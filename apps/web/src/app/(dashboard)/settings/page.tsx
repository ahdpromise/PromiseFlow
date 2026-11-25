
"use client";

import {
  type FormEvent,
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
  updateCurrentUserProfile,
  updateOrganizationSettings,
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
  | "updatePassword"
  | "profileNameRequired"
  | "profileNameLength"
  | "updateProfile"
  | "workspaceNameRequired"
  | "workspaceNameLength"
  | "workspaceSlugInvalid"
  | "updateWorkspace";

type SuccessMessageKey =
  | "passwordUpdated"
  | "profileUpdated"
  | "workspaceUpdated";

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

  const [firstName, setFirstName] =
    useState("");

  const [lastName, setLastName] =
    useState("");

  const [workspaceName, setWorkspaceName] =
    useState("");

  const [workspaceSlug, setWorkspaceSlug] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSavingProfile, setIsSavingProfile] =
    useState(false);

  const [isSavingWorkspace, setIsSavingWorkspace] =
    useState(false);

  const [isSavingPassword, setIsSavingPassword] =
    useState(false);

  const [errorMessageKey, setErrorMessageKey] =
    useState<ErrorMessageKey | null>(null);

  const [successMessageKey, setSuccessMessageKey] =
    useState<SuccessMessageKey | null>(null);

  useEffect(() => {
    async function loadSettings() {
      const token = getAccessToken();
      const currentWorkspaceId = getWorkspaceId();

      if (!token) {
        setErrorMessageKey("authenticationMissing");
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await getCurrentUser(token);

        setUser(currentUser);
        setFirstName(currentUser.first_name);
        setLastName(currentUser.last_name);

        if (!currentWorkspaceId) {
          return;
        }

        const [
          organizationItems,
          membershipItems,
          memberDirectory,
          roleItems,
        ] = await Promise.all([
          getOrganizations(token),
          getMemberships(token),
          getOrganizationMemberDirectory(
            token,
            currentWorkspaceId,
          ),
          getRoles(token, currentWorkspaceId),
        ]);

        const selectedOrganization =
          organizationItems.find(
            (organization) =>
              organization.id === currentWorkspaceId,
          );

        setOrganizations(organizationItems);
        setMemberships(membershipItems);
        setDirectory(memberDirectory);
        setRoles(roleItems);
        setWorkspaceId(currentWorkspaceId);
        setWorkspaceName(selectedOrganization?.name ?? "");
        setWorkspaceSlug(selectedOrganization?.slug ?? "");
      } catch {
        setErrorMessageKey("loadSettings");
      } finally {
        setIsLoading(false);
      }
    }

    void loadSettings();
  }, []);

  const currentOrganization = useMemo(
    () =>
      organizations.find(
        (organization) =>
          organization.id === workspaceId,
      ) ?? null,
    [organizations, workspaceId],
  );

  const currentMembership = useMemo(
    () =>
      memberships.find(
        (membership) =>
          membership.organization_id === workspaceId &&
          membership.user_id === user?.id &&
          membership.deleted_at === null,
      ) ?? null,
    [memberships, workspaceId, user?.id],
  );

  const currentRole = useMemo(
    () =>
      roles.find(
        (role) =>
          role.id === currentMembership?.role_id,
      ) ?? null,
    [roles, currentMembership],
  );

  const canEditWorkspace =
    currentRole?.slug === "administrator";

  const errorMessage = errorMessageKey
    ? t(`errors.${errorMessageKey}`)
    : "";

  const successMessage = successMessageKey
    ? t(`success.${successMessageKey}`)
    : "";

  async function handleProfileChange(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessageKey(null);
    setSuccessMessageKey(null);

    const token = getAccessToken();

    if (!token) {
      setErrorMessageKey("authenticationMissing");
      return;
    }

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      setErrorMessageKey("profileNameRequired");
      return;
    }

    if (
      trimmedFirstName.length > 100 ||
      trimmedLastName.length > 100
    ) {
      setErrorMessageKey("profileNameLength");
      return;
    }

    setIsSavingProfile(true);

    try {
      const updatedUser =
        await updateCurrentUserProfile(
          token,
          trimmedFirstName,
          trimmedLastName,
        );

      setUser(updatedUser);
      setFirstName(updatedUser.first_name);
      setLastName(updatedUser.last_name);
      setSuccessMessageKey("profileUpdated");
    } catch {
      setErrorMessageKey("updateProfile");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleWorkspaceChange(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessageKey(null);
    setSuccessMessageKey(null);

    const token = getAccessToken();

    if (!token || !workspaceId) {
      setErrorMessageKey("authenticationMissing");
      return;
    }

    if (!canEditWorkspace || !currentOrganization) {
      setErrorMessageKey("updateWorkspace");
      return;
    }

    const trimmedName = workspaceName.trim();
    const trimmedSlug = workspaceSlug.trim();

    if (!trimmedName) {
      setErrorMessageKey("workspaceNameRequired");
      return;
    }

    if (trimmedName.length > 150) {
      setErrorMessageKey("workspaceNameLength");
      return;
    }

    if (
      trimmedSlug.length > 100 ||
      !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(trimmedSlug)
    ) {
      setErrorMessageKey("workspaceSlugInvalid");
      return;
    }

    if (
      trimmedName === currentOrganization.name &&
      trimmedSlug === currentOrganization.slug
    ) {
      return;
    }

    setIsSavingWorkspace(true);

    try {
      const updatedOrganization =
        await updateOrganizationSettings(
          token,
          workspaceId,
          trimmedName,
          trimmedSlug,
        );

      setOrganizations((previous) =>
        previous.map((organization) =>
          organization.id === updatedOrganization.id
            ? updatedOrganization
            : organization,
        ),
      );

      setWorkspaceName(updatedOrganization.name);
      setWorkspaceSlug(updatedOrganization.slug);
      setSuccessMessageKey("workspaceUpdated");
    } catch {
      setErrorMessageKey("updateWorkspace");
    } finally {
      setIsSavingWorkspace(false);
    }
  }

  async function handlePasswordChange(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setErrorMessageKey(null);
    setSuccessMessageKey(null);

    const token = getAccessToken();

    if (!token) {
      setErrorMessageKey("authenticationMissing");
      return;
    }

    if (password.length < 8) {
      setErrorMessageKey("passwordLength");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessageKey("passwordMismatch");
      return;
    }

    setIsSavingPassword(true);

    try {
      await updateCurrentUserPassword(
        token,
        password,
      );

      setPassword("");
      setConfirmPassword("");
      setSuccessMessageKey("passwordUpdated");
    } catch {
      setErrorMessageKey("updatePassword");
    } finally {
      setIsSavingPassword(false);
    }
  }

  const inputClassName =
    "h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60";

  const buttonClassName =
    "h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

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
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
        >
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

          <form
            onSubmit={handleProfileChange}
            className="mt-6 space-y-5"
          >
            <div>
              <label
                htmlFor="profile-first-name"
                className="mb-2 block text-sm font-medium"
              >
                {t("profile.firstName")}
              </label>

              <input
                id="profile-first-name"
                type="text"
                autoComplete="given-name"
                maxLength={100}
                required
                value={firstName}
                disabled={isSavingProfile || !user}
                onChange={(event) =>
                  setFirstName(event.target.value)
                }
                className={inputClassName}
              />
            </div>

            <div>
              <label
                htmlFor="profile-last-name"
                className="mb-2 block text-sm font-medium"
              >
                {t("profile.lastName")}
              </label>

              <input
                id="profile-last-name"
                type="text"
                autoComplete="family-name"
                maxLength={100}
                required
                value={lastName}
                disabled={isSavingProfile || !user}
                onChange={(event) =>
                  setLastName(event.target.value)
                }
                className={inputClassName}
              />
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

            <button
              type="submit"
              disabled={isSavingProfile || !user}
              className={buttonClassName}
            >
              {isSavingProfile
                ? t("profile.saving")
                : t("profile.saveChanges")}
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="font-semibold">
            {t("workspace.title")}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {t("workspace.description")}
          </p>

          <form
            onSubmit={handleWorkspaceChange}
            className="mt-6 space-y-5"
          >
            <div>
              <label
                htmlFor="workspace-name"
                className="mb-2 block text-sm font-medium"
              >
                {t("workspace.name")}
              </label>

              <input
                id="workspace-name"
                type="text"
                maxLength={150}
                required
                value={workspaceName}
                disabled={
                  isSavingWorkspace ||
                  !currentOrganization ||
                  !canEditWorkspace
                }
                onChange={(event) =>
                  setWorkspaceName(event.target.value)
                }
                className={inputClassName}
              />
            </div>

            <div>
              <label
                htmlFor="workspace-slug"
                className="mb-2 block text-sm font-medium"
              >
                {t("workspace.slug")}
              </label>

              <input
                id="workspace-slug"
                type="text"
                maxLength={100}
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                value={workspaceSlug}
                disabled={
                  isSavingWorkspace ||
                  !currentOrganization ||
                  !canEditWorkspace
                }
                onChange={(event) =>
                  setWorkspaceSlug(event.target.value)
                }
                className={inputClassName}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              {t("workspace.editDescription")}
            </p>

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

            {canEditWorkspace ? (
              <button
                type="submit"
                disabled={
                  isSavingWorkspace ||
                  !currentOrganization ||
                  (workspaceName.trim() ===
                    currentOrganization.name &&
                    workspaceSlug.trim() ===
                      currentOrganization.slug)
                }
                className={buttonClassName}
              >
                {isSavingWorkspace
                  ? t("workspace.saving")
                  : t("workspace.saveChanges")}
              </button>
            ) : null}
          </form>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="font-semibold">
          {t("security.title")}
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          {t("security.description")}
        </p>

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
                setPassword(event.target.value)
              }
              className={inputClassName}
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
                setConfirmPassword(event.target.value)
              }
              className={inputClassName}
            />
          </div>

          <button
            type="submit"
            disabled={isSavingPassword}
            className={buttonClassName}
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
