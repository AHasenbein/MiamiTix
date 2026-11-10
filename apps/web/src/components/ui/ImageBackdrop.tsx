/**
 * A full-bleed photo behind a section. Lightly darkened so text on top stays readable,
 * and faded into the page background at the bottom.
 * The parent needs `relative isolate` so this sits behind its content.
 */
export function ImageBackdrop({ imageUrl }: { imageUrl: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[var(--background)]/40" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--background)]" />
    </div>
  );
}
