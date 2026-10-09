"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  getOAuthAuthorizationUrl,
  getOAuthProviders,
  login,
  register,
  resendVerificationEmail
} from "@/lib/api/auth";
import { ApiClientError } from "@/lib/api/client";
import { safeReturnTo, saveAuthToken } from "@/lib/auth/token-storage";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { SurfaceCard } from "../ui/SurfaceCard";

interface AuthCardProps {
  mode: "login" | "register";
}

export function AuthCard({ mode }: AuthCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoadingProviders, setIsLoadingProviders] = useState(true);
  const [enabledOAuthProviders, setEnabledOAuthProviders] = useState<
    Array<"google" | "apple">
  >([]);

  const isRegisterMode = mode === "register";
  const hasMinLength = password.length >= 6;
  const hasNumber = /\d/.test(password);
  const passwordsMatch = password === confirmPassword;
  const googleEnabled = enabledOAuthProviders.includes("google");
  const returnTo = safeReturnTo(searchParams.get("returnTo"));

  useEffect(() => {
    getOAuthProviders()
      .then((response) => {
        const enabled = response.providers
          .filter((provider) => provider.enabled)
          .map((provider) => provider.id);
        setEnabledOAuthProviders(enabled);
      })
      .catch(() => {
        setEnabledOAuthProviders([]);
      })
      .finally(() => {
        setIsLoadingProviders(false);
      });
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (isRegisterMode) {
      if (!passwordsMatch) {
        setErrorMessage("Passwords do not match.");
        return;
      }

      if (!hasMinLength || !hasNumber) {
        setErrorMessage("Password must be 6+ characters and include at least one number.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isRegisterMode) {
        const result = await register({ displayName, email, password, confirmPassword });
        if (result.token) {
          saveAuthToken(result.token);
          router.push(returnTo || "/dashboard");
        } else if (result.verificationRequired) {
          setSuccessMessage("Verification email sent. Check your inbox before logging in.");
          if (result.verificationPreviewUrl && process.env.NODE_ENV === "development") {
            setSuccessMessage(
              `Verification email sent. Dev preview link: ${result.verificationPreviewUrl}`
            );
          }
        } else {
          setSuccessMessage("Account created. You can log in now.");
        }
      } else {
        const result = await login({ email, password });
        saveAuthToken(result.token);
        router.push(returnTo || "/dashboard");
      }
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrorMessage(error.issues?.[0]?.message ?? error.message);
      } else {
        setErrorMessage("Unexpected error. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOAuthLogin(provider: "google" | "apple") {
    setErrorMessage("");
    try {
      const authorizationUrl = await getOAuthAuthorizationUrl(provider);
      window.location.assign(authorizationUrl);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiClientError ? error.message : "Could not start OAuth login."
      );
    }
  }

  return (
    <SurfaceCard className="w-full max-w-[28rem] p-5 sm:p-8">
      <div className="mb-6 grid gap-2 sm:mb-7">
        <p className="muted-text text-xs uppercase tracking-[0.16em]">Tix</p>
        <h1 className="brand-heading text-2xl font-semibold leading-tight sm:text-3xl">
          {isRegisterMode ? "Create your account" : "Sign in"}
        </h1>
        <p className="muted-text text-sm leading-6">
          {isRegisterMode
            ? "Join the marketplace to buy, sell, and coordinate tickets quickly."
            : "Continue to your dashboard, listings, and wishlist."}
        </p>
      </div>

      <div className="grid gap-3">
        {isLoadingProviders ? (
          <div
            className="h-11 w-full animate-pulse rounded-xl border border-[var(--border)] bg-white/5"
            role="status"
            aria-live="polite"
            aria-label="Loading OAuth providers"
          />
        ) : null}
        {!isLoadingProviders && googleEnabled ? (
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={() => handleOAuthLogin("google")}
          >
            Continue with Google
          </Button>
        ) : null}
        {!isLoadingProviders && !googleEnabled ? (
          <p
            className="muted-text rounded-xl border border-[var(--border)] bg-white/[0.03] px-3 py-2 text-center text-xs"
            role="status"
            aria-live="polite"
          >
            Google sign-in is currently unavailable.
          </p>
        ) : null}
      </div>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--border)]" />
        <span className="muted-text text-xs uppercase tracking-[0.16em]">or use email</span>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <form className="grid gap-3.5" onSubmit={onSubmit}>
        {isRegisterMode ? (
          <Input
            label="Display name"
            autoComplete="name"
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        ) : null}
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Input
          label="Password"
          type={showPassword ? "text" : "password"}
          autoComplete={isRegisterMode ? "new-password" : "current-password"}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {isRegisterMode ? (
          <>
            <Input
              label="Confirm password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              errorMessage={confirmPassword && !passwordsMatch ? "Passwords must match" : undefined}
            />
            <div className="grid gap-1 rounded-xl border border-[var(--border)] bg-white/[0.03] px-3 py-2 text-xs">
              <p className={hasMinLength ? "text-emerald-300" : "muted-text"}>
                {hasMinLength ? "Met: at least 6 characters" : "Not met: at least 6 characters"}
              </p>
              <p className={hasNumber ? "text-emerald-300" : "muted-text"}>
                {hasNumber
                  ? "Met: includes at least one number"
                  : "Not met: includes at least one number"}
              </p>
            </div>
          </>
        ) : null}
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm muted-text">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(event) => setShowPassword(event.target.checked)}
            className="size-5 shrink-0 rounded border border-[var(--border)] bg-[var(--surface)]"
          />
          Show password
        </label>

        {errorMessage ? (
          <Alert tone="error" announce="assertive">
            {errorMessage}
          </Alert>
        ) : null}
        {successMessage ? (
          <Alert tone="success">
            {successMessage}
          </Alert>
        ) : null}

        <Button disabled={isSubmitting} type="submit" className="mt-1 w-full">
          {isSubmitting
            ? "Please wait..."
            : isRegisterMode
              ? "Create account"
              : "Log in"}
        </Button>
        {isRegisterMode ? (
          <p className="muted-text text-center text-xs leading-5">
            Already signed up but not verified?{" "}
            <button
              type="button"
              className="min-h-11 w-full py-2 font-medium text-[var(--foreground)] underline underline-offset-4 disabled:opacity-60 sm:w-auto sm:py-0"
              onClick={async () => {
                setErrorMessage("");
                setSuccessMessage("");
                try {
                  const response = await resendVerificationEmail(email);
                  setSuccessMessage(
                    response.verificationPreviewUrl && process.env.NODE_ENV === "development"
                      ? `Verification email re-sent. Dev preview: ${response.verificationPreviewUrl}`
                      : response.message
                  );
                } catch (error) {
                  setErrorMessage(
                    error instanceof ApiClientError
                      ? error.issues?.[0]?.message ?? error.message
                      : "Could not resend verification email."
                  );
                }
              }}
              disabled={!email}
            >
              Resend verification email
            </button>
          </p>
        ) : null}
      </form>

      <p className="muted-text mt-6 text-center text-sm">
        {isRegisterMode ? "Already have an account? " : "Need an account? "}
        <Link
          href={`${isRegisterMode ? "/auth/login" : "/auth/register"}${
            returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""
          }`}
          className="text-[var(--foreground)] underline underline-offset-4"
        >
          {isRegisterMode ? "Log in" : "Create one"}
        </Link>
      </p>
    </SurfaceCard>
  );
}
