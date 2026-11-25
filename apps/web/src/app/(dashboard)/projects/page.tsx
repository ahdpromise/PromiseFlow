"use client";

import { DemoActionButton } from "@/components/demo/demo-controls";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { getAccessToken } from "@/lib/auth-storage";
import { getWorkspaceId } from "@/lib/workspace-storage";
import {
  createProject,
  deleteProject,
  getProjects,
  updateProject,
} from "@/services/projects.service";
import type { Project } from "@/types/dashboard";

type ErrorMessageKey =
  | "loadError"
  | "authenticationMissing"
  | "createError"
  | "updateError"
  | "deleteError";

export default function ProjectsPage() {
  const t =
    useTranslations("projects");

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    errorMessageKey,
    setErrorMessageKey,
  ] = useState<ErrorMessageKey | null>(
    null,
  );

  const [
    showCreateForm,
    setShowCreateForm,
  ] = useState(false);

  const [name, setName] =
    useState("");

  const [slug, setSlug] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [isCreating, setIsCreating] =
    useState(false);

  const [
    editingProject,
    setEditingProject,
  ] = useState<Project | null>(null);

  const [editName, setEditName] =
    useState("");

  const [editSlug, setEditSlug] =
    useState("");

  const [
    editDescription,
    setEditDescription,
  ] = useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    deletingProject,
    setDeletingProject,
  ] = useState<Project | null>(null);

  const [isDeleting, setIsDeleting] =
    useState(false);

  useEffect(() => {
    async function loadProjects() {
      const token =
        getAccessToken();

      const workspaceId =
        getWorkspaceId();

      if (!token || !workspaceId) {
        setIsLoading(false);
        return;
      }

      try {
        const items =
          await getProjects(
            token,
            workspaceId,
          );

        setProjects(items);
      } catch {
        setErrorMessageKey(
          "loadError",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadProjects();
  }, []);

  const errorMessage =
    errorMessageKey
      ? t(errorMessageKey)
      : "";

  async function handleCreateProject(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const token =
      getAccessToken();

    const workspaceId =
      getWorkspaceId();

    if (!token || !workspaceId) {
      setErrorMessageKey(
        "authenticationMissing",
      );
      return;
    }

    setErrorMessageKey(null);
    setIsCreating(true);

    try {
      const project =
        await createProject(
          token,
          {
            organization_id:
              workspaceId,
            name,
            slug,
            description:
              description.trim() ||
              undefined,
          },
        );

      setProjects(
        (current) => [
          project,
          ...current,
        ],
      );

      setName("");
      setSlug("");
      setDescription("");
      setShowCreateForm(false);
    } catch {
      setErrorMessageKey(
        "createError",
      );
    } finally {
      setIsCreating(false);
    }
  }

  function handleStartEdit(
    project: Project,
  ) {
    setErrorMessageKey(null);

    setEditingProject(
      project,
    );

    setEditName(
      project.name,
    );

    setEditSlug(
      project.slug,
    );

    setEditDescription(
      project.description ?? "",
    );

    setDeletingProject(null);
  }

  function handleCancelEdit() {
    setEditingProject(null);
    setEditName("");
    setEditSlug("");
    setEditDescription("");
  }

  async function handleUpdateProject(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!editingProject) {
      return;
    }

    const token =
      getAccessToken();

    if (!token) {
      setErrorMessageKey(
        "authenticationMissing",
      );
      return;
    }

    setErrorMessageKey(null);
    setIsSaving(true);

    try {
      const updatedProject =
        await updateProject(
          token,
          editingProject.id,
          {
            name: editName,
            slug: editSlug,
            description:
              editDescription.trim() ||
              undefined,
          },
        );

      setProjects(
        (current) =>
          current.map(
            (project) =>
              project.id ===
              updatedProject.id
                ? updatedProject
                : project,
          ),
      );

      handleCancelEdit();
    } catch {
      setErrorMessageKey(
        "updateError",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleStartDelete(
    project: Project,
  ) {
    setErrorMessageKey(null);
    setDeletingProject(
      project,
    );
    setEditingProject(null);
  }

  function handleCancelDelete() {
    if (isDeleting) {
      return;
    }

    setDeletingProject(null);
  }

  async function handleDeleteProject() {
    if (!deletingProject) {
      return;
    }

    const token =
      getAccessToken();

    if (!token) {
      setErrorMessageKey(
        "authenticationMissing",
      );
      return;
    }

    setErrorMessageKey(null);
    setIsDeleting(true);

    try {
      await deleteProject(
        token,
        deletingProject.id,
      );

      setProjects(
        (current) =>
          current.filter(
            (project) =>
              project.id !==
              deletingProject.id,
          ),
      );

      setDeletingProject(null);
    } catch {
      setErrorMessageKey(
        "deleteError",
      );
    } finally {
      setIsDeleting(false);
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
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
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

        <DemoActionButton
          type="button"
          onClick={() =>
            setShowCreateForm(
              (current) =>
                !current,
            )
          }
          className="h-10 shrink-0 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          {showCreateForm
            ? t("cancel")
            : t("newProject")}
        </DemoActionButton>
      </section>

      {errorMessage ? (
        <div className="break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {showCreateForm ? (
        <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">
              {t("createTitle")}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                "createDescription",
              )}
            </p>
          </div>

          <form
            onSubmit={
              handleCreateProject
            }
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="project-name"
                className="mb-2 block text-sm font-medium"
              >
                {t("projectName")}
              </label>

              <input
                id="project-name"
                type="text"
                required
                disabled={
                  isCreating
                }
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value,
                  )
                }
                placeholder={t(
                  "projectNamePlaceholder",
                )}
                className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="project-slug"
                className="mb-2 block text-sm font-medium"
              >
                {t("slug")}
              </label>

              <input
                id="project-slug"
                type="text"
                required
                disabled={
                  isCreating
                }
                value={slug}
                onChange={(event) =>
                  setSlug(
                    event.target.value,
                  )
                }
                placeholder={t(
                  "slugPlaceholder",
                )}
                className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="project-description"
                className="mb-2 block text-sm font-medium"
              >
                {t(
                  "descriptionLabel",
                )}
              </label>

              <textarea
                id="project-description"
                rows={4}
                disabled={
                  isCreating
                }
                value={
                  description
                }
                onChange={(event) =>
                  setDescription(
                    event.target.value,
                  )
                }
                placeholder={t(
                  "descriptionPlaceholder",
                )}
                className="w-full rounded-lg border border-border bg-surface px-3 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
              />
            </div>

            <div className="flex justify-end">
              <DemoActionButton
                type="submit"
                disabled={
                  isCreating
                }
                className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating
                  ? t(
                      "creating",
                    )
                  : t(
                      "createProject",
                    )}
              </DemoActionButton>
            </div>
          </form>
        </section>
      ) : null}

      {editingProject ? (
        <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">
              {t("editTitle")}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {t("editDescription")}
            </p>
          </div>

          <form
            onSubmit={
              handleUpdateProject
            }
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="edit-project-name"
                className="mb-2 block text-sm font-medium"
              >
                {t("projectName")}
              </label>

              <input
                id="edit-project-name"
                type="text"
                required
                disabled={isSaving}
                value={editName}
                onChange={(event) =>
                  setEditName(
                    event.target.value,
                  )
                }
                className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="edit-project-slug"
                className="mb-2 block text-sm font-medium"
              >
                {t("slug")}
              </label>

              <input
                id="edit-project-slug"
                type="text"
                required
                disabled={isSaving}
                value={editSlug}
                onChange={(event) =>
                  setEditSlug(
                    event.target.value,
                  )
                }
                className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="edit-project-description"
                className="mb-2 block text-sm font-medium"
              >
                {t(
                  "descriptionLabel",
                )}
              </label>

              <textarea
                id="edit-project-description"
                rows={4}
                disabled={isSaving}
                value={
                  editDescription
                }
                onChange={(event) =>
                  setEditDescription(
                    event.target.value,
                  )
                }
                className="w-full rounded-lg border border-border bg-surface px-3 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={isSaving}
                onClick={
                  handleCancelEdit
                }
                className="h-10 rounded-lg border border-border px-4 text-sm font-semibold transition hover:bg-surface-muted disabled:opacity-60"
              >
                {t("cancel")}
              </button>

              <DemoActionButton
                type="submit"
                disabled={isSaving}
                className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving
                  ? t("saving")
                  : t(
                      "saveChanges",
                    )}
              </DemoActionButton>
            </div>
          </form>
        </section>
      ) : null}

      {projects.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map(
            (project) => (
              <article
                key={project.id}
                className="flex min-w-0 flex-col rounded-xl border border-border bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <Link
                  href={`/projects/${project.id}`}
                  className="block min-w-0 flex-1"
                >
                  <h2 className="break-words font-semibold">
                    {
                      project.name
                    }
                  </h2>

                  <p className="mt-2 break-words text-sm leading-6 text-muted-foreground">
                    {project.description ??
                      t(
                        "noDescription",
                      )}
                  </p>

                  <div className="mt-5 min-w-0 border-t border-border pt-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t("slug")}
                    </p>

                    <p className="mt-1 break-all text-sm">
                      {
                        project.slug
                      }
                    </p>
                  </div>
                </Link>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                  <DemoActionButton
                    type="button"
                    onClick={() =>
                      handleStartEdit(
                        project,
                      )
                    }
                    className="h-9 rounded-lg border border-border px-3 text-sm font-medium transition hover:bg-surface-muted"
                  >
                    {t("edit")}
                  </DemoActionButton>

                  <DemoActionButton
                    type="button"
                    onClick={() =>
                      handleStartDelete(
                        project,
                      )
                    }
                    className="h-9 rounded-lg border border-red-200 px-3 text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    {t("delete")}
                  </DemoActionButton>
                </div>
              </article>
            ),
          )}
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <h2 className="font-semibold">
            {t("emptyTitle")}
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            {t(
              "emptyDescription",
            )}
          </p>
        </section>
      )}

      {deletingProject ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-project-title"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
            <h2
              id="delete-project-title"
              className="text-lg font-semibold"
            >
              {t("deleteTitle")}
            </h2>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {t(
                "deleteConfirmation",
              )}
            </p>

            <p className="mt-3 break-words font-semibold">
              {deletingProject.name}
            </p>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={
                  handleCancelDelete
                }
                className="h-10 rounded-lg border border-border px-4 text-sm font-semibold transition hover:bg-surface-muted disabled:opacity-60"
              >
                {t("cancel")}
              </button>

              <DemoActionButton
                type="button"
                disabled={isDeleting}
                onClick={() =>
                  void handleDeleteProject()
                }
                className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting
                  ? t("deleting")
                  : t("delete")}
              </DemoActionButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}