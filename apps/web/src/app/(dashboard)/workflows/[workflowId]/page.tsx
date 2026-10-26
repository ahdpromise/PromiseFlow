"use client";

import CustomSelect from "@/components/ui/custom-select";

import Link from "next/link";
import {
  useParams,
  useRouter,
} from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  GitBranch,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { getAccessToken } from "@/lib/auth-storage";
import { getWorkspaceId } from "@/lib/workspace-storage";
import { getProjects } from "@/services/projects.service";
import {
  createWorkflowStep,
  deleteWorkflowStep,
  getWorkflowSteps,
  reorderWorkflowSteps,
  updateWorkflowStep,
  type WorkflowStep,
} from "@/services/workflow-steps.service";
import {
  deleteWorkflow,
  getWorkflows,
  updateWorkflow,
  type Workflow,
} from "@/services/workflows.service";
import type { Project } from "@/types/dashboard";

type ErrorMessageKey =
  | "authenticationMissing"
  | "notFound"
  | "loadWorkflow"
  | "authenticationOrWorkflowMissing"
  | "required"
  | "createStep"
  | "updateWorkflow"
  | "updateRequired"
  | "deleteWorkflow"
  | "updateStep"
  | "updateStepRequired"
  | "deleteStep"
  | "reorderSteps";

type SuccessMessageKey =
  | "stepCreated"
  | "updated"
  | "stepUpdated"
  | "stepDeleted"
  | "stepsReordered";

export default function WorkflowDetailsPage() {
  const t = useTranslations("workflowDetails");
  const router = useRouter();

  const params = useParams<{
    workflowId: string;
  }>();

  const workflowId = params.workflowId;

  const [workflow, setWorkflow] =
    useState<Workflow | null>(null);

  const [project, setProject] =
    useState<Project | null>(null);

  const [steps, setSteps] =
    useState<WorkflowStep[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

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

  const [
    showCreateForm,
    setShowCreateForm,
  ] = useState(false);

  const [
    showEditForm,
    setShowEditForm,
  ] = useState(false);

  const [
    showDeleteModal,
    setShowDeleteModal,
  ] = useState(false);

  const [
    editingStepId,
    setEditingStepId,
  ] = useState<string | null>(null);

  const [
    deletingStep,
    setDeletingStep,
  ] = useState<WorkflowStep | null>(null);

  const [name, setName] =
    useState("");

  const [slug, setSlug] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [editName, setEditName] =
    useState("");

  const [editSlug, setEditSlug] =
    useState("");

  const [
    editDescription,
    setEditDescription,
  ] = useState("");

  const [
    editStepName,
    setEditStepName,
  ] = useState("");

  const [
    editStepSlug,
    setEditStepSlug,
  ] = useState("");

  const [
    editStepDescription,
    setEditStepDescription,
  ] = useState("");

  const [
    editStepType,
    setEditStepType,
  ] = useState("approval");

  const [isCreating, setIsCreating] =
    useState(false);

  const [isUpdating, setIsUpdating] =
    useState(false);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [
    isUpdatingStep,
    setIsUpdatingStep,
  ] = useState(false);

  const [
    isDeletingStep,
    setIsDeletingStep,
  ] = useState(false);

  const [
    isReorderingSteps,
    setIsReorderingSteps,
  ] = useState(false);

  useEffect(() => {
    async function loadWorkflow() {
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
        const projects =
          await getProjects(
            token,
            workspaceId,
          );

        let selectedWorkflow:
          | Workflow
          | undefined;

        let selectedProject:
          | Project
          | undefined;

        for (
          const projectItem of projects
        ) {
          const projectWorkflows =
            await getWorkflows(
              token,
              projectItem.id,
            );

          const found =
            projectWorkflows.find(
              (item) =>
                item.id === workflowId,
            );

          if (found) {
            selectedWorkflow = found;
            selectedProject =
              projectItem;
            break;
          }
        }

        if (
          !selectedWorkflow ||
          !selectedProject
        ) {
          setErrorMessageKey(
            "notFound",
          );
          return;
        }

        const workflowSteps =
          await getWorkflowSteps(
            token,
            selectedWorkflow.id,
          );

        setWorkflow(
          selectedWorkflow,
        );
        setProject(selectedProject);
        setSteps(workflowSteps);
      } catch {
        setErrorMessageKey(
          "loadWorkflow",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadWorkflow();
  }, [workflowId]);

  const errorMessage =
    errorMessageKey
      ? t(`errors.${errorMessageKey}`)
      : "";

  const successMessage =
    successMessageKey
      ? t(
          `success.${successMessageKey}`,
        )
      : "";

  function openEditForm() {
    if (!workflow) {
      return;
    }

    setEditName(workflow.name);
    setEditSlug(workflow.slug);
    setEditDescription(
      workflow.description ?? "",
    );

    setEditingStepId(null);
    setDeletingStep(null);
    setShowCreateForm(false);
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

  function openDeleteModal() {
    setEditingStepId(null);
    setDeletingStep(null);
    setShowCreateForm(false);
    setShowEditForm(false);
    setErrorMessageKey(null);
    setSuccessMessageKey(null);
    setShowDeleteModal(true);
  }

  function closeDeleteModal() {
    if (isDeleting) {
      return;
    }

    setShowDeleteModal(false);
  }

  function openEditStepForm(
    step: WorkflowStep,
  ) {
    if (
      isUpdatingStep ||
      isDeletingStep ||
      isReorderingSteps
    ) {
      return;
    }

    setEditingStepId(step.id);
    setDeletingStep(null);
    setEditStepName(step.name);
    setEditStepSlug(step.slug);
    setEditStepDescription(
      step.description ?? "",
    );
    setEditStepType(step.step_type);

    setShowCreateForm(false);
    setShowEditForm(false);
    setErrorMessageKey(null);
    setSuccessMessageKey(null);
  }

  function closeEditStepForm() {
    if (isUpdatingStep) {
      return;
    }

    setEditingStepId(null);
  }

  function openDeleteStepModal(
    step: WorkflowStep,
  ) {
    if (
      isDeletingStep ||
      isUpdatingStep ||
      isReorderingSteps
    ) {
      return;
    }

    setEditingStepId(null);
    setShowCreateForm(false);
    setShowEditForm(false);
    setErrorMessageKey(null);
    setSuccessMessageKey(null);
    setDeletingStep(step);
  }

  function closeDeleteStepModal() {
    if (isDeletingStep) {
      return;
    }

    setDeletingStep(null);
  }

  async function handleUpdateWorkflow(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const token = getAccessToken();

    if (!token || !workflow) {
      setErrorMessageKey(
        "authenticationOrWorkflowMissing",
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
      const updatedWorkflow =
        await updateWorkflow(
          token,
          workflow.id,
          {
            name: editName.trim(),
            slug: editSlug.trim(),
            description:
              editDescription.trim() ||
              null,
          },
        );

      setWorkflow(
        updatedWorkflow,
      );
      setShowEditForm(false);

      setSuccessMessageKey(
        "updated",
      );
    } catch {
      setErrorMessageKey(
        "updateWorkflow",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDeleteWorkflow() {
    const token = getAccessToken();

    if (!token || !workflow) {
      setShowDeleteModal(false);
      setErrorMessageKey(
        "authenticationOrWorkflowMissing",
      );
      return;
    }

    setIsDeleting(true);
    setErrorMessageKey(null);
    setSuccessMessageKey(null);

    try {
      await deleteWorkflow(
        token,
        workflow.id,
      );

      sessionStorage.setItem(
        "promiseflow_workflow_deleted",
        "true",
      );

      router.push("/workflows");
    } catch {
      setShowDeleteModal(false);
      setErrorMessageKey(
        "deleteWorkflow",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleCreateStep(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const token = getAccessToken();

    if (!token || !workflow) {
      setErrorMessageKey(
        "authenticationOrWorkflowMissing",
      );
      return;
    }

    if (
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
      const nextPosition =
        steps.length > 0
          ? Math.max(
              ...steps.map(
                (step) =>
                  step.position,
              ),
            ) + 1
          : 0;

      const newStep =
        await createWorkflowStep(
          token,
          {
            workflow_id:
              workflow.id,
            name: name.trim(),
            slug: slug.trim(),
            description:
              description.trim() ||
              undefined,
            step_type: "approval",
            position: nextPosition,
          },
        );

      setSteps((current) =>
        [...current, newStep].sort(
          (a, b) =>
            a.position -
            b.position,
        ),
      );

      setName("");
      setSlug("");
      setDescription("");
      setShowCreateForm(false);

      setSuccessMessageKey(
        "stepCreated",
      );
    } catch {
      setErrorMessageKey(
        "createStep",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdateStep(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const token = getAccessToken();

    if (
      !token ||
      !workflow ||
      !editingStepId
    ) {
      setErrorMessageKey(
        "authenticationOrWorkflowMissing",
      );
      return;
    }

    if (
      !editStepName.trim() ||
      !editStepSlug.trim()
    ) {
      setErrorMessageKey(
        "updateStepRequired",
      );
      return;
    }

    setIsUpdatingStep(true);
    setErrorMessageKey(null);
    setSuccessMessageKey(null);

    try {
      const updatedStep =
        await updateWorkflowStep(
          token,
          editingStepId,
          {
            name: editStepName.trim(),
            slug: editStepSlug.trim(),
            description:
              editStepDescription.trim() ||
              null,
            step_type:
              editStepType,
          },
        );

      setSteps((current) =>
        current
          .map((step) =>
            step.id ===
            updatedStep.id
              ? updatedStep
              : step,
          )
          .sort(
            (a, b) =>
              a.position -
              b.position,
          ),
      );

      setEditingStepId(null);

      setSuccessMessageKey(
        "stepUpdated",
      );
    } catch {
      setErrorMessageKey(
        "updateStep",
      );
    } finally {
      setIsUpdatingStep(false);
    }
  }

  async function handleDeleteStep() {
    const token = getAccessToken();

    if (
      !token ||
      !workflow ||
      !deletingStep
    ) {
      setDeletingStep(null);
      setErrorMessageKey(
        "authenticationOrWorkflowMissing",
      );
      return;
    }

    const workflowStepId =
      deletingStep.id;

    setIsDeletingStep(true);
    setErrorMessageKey(null);
    setSuccessMessageKey(null);

    try {
      await deleteWorkflowStep(
        token,
        workflowStepId,
      );

      setSteps((current) =>
        current.filter(
          (step) =>
            step.id !==
            workflowStepId,
        ),
      );

      setDeletingStep(null);
      setSuccessMessageKey(
        "stepDeleted",
      );
    } catch {
      setDeletingStep(null);
      setErrorMessageKey(
        "deleteStep",
      );
    } finally {
      setIsDeletingStep(false);
    }
  }

  async function handleMoveStep(
    stepIndex: number,
    direction: "up" | "down",
  ) {
    const token = getAccessToken();

    if (
      !token ||
      !workflow ||
      isReorderingSteps
    ) {
      return;
    }

    const targetIndex =
      direction === "up"
        ? stepIndex - 1
        : stepIndex + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= steps.length
    ) {
      return;
    }

    const reorderedSteps =
      [...steps];

    [
      reorderedSteps[stepIndex],
      reorderedSteps[targetIndex],
    ] = [
      reorderedSteps[targetIndex],
      reorderedSteps[stepIndex],
    ];

    setIsReorderingSteps(true);
    setErrorMessageKey(null);
    setSuccessMessageKey(null);

    try {
      const savedSteps =
        await reorderWorkflowSteps(
          token,
          {
            workflow_id:
              workflow.id,
            step_ids:
              reorderedSteps.map(
                (step) => step.id,
              ),
          },
        );

      setSteps(savedSteps);
      setSuccessMessageKey(
        "stepsReordered",
      );
    } catch {
      setErrorMessageKey(
        "reorderSteps",
      );
    } finally {
      setIsReorderingSteps(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  if (
    errorMessage &&
    !workflow
  ) {
    return (
      <div className="space-y-4">
        <Link
          href="/workflows"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft size={16} />
          {t("backToWorkflows")}
        </Link>

        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      </div>
    );
  }

  if (!workflow || !project) {
    return null;
  }

  return (
    <>
      <div className="space-y-8">
        <section>
          <Link
            href="/workflows"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft size={16} />
            {t("backToWorkflows")}
          </Link>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">
                {t("workflow")}
              </p>

              <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight">
                {workflow.name}
              </h1>

              <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-muted-foreground">
                {workflow.description ??
                  t("noDescription")}
              </p>

              <p className="mt-2 text-sm text-muted-foreground">
                {t("project")}:{" "}
                <span className="font-medium text-foreground">
                  {project.name}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openDeleteModal}
                disabled={
                  isUpdating ||
                  isCreating ||
                  isDeleting ||
                  isUpdatingStep ||
                  isDeletingStep ||
                  isReorderingSteps
                }
                className="h-10 rounded-lg border border-red-300 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("deleteWorkflow")}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (showEditForm) {
                    closeEditForm();
                  } else {
                    openEditForm();
                  }
                }}
                disabled={
                  isUpdating ||
                  isDeleting ||
                  isUpdatingStep ||
                  isDeletingStep ||
                  isReorderingSteps
                }
                className="h-10 rounded-lg border border-border px-4 text-sm font-semibold transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showEditForm
                  ? t("cancel")
                  : t("editWorkflow")}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(
                    (current) =>
                      !current,
                  );

                  setEditingStepId(null);
                  setDeletingStep(null);
                  setShowEditForm(false);
                  setErrorMessageKey(null);
                  setSuccessMessageKey(null);
                }}
                disabled={
                  isDeleting ||
                  isUpdatingStep ||
                  isDeletingStep ||
                  isReorderingSteps
                }
                className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {showCreateForm
                  ? t("cancel")
                  : t("newStep")}
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
            onSubmit={
              handleUpdateWorkflow
            }
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
                  htmlFor="edit-workflow-name"
                  className="text-sm font-medium"
                >
                  {t(
                    "edit.workflowName",
                  )}
                </label>

                <input
                  id="edit-workflow-name"
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
                  htmlFor="edit-workflow-slug"
                  className="text-sm font-medium"
                >
                  {t("edit.slug")}
                </label>

                <input
                  id="edit-workflow-slug"
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

              <div className="md:col-span-2">
                <label
                  htmlFor="edit-workflow-description"
                  className="text-sm font-medium"
                >
                  {t(
                    "edit.descriptionLabel",
                  )}
                </label>

                <textarea
                  id="edit-workflow-description"
                  value={
                    editDescription
                  }
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

        {showCreateForm ? (
          <form
            onSubmit={
              handleCreateStep
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
                  htmlFor="step-name"
                  className="text-sm font-medium"
                >
                  {t("create.stepName")}
                </label>

                <input
                  id="step-name"
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
                  htmlFor="step-slug"
                  className="text-sm font-medium"
                >
                  {t("create.slug")}
                </label>

                <input
                  id="step-slug"
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

              <div className="md:col-span-2">
                <label
                  htmlFor="step-description"
                  className="text-sm font-medium"
                >
                  {t(
                    "create.descriptionLabel",
                  )}
                </label>

                <input
                  id="step-description"
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

        <section className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              {t("stats.steps")}
            </p>

            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {steps.length}
            </p>
          </article>

          <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              {t("stats.project")}
            </p>

            <p className="mt-3 text-sm font-semibold">
              {project.name}
            </p>
          </article>

          <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              {t(
                "stats.workflowSlug",
              )}
            </p>

            <p className="mt-3 break-all text-sm font-semibold">
              {workflow.slug}
            </p>
          </article>
        </section>

        <section className="rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="font-semibold">
                {t("steps.title")}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  "steps.description",
                )}
              </p>
            </div>

            <GitBranch
              size={20}
              className="text-muted-foreground"
            />
          </div>

          {steps.length > 0 ? (
            <div className="divide-y divide-border">
              {steps.map(
                (step, stepIndex) => (
                  <div
                    key={step.id}
                    className="p-5"
                  >
                    {editingStepId ===
                    step.id ? (
                      <form
                        onSubmit={
                          handleUpdateStep
                        }
                        className="rounded-xl border border-border bg-background p-5"
                      >
                        <div>
                          <h3 className="font-semibold">
                            {t(
                              "editStep.title",
                            )}
                          </h3>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {t(
                              "editStep.description",
                            )}
                          </p>
                        </div>

                        <div className="mt-5 grid gap-5 md:grid-cols-2">
                          <div>
                            <label
                              htmlFor={`edit-step-name-${step.id}`}
                              className="text-sm font-medium"
                            >
                              {t(
                                "editStep.stepName",
                              )}
                            </label>

                            <input
                              id={`edit-step-name-${step.id}`}
                              value={
                                editStepName
                              }
                              disabled={
                                isUpdatingStep
                              }
                              onChange={(
                                event,
                              ) =>
                                setEditStepName(
                                  event
                                    .target
                                    .value,
                                )
                              }
                              placeholder={t(
                                "editStep.namePlaceholder",
                              )}
                              className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`edit-step-slug-${step.id}`}
                              className="text-sm font-medium"
                            >
                              {t(
                                "editStep.slug",
                              )}
                            </label>

                            <input
                              id={`edit-step-slug-${step.id}`}
                              value={
                                editStepSlug
                              }
                              disabled={
                                isUpdatingStep
                              }
                              onChange={(
                                event,
                              ) =>
                                setEditStepSlug(
                                  event
                                    .target
                                    .value,
                                )
                              }
                              placeholder={t(
                                "editStep.slugPlaceholder",
                              )}
                              className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
                            />
                          </div>

                          <div>
                            <label
                              htmlFor={`edit-step-type-${step.id}`}
                              className="text-sm font-medium"
                            >
                              {t(
                                "editStep.stepType",
                              )}
                            </label>

                            <CustomSelect
      id={`edit-step-type-${step.id}`}
      value={editStepType}
      disabled={isUpdatingStep}
      className="mt-2"
      options={[
        {
          value: "approval",
          label: t("editStep.approval"),
        },
      ]}
      onChange={setEditStepType}
    />
                          </div>

                          <div>
                            <label
                              htmlFor={`edit-step-description-${step.id}`}
                              className="text-sm font-medium"
                            >
                              {t(
                                "editStep.descriptionLabel",
                              )}
                            </label>

                            <input
                              id={`edit-step-description-${step.id}`}
                              value={
                                editStepDescription
                              }
                              disabled={
                                isUpdatingStep
                              }
                              onChange={(
                                event,
                              ) =>
                                setEditStepDescription(
                                  event
                                    .target
                                    .value,
                                )
                              }
                              placeholder={t(
                                "editStep.descriptionPlaceholder",
                              )}
                              className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
                            />
                          </div>
                        </div>

                        <div className="mt-5 flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={
                              closeEditStepForm
                            }
                            disabled={
                              isUpdatingStep
                            }
                            className="h-10 rounded-lg border border-border px-4 text-sm font-semibold transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {t(
                              "editStep.cancel",
                            )}
                          </button>

                          <button
                            type="submit"
                            disabled={
                              isUpdatingStep
                            }
                            className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isUpdatingStep
                              ? t(
                                  "editStep.saving",
                                )
                              : t(
                                  "editStep.submit",
                                )}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-sm font-semibold">
                            {step.position +
                              1}
                          </div>

                          <div>
                            <p className="font-medium">
                              {step.name}
                            </p>

                            <p className="mt-1 text-sm text-muted-foreground">
                              {step.description ??
                                t(
                                  "noDescription",
                                )}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-muted-foreground">
                            {step.step_type ===
                            "approval"
                              ? t(
                                  "stepTypes.approval",
                                )
                              : step.step_type}
                          </span>

                          <span className="mr-1 text-muted-foreground">
                            {step.slug}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              void handleMoveStep(
                                stepIndex,
                                "up",
                              );
                            }}
                            disabled={
                              stepIndex === 0 ||
                              isReorderingSteps ||
                              isUpdatingStep ||
                              isDeletingStep ||
                              isDeleting
                            }
                            title={t(
                              "reorder.moveUp",
                            )}
                            aria-label={t(
                              "reorder.moveUp",
                            )}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ArrowUp
                              size={16}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              void handleMoveStep(
                                stepIndex,
                                "down",
                              );
                            }}
                            disabled={
                              stepIndex ===
                                steps.length -
                                  1 ||
                              isReorderingSteps ||
                              isUpdatingStep ||
                              isDeletingStep ||
                              isDeleting
                            }
                            title={t(
                              "reorder.moveDown",
                            )}
                            aria-label={t(
                              "reorder.moveDown",
                            )}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <ArrowDown
                              size={16}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openEditStepForm(
                                step,
                              )
                            }
                            disabled={
                              isUpdatingStep ||
                              isDeleting ||
                              isDeletingStep ||
                              isReorderingSteps
                            }
                            className="h-9 rounded-lg border border-border px-3 text-sm font-semibold transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {t(
                              "editStep.button",
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openDeleteStepModal(
                                step,
                              )
                            }
                            disabled={
                              isUpdatingStep ||
                              isDeleting ||
                              isDeletingStep ||
                              isReorderingSteps
                            }
                            className="h-9 rounded-lg border border-red-300 px-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {t(
                              "deleteStep.button",
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm font-medium">
                {t(
                  "steps.emptyTitle",
                )}
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  "steps.emptyDescription",
                )}
              </p>
            </div>
          )}
        </section>
      </div>

      {showDeleteModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-workflow-title"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl">
            <h2
              id="delete-workflow-title"
              className="text-lg font-semibold"
            >
              {t("delete.title")}
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t("delete.description")}
            </p>

            <p className="mt-4 break-words rounded-lg bg-surface-muted p-3 text-sm font-semibold">
              {workflow.name}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="h-10 rounded-lg border border-border px-4 text-sm font-semibold transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("delete.cancel")}
              </button>

              <button
                type="button"
                onClick={() => {
                  void handleDeleteWorkflow();
                }}
                disabled={isDeleting}
                className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting
                  ? t("delete.deleting")
                  : t("delete.confirm")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deletingStep ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-workflow-step-title"
        >
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-xl">
            <h2
              id="delete-workflow-step-title"
              className="text-lg font-semibold"
            >
              {t("deleteStep.title")}
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t(
                "deleteStep.description",
              )}
            </p>

            <p className="mt-4 break-words rounded-lg bg-surface-muted p-3 text-sm font-semibold">
              {deletingStep.name}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={
                  closeDeleteStepModal
                }
                disabled={
                  isDeletingStep
                }
                className="h-10 rounded-lg border border-border px-4 text-sm font-semibold transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t(
                  "deleteStep.cancel",
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  void handleDeleteStep();
                }}
                disabled={
                  isDeletingStep
                }
                className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeletingStep
                  ? t(
                      "deleteStep.deleting",
                    )
                  : t(
                      "deleteStep.confirm",
                    )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}