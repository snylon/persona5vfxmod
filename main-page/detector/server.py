"""
server.py
=========
Thin FastAPI HTTP layer for the YOLO detection sidecar.

All detection logic lives in detector.py.  This file only handles:
  - HTTP routing and request/response schema
  - CORS so the Next.js dev server can call this API
  - Two input styles: JSON base64 body, or multipart file upload

Start with:
    py -3.13 -m uvicorn server:app --host 127.0.0.1 --port 8000

Endpoints
---------
POST /detect         JSON body  { "image": "<base64 or data-URL>" }
POST /detect/upload  Multipart  field name "file"
GET  /health         Liveness check — returns model name and class count
"""

import logging
import os

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from detector import DetectionResult, detect

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="YOLO Detection Sidecar",
    description="Runs YOLO11n inference and returns the main detected object.",
    version="1.0.0",
)

# Allow requests from the Next.js dev server and any deployed origin.
# In production, replace "*" with your exact frontend URL.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class DetectRequest(BaseModel):
    """Body for the JSON /detect endpoint."""

    # Base64-encoded image, with or without a data-URL prefix
    # e.g. "data:image/jpeg;base64,/9j/4AAQ..." or just the raw base64 string
    image: str


class DetectResponse(BaseModel):
    """Shared response schema for both /detect endpoints."""

    success: bool
    # Name of the highest-confidence detected object, or null
    main_object: str | None
    # All detected object names, ordered by descending confidence
    all_objects: list[str]
    # Confidence score of main_object in [0, 1], or null
    confidence: float | None
    # Human-readable error description, or null
    error: str | None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _result_to_response(result: DetectionResult) -> DetectResponse:
    """Convert a DetectionResult dataclass to the HTTP response schema."""
    return DetectResponse(
        success=result.success,
        main_object=result.main_object,
        all_objects=result.all_objects,
        confidence=result.confidence,
        error=result.error,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health() -> dict:
    """Liveness check.  Returns model name and number of known classes."""
    # Import the module-level model name and class count from detector
    from detector import _MODEL_NAME, _model

    return {
        "status": "ok",
        "model": _MODEL_NAME,
        "classes": len(_model.names),
    }


@app.post("/detect", response_model=DetectResponse)
def detect_base64(body: DetectRequest) -> DetectResponse:
    """Run detection on a base64-encoded or data-URL image.

    Returns the main detected object (highest confidence) together with the
    full ordered list of detected classes.  Never returns a 500 — errors are
    reported inside the response body via ``success: false`` and ``error``.
    """
    logger.info("POST /detect — base64 image received")
    result = detect(body.image)
    logger.info(
        "Detection complete — success=%s main_object=%s confidence=%s",
        result.success,
        result.main_object,
        result.confidence,
    )
    return _result_to_response(result)


@app.post("/detect/upload", response_model=DetectResponse)
async def detect_upload(file: UploadFile = File(...)) -> DetectResponse:
    """Run detection on a multipart file upload.

    Accepts any image format supported by OpenCV (JPEG, PNG, BMP, WEBP, …).
    """
    logger.info("POST /detect/upload — file '%s' received", file.filename)

    if not file.content_type or not file.content_type.startswith("image/"):
        logger.warning("Rejected non-image content type: %s", file.content_type)
        return DetectResponse(
            success=False,
            main_object=None,
            all_objects=[],
            confidence=None,
            error=f"Expected an image file, got '{file.content_type}'.",
        )

    raw_bytes: bytes = await file.read()
    result = detect(raw_bytes)

    logger.info(
        "Detection complete — success=%s main_object=%s confidence=%s",
        result.success,
        result.main_object,
        result.confidence,
    )
    return _result_to_response(result)
