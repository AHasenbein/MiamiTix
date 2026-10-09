"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EVENT_IMAGE_ASPECT,
  EventImageError,
  cropImageFileToUploadableJpeg,
  type ImageCropRect
} from "@/lib/images/prepare-event-image";
import { Button } from "../ui/Button";

interface ImageCropModalProps {
  file: File;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function coverScale(imageWidth: number, imageHeight: number, frameWidth: number, frameHeight: number) {
  return Math.max(frameWidth / imageWidth, frameHeight / imageHeight);
}

export function ImageCropModal({ file, onCancel, onConfirm }: ImageCropModalProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [frameSize, setFrameSize] = useState({ width: 320, height: 256 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const dragOrigin = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  useEffect(() => {
    const url = URL.createObjectURL(file);
    if (imageRef.current) {
      imageRef.current.src = url;
    }
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function measure() {
      const stage = stageRef.current;
      if (!stage) return;
      const width = stage.clientWidth;
      const height = Math.round(width / EVENT_IMAGE_ASPECT);
      setFrameSize({ width, height });
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const baseScale =
    naturalSize.width && naturalSize.height
      ? coverScale(naturalSize.width, naturalSize.height, frameSize.width, frameSize.height)
      : 1;
  const scale = baseScale * zoom;
  const drawnWidth = naturalSize.width * scale;
  const drawnHeight = naturalSize.height * scale;
  const maxPanX = Math.max(0, (drawnWidth - frameSize.width) / 2);
  const maxPanY = Math.max(0, (drawnHeight - frameSize.height) / 2);

  // Zooming out or resizing shrinks the pan limits, so clamp at render time.
  const clampedPan = {
    x: clamp(pan.x, -maxPanX, maxPanX),
    y: clamp(pan.y, -maxPanY, maxPanY)
  };
  const imageLeft = (frameSize.width - drawnWidth) / 2 + clampedPan.x;
  const imageTop = (frameSize.height - drawnHeight) / 2 + clampedPan.y;

  const getCropRect = useCallback((): ImageCropRect => {
    const x = (-imageLeft) / scale;
    const y = (-imageTop) / scale;
    const width = frameSize.width / scale;
    const height = frameSize.height / scale;
    return {
      x: clamp(x, 0, Math.max(0, naturalSize.width - width)),
      y: clamp(y, 0, Math.max(0, naturalSize.height - height)),
      width: Math.min(width, naturalSize.width),
      height: Math.min(height, naturalSize.height)
    };
  }, [frameSize.height, frameSize.width, imageLeft, imageTop, naturalSize.height, naturalSize.width, scale]);

  function beginDrag(clientX: number, clientY: number) {
    setIsDragging(true);
    dragOrigin.current = { x: clientX, y: clientY, panX: clampedPan.x, panY: clampedPan.y };
  }

  function moveDrag(clientX: number, clientY: number) {
    if (!isDragging) return;
    const nextX = dragOrigin.current.panX + (clientX - dragOrigin.current.x);
    const nextY = dragOrigin.current.panY + (clientY - dragOrigin.current.y);
    setPan({
      x: clamp(nextX, -maxPanX, maxPanX),
      y: clamp(nextY, -maxPanY, maxPanY)
    });
  }

  function endDrag() {
    setIsDragging(false);
  }

  async function handleConfirm() {
    if (!naturalSize.width || !naturalSize.height) return;
    setIsSaving(true);
    setErrorMessage("");
    try {
      const dataUrl = await cropImageFileToUploadableJpeg(file, getCropRect());
      onConfirm(dataUrl);
    } catch (error) {
      setErrorMessage(error instanceof EventImageError ? error.message : "Could not crop image.");
      setIsSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-[rgba(7,6,15,0.82)] p-0 backdrop-blur-md sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-crop-title"
    >
      <div className="flex max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.25rem] border border-[var(--border)] bg-[rgba(12,10,22,0.98)] shadow-[0_-20px_60px_rgba(0,0,0,0.45)] sm:max-h-[90dvh] sm:rounded-[1.25rem]">
        <header className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--neon-pink-soft)]">
              Crop photo
            </p>
            <h2 id="image-crop-title" className="brand-heading mt-1 text-xl font-semibold">
              Frame your event image
            </h2>
            <p className="muted-text mt-1 text-xs leading-relaxed">
              Drag to reposition. Zoom to choose what shows on cards.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-lg text-[var(--silver)] transition hover:text-white"
            aria-label="Close cropper"
          >
            ×
          </button>
        </header>

        <div className="grid gap-4 overflow-y-auto px-4 py-4 sm:px-5">
          <div
            ref={stageRef}
            className="relative mx-auto w-full touch-none overflow-hidden rounded-[1rem] border border-[var(--border)] bg-black select-none"
            style={{ height: frameSize.height || undefined, aspectRatio: `${EVENT_IMAGE_ASPECT}` }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              beginDrag(event.clientX, event.clientY);
            }}
            onPointerMove={(event) => moveDrag(event.clientX, event.clientY)}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {/* src is assigned from an object URL in the effect above. */}
            <img
              ref={imageRef}
              alt="Crop preview"
              draggable={false}
              className={`absolute max-w-none origin-top-left ${isDragging ? "cursor-grabbing" : "cursor-grab"} ${
                naturalSize.width ? "" : "invisible"
              }`}
              style={{
                width: drawnWidth || undefined,
                height: drawnHeight || undefined,
                left: imageLeft,
                top: imageTop
              }}
              onLoad={(event) => {
                setNaturalSize({
                  width: event.currentTarget.naturalWidth,
                  height: event.currentTarget.naturalHeight
                });
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            />
            <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35),inset_0_0_40px_rgba(0,0,0,0.35)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-[linear-gradient(180deg,rgba(0,0,0,0.35),transparent)]" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-[linear-gradient(0deg,rgba(0,0,0,0.35),transparent)]" />
          </div>

          <label className="grid gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="muted-text uppercase tracking-[0.14em]">Zoom</span>
              <span className="text-[var(--silver)]">{Math.round(zoom * 100)}%</span>
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[rgba(232,235,243,0.16)] accent-[var(--neon-pink)]"
            />
          </label>

          {errorMessage ? (
            <p className="text-sm text-danger" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 border-t border-[var(--border)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
          <Button variant="ghost" type="button" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleConfirm()} disabled={isSaving || !naturalSize.width}>
            {isSaving ? "Saving crop..." : "Use this crop"}
          </Button>
        </div>
      </div>
    </div>
  );
}
