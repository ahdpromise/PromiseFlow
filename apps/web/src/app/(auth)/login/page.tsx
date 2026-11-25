"use client";

import {
  FormEvent,
  useState,
  useSyncExternalStore,
} from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { saveAuthSession } from "@/lib/auth-storage";
import { login, demoLogin } from "@/services/auth.service";
import { clearWorkspaceId } from "@/lib/workspace-storage";

type ErrorMessageKey =
  | "errors.signIn"
  | "demo.error";

const PENDING_INVITATION_TOKEN_KEY =
  "promiseflow_pending_invitation_token";

function subscribeToExpirationNotice() {
  return () => {};
}

function getExpirationNotice() {
  return new URLSearchParams(
    window.location.search,
  ).get("demo") === "expired";
}

function getServerExpirationNotice() {
  return false;
}

export default function LoginPage() {
  const router = useRouter();
  const t = useTranslations("login");
  const tDemo = useTranslations("demo");

  const showExpirationNotice = useSyncExternalStore(
    subscribeToExpirationNotice,
    getExpirationNotice,
    getServerExpirationNotice,
  );

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

  const [isDemoLoading, setIsDemoLoading] =
    useState(false);

  const errorMessage =
    errorMessageKey
      ? t(errorMessageKey)
      : "";

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isLoading || isDemoLoading) {
      return;
    }

    setErrorMessageKey(null);
    setIsLoading(true);

    try {
      const result = await login({
        email,
        password,
      });

      clearWorkspaceId();

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

  async function handleDemoLogin() {
    if (isLoading || isDemoLoading) {
      return;
    }

    setErrorMessageKey(null);
    setIsDemoLoading(true);

    try {
      const result = await demoLogin();

      if (
        result.user.email.trim().toLowerCase() !==
        "demo@promiseflow.invalid"
      ) {
        throw new Error("Invalid demo identity");
      }

      clearWorkspaceId();

      sessionStorage.removeItem(
        PENDING_INVITATION_TOKEN_KEY,
      );

      saveAuthSession(
        result.access_token,
        result.user,
      );

      setPassword("");
      router.replace("/dashboard");
    } catch {
      setErrorMessageKey("demo.error");
    } finally {
      setIsDemoLoading(false);
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

      {showExpirationNotice ? (
        <div
          role="status"
          className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950"
        >
          {tDemo("expired")}
        </div>
      ) : null}

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
            disabled={isLoading || isDemoLoading}
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
            disabled={isLoading || isDemoLoading}
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
          disabled={isLoading || isDemoLoading}
          className="flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading
            ? t("signingIn")
            : t("signIn")}
        </button>
      </form>

      <div className="mt-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">
            {t("demo.or")}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={isLoading || isDemoLoading}
          className="flex h-11 w-full items-center justify-center rounded-lg border border-primary px-4 text-sm font-semibold text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDemoLoading
            ? t("demo.loading")
            : t("demo.button")}
        </button>

        <p className="text-center text-xs leading-5 text-muted-foreground">
          {t("demo.description")}
        </p>
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {t("newToPromiseFlow")}{" "}
        <button
          type="button"
          onClick={() => router.push("/register")}
          className="font-medium text-primary hover:underline"
        >
          {t("createAccount")}
        </button>
      </p>
    </div>
  );
}