'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, RefreshCw, Loader2 } from 'lucide-react'

interface CameraModalProps {
  isOpen: boolean
  onClose: () => void
  onCapture: (files: File[]) => void
  maxPhotos: number
}

export default function CameraModal({ isOpen, onClose, onCapture, maxPhotos }: CameraModalProps) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedPhotos, setCapturedPhotos] = useState<{ file: File; url: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const stopStream = useCallback((s: MediaStream | null) => {
    if (s) {
      s.getTracks().forEach(track => track.stop())
    }
  }, [])

  const startCamera = useCallback(async () => {
    setIsInitializing(true)
    setError(null)
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(d => d.kind === 'videoinput')
      setHasMultipleCameras(videoDevices.length > 1)
    } catch (err) {
      const name = err instanceof DOMException ? err.name : ''
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError('Camera access was denied. Please allow camera access in your browser settings and try again.')
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('No camera found on this device.')
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setError('Camera is in use by another application.')
      } else {
        setError('Could not access camera.')
      }
    } finally {
      setIsInitializing(false)
    }
  }, [facingMode])

  // Start/restart camera when modal opens or facingMode changes
  useEffect(() => {
    if (!isOpen) return

    startCamera()

    return () => {
      setStream(prev => {
        stopStream(prev)
        return null
      })
    }
  }, [isOpen, facingMode, startCamera, stopStream])

  // Attach stream to video element when stream changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  // Cleanup everything when modal closes
  useEffect(() => {
    if (!isOpen) {
      stopStream(stream)
      setStream(null)
      // Revoke any leftover blob URLs
      capturedPhotos.forEach(p => URL.revokeObjectURL(p.url))
      setCapturedPhotos([])
      setError(null)
      setIsInitializing(true)
      setFacingMode('environment')
    }
    // Only run when isOpen changes to false
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return
    if (capturedPhotos.length >= maxPhotos) return

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0)

    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' })
      const url = URL.createObjectURL(file)
      setCapturedPhotos(prev => [...prev, { file, url }])
    }, 'image/jpeg', 0.92)
  }, [capturedPhotos.length, maxPhotos])

  const removePhoto = useCallback((index: number) => {
    setCapturedPhotos(prev => {
      const removed = prev[index]
      if (removed) URL.revokeObjectURL(removed.url)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  const flipCamera = useCallback(() => {
    stopStream(stream)
    setStream(null)
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')
  }, [stream, stopStream])

  const handleDone = useCallback(() => {
    onCapture(capturedPhotos.map(p => p.file))
    onClose()
  }, [capturedPhotos, onCapture, onClose])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Video viewfinder */}
      <div className="flex-1 relative overflow-hidden">
        {isInitializing && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Loader2 size={32} className="text-white animate-spin" />
            <p className="text-white/70 text-sm">Starting camera...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
              <X size={32} className="text-white/60" />
            </div>
            <p className="text-white text-lg font-medium">Camera Unavailable</p>
            <p className="text-white/70 text-sm">{error}</p>
            <button
              onClick={handleClose}
              className="mt-2 px-6 py-2.5 bg-white text-black rounded-lg font-medium text-sm hover:bg-white/90 transition-colors"
            >
              Upload Photos Instead
            </button>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''} ${error || isInitializing ? 'opacity-0' : 'opacity-100'}`}
        />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
        <button
          onClick={handleClose}
          className="p-3 text-white hover:bg-white/10 rounded-full transition-colors"
          aria-label="Close camera"
        >
          <X size={24} />
        </button>

        {hasMultipleCameras && !error && (
          <button
            onClick={flipCamera}
            className="p-3 text-white hover:bg-white/10 rounded-full transition-colors"
            aria-label="Switch camera"
          >
            <RefreshCw size={22} />
          </button>
        )}
      </div>

      {/* Bottom controls */}
      {!error && (
        <div className="absolute bottom-0 left-0 right-0 z-10 pb-8 pt-4 bg-gradient-to-t from-black/80 to-transparent">
          {/* Thumbnail strip */}
          {capturedPhotos.length > 0 && (
            <div className="flex gap-2 justify-center mb-3 px-4">
              {capturedPhotos.map((photo, i) => (
                <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden border-2 border-white/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={`Capture ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-black/80 text-white rounded-full flex items-center justify-center"
                    aria-label={`Remove photo ${i + 1}`}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Counter */}
          <p className="text-white/70 text-sm text-center mb-4">
            {capturedPhotos.length} of {maxPhotos} photo{maxPhotos !== 1 ? 's' : ''}
          </p>

          {/* Controls row */}
          <div className="flex items-center justify-center gap-8">
            {/* Spacer for centering */}
            <div className="w-16" />

            {/* Shutter button */}
            <button
              onClick={capturePhoto}
              disabled={capturedPhotos.length >= maxPhotos || isInitializing}
              className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-transform"
              aria-label="Take photo"
            >
              <div className="w-12 h-12 rounded-full bg-white" />
            </button>

            {/* Done button */}
            <div className="w-16 flex justify-center">
              {capturedPhotos.length > 0 && (
                <button
                  onClick={handleDone}
                  className="px-4 py-2 bg-white text-black rounded-lg font-medium text-sm hover:bg-white/90 transition-colors"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
