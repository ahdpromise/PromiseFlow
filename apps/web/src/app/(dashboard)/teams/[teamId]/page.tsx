"use client";

import Link from "next/link";
import {
  useParams,
  useRouter,
} from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Users } from "lucide-react";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { getAccessToken } from "@/lib/auth-storage";
import { getWorkspaceId } from "@/lib/workspace-storage";
import {
  getOrganizationMemberDirectory,
  type OrganizationMember,
} from "@/services/memberships.service";
import {
  createTeamMember,
  deleteTeamMember,
  getTeamMembers,
  type TeamMember,
} from "@/services/team-members.service";
import {
  deleteTeam,
  getTeams,
  updateTeam,
} from "@/services/teams.service";
import type { Team } from "@/types/dashboard";

type ErrorMessageKey =
  | "authenticationMissing"
  | "notFound"
  | "loadTeam"
  | "authenticationOrTeamMissing"
  | "selectMember"
  | "addMember"
  | "removeMember"
  | "updateTeam"
  | "updateRequired"
  | "deleteTeam";

type SuccessMessageKey =
  | "memberAdded"
  | "memberRemoved"
  | "updated";

export default function TeamDetailsPage() {
  const t = useTranslations("teamDetails");
  const router = useRouter();

  const params = useParams<{
    teamId: string;
  }>();

  const teamId = params.teamId;

  const [team, setTeam] =
    useState<Team | null>(null);

  const [members, setMembers] =
    useState<TeamMember[]>([]);

  const [directory, setDirectory] =
    useState<OrganizationMember[]>([]);

  const [selectedUserId, setSelectedUserId] =
    useState("");

  const [showAddMember, setShowAddMember] =
    useState(false);

  const [showEditForm, setShowEditForm] =
    useState(false);

  const [
    showDeleteConfirmation,
    setShowDeleteConfirmation,
  ] = useState(false);

  const [
    memberToRemove,
    setMemberToRemove,
  ] = useState<TeamMember | null>(
    null,
  );

  const [editName, setEditName] =
    useState("");

  const [editSlug, setEditSlug] =
    useState("");

  const [
    editDescription,
    setEditDescription,
  ] = useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isAdding, setIsAdding] =
    useState(false);

  const [isRemoving, setIsRemoving] =
    useState(false);

  const [isUpdating, setIsUpdating] =
    useState(false);

  const [isDeleting, setIsDeleting] =
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
    async function loadTeam() {
      const token = getAccessToken();
      const workspaceId =
        getWorkspaceId();

      if (!token || !workspaceId) {
        setErrorMessageKey(
          "authenticationMissing",
        );
        setIsLoading(false);
        return;
      }

      try {
        const [
          teams,
          organizationMembers,
        ] = await Promise.all([
          getTeams(
            token,
            workspaceId,
          ),
          getOrganizationMemberDirectory(
            token,
            workspaceId,
          ),
        ]);

        const selectedTeam =
          teams.find(
            (item) =>
              item.id === teamId,
          );

        if (!selectedTeam) {
          setErrorMessageKey(
            "notFound",
          );
          setIsLoading(false);
          return;
        }

        const teamMembers =
          await getTeamMembers(
            token,
            selectedTeam.id,
          );

        setTeam(selectedTeam);
        setMembers(teamMembers);
        setDirectory(
          organizationMembers,
        );
      } catch {
        setErrorMessageKey(
          "loadTeam",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadTeam();
  }, [teamId]);

  const errorMessage = errorMessageKey
    ? t(`errors.${errorMessageKey}`)
    : "";

  const successMessage =
    successMessageKey
      ? t(
          `success.${successMessageKey}`,
        )
      : "";

  const availableMembers =
    directory.filter(
      (directoryMember) =>
        !members.some(
          (teamMember) =>
            teamMember.user_id ===
            directoryMember.user_id,
        ),
    );

  function openEditForm() {
    if (!team) {
      return;
    }

    setEditName(team.name);
    setEditSlug(team.slug);
    setEditDescription(
      team.description ?? "",
    );

    setShowAddMember(false);
    setShowEditForm(true);
    setErrorMessageKey(null);
    setSuccessMessageKey(null);
  }

  function closeEditForm() {
    if (isUpdating) {
      return;
    }

    setShowEditForm(false);
  }

  async function handleUpdateTeam(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const token = getAccessToken();

    if (!token || !team) {
      setErrorMessageKey(
        "authenticationOrTeamMissing",
      );
      return;
    }

    if (
      !editName.trim() ||
      !editSlug.trim()
    ) {
      setErrorMessageKey(
        "updateRequired",
      );
      return;
    }

    setIsUpdating(true);
    setErrorMessageKey(null);
    setSuccessMessageKey(null);

    try {
      const updatedTeam =
        await updateTeam(
          token,
          team.id,
          {
            name: editName.trim(),
            slug: editSlug.trim(),
            description:
              editDescription.trim() ||
              null,
          },
        );

      setTeam(updatedTeam);
      setShowEditForm(false);

      setSuccessMessageKey(
        "updated",
      );
    } catch {
      setErrorMessageKey(
        "updateTeam",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDeleteTeam() {
    const token = getAccessToken();

    if (!token || !team) {
      setShowDeleteConfirmation(false);
      setErrorMessageKey(
        "deleteTeam",
      );
      return;
    }

    setIsDeleting(true);
    setErrorMessageKey(null);
    setSuccessMessageKey(null);

    try {
      await deleteTeam(
        token,
        team.id,
      );

      sessionStorage.setItem(
        "team-deleted-success",
        "1",
      );

      setShowDeleteConfirmation(false);

      router.push("/teams");
      router.refresh();
    } catch {
      setShowDeleteConfirmation(false);
      setErrorMessageKey(
        "deleteTeam",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleAddMember(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const token = getAccessToken();

    if (!token || !team) {
      setErrorMessageKey(
        "authenticationOrTeamMissing",
      );
      return;
    }

    if (!selectedUserId) {
      setErrorMessageKey(
        "selectMember",
      );
      return;
    }

    setIsAdding(true);
    setErrorMessageKey(null);
    setSuccessMessageKey(null);

    try {
      const newMember =
        await createTeamMember(
          token,
          team.id,
          selectedUserId,
        );

      setMembers(
        (currentMembers) => [
          newMember,
          ...currentMembers,
        ],
      );

      setSelectedUserId("");
      setShowAddMember(false);

      setSuccessMessageKey(
        "memberAdded",
      );
    } catch {
      setErrorMessageKey(
        "addMember",
      );
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemoveMember() {
    const token = getAccessToken();

    if (!token || !memberToRemove) {
      setMemberToRemove(null);
      setErrorMessageKey(
        "removeMember",
      );
      return;
    }

    setIsRemoving(true);
    setErrorMessageKey(null);
    setSuccessMessageKey(null);

    try {
      await deleteTeamMember(
        token,
        memberToRemove.id,
      );

      setMembers(
        (currentMembers) =>
          currentMembers.filter(
            (member) =>
              member.id !==
              memberToRemove.id,
          ),
      );

      setMemberToRemove(null);

      setSuccessMessageKey(
        "memberRemoved",
      );
    } catch {
      setMemberToRemove(null);
      setErrorMessageKey(
        "removeMember",
      );
    } finally {
      setIsRemoving(false);
    }
  }

  function getMemberDetails(
    userId: string,
  ) {
    return directory.find(
      (item) =>
        item.user_id === userId,
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  if (errorMessage && !team) {
    return (
      <div className="space-y-4">
        <Link
          href="/teams"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft size={16} />
          {t("backToTeams")}
        </Link>

        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      </div>
    );
  }

  if (!team) {
    return null;
  }

  return (
    <>
      <div className="space-y-8">
        <section>
          <Link
            href="/teams"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft size={16} />
            {t("backToTeams")}
          </Link>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">
                {t("team")}
              </p>

              <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight">
                {team.name}
              </h1>

              <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-muted-foreground">
                {team.description ??
                  t("noDescription")}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  if (showEditForm) {
                    closeEditForm();
                  } else {
                    openEditForm();
                  }
                }}
                disabled={isUpdating}
                className="h-10 rounded-lg border border-border px-4 text-sm font-semibold transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showEditForm
                  ? t("cancel")
                  : t("editTeam")}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAddMember(
                    (current) =>
                      !current,
                  );

                  setShowEditForm(false);
                  setErrorMessageKey(null);
                  setSuccessMessageKey(null);
                }}
                className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                {showAddMember
                  ? t("cancel")
                  : t("addMember")}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmation(
                    true,
                  );
                  setShowEditForm(false);
                  setShowAddMember(false);
                  setErrorMessageKey(null);
                  setSuccessMessageKey(null);
                }}
                className="h-10 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50"
              >
                {t("deleteTeam")}
              </button>
            </div>
          </div>
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

        {showEditForm ? (
          <form
            onSubmit={handleUpdateTeam}
            className="rounded-xl border border-border bg-surface p-6 shadow-sm"
          >
            <div>
              <h2 className="font-semibold">
                {t("edit.title")}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {t("edit.description")}
              </p>
            </div>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="edit-team-name"
                  className="text-sm font-medium"
                >
                  {t("edit.teamName")}
                </label>

                <input
                  id="edit-team-name"
                  value={editName}
                  disabled={isUpdating}
                  onChange={(event) =>
                    setEditName(
                      event.target.value,
                    )
                  }
                  placeholder={t(
                    "edit.namePlaceholder",
                  )}
                  className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-team-slug"
                  className="text-sm font-medium"
                >
                  {t("edit.slug")}
                </label>

                <input
                  id="edit-team-slug"
                  value={editSlug}
                  disabled={isUpdating}
                  onChange={(event) =>
                    setEditSlug(
                      event.target.value,
                    )
                  }
                  placeholder={t(
                    "edit.slugPlaceholder",
                  )}
                  className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
                />
              </div>
            </div>

            <div className="mt-5">
              <label
                htmlFor="edit-team-description"
                className="text-sm font-medium"
              >
                {t(
                  "edit.teamDescription",
                )}
              </label>

              <textarea
                id="edit-team-description"
                value={editDescription}
                disabled={isUpdating}
                onChange={(event) =>
                  setEditDescription(
                    event.target.value,
                  )
                }
                placeholder={t(
                  "edit.descriptionPlaceholder",
                )}
                rows={4}
                className="mt-2 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-60"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEditForm}
                disabled={isUpdating}
                className="h-10 rounded-lg border border-border px-4 text-sm font-semibold transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("cancel")}
              </button>

              <button
                type="submit"
                disabled={isUpdating}
                className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isUpdating
                  ? t("edit.saving")
                  : t("edit.submit")}
              </button>
            </div>
          </form>
        ) : null}

        {showAddMember ? (
          <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <h2 className="font-semibold">
              {t("addMemberForm.title")}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                "addMemberForm.description",
              )}
            </p>

            {availableMembers.length >
            0 ? (
              <form
                onSubmit={
                  handleAddMember
                }
                className="mt-6 space-y-5"
              >
                <div>
                  <label
                    htmlFor="team-member"
                    className="mb-2 block text-sm font-medium"
                  >
                    {t(
                      "addMemberForm.workspaceMember",
                    )}
                  </label>

                  <select
                    id="team-member"
                    value={selectedUserId}
                    disabled={isAdding}
                    onChange={(event) =>
                      setSelectedUserId(
                        event.target.value,
                      )
                    }
                    className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
                  >
                    <option value="">
                      {t(
                        "addMemberForm.selectMember",
                      )}
                    </option>

                    {availableMembers.map(
                      (member) => (
                        <option
                          key={
                            member.membership_id
                          }
                          value={
                            member.user_id
                          }
                        >
                          {
                            member.first_name
                          }{" "}
                          {
                            member.last_name
                          }{" "}
                          — {member.email}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={
                      isAdding ||
                      !selectedUserId
                    }
                    className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAdding
                      ? t(
                          "addMemberForm.adding",
                        )
                      : t(
                          "addMemberForm.submit",
                        )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-6 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {t(
                  "addMemberForm.allMembersAdded",
                )}
              </div>
            )}
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              {t("stats.members")}
            </p>

            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {members.length}
            </p>
          </article>

          <article className="min-w-0 rounded-xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              {t("stats.teamSlug")}
            </p>

            <p className="mt-3 break-all text-sm font-semibold">
              {team.slug}
            </p>
          </article>
        </section>

        <section className="rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="font-semibold">
                {t("members.title")}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  "members.description",
                )}
              </p>
            </div>

            <Users
              size={20}
              className="text-muted-foreground"
            />
          </div>

          {members.length > 0 ? (
            <div className="divide-y divide-border">
              {members.map((member) => {
                const details =
                  getMemberDetails(
                    member.user_id,
                  );

                return (
                  <div
                    key={member.id}
                    className="flex min-w-0 items-center justify-between gap-4 p-5"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-medium">
                        {details
                          ? `${details.first_name} ${details.last_name}`
                          : t(
                              "members.workspaceMember",
                            )}
                      </p>

                      <p className="mt-1 break-all text-sm text-muted-foreground">
                        {details?.email ??
                          member.user_id}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setMemberToRemove(
                          member,
                        );
                        setErrorMessageKey(
                          null,
                        );
                        setSuccessMessageKey(
                          null,
                        );
                      }}
                      className="shrink-0 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                    >
                      {t(
                        "removeMember.button",
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm font-medium">
                {t(
                  "members.emptyTitle",
                )}
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  "members.emptyDescription",
                )}
              </p>
            </div>
          )}
        </section>
      </div>

      {showDeleteConfirmation ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
            <h2 className="text-lg font-semibold">
              {t("delete.title")}
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              {t("delete.description")}
            </p>

            <p className="mt-3 break-words font-medium">
              {team.name}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() =>
                  setShowDeleteConfirmation(
                    false,
                  )
                }
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("delete.cancel")}
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={() =>
                  void handleDeleteTeam()
                }
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting
                  ? t(
                      "delete.deleting",
                    )
                  : t(
                      "delete.confirm",
                    )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {memberToRemove ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
            <h2 className="text-lg font-semibold">
              {t(
                "removeMember.title",
              )}
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              {t(
                "removeMember.description",
              )}
            </p>

            <p className="mt-3 break-words font-medium">
              {(() => {
                const details =
                  getMemberDetails(
                    memberToRemove.user_id,
                  );

                return details
                  ? `${details.first_name} ${details.last_name}`
                  : t(
                      "members.workspaceMember",
                    );
              })()}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isRemoving}
                onClick={() =>
                  setMemberToRemove(
                    null,
                  )
                }
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t(
                  "removeMember.cancel",
                )}
              </button>

              <button
                type="button"
                disabled={isRemoving}
                onClick={() =>
                  void handleRemoveMember()
                }
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRemoving
                  ? t(
                      "removeMember.removing",
                    )
                  : t(
                      "removeMember.confirm",
                    )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}