"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/api/auth";
import { ApiClientError } from "@/lib/api/client";
import { clearAuthToken, readAuthToken } from "@/lib/auth/token-storage";
import { Button } from "../ui/Button";
import { ButtonLink } from "../ui/ButtonLink";

interface NavItem {
  href: string;
  label: string;
}

interface AppHeaderProps {
  onAuthChange?: (isAuthenticated: boolean) => void;
}

export function AppHeader({ onAuthChange }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [canSell, setCanSell] = useState(false);

  const authedPrimaryItems: NavItem[] = [{ href: "/events", label: "Events" }];
  if (canSell) {
    authedPrimaryItems.push({ href: "/listings/new", label: "Sell tickets" });
  }
  const authedSecondaryItems: NavItem[] = [
    { href: "/listings/mine", label: "My listings" },
    { href: "/account", label: "Account" }
  ];

  useEffect(() => {
    const syncAuthState = () => {
      const token = readAuthToken();
      const authed = Boolean(token);
      setIsAuthenticated(authed);
      onAuthChange?.(authed);
      if (!token) {
        setCanSell(false);
        return;
      }
      void getCurrentUser(token)
        .then((response) => setCanSell(response.user.isTrustedSeller))
        .catch((error) => {
          setCanSell(false);
          // Expired/invalid session: drop the stale token so the UI stops looking logged in.
          // Network errors (status 0) keep the token.
          if (error instanceof ApiClientError && error.statusCode === 401) {
            clearAuthToken();
            setIsAuthenticated(false);
            onAuthChange?.(false);
          }
        });
    };

    syncAuthState();
    window.addEventListener("storage", syncAuthState);
    window.addEventListener("focus", syncAuthState);
    return () => {
      window.removeEventListener("storage", syncAuthState);
      window.removeEventListener("focus", syncAuthState);
    };
  }, [onAuthChange]);

  const isAuthRoute = pathname.startsWith("/auth");
  const isHome = pathname === "/";
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const isEvents = isActive("/events");
  const isAccount = isActive("/account");

  function handleLogout() {
    clearAuthToken();
    setIsAuthenticated(false);
    onAuthChange?.(false);
    setCanSell(false);
    router.push("/auth/login");
  }

  function renderDesktopNavLink(item: NavItem) {
    const active = isActive(item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`rounded-[var(--radius-md)] px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] ${
          active
            ? "text-[var(--foreground)]"
            : "text-[var(--muted)] hover:text-[var(--foreground)]"
        }`}
        aria-current={active ? "page" : undefined}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <>
      {/* Desktop — original header (pre-mobile) */}
      <header className="sticky top-0 z-30 hidden border-b border-[var(--border)] bg-[var(--background)]/90 backdrop-blur md:block">
        <div className="page-shell flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex items-center"
          >
            <BrandMark />
          </Link>

          <nav className="flex items-center gap-1">
            {isAuthenticated ? (
              <>
                {authedPrimaryItems.map((item) => renderDesktopNavLink(item))}
                {authedSecondaryItems.map((item) => renderDesktopNavLink(item))}
                <Button variant="ghost" className="ml-1 h-9 px-3" onClick={handleLogout}>
                  Log out
                </Button>
              </>
            ) : (
              <>
                {!isAuthRoute ? (
                  <ButtonLink href="/auth/login" variant="ghost" className="h-9 px-3">
                    Log in
                  </ButtonLink>
                ) : null}
                <ButtonLink href="/auth/register" className="ml-1 h-9 px-3.5">
                  Create account
                </ButtonLink>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Mobile — button header + bottom nav companion */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/95 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
        <div className="mx-auto flex w-[min(1180px,94vw)] items-center justify-between gap-2 px-[3vw] pb-1.5 pt-5">
          <div className="flex min-w-0 items-center gap-1">
            {!isHome ? (
              <Link
                href="/"
                className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-base font-medium text-[var(--muted)] transition-colors hover:text-white"
                aria-label="Back to homepage"
              >
                <span aria-hidden="true">←</span>
              </Link>
            ) : null}
            {!isEvents ? (
              <Link
                href="/"
                className="flex min-h-11 shrink-0 items-center"
              >
                <BrandMark />
              </Link>
            ) : null}
          </div>

          <nav className="flex min-w-0 items-center gap-1.5">
            {isAuthenticated ? (
              <>
                <ButtonLink
                  href="/events"
                  variant={isEvents ? "secondary" : "ghost"}
                  className="h-9 !min-h-9 !px-3 text-xs"
                  aria-current={isEvents ? "page" : undefined}
                >
                  Events
                </ButtonLink>
                <ButtonLink
                  href="/account"
                  variant={isAccount ? "secondary" : "ghost"}
                  className="h-9 !min-h-9 !px-3 text-xs"
                  aria-current={isAccount ? "page" : undefined}
                >
                  Account
                </ButtonLink>
              </>
            ) : !isAuthRoute ? (
              <>
                {!isHome ? (
                  <ButtonLink
                    href="/events"
                    variant={isEvents ? "secondary" : "ghost"}
                    className="h-9 !min-h-9 !px-3 text-xs"
                    aria-current={isEvents ? "page" : undefined}
                  >
                    Events
                  </ButtonLink>
                ) : null}
                <ButtonLink href="/auth/login" variant="ghost" className="h-9 !min-h-9 !px-3 text-xs">
                  Log in
                </ButtonLink>
                <ButtonLink href="/auth/register" className="h-9 !min-h-9 !px-3 text-xs">
                  Sign up
                </ButtonLink>
              </>
            ) : null}
          </nav>
        </div>
      </header>
    </>
  );
}

// Signature monogram, cut from brand/source/monograms/signature-2400.jpg with its #111111
// ground made transparent (artwork otherwise unchanged).
function BrandMark() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/monogram-signature.png" alt="Tix" width={44} height={44} className="h-11 w-11" />
  );
}
