"use client";

import CustomSelect from "@/components/ui/custom-select";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useLocale } from "@/i18n/locale-provider";
import { getAccessToken } from "@/lib/auth-storage";
import { getWorkspaceId } from "@/lib/workspace-storage";
import { getProjects } from "@/services/projects.service";
import {
  createWorkflow,
  getWorkflows,
  type Workflow,
} from "@/services/workflows.service";
import type { Project } from "@/types/dashboard";

type WorkflowWithProject = Workflow & {
  project_name: string;
};

type ErrorMessageKey =
  | "loadWorkflows"
  | "authenticationMissing"
  | "required"
  | "createWorkflow";

type SuccessMessageKey =
  | "created"
  | "deleted";

export default function WorkflowsPage() {
  const t = useTranslations("workflows");
  const { locale } = useLocale();

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [workflows, setWorkflows] =
    useState<WorkflowWithProject[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    errorMessageKey,
    setErrorMessageKey,
  ] =
    useState<ErrorMessageKey | null>(
      null,
    );

  const [
    successMessageKey,
    setSuccessMessageKey,
  ] = useState<SuccessMessageKey | null>(
    () => {
      if (
        typeof window === "undefined"
      ) {
        return null;
      }

      return sessionStorage.getItem(
        "promiseflow_workflow_deleted",
      ) === "true"
        ? "deleted"
        : null;
    },
  );

  const [
    showCreateForm,
    setShowCreateForm,
  ] = useState(false);

  const [
    selectedProjectId,
    setSelectedProjectId,
  ] = useState("");

  const [name, setName] =
    useState("");

  const [slug, setSlug] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [isCreating, setIsCreating] =
    useState(false);

  useEffect(() => {
    if (
      sessionStorage.getItem(
        "promiseflow_workflow_deleted",
      ) === "true"
    ) {
      sessionStorage.removeItem(
        "promiseflow_workflow_deleted",
      );
    }
  }, []);

  useEffect(() => {
    async function loadWorkflows() {
      const token = getAccessToken();
      const workspaceId =
        getWorkspaceId();

      if (!token || !workspaceId) {
        setIsLoading(false);
        return;
      }

      try {
        const projectItems =
          await getProjects(
            token,
            workspaceId,
          );

        setProjects(projectItems);

        const workflowsByProject =
          await Promise.all(
            projectItems.map(
              async (
                project: Project,
              ) => {
                const projectWorkflows =
                  await getWorkflows(
                    token,
                    project.id,
                  );

                return projectWorkflows.map(
                  (workflow) => ({
                    ...workflow,
                    project_name:
                      project.name,
                  }),
                );
              },
            ),
          );

        setWorkflows(
          workflowsByProject.flat(),
        );

        if (
          projectItems.length > 0
        ) {
          setSelectedProjectId(
            projectItems[0].id,
          );
        }
      } catch {
        setErrorMessageKey(
          "loadWorkflows",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadWorkflows();
  }, []);

  const projectMap = useMemo(
    () =>
      new Map(
        projects.map((project) => [
          project.id,
          project.name,
        ]),
      ),
    [projects],
  );

  const errorMessage = useMemo(() => {
    if (!errorMessageKey) {
      return "";
    }

    if (locale === "de") {
      switch (errorMessageKey) {
        case "loadWorkflows":
          return "Workflows konnten nicht geladen werden";
        case "authenticationMissing":
          return "Authentifizierung fehlt";
        case "required":
          return "Projekt, Workflow-Name und Slug sind erforderlich";
        case "createWorkflow":
          return "Workflow konnte nicht erstellt werden";
      }
    }

    switch (errorMessageKey) {
      case "loadWorkflows":
        return "Unable to load workflows";
      case "authenticationMissing":
        return "Authentication is missing";
      case "required":
        return "Project, workflow name, and slug are required";
      case "createWorkflow":
        return "Unable to create workflow";
    }
  }, [
    locale,
    errorMessageKey,
  ]);

  const successMessage =
    successMessageKey
      ? t(
          `success.${successMessageKey}`,
        )
      : "";

  async function handleCreateWorkflow(
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

    if (
      !selectedProjectId ||
      !name.trim() ||
      !slug.trim()
    ) {
      setErrorMessageKey(
        "required",
      );
      return;
    }

    setIsCreating(true);
    setErrorMessageKey(null);
    setSuccessMessageKey(null);

    try {
      const workflow =
        await createWorkflow(
          token,
          {
            project_id:
              selectedProjectId,
            name: name.trim(),
            slug: slug.trim(),
            description:
              description.trim() ||
              undefined,
          },
        );

      setWorkflows(
        (current) => [
          {
            ...workflow,
            project_name:
              projectMap.get(
                workflow.project_id,
              ) ?? t("project"),
          },
          ...current,
        ],
      );

      setName("");
      setSlug("");
      setDescription("");
      setShowCreateForm(false);

      setSuccessMessageKey(
        "created",
      );
    } catch {
      setErrorMessageKey(
        "createWorkflow",
      );
    } finally {
      setIsCreating(false);
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
            setShowCreateForm(
              (current) => !current,
            );
            setErrorMessageKey(null);
            setSuccessMessageKey(null);
          }}
          disabled={
            projects.length === 0
          }
          className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {showCreateForm
            ? t("cancel")
            : t("newWorkflow")}
        </button>
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

      {showCreateForm ? (
        <form
          onSubmit={
            handleCreateWorkflow
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
                htmlFor="workflow-project"
                className="text-sm font-medium"
              >
                {t("create.project")}
              </label>

              <CustomSelect
      id="workflow-project"
      value={selectedProjectId}
      disabled={isCreating}
      className="mt-2"
      options={projects.map((project) => ({
        value: project.id,
        label: project.name,
      }))}
      onChange={setSelectedProjectId}
    />
            </div>

            <div>
              <label
                htmlFor="workflow-name"
                className="text-sm font-medium"
              >
                {t(
                  "create.workflowName",
                )}
              </label>

              <input
                id="workflow-name"
                value={name}
                disabled={isCreating}
                onChange={(event) =>
                  setName(
                    event.target.value,
                  )
                }
                placeholder={t(
                  "create.namePlaceholder",
                )}
                className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </div>

            <div>
              <label
                htmlFor="workflow-slug"
                className="text-sm font-medium"
              >
                {t("create.slug")}
              </label>

              <input
                id="workflow-slug"
                value={slug}
                disabled={isCreating}
                onChange={(event) =>
                  setSlug(
                    event.target.value,
                  )
                }
                placeholder={t(
                  "create.slugPlaceholder",
                )}
                className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </div>

            <div>
              <label
                htmlFor="workflow-description"
                className="text-sm font-medium"
              >
                {t(
                  "create.descriptionLabel",
                )}
              </label>

              <input
                id="workflow-description"
                value={description}
                disabled={isCreating}
                onChange={(event) =>
                  setDescription(
                    event.target.value,
                  )
                }
                placeholder={t(
                  "create.descriptionPlaceholder",
                )}
                className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isCreating}
              className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreating
                ? t(
                    "create.creating",
                  )
                : t(
                    "create.submit",
                  )}
            </button>
          </div>
        </form>
      ) : null}

      {workflows.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workflows.map(
            (workflow) => (
              <Link
                key={workflow.id}
                href={`/workflows/${workflow.id}`}
                className="block rounded-xl border border-border bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <h2 className="break-words font-semibold">
                  {workflow.name}
                </h2>

                <p className="mt-2 break-words text-sm text-muted-foreground">
                  {workflow.description ??
                    t(
                      "noDescription",
                    )}
                </p>

                <div className="mt-5 space-y-3 border-t border-border pt-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t("project")}
                    </p>

                    <p className="mt-1 break-words text-sm">
                      {
                        workflow.project_name
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {t("slug")}
                    </p>

                    <p className="mt-1 break-all text-sm">
                      {workflow.slug}
                    </p>
                  </div>
                </div>
              </Link>
            ),
          )}
        </section>
      ) : (
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
      )}
    </div>
  );
}