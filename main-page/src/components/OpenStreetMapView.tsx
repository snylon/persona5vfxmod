'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface OpenStreetMapViewProps {
  lat: number
  lng: number
  patientName: string
  accuracy?: number | null
}

function lon2tile(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom)
}

function lat2tile(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, zoom)
  )
}

/**
 * Lightweight, interactive, high-res OpenStreetMap canvas renderer.
 *
 * Supports:
 * - Touch & mouse dragging / panning around the map
 * - The patient pin & accuracy circle stay pinned to the exact world location
 * - Smooth zooming (+ / − buttons or recenter)
 * - "Recenter" button appears as soon as you drag away
 * - Cached tiles via same-origin /api/map-tile
 */
export default function OpenStreetMapView({
  lat,
  lng,
  patientName,
  accuracy,
}: OpenStreetMapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [zoom, setZoom] = useState(16)
  const [loading, setLoading] = useState(true)

  // Pan offset in screen pixels relative to patient's center
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef<{ clientX: number; clientY: number; startOffsetX: number; startOffsetY: number }>({
    clientX: 0,
    clientY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  })

  // Cache loaded tile images so dragging doesn't cause tile flickering
  const tileImageCache = useRef<Map<string, HTMLImageElement>>(new Map())

  // Reset pan when coordinates change significantly (e.g. new patient selected)
  const lastCoordsRef = useRef({ lat, lng })
  useEffect(() => {
    const dLat = Math.abs(lat - lastCoordsRef.current.lat)
    const dLng = Math.abs(lng - lastCoordsRef.current.lng)
    if (dLat > 0.05 || dLng > 0.05) {
      setPanOffset({ x: 0, y: 0 })
      lastCoordsRef.current = { lat, lng }
    }
  }, [lat, lng])

  const renderMap = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const TILE_SIZE = 256
    const width = canvas.width
    const height = canvas.height

    // Screen center + pan offset
    const centerPxX = width / 2 + panOffset.x
    const centerPxY = height / 2 + panOffset.y

    // Floating tile coordinates of the patient's fixed world position
    const patientTileX = lon2tile(lng, zoom)
    const patientTileY = lat2tile(lat, zoom)

    // Clear background
    ctx.fillStyle = '#e8eee1'
    ctx.fillRect(0, 0, width, height)

    // Range of tiles intersecting viewport
    const minTileX = Math.floor(patientTileX - centerPxX / TILE_SIZE) - 1
    const maxTileX = Math.floor(patientTileX + (width - centerPxX) / TILE_SIZE) + 1
    const minTileY = Math.floor(patientTileY - centerPxY / TILE_SIZE) - 1
    const maxTileY = Math.floor(patientTileY + (height - centerPxY) / TILE_SIZE) + 1

    const numTiles = Math.pow(2, zoom)
    const pendingLoads: Promise<void>[] = []

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        const wrappedX = ((tx % numTiles) + numTiles) % numTiles
        if (ty < 0 || ty >= numTiles) continue

        const tileLeft = Math.round(centerPxX + (tx - patientTileX) * TILE_SIZE)
        const tileTop = Math.round(centerPxY + (ty - patientTileY) * TILE_SIZE)

        const tileKey = `${zoom}/${wrappedX}/${ty}`
        const cachedImg = tileImageCache.current.get(tileKey)

        if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
          ctx.drawImage(cachedImg, tileLeft, tileTop, TILE_SIZE, TILE_SIZE)
        } else {
          const p = new Promise<void>((resolve) => {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            img.src = `/api/map-tile?z=${zoom}&x=${wrappedX}&y=${ty}`
            img.onload = () => {
              tileImageCache.current.set(tileKey, img)
              // Only draw if still mounted & same viewport
              ctx.drawImage(img, tileLeft, tileTop, TILE_SIZE, TILE_SIZE)
              resolve()
            }
            img.onerror = () => {
              const fallback = new Image()
              fallback.src = `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${ty}.png`
              fallback.onload = () => {
                tileImageCache.current.set(tileKey, fallback)
                ctx.drawImage(fallback, tileLeft, tileTop, TILE_SIZE, TILE_SIZE)
                resolve()
              }
              fallback.onerror = () => resolve()
            }
          })
          pendingLoads.push(p)
        }
      }
    }

    // Draw the fixed world-pinned marker at (centerPxX, centerPxY)
    const drawPin = () => {
      // 1. Accuracy circle (if given)
      if (typeof accuracy === 'number' && accuracy > 0) {
        const metersPerPixel = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom)
        const pixelRadius = Math.max(12, Math.min(width / 2, accuracy / metersPerPixel))

        ctx.beginPath()
        ctx.arc(centerPxX, centerPxY, pixelRadius, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(92, 124, 72, 0.16)'
        ctx.fill()
        ctx.lineWidth = 1.5
        ctx.strokeStyle = 'rgba(92, 124, 72, 0.45)'
        ctx.stroke()
      }

      // 2. Outer halo
      ctx.beginPath()
      ctx.arc(centerPxX, centerPxY, 15, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
      ctx.fill()
      ctx.lineWidth = 2.5
      ctx.strokeStyle = '#4d6f3b'
      ctx.stroke()

      // 3. Pin center core
      ctx.beginPath()
      ctx.arc(centerPxX, centerPxY, 7.5, 0, Math.PI * 2)
      ctx.fillStyle = '#456c35'
      ctx.fill()

      // 4. Center white dot
      ctx.beginPath()
      ctx.arc(centerPxX, centerPxY, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()

      // 5. Patient Name Tag directly attached to the moving pin
      const nameText = patientName || 'Patient'
      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif'
      const textMetrics = ctx.measureText(nameText)
      const badgeWidth = textMetrics.width + 16
      const badgeHeight = 22
      const badgeX = centerPxX - badgeWidth / 2
      const badgeY = centerPxY - 38

      // Rounded rectangle badge above pin
      ctx.beginPath()
      const r = 6
      ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, r)
      ctx.fillStyle = 'rgba(44, 61, 38, 0.92)'
      ctx.fill()

      // Pin indicator arrow pointing down to the marker
      ctx.beginPath()
      ctx.moveTo(centerPxX - 5, badgeY + badgeHeight)
      ctx.lineTo(centerPxX + 5, badgeY + badgeHeight)
      ctx.lineTo(centerPxX, badgeY + badgeHeight + 5)
      ctx.closePath()
      ctx.fillStyle = 'rgba(44, 61, 38, 0.92)'
      ctx.fill()

      // Name text
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(nameText, centerPxX, badgeY + badgeHeight / 2)

      // Attribution
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
      ctx.fillRect(width - 130, height - 16, 130, 16)
      ctx.font = '9px system-ui, sans-serif'
      ctx.fillStyle = '#555555'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText('© OpenStreetMap', width - 6, height - 4)
    }

    if (pendingLoads.length > 0) {
      void Promise.all(pendingLoads).then(() => {
        drawPin()
        setLoading(false)
      })
    } else {
      drawPin()
      setLoading(false)
    }
  }, [lat, lng, zoom, accuracy, panOffset, patientName])

  useEffect(() => {
    renderMap()
  }, [renderMap])

  // ── Drag & Pan Interaction Handlers ───────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag with primary touch or left-click
    if (e.button !== 0) return
    isDraggingRef.current = true
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startOffsetX: panOffset.x,
      startOffsetY: panOffset.y,
    }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return
    const dx = e.clientX - dragStartRef.current.clientX
    const dy = e.clientY - dragStartRef.current.clientY
    setPanOffset({
      x: dragStartRef.current.startOffsetX + dx,
      y: dragStartRef.current.startOffsetY + dy,
    })
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false
      try {
        ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {
        // Pointer was not captured
      }
    }
  }

  const handleRecenter = () => {
    setPanOffset({ x: 0, y: 0 })
  }

  const isPannedAway = Math.abs(panOffset.x) > 15 || Math.abs(panOffset.y) > 15

  return (
    <div
      ref={containerRef}
      className="relative h-[230px] w-full select-none overflow-hidden rounded-[16px] border border-[#d3dfc7] bg-[#e8eee1] touch-none cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <canvas
        ref={canvasRef}
        width={480}
        height={230}
        className="h-full w-full object-cover pointer-events-none"
      />

      {loading && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-xs">
          <div className="flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 shadow-xs">
            <span className="h-2 w-2 animate-ping rounded-full bg-[#52773e]" />
            <span className="text-[10px] font-semibold text-[#3b542c]">Loading map…</span>
          </div>
        </div>
      )}

      {/* Floating Zoom & Recenter Controls */}
      <div className="absolute right-2.5 top-2.5 flex flex-col items-center gap-1.5">
        <div className="flex flex-col overflow-hidden rounded-[8px] border border-[#d2dec8] bg-white/95 shadow-sm">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setZoom((z) => Math.min(18, z + 1))}
            className="flex h-7 w-7 items-center justify-center font-bold text-[#486337] hover:bg-[#eef5e6] active:bg-[#e1edd7]"
            title="Zoom in"
            aria-label="Zoom in"
          >
            +
          </button>
          <div className="h-[1px] w-full bg-[#e3ecd9]" />
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setZoom((z) => Math.max(12, z - 1))}
            className="flex h-7 w-7 items-center justify-center font-bold text-[#486337] hover:bg-[#eef5e6] active:bg-[#e1edd7]"
            title="Zoom out"
            aria-label="Zoom out"
          >
            −
          </button>
        </div>

        {/* Recenter button when panned away */}
        {isPannedAway && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleRecenter}
            className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-[#cfe0c4] bg-white/95 text-[#426430] shadow-sm hover:bg-[#eef5e6]"
            title={`Recenter on ${patientName}`}
            aria-label={`Recenter on ${patientName}`}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
          </button>
        )}
      </div>

      {/* Subtle Drag Prompt Hint */}
      <div className="pointer-events-none absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-full border border-white/80 bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-[#4b6141] shadow-xs backdrop-blur-xs">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M12 12h.01" />
        </svg>
        <span>Drag to pan</span>
      </div>
    </div>
  )
}
