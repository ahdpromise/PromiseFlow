
"use client";

import { Lock, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "@/i18n/locale-provider";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

type SidebarProps = {
  isDemo?: boolean;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
};

type AnimatedIconName =
  | "dashboard"
  | "projects"
  | "tasks"
  | "teams"
  | "workflows"
  | "approvals"
  | "automations"
  | "invitations"
  | "activityAudit"
  | "reports"
  | "settings";

const navigation = [
  { key: "dashboard", href: "/dashboard" },
  { key: "projects", href: "/projects" },
  { key: "tasks", href: "/tasks" },
  { key: "teams", href: "/teams" },
  { key: "workflows", href: "/workflows" },
  { key: "approvals", href: "/approvals" },
  { key: "automations", href: "/automations" },
  { key: "invitations", href: "/invitations" },
  { key: "activityAudit", href: "/activity-audit" },
  { key: "reports", href: "/reports" },
] as const;

function IconFrame({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 overflow-visible"
    >
      {children}
    </svg>
  );
}

function AnimatedSidebarIcon({
  name,
}: {
  name: AnimatedIconName;
}) {
  switch (name) {
    case "dashboard":
      return (
        <IconFrame>
          <rect
            className="pf-dashboard-square pf-dashboard-1"
            x="3"
            y="3"
            width="7"
            height="7"
            rx="1"
          />
          <rect
            className="pf-dashboard-square pf-dashboard-2"
            x="14"
            y="3"
            width="7"
            height="7"
            rx="1"
          />
          <rect
            className="pf-dashboard-square pf-dashboard-3"
            x="3"
            y="14"
            width="7"
            height="7"
            rx="1"
          />
          <rect
            className="pf-dashboard-square pf-dashboard-4"
            x="14"
            y="14"
            width="7"
            height="7"
            rx="1"
          />
        </IconFrame>
      );

    case "projects":
      return (
        <IconFrame>
          <path d="M3 7V5.5A2.5 2.5 0 0 1 5.5 3H10l2 3h6.5A2.5 2.5 0 0 1 21 8.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
          <g className="pf-project-file">
            <rect
              x="9"
              y="10.5"
              width="6"
              height="7"
              rx=".6"
            />
            <path d="M11 13h2M11 15h2" />
          </g>
        </IconFrame>
      );

    case "tasks":
      return (
        <IconFrame>
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="2"
          />
          <path
            className="pf-check-draw"
            d="m7 12 3.5 3.5L17 8"
          />
        </IconFrame>
      );

    case "teams":
      return (
        <IconFrame>
          <g className="pf-team-left">
            <path d="M5 19v-1a4 4 0 0 1 4-4" />
            <path d="M7.5 7.5a3 3 0 0 0 0 5" />
          </g>

          <g className="pf-team-center">
            <circle cx="12" cy="8" r="3" />
            <path d="M5.5 20v-2a6.5 6.5 0 0 1 13 0v2" />
          </g>

          <g className="pf-team-right">
            <path d="M19 19v-1a4 4 0 0 0-4-4" />
            <path d="M16.5 7.5a3 3 0 0 1 0 5" />
          </g>
        </IconFrame>
      );

    case "workflows":
      return (
        <IconFrame>
          <rect
            x="3"
            y="3"
            width="6"
            height="6"
            rx="1.5"
          />
          <rect
            x="15"
            y="15"
            width="6"
            height="6"
            rx="1.5"
          />
          <path
            className="pf-workflow-line"
            d="M6 9v5a4 4 0 0 0 4 4h5"
          />
          <circle
            className="pf-workflow-node"
            cx="10"
            cy="18"
            r="1"
            fill="currentColor"
            stroke="none"
          />
        </IconFrame>
      );

    case "approvals":
      return (
        <IconFrame>
          <rect
            x="5"
            y="4"
            width="14"
            height="17"
            rx="2"
          />
          <path d="M9 4.5V3h6v1.5" />
          <path
            className="pf-approval-check"
            d="m9 13 2.5 2.5L16 10"
          />
        </IconFrame>
      );

    case "automations":
      return (
        <IconFrame>
          <g className="pf-automation-robot">
            <rect
              x="3"
              y="8"
              width="18"
              height="12"
              rx="3"
            />
            <path d="M12 5v3" />
            <circle cx="8" cy="13" r="1" />
            <circle cx="16" cy="13" r="1" />
            <path d="M9 17h6" />
          </g>

          <g className="pf-automation-gear">
            <path d="M12 1.5 13 3l1.8.4 1.5-.8 1.5 1.5-.8 1.5.4 1.8L19 8.5l-1.6 1.1-.4 1.8.8 1.5-1.5 1.5-1.5-.8-1.8.4-1 1.5-1-1.5-1.8-.4-1.5.8-1.5-1.5.8-1.5-.4-1.8L5 8.5l1.6-1.1.4-1.8-.8-1.5 1.5-1.5 1.5.8L11 3Z" />
            <circle cx="12" cy="8.5" r="2.2" />
          </g>
        </IconFrame>
      );

    case "invitations":
      return (
        <IconFrame>
          <g className="pf-invitation-envelope">
            <rect
              x="3"
              y="5"
              width="18"
              height="14"
              rx="2"
            />
            <path d="m3 7 9 6 9-6" />
          </g>

          <g className="pf-invitation-plus">
            <circle
              cx="18"
              cy="18"
              r="4"
              fill="#020617"
            />
            <path d="M18 16v4M16 18h4" />
          </g>
        </IconFrame>
      );

    case "activityAudit":
      return (
        <IconFrame>
          <path
            className="pf-activity-line"
            d="M2 12h4l3-8 5 16 3-8h5"
          />
        </IconFrame>
      );

    case "reports":
      return (
        <IconFrame>
          <path d="M3 3v18h18" />
          <rect
            className="pf-report-bar pf-report-1"
            x="6"
            y="12"
            width="3"
            height="6"
            rx=".5"
          />
          <rect
            className="pf-report-bar pf-report-2"
            x="11"
            y="8"
            width="3"
            height="10"
            rx=".5"
          />
          <rect
            className="pf-report-bar pf-report-3"
            x="16"
            y="5"
            width="3"
            height="13"
            rx=".5"
          />
        </IconFrame>
      );

    case "settings":
      return (
        <IconFrame>
          <g className="pf-settings-gear">
            <path d="M12 2.5 14 3l.7 2 2 .9 2-.5 1.5 1.6-.6 2 .9 2 2 .8v2.2l-2 .8-.9 2 .6 2-1.5 1.6-2-.5-2 .9-.7 2-2 .5-2-.5-.7-2-2-.9-2 .5-1.5-1.6.6-2-.9-2-2-.8v-2.2l2-.8.9-2-.6-2L5.3 5.4l2 .5 2-.9.7-2Z" />
            <circle cx="12" cy="12" r="3" />
          </g>
        </IconFrame>
      );
  }
}

export function Sidebar({
  isDemo = false,
  isMobileOpen = false,
  onMobileClose = () => {},
}: SidebarProps) {
  const pathname = usePathname();
  const tDemo = useTranslations("demo");
  const { locale } = useLocale();
  const isRtl = locale === "ar";

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
  }, [isMobileOpen, onMobileClose]);

  function handleNavigation() {
    if (isMobileOpen) {
      onMobileClose();
    }
  }

  function renderSidebarContent() {
    return (
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
            const isLocked = isDemo && ![
              "dashboard",
              "projects",
              "tasks",
              "teams",
              "workflows",
              "reports",
            ].includes(item.key);
            const isActive =
              pathname === item.href ||
              pathname.startsWith(
                `${item.href}/`,
              );

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavigation}
                className={`pf-sidebar-link flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-primary text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <AnimatedSidebarIcon
                  name={item.key}
                />

                <span className="min-w-0 flex-1">
                  {tNavigation(item.key)}
                </span>

                {isLocked ? (
                  <span title={tDemo("fullVersionTitle")}>
                    <Lock
                      size={14}
                      className="shrink-0 opacity-70"
                      aria-label={tDemo("fullVersionTitle")}
                    />
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-3">
          <Link
            href="/settings"
            onClick={handleNavigation}
            className={`pf-sidebar-link flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
              pathname.startsWith(
                "/settings",
              )
                ? "bg-primary text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <AnimatedSidebarIcon
              name="settings"
            />

            <span className="min-w-0 flex-1">
              {tNavigation("settings")}
            </span>

            {isDemo ? (
              <span title={tDemo("fullVersionTitle")}>
                <Lock
                  size={14}
                  className="shrink-0 opacity-70"
                  aria-label={tDemo("fullVersionTitle")}
                />
              </span>
            ) : null}
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <style jsx global>{`
        .pf-sidebar-link svg {
          flex-shrink: 0;
        }

        .pf-dashboard-square,
        .pf-project-file,
        .pf-team-left,
        .pf-team-center,
        .pf-team-right,
        .pf-workflow-node,
        .pf-report-bar,
        .pf-automation-robot,
        .pf-automation-gear,
        .pf-settings-gear,
        .pf-invitation-envelope,
        .pf-invitation-plus {
          transform-box: fill-box;
          transform-origin: center;
        }

        .pf-check-draw,
        .pf-approval-check,
        .pf-workflow-line,
        .pf-activity-line {
          stroke-dasharray: 50;
          stroke-dashoffset: 0;
        }

        @keyframes pf-square-pop {
          0%, 100% {
            transform: scale(1);
          }
          45% {
            transform: scale(0.65);
          }
          70% {
            transform: scale(1.12);
          }
        }

        @keyframes pf-file-slide {
          0%, 100% {
            transform: translateY(0);
          }
          35% {
            transform: translateY(-3px);
          }
          75% {
            transform: translateY(1px);
          }
        }

        @keyframes pf-check-draw-animation {
          0% {
            stroke-dashoffset: 50;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        @keyframes pf-team-move-left {
          0%, 100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(-2px);
          }
        }

        @keyframes pf-team-move-right {
          0%, 100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(2px);
          }
        }

        @keyframes pf-team-move-center {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
        }

        @keyframes pf-workflow-draw {
          0% {
            stroke-dashoffset: 50;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        @keyframes pf-node-pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.8);
            opacity: 0.5;
          }
        }

        @keyframes pf-gear-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pf-robot-bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(1.5px);
          }
        }

        @keyframes pf-envelope-slide {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
        }

        @keyframes pf-plus-pop {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.25);
          }
        }

        @keyframes pf-activity-draw {
          0% {
            stroke-dashoffset: 50;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }

        @keyframes pf-bar-rise {
          0%, 100% {
            transform: scaleY(1);
          }
          50% {
            transform: scaleY(0.55);
          }
        }

        @media (hover: hover) and (pointer: fine) {
          .pf-sidebar-link:hover .pf-dashboard-square {
            animation: pf-square-pop 650ms ease-in-out both;
          }

          .pf-sidebar-link:hover .pf-dashboard-1 {
            animation-delay: 0ms;
          }

          .pf-sidebar-link:hover .pf-dashboard-2 {
            animation-delay: 100ms;
          }

          .pf-sidebar-link:hover .pf-dashboard-3 {
            animation-delay: 200ms;
          }

          .pf-sidebar-link:hover .pf-dashboard-4 {
            animation-delay: 300ms;
          }

          .pf-sidebar-link:hover .pf-project-file {
            animation: pf-file-slide 650ms ease-in-out;
          }

          .pf-sidebar-link:hover .pf-check-draw {
            animation: pf-check-draw-animation 1350ms ease-out both;
          }

          .pf-sidebar-link:hover .pf-team-left {
            animation: pf-team-move-left 1450ms ease-in-out;
          }

          .pf-sidebar-link:hover .pf-team-center {
            animation: pf-team-move-center 1450ms ease-in-out;
          }

          .pf-sidebar-link:hover .pf-team-right {
            animation: pf-team-move-right 1450ms ease-in-out;
          }

          .pf-sidebar-link:hover .pf-workflow-line {
            animation: pf-workflow-draw 2800ms ease-out both;
          }

          .pf-sidebar-link:hover .pf-workflow-node {
            animation: pf-node-pulse 2800ms ease-in-out;
          }

          .pf-sidebar-link:hover .pf-approval-check {
            animation: pf-check-draw-animation 2700ms ease-out both;
          }

          .pf-sidebar-link:hover .pf-automation-gear {
            animation: pf-gear-spin 1500ms ease-in-out both;
          }

          .pf-sidebar-link:hover .pf-automation-robot {
            animation: pf-robot-bounce 1500ms ease-in-out;
          }

          .pf-sidebar-link:hover .pf-invitation-envelope {
            animation: pf-envelope-slide 650ms ease-in-out;
          }

          .pf-sidebar-link:hover .pf-invitation-plus {
            animation: pf-plus-pop 650ms ease-in-out;
          }

          .pf-sidebar-link:hover .pf-activity-line {
            animation: pf-activity-draw 750ms ease-out both;
          }

          .pf-sidebar-link:hover .pf-report-bar {
            animation: pf-bar-rise 700ms ease-in-out;
          }

          .pf-sidebar-link:hover .pf-report-1 {
            animation-delay: 0ms;
          }

          .pf-sidebar-link:hover .pf-report-2 {
            animation-delay: 100ms;
          }

          .pf-sidebar-link:hover .pf-report-3 {
            animation-delay: 200ms;
          }

          .pf-sidebar-link:hover .pf-settings-gear {
            animation: pf-gear-spin 750ms ease-in-out;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .pf-sidebar-link svg *,
          .pf-sidebar-link svg {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <aside className={`fixed inset-y-0 z-40 hidden w-64 flex-col border-slate-800 bg-slate-950 text-white lg:flex ${isRtl ? "right-0 border-l" : "left-0 border-r"}`}>
        {renderSidebarContent()}
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

          <aside className={`absolute inset-y-0 flex w-[min(85vw,320px)] flex-col border-slate-800 bg-slate-950 text-white shadow-2xl ${isRtl ? "right-0 border-l" : "left-0 border-r"}`}>
            {renderSidebarContent()}
          </aside>
        </div>
      ) : null}
    </>
  );
}
