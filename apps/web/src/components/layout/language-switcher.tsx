"use client";

import { Languages } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  type Locale,
  useLocale,
} from "@/i18n/locale-provider";

export function LanguageSwitcher() {
  const t = useTranslations("language");

  const {
    locale,
    setLocale,
  } = useLocale();

  function handleChange(
    event: React.ChangeEvent<HTMLSelectElement>,
  ) {
    setLocale(
      event.target.value as Locale,
    );
  }

  return (
    <div className="relative hidden sm:block">
      <Languages
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />

      <select
        value={locale}
        onChange={handleChange}
        aria-label={t("label")}
        className="h-9 appearance-none rounded-lg border border-border bg-surface pl-9 pr-8 text-sm font-medium outline-none transition hover:bg-surface-muted focus:border-primary"
      >
        <option value="en">
          EN
        </option>

        <option value="de">
          DE
        </option>
      </select>
    </div>
  );
}