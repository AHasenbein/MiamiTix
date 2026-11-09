"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { ApiClientError } from "@/lib/api/client";
import { submitSellerApplication } from "@/lib/api/seller-applications";
import { Input } from "@/components/ui/Input";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

/** "Apply to be a verified seller": name, email and a short description, sent to the site owner. */
export function SellerApplicationForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = formEvent.currentTarget;
    const data = new FormData(form);
    setStatus({ kind: "sending" });
    try {
      await submitSellerApplication({
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        description: String(data.get("description") ?? ""),
        website: String(data.get("website") ?? "")
      });
      form.reset();
      setStatus({ kind: "sent" });
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof ApiClientError ? error.message : "Something went wrong. Try again."
      });
    }
  }

  return (
    <section className="grid gap-6 border-t border-[var(--border)] pt-12">
      <div className="text-center">
        <h2 className="display-heading text-xl font-extrabold uppercase text-[var(--foreground)] sm:text-2xl">
          Apply to be a verified seller
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Tell us who you are and what you sell. We&apos;ll get back to you by email.
        </p>
      </div>

      {status.kind === "sent" ? (
        <p className="text-center text-sm text-[var(--foreground)]" role="status">
          Thanks! Your application is in. We&apos;ll be in touch.
        </p>
      ) : (
        <form className="mx-auto grid w-full max-w-2xl gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Name" name="name" autoComplete="name" required maxLength={100} />
            <Input label="Email" name="email" type="email" autoComplete="email" required maxLength={200} />
          </div>
          <label className="grid gap-1.5 text-sm">
            <span className="text-[13px] font-medium text-[var(--silver)]">Short description</span>
            <textarea
              name="description"
              required
              minLength={10}
              maxLength={1000}
              rows={3}
              placeholder="What events do you sell tickets for, and how many?"
              className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-[var(--foreground)] outline-none transition placeholder:text-zinc-600 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-soft)]"
            />
          </label>
          {/* Honeypot: off-screen and skipped by keyboard and screen readers; bots fill it in. */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
          <div className="flex flex-col items-center gap-3">
            <button
              type="submit"
              disabled={status.kind === "sending"}
              className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--brand-pink)] px-6 text-sm font-bold uppercase tracking-wide text-[#111111] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status.kind === "sending" ? "Sending…" : "Apply"}
            </button>
            {status.kind === "error" ? (
              <p className="text-center text-sm text-danger" role="alert">
                {status.message}
              </p>
            ) : null}
          </div>
        </form>
      )}
    </section>
  );
}
