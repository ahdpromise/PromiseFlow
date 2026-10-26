"use client";

import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useLocale } from "@/i18n/locale-provider";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Sidebar } from "@/components/layout/sidebar";
import { UserMenu } from "@/components/layout/user-menu";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";

export function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("sidebar");
  const { locale } = useLocale();
  const isRtl = locale === "ar";

  const [
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
  ] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
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

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}