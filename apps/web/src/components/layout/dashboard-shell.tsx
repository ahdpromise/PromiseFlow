"use client";

import { LockKeyhole, Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  clearAuthSession,
  getDemoSessionExpiresAt,
  isDemoSession,
} from "@/lib/auth-storage";
import { clearWorkspaceId } from "@/lib/workspace-storage";
import { useLocale } from "@/i18n/locale-provider";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Sidebar } from "@/components/layout/sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";

const demoRoutes = [
  "/dashboard",
  "/projects",
  "/tasks",
  "/teams",
  "/workflows",
  "/reports",
];

function subscribeDemoSession() {
  return () => {};
}

function getServerDemoSnapshot() {
  return false;
}

export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("sidebar");
  const tDemo = useTranslations("demo");
  const router = useRouter();
  const pathname = usePathname();

  const isDemo = useSyncExternalStore(
    subscribeDemoSession,
    isDemoSession,
    getServerDemoSnapshot,
  );

  useEffect(() => {
    if (!isDemo) {
      return;
    }

    const expiresAt = getDemoSessionExpiresAt();

    if (expiresAt === null) {
      return;
    }

    let expired = false;

    function checkExpiration() {
      if (
        expired ||
        !isDemoSession() ||
        expiresAt === null ||
        Date.now() < expiresAt
      ) {
        return;
      }

      expired = true;

      clearAuthSession();
      clearWorkspaceId();

      sessionStorage.removeItem(
        "promiseflow_pending_invitation_token",
      );

      window.location.replace("/login?demo=expired");
    }

    const timeout = window.setTimeout(
      checkExpiration,
      Math.max(0, expiresAt - Date.now()),
    );

    window.addEventListener("focus", checkExpiration);
    document.addEventListener(
      "visibilitychange",
      checkExpiration,
    );

    checkExpiration();

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("focus", checkExpiration);
      document.removeEventListener(
        "visibilitychange",
        checkExpiration,
      );
    };
  }, [isDemo]);

  const isDemoRouteAllowed = demoRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(route + "/"),
  );

  function exitDemo() {
    clearAuthSession();
    clearWorkspaceId();

    sessionStorage.removeItem(
      "promiseflow_pending_invitation_token",
    );

    router.replace("/login");
  }
  const { locale } = useLocale();
  const isRtl = locale === "ar";

  const [
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
  ] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        isDemo={isDemo}
        isMobileOpen={
          isMobileSidebarOpen
        }
        onMobileClose={() =>
          setIsMobileSidebarOpen(false)
        }
      />

      <div className={isRtl ? "lg:pr-64" : "lg:pl-64"}>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-surface/95 px-3 backdrop-blur sm:px-4 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() =>
                setIsMobileSidebarOpen(
                  true,
                )
              }
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-surface-muted hover:text-foreground lg:hidden"
              aria-label={t(
                "openNavigation",
              )}
            >
              <Menu
                size={21}
                strokeWidth={1.8}
              />
            </button>

            <div className="min-w-0">
              <WorkspaceSwitcher />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <LanguageSwitcher />
            <NotificationBell />
            <UserMenu />
          </div>
        </header>

        {isDemo ? (
          <section className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 sm:px-6 lg:px-8">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {tDemo("title")}
              </p>
              <p className="mt-1 text-xs leading-5">
                {tDemo("description")}
              </p>
              <p className="mt-1 text-xs">
                {tDemo("session")}
              </p>
            </div>

            <button
              type="button"
              onClick={exitDemo}
              className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium transition hover:bg-amber-100"
            >
              {tDemo("exit")}
            </button>
          </section>
        ) : null}

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]">
            {isDemo && !isDemoRouteAllowed ? (
              <div className="flex min-h-[420px] items-center justify-center">
                <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-8 text-center shadow-sm sm:p-12">
                  <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
                    <LockKeyhole size={30} strokeWidth={1.6} />
                  </div>

                  <h1 className="text-xl font-semibold text-foreground sm:text-2xl">
                    {tDemo("fullVersionTitle")}
                  </h1>

                  <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-muted-foreground">
                    {tDemo("fullVersionDescription")}
                  </p>

                  <button
                    type="button"
                    onClick={() => router.replace("/dashboard")}
                    className="mt-8 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                  >
                    {tDemo("backToDashboard")}
                  </button>
                </div>
              </div>
            ) : (
              children
            )}
          </div>
        </main>
      </div>
    </div>
  );
}