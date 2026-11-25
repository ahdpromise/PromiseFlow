"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { register } from "@/services/auth.service";

export default function VerifyEmailPage() {
  const router = useRouter();
  const t = useTranslations("register");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] =
    useState(false);

  const [error, setError] = useState<
    | "errors.passwordMismatch"
    | "errors.registration"
    | "errors.invalidName"
    | "verification.invalidToken"
    | "verification.passwordLength"
    | null
  >(null);

  const inputClass =
    "h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isLoading || isRegistered) return;

    setError(null);

    const verificationToken =
      new URLSearchParams(
        window.location.hash.slice(1),
      ).get("token") ?? "";

    if (!/^[0-9a-f]{64}$/.test(verificationToken)) {
      setError("verification.invalidToken");
      return;
    }

    if (
      firstName.trim().length < 2 ||
      lastName.trim().length < 2
    ) {
      setError("errors.invalidName");
      return;
    }

    if (password !== confirmPassword) {
      setError("errors.passwordMismatch");
      return;
    }

    if (
      password.length < 8 ||
      new TextEncoder().encode(password).length > 72
    ) {
      setError("verification.passwordLength");
      return;
    }

    setIsLoading(true);

    try {
      await register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        verification_token: verificationToken,
      });

      setPassword("");
      setConfirmPassword("");

      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname +
          window.location.search,
      );

      setIsRegistered(true);
    } catch {
      setError("errors.registration");
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
          {t("verification.completeTitle")}
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {t("verification.completeDescription")}
        </p>
      </div>

      {isRegistered ? (
        <div className="space-y-5">
          <div
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            {t("success")}
          </div>

          <p className="text-sm leading-6 text-muted-foreground">
            {t("verification.invitationHint")}
          </p>

          <button
            type="button"
            onClick={() => router.replace("/login")}
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="firstName"
                  className="mb-2 block text-sm font-medium"
                >
                  {t("firstName")}
                </label>

                <input
                  id="firstName"
                  name="firstName"
                  autoComplete="given-name"
                  required
                  minLength={2}
                  maxLength={100}
                  disabled={isLoading}
                  value={firstName}
                  onChange={(event) =>
                    setFirstName(event.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="lastName"
                  className="mb-2 block text-sm font-medium"
                >
                  {t("lastName")}
                </label>

                <input
                  id="lastName"
                  name="lastName"
                  autoComplete="family-name"
                  required
                  minLength={2}
                  maxLength={100}
                  disabled={isLoading}
                  value={lastName}
                  onChange={(event) =>
                    setLastName(event.target.value)
                  }
                  className={inputClass}
                />
              </div>
            </div>

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

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium"
              >
                {t("password")}
              </label>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                disabled={isLoading}
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                className={inputClass}
              />

              <p className="mt-2 text-xs text-muted-foreground">
                {t("passwordHint")}
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-medium"
              >
                {t("confirmPassword")}
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                disabled={isLoading}
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                className={inputClass}
              />
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
              >
                {t(error)}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading
                ? t("registering")
                : t("submit")}
            </button>
          </form>

          <p className="mt-8 text-center text-sm">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => router.replace("/register")}
              className="font-medium text-primary hover:underline"
            >
              {t("verification.newLink")}
            </button>
          </p>
        </>
      )}
    </div>
  );
}