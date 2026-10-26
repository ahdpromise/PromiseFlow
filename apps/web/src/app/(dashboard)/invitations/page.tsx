"use client";

import { useTranslations } from "next-intl";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getAccessToken } from "@/lib/auth-storage";
import { getWorkspaceId } from "@/lib/workspace-storage";
import {
  createInvitation,
  getInvitationRoles,
  getInvitations,
  resendInvitation,
  revokeInvitation,
  type Invitation,
  type InvitationRole,
} from "@/services/invitations.service";

type InvitationStatus =
  | "pending"
  | "accepted"
  | "expired"
  | "revoked";

export default function InvitationsPage() {
  const t = useTranslations("invitations");

  const [invitations, setInvitations] =
    useState<Invitation[]>([]);

  const [roles, setRoles] =
    useState<InvitationRole[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [hasError, setHasError] =
    useState(false);

  const [loadedAt, setLoadedAt] =
    useState(0);

  const [
    showInviteForm,
    setShowInviteForm,
  ] = useState(false);

  const [email, setEmail] =
    useState("");

  const [roleId, setRoleId] =
    useState("");

  const [isCreating, setIsCreating] =
    useState(false);

  const [
    createError,
    setCreateError,
  ] = useState("");

  const [
    createSuccess,
    setCreateSuccess,
  ] = useState(false);

  const [
    revokingInvitationId,
    setRevokingInvitationId,
  ] = useState<string | null>(null);

  const [
    revokeError,
    setRevokeError,
  ] = useState("");

  const [
    revokeSuccess,
    setRevokeSuccess,
  ] = useState(false);

  const [
    resendingInvitationId,
    setResendingInvitationId,
  ] = useState<string | null>(null);

  const [
    resendError,
    setResendError,
  ] = useState("");

  const [
    resendSuccess,
    setResendSuccess,
  ] = useState(false);

  useEffect(() => {
    async function loadInvitations() {
      const token = getAccessToken();
      const workspaceId = getWorkspaceId();

      if (!token || !workspaceId) {
        setHasError(true);
        setIsLoading(false);
        return;
      }

      try {
        const [
          invitationItems,
          roleItems,
        ] = await Promise.all([
          getInvitations(
            token,
            workspaceId,
          ),
          getInvitationRoles(
            token,
            workspaceId,
          ),
        ]);

        setInvitations(
          invitationItems.filter(
            (invitation) =>
              invitation.deleted_at === null,
          ),
        );

        const activeRoles =
          roleItems.filter(
            (role) =>
              role.deleted_at === null,
          );

        setRoles(activeRoles);

        setRoleId(
          activeRoles[0]?.id ?? "",
        );

        setLoadedAt(Date.now());
      } catch {
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }

    void loadInvitations();
  }, []);

  const roleNames = useMemo(
    () =>
      new Map(
        roles.map((role) => [
          role.id,
          role.name,
        ]),
      ),
    [roles],
  );

  function getStatus(
    invitation: Invitation,
  ): InvitationStatus {
    if (invitation.accepted_at) {
      return "accepted";
    }

    if (invitation.revoked_at) {
      return "revoked";
    }

    if (
      loadedAt > 0 &&
      new Date(
        invitation.expires_at,
      ).getTime() <= loadedAt
    ) {
      return "expired";
    }

    return "pending";
  }

  function getStatusClassName(
    status: InvitationStatus,
  ) {
    if (status === "accepted") {
      return "bg-green-100 text-green-700";
    }

    if (status === "expired") {
      return "bg-red-100 text-red-700";
    }

    if (status === "revoked") {
      return "bg-slate-100 text-slate-700";
    }

    return "bg-amber-100 text-amber-700";
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat(
      undefined,
      {
        year: "numeric",
        month: "short",
        day: "2-digit",
      },
    ).format(new Date(value));
  }

  function clearMessages() {
    setCreateError("");
    setCreateSuccess(false);
    setRevokeError("");
    setRevokeSuccess(false);
    setResendError("");
    setResendSuccess(false);
  }

  async function handleCreateInvitation(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const token = getAccessToken();
    const workspaceId =
      getWorkspaceId();

    clearMessages();

    if (!token || !workspaceId) {
      setCreateError(
        t(
          "create.errors.authenticationMissing",
        ),
      );
      return;
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    if (
      !normalizedEmail ||
      !roleId
    ) {
      setCreateError(
        t("create.errors.required"),
      );
      return;
    }

    setIsCreating(true);

    try {
      const expiresAt = new Date();

      expiresAt.setDate(
        expiresAt.getDate() + 7,
      );

      const invitation =
        await createInvitation(
          token,
          {
            organization_id:
              workspaceId,
            email: normalizedEmail,
            role_id: roleId,
            expires_at:
              expiresAt.toISOString(),
          },
        );

      setInvitations(
        (currentInvitations) => [
          invitation,
          ...currentInvitations,
        ],
      );

      setLoadedAt(Date.now());
      setEmail("");
      setShowInviteForm(false);
      setCreateSuccess(true);
    } catch {
      setCreateError(
        t("create.errors.create"),
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleRevokeInvitation(
    invitationId: string,
  ) {
    const token = getAccessToken();

    clearMessages();

    if (!token) {
      setRevokeError(
        t(
          "revoke.errors.authenticationMissing",
        ),
      );
      return;
    }

    setRevokingInvitationId(
      invitationId,
    );

    try {
      const revokedInvitation =
        await revokeInvitation(
          token,
          invitationId,
        );

      setInvitations(
        (currentInvitations) =>
          currentInvitations.map(
            (invitation) =>
              invitation.id ===
              revokedInvitation.id
                ? revokedInvitation
                : invitation,
          ),
      );

      setRevokeSuccess(true);
    } catch {
      setRevokeError(
        t("revoke.errors.revoke"),
      );
    } finally {
      setRevokingInvitationId(
        null,
      );
    }
  }

  async function handleResendInvitation(
    invitationId: string,
  ) {
    const token = getAccessToken();

    clearMessages();

    if (!token) {
      setResendError(
        t(
          "resend.errors.authenticationMissing",
        ),
      );
      return;
    }

    setResendingInvitationId(
      invitationId,
    );

    try {
      const resentInvitation =
        await resendInvitation(
          token,
          invitationId,
        );

      setInvitations(
        (currentInvitations) =>
          currentInvitations.map(
            (invitation) =>
              invitation.id ===
              resentInvitation.id
                ? resentInvitation
                : invitation,
          ),
      );

      setResendSuccess(true);
    } catch {
      setResendError(
        t("resend.errors.resend"),
      );
    } finally {
      setResendingInvitationId(
        null,
      );
    }
  }

  function renderActions(
    invitation: Invitation,
    status: InvitationStatus,
  ) {
    if (status === "accepted") {
      return (
        <span className="text-xs text-muted-foreground">
          —
        </span>
      );
    }

    const isRevoking =
      revokingInvitationId ===
      invitation.id;

    const isResending =
      resendingInvitationId ===
      invitation.id;

    return (
      <div className="flex flex-wrap gap-2">
        {status === "pending" ? (
          <button
            type="button"
            disabled={
              isRevoking ||
              isResending
            }
            onClick={() =>
              void handleRevokeInvitation(
                invitation.id,
              )
            }
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRevoking
              ? t("revoke.revoking")
              : t("revoke.button")}
          </button>
        ) : null}

        <button
          type="button"
          disabled={
            isRevoking ||
            isResending
          }
          onClick={() =>
            void handleResendInvitation(
              invitation.id,
            )
          }
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isResending
            ? t("resend.resending")
            : t("resend.button")}
        </button>
      </div>
    );
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
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">
            {t("workspace")}
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {t("title")}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowInviteForm(
              (current) => !current,
            );
            clearMessages();
          }}
          className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          {showInviteForm
            ? t("create.cancel")
            : t("create.button")}
        </button>
      </section>

      {hasError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {t("errors.load")}
        </div>
      ) : null}

      {createError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {createError}
        </div>
      ) : null}

      {createSuccess ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {t("create.success")}
        </div>
      ) : null}

      {revokeError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {revokeError}
        </div>
      ) : null}

      {revokeSuccess ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {t("revoke.success")}
        </div>
      ) : null}

      {resendError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {resendError}
        </div>
      ) : null}

      {resendSuccess ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {t("resend.success")}
        </div>
      ) : null}

      {showInviteForm ? (
        <form
          onSubmit={
            handleCreateInvitation
          }
          className="rounded-xl border border-border bg-surface p-6 shadow-sm"
        >
          <div>
            <h2 className="font-semibold">
              {t("create.title")}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                "create.description",
              )}
            </p>
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="invitation-email"
                className="text-sm font-medium"
              >
                {t("create.email")}
              </label>

              <input
                id="invitation-email"
                type="email"
                value={email}
                disabled={isCreating}
                onChange={(event) =>
                  setEmail(
                    event.target.value,
                  )
                }
                placeholder={t(
                  "create.emailPlaceholder",
                )}
                className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="invitation-role"
                className="text-sm font-medium"
              >
                {t("create.role")}
              </label>

              <details className="group relative mt-2">
                <summary
                  className={`flex h-10 w-full cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary group-open:border-primary [&::-webkit-details-marker]:hidden ${
                    isCreating || roles.length === 0
                      ? "pointer-events-none opacity-60"
                      : ""
                  }`}
                >
                  <span dir="auto">
                    {roles.find((role) => role.id === roleId)?.name ??
                      t("unknownRole")}
                  </span>
                  <span aria-hidden="true">⌄</span>
                </summary>

                <div className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-white p-1 text-foreground shadow-lg">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      disabled={isCreating}
                      onClick={(event) => {
                        setRoleId(role.id);
                        event.currentTarget
                          .closest("details")
                          ?.removeAttribute("open");
                      }}
                      className={`block w-full rounded-md px-3 py-2 text-start text-sm hover:bg-gray-100 ${
                        role.id === roleId ? "bg-gray-100 font-semibold" : ""
                      }`}
                      dir="auto"
                    >
                      {role.name}
                    </button>
                  ))}
                </div>
              </details>
            </div>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            {t("create.expiration")}
          </p>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={
                isCreating ||
                roles.length === 0
              }
              className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating
                ? t("create.creating")
                : t("create.submit")}
            </button>
          </div>
        </form>
      ) : null}

      {!hasError &&
      invitations.length > 0 ? (
        <>
          {/* Mobile */}
          <section className="space-y-4 md:hidden">
            {invitations.map(
              (invitation) => {
                const status =
                  getStatus(invitation);

                return (
                  <article
                    key={invitation.id}
                    className="rounded-xl border border-border bg-surface p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {t("table.email")}
                        </p>

                        <p className="mt-1 break-all text-sm font-semibold">
                          {invitation.email}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClassName(
                          status,
                        )}`}
                      >
                        {t(
                          `status.${status}`,
                        )}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {t("table.role")}
                        </p>

                        <p className="mt-1 text-sm">
                          {roleNames.get(
                            invitation.role_id,
                          ) ??
                            t(
                              "unknownRole",
                            )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {t("table.status")}
                        </p>

                        <p className="mt-1 text-sm capitalize">
                          {t(
                            `status.${status}`,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {t("table.sent")}
                        </p>

                        <p className="mt-1 text-sm">
                          {formatDate(
                            invitation.created_at,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {t(
                            "table.expires",
                          )}
                        </p>

                        <p className="mt-1 text-sm">
                          {formatDate(
                            invitation.expires_at,
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 border-t border-border pt-4">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {t("table.actions")}
                      </p>

                      {renderActions(
                        invitation,
                        status,
                      )}
                    </div>
                  </article>
                );
              },
            )}
          </section>

          {/* Tablet / Desktop */}
          <section className="hidden overflow-hidden rounded-xl border border-border bg-surface shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b border-border bg-background/60 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-4 font-medium">
                      {t("table.email")}
                    </th>

                    <th className="px-5 py-4 font-medium">
                      {t("table.role")}
                    </th>

                    <th className="px-5 py-4 font-medium">
                      {t("table.status")}
                    </th>

                    <th className="px-5 py-4 font-medium">
                      {t("table.sent")}
                    </th>

                    <th className="px-5 py-4 font-medium">
                      {t(
                        "table.expires",
                      )}
                    </th>

                    <th className="px-5 py-4 text-right font-medium">
                      {t(
                        "table.actions",
                      )}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {invitations.map(
                    (invitation) => {
                      const status =
                        getStatus(
                          invitation,
                        );

                      return (
                        <tr
                          key={
                            invitation.id
                          }
                          className="transition hover:bg-background/50"
                        >
                          <td className="px-5 py-4 font-medium">
                            {
                              invitation.email
                            }
                          </td>

                          <td className="px-5 py-4 text-muted-foreground">
                            {roleNames.get(
                              invitation.role_id,
                            ) ??
                              t(
                                "unknownRole",
                              )}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClassName(
                                status,
                              )}`}
                            >
                              {t(
                                `status.${status}`,
                              )}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-muted-foreground">
                            {formatDate(
                              invitation.created_at,
                            )}
                          </td>

                          <td className="px-5 py-4 text-muted-foreground">
                            {formatDate(
                              invitation.expires_at,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end">
                              {renderActions(
                                invitation,
                                status,
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      {!hasError &&
      invitations.length === 0 ? (
        <section className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <h2 className="font-semibold">
            {t("empty.title")}
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            {t(
              "empty.description",
            )}
          </p>
        </section>
      ) : null}
    </div>
  );
}
