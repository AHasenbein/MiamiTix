"use client";

import { useId, useRef, useState } from "react";
import { EventImageError } from "@/lib/images/prepare-event-image";
import { ImageCropModal } from "./ImageCropModal";

interface EventImagePickerProps {
  valueUrl: string;
  onChange: (dataUrl: string) => void;
  onClear?: () => void;
  disabled?: boolean;
  errorMessage?: string;
  /** Mobile create listing hero vs compact form field */
  variant?: "hero" | "field";
  label?: string;
  helperText?: string;
}

export function EventImagePicker({
  valueUrl,
  onChange,
  onClear,
  disabled = false,
  errorMessage,
  variant = "field",
  label = "Event image",
  helperText = "Optional — crop to frame the shot"
}: EventImagePickerProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState("");

  function openFilePicker() {
    if (disabled) return;
    inputRef.current?.click();
  }

  function handleFileChange(file: File | null) {
    setLocalError("");
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setLocalError("Please choose an image file.");
      return;
    }
    setCropFile(file);
  }

  function handleCropCancel() {
    setCropFile(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleCropConfirm(dataUrl: string) {
    onChange(dataUrl);
    setCropFile(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  const displayError = errorMessage || localError;

  const fileInput = (
    <input
      ref={inputRef}
      id={inputId}
      accept="image/*"
      className="sr-only"
      disabled={disabled}
      type="file"
      onChange={(event) => {
        const file = event.target.files?.[0] ?? null;
        try {
          handleFileChange(file);
        } catch (error) {
          setLocalError(error instanceof EventImageError ? error.message : "Could not open image.");
        }
      }}
    />
  );

  if (variant === "hero") {
    return (
      <>
        <section className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
          <button
            type="button"
            disabled={disabled}
            onClick={openFilePicker}
            className="relative flex min-h-44 w-full cursor-pointer flex-col items-center justify-center overflow-hidden disabled:opacity-60"
          >
            {valueUrl ? (
              <>
                <img
                  src={valueUrl}
                  alt="Event upload preview"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,9,11,0.15),rgba(9,9,11,0.75))]" />
                <span className="relative z-10 rounded-full border border-[var(--border)] bg-[rgba(9,9,11,0.72)] px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                  Tap to crop / change
                </span>
              </>
            ) : (
              <div className="relative z-10 grid place-items-center gap-2 px-6 py-10 text-center">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-elevated)] border border-[var(--border-strong)] text-xl font-bold text-white">
                  +
                </span>
                <p className="brand-heading text-base font-semibold text-white">Add event photo</p>
                <p className="muted-text text-xs">{helperText}</p>
              </div>
            )}
          </button>
          {valueUrl && onClear ? (
            <div className="flex border-t border-[var(--border)]">
              <button
                type="button"
                className="flex-1 px-4 py-2.5 text-xs font-semibold text-[var(--silver)] transition hover:text-white"
                onClick={openFilePicker}
                disabled={disabled}
              >
                Recrop / change
              </button>
              <button
                type="button"
                className="flex-1 border-l border-[var(--border)] px-4 py-2.5 text-xs font-semibold text-[var(--danger)] transition hover:text-white"
                onClick={onClear}
                disabled={disabled}
              >
                Remove
              </button>
            </div>
          ) : null}
          {displayError ? (
            <p className="border-t border-[var(--border)] px-4 py-2 text-xs text-danger">{displayError}</p>
          ) : null}
          {fileInput}
        </section>
        {cropFile ? (
          <ImageCropModal
            file={cropFile}
            onCancel={handleCropCancel}
            onConfirm={handleCropConfirm}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className="grid gap-1.5 text-sm">
        <span className="muted-text">{label}</span>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={openFilePicker}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-semibold text-[var(--foreground)] transition hover:border-[rgba(255,46,168,0.55)] hover:bg-[rgba(255,46,168,0.08)] disabled:opacity-60"
          >
            {valueUrl ? "Crop / change photo" : "Choose & crop photo"}
          </button>
          {valueUrl && onClear ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onClear}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] px-4 text-sm font-semibold text-[var(--silver)] transition hover:text-white disabled:opacity-60"
            >
              Remove
            </button>
          ) : null}
        </div>
        <p className="muted-text text-xs">{helperText}</p>
        {displayError ? <span className="text-xs text-danger">{displayError}</span> : null}
        {fileInput}
      </div>
      {valueUrl ? (
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)]">
          <img src={valueUrl} alt="Event upload preview" className="aspect-[5/4] h-auto w-full object-cover" />
        </div>
      ) : null}
      {cropFile ? (
        <ImageCropModal
          file={cropFile}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      ) : null}
    </>
  );
}
