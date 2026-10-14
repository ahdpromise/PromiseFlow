"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

import { getAccessToken } from "@/lib/auth-storage";
import { setWorkspaceId } from "@/lib/workspace-storage";
import { acceptInvitation } from "@/services/invitations.service";

const PENDING_INVITATION_TOKEN_KEY =
  "promiseflow_pending_invitation_token";

function AcceptInvitationContent() {
  const t = useTranslations(
    "acceptInvitation",
  );

  const router = useRouter();
  const searchParams = useSearchParams();

  const invitationToken =
    searchParams.get("token") ?? "";

  const [isAccepting, setIsAccepting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [isAccepted, setIsAccepted] =
    useState(false);

  async function handleAccept() {
    setErrorMessage("");

    if (!invitationToken) {
      setErrorMessage(
        t("errors.missingToken"),
      );
      return;
    }

    const accessToken =
      getAccessToken();

    if (!accessToken) {
      sessionStorage.setItem(
        PENDING_INVITATION_TOKEN_KEY,
        invitationToken,
      );

      router.push("/login");
      return;
    }

    setIsAccepting(true);

    try {
      const result =
        await acceptInvitation(
          accessToken,
          invitationToken,
        );

      sessionStorage.removeItem(
        PENDING_INVITATION_TOKEN_KEY,
      );

      setWorkspaceId(
        result.organization_id,
      );

      setIsAccepted(true);
    } catch {
      setErrorMessage(
        t("errors.accept"),
      );
    } finally {
      setIsAccepting(false);
    }
  }

  if (!invitationToken) {
    return (
      <div>
        <p className="text-sm font-medium text-primary">
          PromiseFlow
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {t("title")}
        </h1>

        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t("errors.missingToken")}
        </div>
      </div>
    );
  }

  if (isAccepted) {
    return (
      <div>
        <p className="text-sm font-medium text-primary">
          PromiseFlow
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {t("success.title")}
        </h1>

        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {t("success.description")}
        </p>

        <div className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {t("success.message")}
        </div>

        <button
          type="button"
          onClick={() => {
            router.push("/dashboard");
          }}
          className="mt-6 flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          {t("success.continue")}
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-medium text-primary">
        PromiseFlow
      </p>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {t("title")}
      </h1>

      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {t("description")}
      </p>

      {errorMessage ? (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <button
        type="button"
        disabled={isAccepting}
        onClick={() => {
          void handleAccept();
        }}
        className="mt-6 flex h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isAccepting
          ? t("accepting")
          : t("accept")}
      </button>
    </div>
  );
}

function AcceptInvitationFallback() {
  const t = useTranslations(
    "acceptInvitation",
  );

  return (
    <div>
      <p className="text-sm font-medium text-primary">
        PromiseFlow
      </p>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {t("title")}
      </h1>

      <p className="mt-3 text-sm text-muted-foreground">
        {t("loading")}
      </p>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <AcceptInvitationFallback />
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}