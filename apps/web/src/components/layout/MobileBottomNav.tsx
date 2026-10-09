"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAuthToken } from "@/lib/auth/token-storage";

interface MobileBottomNavProps {
  isAuthenticated: boolean;
  onAuthChange?: (isAuthenticated: boolean) => void;
}

export function MobileBottomNav({ isAuthenticated, onAuthChange }: MobileBottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthRoute = pathname.startsWith("/auth");

  if (isAuthRoute) {
    return null;
  }

  const isHome = pathname === "/";
  const isEvents = pathname === "/events" || pathname.startsWith("/events/");
  const isDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isAccount = pathname === "/account" || pathname.startsWith("/account/");
  const isLogin = pathname.startsWith("/auth/login");
  const isRegister = pathname.startsWith("/auth/register");

  const tabClass = (active: boolean) =>
    `flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-md)] px-1 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition active:scale-95 ${
      active
        ? "bg-[rgba(255,46,168,0.14)] text-white"
        : "text-[var(--silver)] hover:text-white"
    }`;

  function handleLogout() {
    clearAuthToken();
    onAuthChange?.(false);
    router.push("/auth/login");
  }

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[rgba(7,6,15,0.94)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around gap-1 px-2 py-2">
        <Link href="/" className={tabClass(isHome)} aria-current={isHome ? "page" : undefined}>
          Home
        </Link>
        <Link
          href="/events"
          className={tabClass(isEvents)}
          aria-current={isEvents ? "page" : undefined}
        >
          Events
        </Link>
        {isAuthenticated ? (
          <>
            <Link
              href="/dashboard"
              className={tabClass(isDashboard)}
              aria-current={isDashboard ? "page" : undefined}
            >
              Dashboard
            </Link>
            <Link
              href="/account"
              className={tabClass(isAccount)}
              aria-current={isAccount ? "page" : undefined}
            >
              Account
            </Link>
            <button type="button" className={tabClass(false)} onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <>
            <Link
              href="/auth/login"
              className={tabClass(isLogin)}
              aria-current={isLogin ? "page" : undefined}
            >
              Log in
            </Link>
            <Link
              href="/auth/register"
              className={tabClass(isRegister)}
              aria-current={isRegister ? "page" : undefined}
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
