"""
detector.py
===========
Dedicated object-detection module.

Responsibilities
----------------
- Load the YOLO model exactly once at import time (module-level singleton).
- Accept an image supplied as a file path, raw bytes, or a base64 / data-URL
  string.
- Run YOLO inference with a configurable confidence threshold.
- Identify the *main* object in the picture — defined as the detection with
  the highest confidence score.
- Return a structured DetectionResult dataclass.
- Handle every failure mode (invalid image, no detections, corrupt data,
  runtime errors) without raising to the caller.

This module contains no HTTP, routing, or framework code.
Import it from server.py or any other entry point.

Environment variables
---------------------
YOLO_MODEL      Name or path of the model weights file.
                Default: "yolo11n.pt"  (YOLO11 nano, ~5.4 MB, auto-downloaded)

YOLO_CONFIDENCE Minimum confidence threshold, 0.0–1.0.
                Default: "0.25"
"""

from __future__ import annotations

import base64
import logging
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Union

import cv2
import numpy as np
from ultralytics import YOLO

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration — read once from the environment
# ---------------------------------------------------------------------------
_MODEL_NAME: str = os.environ.get("YOLO_MODEL", "yolo11n.pt")

_CONFIDENCE_THRESHOLD: float = float(os.environ.get("YOLO_CONFIDENCE", "0.25"))
if not 0.0 <= _CONFIDENCE_THRESHOLD <= 1.0:
    logger.warning(
        "YOLO_CONFIDENCE %s is outside [0, 1]; falling back to 0.25",
        _CONFIDENCE_THRESHOLD,
    )
    _CONFIDENCE_THRESHOLD = 0.25

# ---------------------------------------------------------------------------
# Model singleton — loaded here, once, when the module is first imported.
# Ultralytics downloads the weights automatically if not already cached
# (stored in %APPDATA%\Ultralytics\ on Windows, ~/.config/Ultralytics/ on
# macOS/Linux).
# ---------------------------------------------------------------------------
logger.info("Loading YOLO model '%s' …", _MODEL_NAME)
_model: YOLO = YOLO(_MODEL_NAME)
logger.info(
    "Model ready — %d classes, confidence threshold %.2f",
    len(_model.names),
    _CONFIDENCE_THRESHOLD,
)

# ---------------------------------------------------------------------------
# Public types
# ---------------------------------------------------------------------------

#: Accepted image input types
ImageInput = Union[str, bytes, Path]


@dataclass(frozen=True)
class DetectionResult:
    """Outcome of a single detection run.

    Attributes
    ----------
    success:
        ``True`` when inference completed without error (even if no objects
        were found).
    main_object:
        Name of the most-confident detection, or ``None`` when nothing was
        detected above the confidence threshold or when ``success`` is
        ``False``.
    all_objects:
        Ordered list of every detected class name (deduplicated, sorted by
        descending confidence).  Empty when nothing was detected.
    confidence:
        Confidence score of ``main_object`` in [0, 1], or ``None``.
    error:
        Human-readable error description when ``success`` is ``False``.
    """

    success: bool
    main_object: str | None = None
    all_objects: list[str] = field(default_factory=list)
    confidence: float | None = None
    error: str | None = None


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _decode_image(source: ImageInput) -> np.ndarray | None:
    """Convert *source* to an OpenCV BGR image array.

    Returns ``None`` when the image cannot be decoded.
    """
    # ── Base64 string or data-URL (must be checked before the Path branch) ─
    # A base64 string is not a file path.  We identify it by the presence of
    # a data-URL comma separator OR by the string not pointing to an existing
    # file on disk.
    if isinstance(source, str):
        path = Path(source)
        is_data_url = "," in source
        is_existing_file = path.exists() and path.is_file()

        if is_data_url or not is_existing_file:
            # Treat as base64 / data-URL
            raw_str = source
            if "," in raw_str:
                raw_str = raw_str.split(",", 1)[1]
            try:
                raw = base64.b64decode(raw_str)
            except Exception:
                logger.debug("base64 decode failed for string input")
                return None
            if len(raw) == 0:
                logger.debug("Empty buffer after base64 decode")
                return None
            try:
                arr = np.frombuffer(raw, dtype=np.uint8)
                img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            except Exception:
                logger.debug("cv2.imdecode raised for base64 input")
                return None
            if img is None:
                logger.debug("cv2.imdecode returned None for base64 input")
            return img

        # Existing file path
        try:
            img = cv2.imread(str(path))
        except Exception:
            logger.debug("cv2.imread raised for path '%s'", path)
            return None
        if img is None:
            logger.debug("cv2.imread returned None for path '%s'", path)
        return img

    # ── pathlib.Path ───────────────────────────────────────────────────────
    if isinstance(source, Path):
        try:
            img = cv2.imread(str(source))
        except Exception:
            logger.debug("cv2.imread raised for path '%s'", source)
            return None
        if img is None:
            logger.debug("cv2.imread returned None for path '%s'", source)
        return img

    # ── Raw bytes ──────────────────────────────────────────────────────────
    if isinstance(source, bytes):
        if len(source) == 0:
            logger.debug("Empty byte buffer")
            return None
        try:
            arr = np.frombuffer(source, dtype=np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        except Exception:
            logger.debug("cv2.imdecode raised for bytes input")
            return None
        if img is None:
            logger.debug("cv2.imdecode returned None for bytes input")
        return img

    logger.debug("Unsupported source type: %s", type(source))
    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def detect(source: ImageInput) -> DetectionResult:
    """Run YOLO object detection on *source* and return a :class:`DetectionResult`.

    Parameters
    ----------
    source:
        One of:

        * A file-system path (``str`` or :class:`~pathlib.Path`) to an image
          file (JPEG, PNG, BMP, WEBP, …).
        * Raw image bytes.
        * A base64-encoded string, with or without a ``data:image/…;base64,``
          prefix.

    Returns
    -------
    DetectionResult
        Always returns a result — never raises.  Check ``result.success``
        and ``result.error`` to distinguish failure modes.

    Examples
    --------
    >>> result = detect("photo.jpg")
    >>> if result.main_object:
    ...     print(result.main_object, result.confidence)

    >>> result = detect(base64_string)
    >>> result.all_objects        # ['cup', 'bottle']
    >>> result.main_object        # 'cup'
    """
    # ── 1. Decode the image ────────────────────────────────────────────────
    try:
        img = _decode_image(source)
    except Exception as exc:
        logger.exception("Unexpected error while decoding image")
        return DetectionResult(success=False, error=f"Image decode error: {exc}")

    if img is None:
        return DetectionResult(
            success=False,
            error="Could not decode image — unsupported format or corrupt data.",
        )

    # ── 2. Run YOLO inference ──────────────────────────────────────────────
    try:
        results = _model(img, conf=_CONFIDENCE_THRESHOLD, verbose=False)
    except Exception as exc:
        logger.exception("YOLO inference failed")
        return DetectionResult(success=False, error=f"Inference error: {exc}")

    # ── 3. Collect detections ordered by confidence (descending) ───────────
    # Each entry: (confidence: float, class_name: str)
    detections: list[tuple[float, str]] = []
    seen: set[str] = set()

    try:
        for result in results:
            if result.boxes is None or len(result.boxes) == 0:
                continue
            for conf_tensor, cls_tensor in zip(
                result.boxes.conf.tolist(),
                result.boxes.cls.tolist(),
            ):
                name: str = _model.names[int(cls_tensor)]
                confidence: float = float(conf_tensor)
                # Keep only the highest-confidence entry per class
                if name not in seen:
                    seen.add(name)
                    detections.append((confidence, name))

        # Sort by confidence descending so index 0 is the most prominent object
        detections.sort(key=lambda t: t[0], reverse=True)

    except Exception as exc:
        logger.exception("Error while parsing YOLO results")
        return DetectionResult(success=False, error=f"Result parse error: {exc}")

    # ── 4. Build and return the result ─────────────────────────────────────
    if not detections:
        # Inference ran fine but nothing was found above the threshold
        return DetectionResult(success=True, main_object=None, all_objects=[])

    top_confidence, top_name = detections[0]
    all_names = [name for _, name in detections]

    return DetectionResult(
        success=True,
        main_object=top_name,
        all_objects=all_names,
        confidence=round(top_confidence, 4),
    )
