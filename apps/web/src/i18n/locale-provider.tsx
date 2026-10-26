"use client";

import { NextIntlClientProvider } from "next-intl";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import arMessages from "../../messages/ar.json";
import deMessages from "../../messages/de.json";
import enMessages from "../../messages/en.json";
import esMessages from "../../messages/es.json";

export type Locale = "en" | "de" | "es" | "ar";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const STORAGE_KEY = "promiseflow_locale";

const messages = {
  en: enMessages,
  de: deMessages,
  es: esMessages,
  ar: arMessages,
};

function getDirection(locale: Locale) {
  return locale === "ar" ? "rtl" : "ltr";
}

const LocaleContext =
  createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] =
    useState<Locale>("en");

  useEffect(() => {
    const storedLocale =
      localStorage.getItem(STORAGE_KEY);

    if (
      storedLocale !== "en" &&
      storedLocale !== "de" &&
      storedLocale !== "es" &&
      storedLocale !== "ar"
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setLocaleState(storedLocale);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir =
      getDirection(locale);
  }, [locale]);

  function setLocale(nextLocale: Locale) {
    setLocaleState(nextLocale);
    localStorage.setItem(
      STORAGE_KEY,
      nextLocale,
    );
  }

  const contextValue = useMemo(
    () => ({
      locale,
      setLocale,
    }),
    [locale],
  );

  return (
    <LocaleContext.Provider value={contextValue}>
      <NextIntlClientProvider
        locale={locale}
        messages={messages[locale]}
        timeZone="Europe/Berlin"
      >
        {children}
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error(
      "useLocale must be used inside LocaleProvider",
    );
  }

  return context;
}