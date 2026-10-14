"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useTranslations } from "next-intl";

import { getAccessToken } from "@/lib/auth-storage";
import { getWorkspaceId } from "@/lib/workspace-storage";
import {
  getOrganizationMemberDirectory,
  type OrganizationMember,
} from "@/services/memberships.service";
import {
  getCurrentUser,
  getMemberships,
  getOrganizations,
  getRoles,
  updateCurrentUserPassword,
  type CurrentUser,
  type Membership,
  type Organization,
  type Role,
} from "@/services/settings.service";

type ErrorMessageKey =
  | "loadSettings"
  | "authenticationMissing"
  | "passwordLength"
  | "passwordMismatch"
  | "updatePassword";

type SuccessMessageKey =
  "passwordUpdated";

export default function SettingsPage() {
  const t = useTranslations("settings");

  const [user, setUser] =
    useState<CurrentUser | null>(null);

  const [organizations, setOrganizations] =
    useState<Organization[]>([]);

  const [memberships, setMemberships] =
    useState<Membership[]>([]);

  const [roles, setRoles] =
    useState<Role[]>([]);

  const [directory, setDirectory] =
    useState<OrganizationMember[]>([]);

  const [workspaceId, setWorkspaceId] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSavingPassword, setIsSavingPassword] =
    useState(false);

  const [
    errorMessageKey,
    setErrorMessageKey,
  ] = useState<ErrorMessageKey | null>(
    null,
  );

  const [
    successMessageKey,
    setSuccessMessageKey,
  ] = useState<SuccessMessageKey | null>(
    null,
  );

  useEffect(() => {
    async function loadSettings() {
      const token = getAccessToken();
      const currentWorkspaceId =
        getWorkspaceId();

      if (!token || !currentWorkspaceId) {
        setIsLoading(false);
        return;
      }

      try {
        const [
          currentUser,
          organizationItems,
          membershipItems,
          memberDirectory,
          roleItems,
        ] = await Promise.all([
          getCurrentUser(token),
          getOrganizations(token),
          getMemberships(token),
          getOrganizationMemberDirectory(
            token,
            currentWorkspaceId,
          ),
          getRoles(
            token,
            currentWorkspaceId,
          ),
        ]);

        setUser(currentUser);

        setOrganizations(
          organizationItems,
        );

        setMemberships(
          membershipItems,
        );

        setDirectory(
          memberDirectory,
        );

        setRoles(roleItems);

        setWorkspaceId(
          currentWorkspaceId,
        );
      } catch {
        setErrorMessageKey(
          "loadSettings",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadSettings();
  }, []);

  const currentOrganization =
    useMemo(
      () =>
        organizations.find(
          (organization) =>
            organization.id ===
            workspaceId,
        ) ?? null,
      [organizations, workspaceId],
    );

  const currentMembership =
    useMemo(
      () =>
        memberships.find(
          (membership) =>
            membership.organization_id ===
            workspaceId,
        ) ?? null,
      [memberships, workspaceId],
    );

  const currentRole =
    useMemo(
      () =>
        roles.find(
          (role) =>
            role.id ===
            currentMembership?.role_id,
        ) ?? null,
      [roles, currentMembership],
    );

  const errorMessage = errorMessageKey
    ? t(`errors.${errorMessageKey}`)
    : "";

  const successMessage =
    successMessageKey
      ? t(
          `success.${successMessageKey}`,
        )
      : "";

  async function handlePasswordChange(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const token = getAccessToken();

    if (!token) {
      setErrorMessageKey(
        "authenticationMissing",
      );
      return;
    }

    if (password.length < 8) {
      setErrorMessageKey(
        "passwordLength",
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessageKey(
        "passwordMismatch",
      );
      return;
    }

    setErrorMessageKey(null);
    setSuccessMessageKey(null);
    setIsSavingPassword(true);

    try {
      await updateCurrentUserPassword(
        token,
        password,
      );

      setPassword("");
      setConfirmPassword("");

      setSuccessMessageKey(
        "passwordUpdated",
      );
    } catch {
      setErrorMessageKey(
        "updatePassword",
      );
    } finally {
      setIsSavingPassword(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium text-primary">
          {t("account")}
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {t("title")}
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          {t("description")}
        </p>
      </section>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {successMessage}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="font-semibold">
            {t("profile.title")}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {t("profile.description")}
          </p>

          <div className="mt-6 space-y-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("profile.name")}
              </p>

              <p className="mt-1 text-sm font-medium">
                {user
                  ? `${user.first_name} ${user.last_name}`
                  : "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("profile.email")}
              </p>

              <p className="mt-1 text-sm font-medium">
                {user?.email ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("profile.emailVerified")}
              </p>

              <p className="mt-1 text-sm font-medium">
                {user?.email_verified_at
                  ? t("profile.yes")
                  : t("profile.no")}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="font-semibold">
            {t("workspace.title")}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {t("workspace.description")}
          </p>

          <div className="mt-6 space-y-5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("workspace.name")}
              </p>

              <p className="mt-1 text-sm font-medium">
                {currentOrganization?.name ??
                  "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("workspace.slug")}
              </p>

              <p className="mt-1 text-sm font-medium">
                {currentOrganization?.slug ??
                  "—"}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("workspace.members")}
              </p>

              <p className="mt-1 text-sm font-medium">
                {directory.length}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("workspace.role")}
              </p>

              <p className="mt-1 text-sm font-medium">
                {currentRole?.name ?? "—"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <div>
          <h2 className="font-semibold">
            {t("security.title")}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {t("security.description")}
          </p>
        </div>

        <form
          onSubmit={handlePasswordChange}
          className="mt-6 max-w-xl space-y-5"
        >
          <div>
            <label
              htmlFor="new-password"
              className="mb-2 block text-sm font-medium"
            >
              {t("security.newPassword")}
            </label>

            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              disabled={isSavingPassword}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="mb-2 block text-sm font-medium"
            >
              {t("security.confirmPassword")}
            </label>

            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              disabled={isSavingPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value,
                )
              }
              className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={isSavingPassword}
            className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSavingPassword
              ? t("security.updating")
              : t("security.updatePassword")}
          </button>
        </form>
      </section>
    </div>
  );
}