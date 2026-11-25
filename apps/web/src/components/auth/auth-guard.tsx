"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import {
  clearAuthSession,
  getAccessToken,
  isDemoSessionExpired,
} from "@/lib/auth-storage";

import { clearWorkspaceId } from "@/lib/workspace-storage";

function subscribe() {
  return () => {};
}

function getSessionStatus() {
  if (isDemoSessionExpired()) {
    return "expired";
  }

  return getAccessToken()
    ? "authenticated"
    : "unauthenticated";
}

function getServerSnapshot() {
  return "checking";
}

export function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const status = useSyncExternalStore(
    subscribe,
    getSessionStatus,
    getServerSnapshot,
  );

  useEffect(() => {
    if (status === "expired") {
      clearAuthSession();
      clearWorkspaceId();

      sessionStorage.removeItem(
        "promiseflow_pending_invitation_token",
      );

      window.location.replace("/login?demo=expired");
      return;
    }

    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return null;
  }

  return <>{children}</>;
}
