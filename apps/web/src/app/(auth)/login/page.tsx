"use client";

import {
  FormEvent,
  useState,
} from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { saveAuthSession } from "@/lib/auth-storage";
import { login } from "@/services/auth.service";

type ErrorMessageKey =
  | "errors.signIn";

const PENDING_INVITATION_TOKEN_KEY =
  "promiseflow_pending_invitation_token";

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("login");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    errorMessageKey,
    setErrorMessageKey,
  ] = useState<ErrorMessageKey | null>(
    null,
  );

  const [isLoading, setIsLoading] =
    useState(false);

  const errorMessage =
    errorMessageKey
      ? t(errorMessageKey)
      : "";

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessageKey(null);
    setIsLoading(true);

    try {
      const result = await login({
        email,
        password,
      });

      saveAuthSession(
        result.access_token,
        result.user,
      );

      const pendingInvitationToken =
        sessionStorage.getItem(
          PENDING_INVITATION_TOKEN_KEY,
        );

      if (pendingInvitationToken) {
        router.push(
          `/invitations/accept?token=${encodeURIComponent(
            pendingInvitationToken,
          )}`,
        );
        return;
      }

      router.push("/dashboard");
    } catch {
      setErrorMessageKey(
        "errors.signIn",
      );
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
          {t("welcomeBack")}
        </p>

        <h1 className="text-3xl font-semibold tracking-tight">
          {t("title")}
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium"
          >
            {t("email.label")}
          </label>

          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={isLoading}
            value={email}
            onChange={(event) =>
              setEmail(
                event.target.value,
              )
            }
            placeholder={t(
              "email.placeholder",
            )}
            className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-sm font-medium"
            >
              {t("password.label")}
            </label>

            <button
              type="button"
              className="text-sm font-medium text-primary hover:underline"
            >
              {t("forgotPassword")}
            </button>
          </div>

          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={isLoading}
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value,
              )
            }
            placeholder={t(
              "password.placeholder",
            )}
            className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>

        {errorMessage ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isLoading}
          className="flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading
            ? t("signingIn")
            : t("signIn")}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {t("newToPromiseFlow")}{" "}
        <button
          type="button"
          className="font-medium text-primary hover:underline"
        >
          {t("createAccount")}
        </button>
      </p>
    </div>
  );
}