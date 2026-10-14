"use client";

import {
  ChevronDown,
  LogOut,
  Settings,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  clearAuthSession,
} from "@/lib/auth-storage";
import type { AuthUser } from "@/services/auth.service";

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return sessionStorage.getItem(
    "promiseflow_user",
  );
}

function getServerSnapshot() {
  return null;
}

export function UserMenu() {
  const router = useRouter();
  const t = useTranslations("userMenu");

  const containerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const [isOpen, setIsOpen] =
    useState(false);

  const storedUser = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  const user = useMemo<AuthUser | null>(() => {
    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(
        storedUser,
      ) as AuthUser;
    } catch {
      return null;
    }
  }, [storedUser]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    function handlePointerDown(
      event: PointerEvent,
    ) {
      const target =
        event.target as Node;

      if (
        containerRef.current &&
        !containerRef.current.contains(
          target,
        )
      ) {
        setIsOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );
    };
  }, [isOpen]);

  const initials = user
    ? `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`
    : "PF";

  function handleSettings() {
    setIsOpen(false);
    router.push("/settings");
  }

  function handleLogout() {
    clearAuthSession();
    setIsOpen(false);
    router.replace("/login");
  }

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <button
        type="button"
        onClick={() =>
          setIsOpen(
            (current) => !current,
          )
        }
        className="ml-1 flex items-center gap-2 rounded-lg p-1.5 pr-2 transition hover:bg-surface-muted"
        aria-label={t("menu")}
        aria-expanded={isOpen}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
          {initials}
        </span>

        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium leading-4">
            {user?.first_name ?? t("user")}
          </span>

          <span className="mt-0.5 block text-xs text-muted-foreground">
            {t("member")}
          </span>
        </span>

        <ChevronDown
          size={16}
          className={`hidden text-muted-foreground transition-transform sm:block ${
            isOpen
              ? "rotate-180"
              : ""
          }`}
        />
      </button>

      {isOpen ? (
        <div className="fixed right-4 top-16 z-50 w-56 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-surface shadow-lg sm:absolute sm:right-0 sm:top-12">
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-medium">
              {user
                ? `${user.first_name} ${user.last_name}`
                : t("user")}
            </p>

            <p className="mt-1 truncate text-xs text-muted-foreground">
              {user?.email ?? ""}
            </p>
          </div>

          <div className="p-1.5">
            <button
              type="button"
              onClick={handleSettings}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-surface-muted"
            >
              <Settings
                size={17}
                strokeWidth={1.8}
              />

              {t("settings")}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
            >
              <LogOut
                size={17}
                strokeWidth={1.8}
              />

              {t("logout")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}