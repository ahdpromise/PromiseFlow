"use client";

import {
  Activity,
  BarChart3,
  Bot,
  CheckSquare,
  ClipboardCheck,
  FolderKanban,
  LayoutDashboard,
  MailPlus,
  Settings,
  Users,
  Workflow,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

type SidebarProps = {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
};

const navigation = [
  {
    key: "dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    key: "projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    key: "tasks",
    href: "/tasks",
    icon: CheckSquare,
  },
  {
    key: "teams",
    href: "/teams",
    icon: Users,
  },
  {
    key: "workflows",
    href: "/workflows",
    icon: Workflow,
  },
  {
    key: "approvals",
    href: "/approvals",
    icon: ClipboardCheck,
  },
  {
    key: "automations",
    href: "/automations",
    icon: Bot,
  },
  {
    key: "invitations",
    href: "/invitations",
    icon: MailPlus,
  },
  {
    key: "activityAudit",
    href: "/activity-audit",
    icon: Activity,
  },
  {
    key: "reports",
    href: "/reports",
    icon: BarChart3,
  },
] as const;

export function Sidebar({
  isMobileOpen = false,
  onMobileClose = () => {},
}: SidebarProps) {
  const pathname = usePathname();

  const tNavigation =
    useTranslations("navigation");

  const tSidebar =
    useTranslations("sidebar");

  useEffect(() => {
    if (!isMobileOpen) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        onMobileClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    isMobileOpen,
    onMobileClose,
  ]);

  function handleNavigation() {
    if (isMobileOpen) {
      onMobileClose();
    }
  }

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
        <Link
          href="/dashboard"
          onClick={handleNavigation}
          className="flex items-center gap-3"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary font-bold text-white">
            P
          </div>

          <div>
            <p className="font-semibold tracking-tight">
              PromiseFlow
            </p>

            <p className="text-xs text-slate-400">
              {tSidebar("workspace")}
            </p>
          </div>
        </Link>

        <button
          type="button"
          onClick={onMobileClose}
          aria-label={tSidebar(
            "closeNavigation",
          )}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white lg:hidden"
        >
          <X
            size={20}
            strokeWidth={1.8}
          />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {navigation.map((item) => {
          const Icon = item.icon;

          const isActive =
            pathname === item.href ||
            pathname.startsWith(
              `${item.href}/`,
            );

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={
                handleNavigation
              }
              className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                isActive
                  ? "bg-primary text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon
                size={18}
                strokeWidth={1.8}
              />

              {tNavigation(item.key)}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <Link
          href="/settings"
          onClick={handleNavigation}
          className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
            pathname.startsWith(
              "/settings",
            )
              ? "bg-primary text-white"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <Settings
            size={18}
            strokeWidth={1.8}
          />

          {tNavigation("settings")}
        </Link>
      </div>
    </>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-800 bg-slate-950 text-white lg:flex">
        {sidebarContent}
      </aside>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label={tSidebar(
              "closeNavigation",
            )}
            onClick={onMobileClose}
            className="absolute inset-0 bg-black/50"
          />

          <aside className="absolute inset-y-0 left-0 flex w-[min(85vw,320px)] flex-col border-r border-slate-800 bg-slate-950 text-white shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      ) : null}
    </>
  );
}