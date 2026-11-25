"use client";

import {
  useSyncExternalStore,
  type ComponentProps,
} from "react";
import { useTranslations } from "next-intl";
import { isDemoSession } from "@/lib/auth-storage";

function subscribe() {
  return () => {};
}

function getServerSnapshot() {
  return false;
}

function useDemoRestriction() {
  return useSyncExternalStore(
    subscribe,
    isDemoSession,
    getServerSnapshot,
  );
}

export function DemoActionButton({
  disabled,
  title,
  className,
  ...props
}: ComponentProps<"button">) {
  const isDemo = useDemoRestriction();
  const t = useTranslations("demo");

  return (
    <button
      {...props}
      disabled={isDemo || disabled}
      title={isDemo ? t("actionRestricted") : title}
      className={
        isDemo
          ? [className, "cursor-not-allowed opacity-50"].filter(Boolean).join(" ")
          : className
      }
    />
  );
}

export function DemoInput({
  disabled,
  title,
  ...props
}: ComponentProps<"input">) {
  const isDemo = useDemoRestriction();
  const t = useTranslations("demo");

  return (
    <input
      {...props}
      disabled={isDemo || disabled}
      title={isDemo ? t("actionRestricted") : title}
    />
  );
}

export function DemoTextarea({
  disabled,
  title,
  ...props
}: ComponentProps<"textarea">) {
  const isDemo = useDemoRestriction();
  const t = useTranslations("demo");

  return (
    <textarea
      {...props}
      disabled={isDemo || disabled}
      title={isDemo ? t("actionRestricted") : title}
    />
  );
}

export function DemoSelect({
  disabled,
  title,
  ...props
}: ComponentProps<"select">) {
  const isDemo = useDemoRestriction();
  const t = useTranslations("demo");

  return (
    <select
      {...props}
      disabled={isDemo || disabled}
      title={isDemo ? t("actionRestricted") : title}
    />
  );
}
