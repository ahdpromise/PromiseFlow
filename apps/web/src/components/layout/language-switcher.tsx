"use client";

import { Languages } from "lucide-react";
import { useTranslations } from "next-intl";

import { useLocale } from "@/i18n/locale-provider";

export function LanguageSwitcher() {
  const t = useTranslations("language");

  const { locale, setLocale } = useLocale();

  function handleChange(
    event: React.ChangeEvent<HTMLSelectElement>,
  ) {
    const nextLocale = event.target.value;

    if (
      nextLocale === "en" ||
      nextLocale === "de" ||
      nextLocale === "es" ||
      nextLocale === "ar"
    ) {
      setLocale(nextLocale);
    }
  }

  return (
    <div className="relative shrink-0" dir="ltr">
      <Languages
        size={16}
        className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground sm:left-3"
      />

      <select
        value={locale}
        onChange={handleChange}
        aria-label={t("label")}
        className="h-9 w-[58px] appearance-none rounded-lg border border-border bg-surface pl-7 pr-1 text-xs font-medium outline-none transition hover:bg-surface-muted focus:border-primary sm:w-auto sm:pl-9 sm:pr-8 sm:text-sm"
      >
        <option value="en">EN</option>
        <option value="de">DE</option>
        <option value="es">ES</option>
        <option value="ar">AR</option>
      </select>
    </div>
  );
}