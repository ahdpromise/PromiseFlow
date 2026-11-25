"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { requestEmailVerification } from "@/services/auth.service";

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations("register");

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState(false);

  const inputClass =
    "h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isLoading) return;

    setError(false);
    setIsLoading(true);

    try {
      await requestEmailVerification({
        email: email.trim().toLowerCase(),
      });

      setIsSent(true);
    } catch {
      setError(true);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <LanguageSwitcher />
      </div>

      <div className="mb-8">
        <p className="mb-2 text-sm font-medium text-primary">
          PromiseFlow
        </p>

        <h1 className="text-3xl font-semibold tracking-tight">
          {t("title")}
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {t("verification.description")}
        </p>
      </div>

      {isSent ? (
        <div className="space-y-5">
          <div
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            {t("verification.sent")}
          </div>

          <button
            type="button"
            onClick={() => {
              setIsSent(false);
              setError(false);
            }}
            className="flex h-11 w-full items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold transition hover:bg-muted"
          >
            {t("verification.tryAgain")}
          </button>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            {t("signIn")}
          </button>
        </div>
      ) : (
        <>
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium"
              >
                {t("email")}
              </label>

              <input
                id="email"
                name="email"
                type="email"
                dir="ltr"
                autoComplete="email"
                required
                maxLength={255}
                disabled={isLoading}
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                className={inputClass}
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
              >
                {t("verification.requestError")}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading
                ? t("verification.sending")
                : t("verification.send")}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {t("alreadyHaveAccount")}{" "}

            <button
              type="button"
              disabled={isLoading}
              onClick={() => router.push("/login")}
              className="font-medium text-primary hover:underline"
            >
              {t("signIn")}
            </button>
          </p>
        </>
      )}
    </div>
  );
}