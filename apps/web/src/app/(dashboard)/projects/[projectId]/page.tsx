"use client";

import { DemoActionButton } from "@/components/demo/demo-controls";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CheckSquare } from "lucide-react";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useTranslations } from "next-intl";

import { getAccessToken } from "@/lib/auth-storage";
import { getWorkspaceId } from "@/lib/workspace-storage";
import { getProjects } from "@/services/projects.service";
import {
  createTask,
  getTasks,
} from "@/services/tasks.service";
import type {
  Project,
  Task,
} from "@/types/dashboard";

type ErrorMessageKey =
  | "loadProject"
  | "missingAuthentication"
  | "createTask";

export default function ProjectDetailsPage() {
  const t = useTranslations("projectDetails");

  const params = useParams<{
    projectId: string;
  }>();

  const projectId = params.projectId;

  const [project, setProject] =
    useState<Project | null>(null);

  const [tasks, setTasks] =
    useState<Task[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    errorMessageKey,
    setErrorMessageKey,
  ] = useState<ErrorMessageKey | null>(
    null,
  );

  const [
    backendError,
    setBackendError,
  ] = useState("");

  const [showCreateForm, setShowCreateForm] =
    useState(false);

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [status, setStatus] =
    useState("pending");

  const [priority, setPriority] =
    useState("medium");

  const [dueAt, setDueAt] =
    useState("");

  const [isCreating, setIsCreating] =
    useState(false);

  const errorMessage =
    backendError ||
    (errorMessageKey
      ? t(`errors.${errorMessageKey}`)
      : "");

  function clearError() {
    setErrorMessageKey(null);
    setBackendError("");
  }

  function setCaughtError(
    error: unknown,
    fallbackKey: ErrorMessageKey,
  ) {
    if (error instanceof Error) {
      setBackendError(error.message);
      setErrorMessageKey(null);
      return;
    }

    setBackendError("");
    setErrorMessageKey(fallbackKey);
  }

  useEffect(() => {
    async function loadProject() {
      const token = getAccessToken();
      const workspaceId = getWorkspaceId();

      if (!token || !workspaceId) {
        setIsLoading(false);
        return;
      }

      try {
        const projects = await getProjects(
          token,
          workspaceId,
        );

        const selectedProject =
          projects.find(
            (item) =>
              item.id === projectId,
          );

        if (!selectedProject) {
          throw new Error(
            "Project not found in this workspace",
          );
        }

        const projectTasks =
          await getTasks(
            token,
            selectedProject.id,
          );

        setProject(selectedProject);
        setTasks(projectTasks);
      } catch (error) {
        setCaughtError(
          error,
          "loadProject",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadProject();
  }, [projectId]);

  async function handleCreateTask(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const token = getAccessToken();

    if (!token || !project) {
      setBackendError("");
      setErrorMessageKey(
        "missingAuthentication",
      );
      return;
    }

    clearError();
    setIsCreating(true);

    try {
      const task = await createTask(
        token,
        {
          project_id: project.id,
          title,
          description:
            description.trim() || undefined,
          status,
          priority,
          due_at:
            dueAt || undefined,
        },
      );

      setTasks((current) => [
        task,
        ...current,
      ]);

      setTitle("");
      setDescription("");
      setStatus("pending");
      setPriority("medium");
      setDueAt("");
      setShowCreateForm(false);
    } catch (error) {
      setCaughtError(
        error,
        "createTask",
      );
    } finally {
      setIsCreating(false);
    }
  }

  function getStatusLabel(value: string) {
    switch (value) {
      case "pending":
        return t("status.pending");
      case "in_progress":
        return t("status.inProgress");
      case "completed":
        return t("status.completed");
      case "canceled":
        return t("status.canceled");
      default:
        return value;
    }
  }

  function getPriorityLabel(value: string) {
    switch (value) {
      case "low":
        return t("priority.low");
      case "medium":
        return t("priority.medium");
      case "high":
        return t("priority.high");
      case "urgent":
        return t("priority.urgent");
      default:
        return value;
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  if (errorMessage && !project) {
    return (
      <div className="space-y-4">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft size={16} />
          {t("backToProjects")}
        </Link>

        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const openTasks = tasks.filter(
    (task) =>
      task.status !== "completed" &&
      task.status !== "canceled",
  ).length;

  return (
    <div className="space-y-8">
      <section>
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft size={16} />
          {t("backToProjects")}
        </Link>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">
              {t("project")}
            </p>

            <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight">
              {project.name}
            </h1>

            <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-muted-foreground">
              {project.description ??
                t("noDescription")}
            </p>
          </div>

          <DemoActionButton
            type="button"
            onClick={() =>
              setShowCreateForm(
                (current) => !current,
              )
            }
            className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            {showCreateForm
              ? t("cancel")
              : t("newTask")}
          </DemoActionButton>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {showCreateForm ? (
        <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">
              {t("createTask.title")}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {t("createTask.description")}
            </p>
          </div>

          <form
            onSubmit={handleCreateTask}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="task-title"
                className="mb-2 block text-sm font-medium"
              >
                {t("createTask.taskTitle")}
              </label>

              <input
                id="task-title"
                type="text"
                required
                disabled={isCreating}
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder={t(
                  "createTask.titlePlaceholder",
                )}
                className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="task-description"
                className="mb-2 block text-sm font-medium"
              >
                {t("createTask.taskDescription")}
              </label>

              <textarea
                id="task-description"
                rows={4}
                disabled={isCreating}
                value={description}
                onChange={(event) =>
                  setDescription(
                    event.target.value,
                  )
                }
                placeholder={t(
                  "createTask.descriptionPlaceholder",
                )}
                className="w-full rounded-lg border border-border bg-surface px-3 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <label
                  htmlFor="task-status"
                  className="mb-2 block text-sm font-medium"
                >
                  {t("createTask.status")}
                </label>

                <select
                  id="task-status"
                  value={status}
                  disabled={isCreating}
                  onChange={(event) =>
                    setStatus(
                      event.target.value,
                    )
                  }
                  className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary disabled:opacity-60"
                >
                  <option value="pending">
                    {t("status.pending")}
                  </option>

                  <option value="in_progress">
                    {t("status.inProgress")}
                  </option>

                  <option value="completed">
                    {t("status.completed")}
                  </option>

                  <option value="canceled">
                    {t("status.canceled")}
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="task-priority"
                  className="mb-2 block text-sm font-medium"
                >
                  {t("createTask.priority")}
                </label>

                <select
                  id="task-priority"
                  value={priority}
                  disabled={isCreating}
                  onChange={(event) =>
                    setPriority(
                      event.target.value,
                    )
                  }
                  className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary disabled:opacity-60"
                >
                  <option value="low">
                    {t("priority.low")}
                  </option>

                  <option value="medium">
                    {t("priority.medium")}
                  </option>

                  <option value="high">
                    {t("priority.high")}
                  </option>

                  <option value="urgent">
                    {t("priority.urgent")}
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="task-due-at"
                  className="mb-2 block text-sm font-medium"
                >
                  {t("createTask.dueDate")}
                </label>

                <input
                  id="task-due-at"
                  type="datetime-local"
                  value={dueAt}
                  disabled={isCreating}
                  onChange={(event) =>
                    setDueAt(
                      event.target.value,
                    )
                  }
                  className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary disabled:opacity-60"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <DemoActionButton
                type="submit"
                disabled={isCreating}
                className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCreating
                  ? t("createTask.creating")
                  : t("createTask.submit")}
              </DemoActionButton>
            </div>
          </form>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            {t("stats.totalTasks")}
          </p>

          <p className="mt-3 text-3xl font-semibold tracking-tight">
            {tasks.length}
          </p>
        </article>

        <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            {t("stats.openTasks")}
          </p>

          <p className="mt-3 text-3xl font-semibold tracking-tight">
            {openTasks}
          </p>
        </article>

        <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            {t("stats.projectSlug")}
          </p>

          <p className="mt-3 break-all text-sm font-semibold">
            {project.slug}
          </p>
        </article>
      </section>

      <section className="rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-semibold">
              {t("tasks.title")}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {t("tasks.description")}
            </p>
          </div>

          <CheckSquare
            size={20}
            className="text-muted-foreground"
          />
        </div>

        {tasks.length > 0 ? (
          <div className="divide-y divide-border">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={`/tasks/${task.id}`}
                className="flex min-w-0 flex-col gap-2 p-5 transition hover:bg-surface-muted/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="break-words font-medium">
                    {task.title}
                  </p>

                  <p className="mt-1 break-words text-sm text-muted-foreground">
                    {task.description ??
                      t("noDescription")}
                  </p>

                  {task.due_at ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("tasks.due")}:{" "}
                      {new Date(
                        task.due_at,
                      ).toLocaleString()}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-3 text-sm">
                  <span className="rounded-full bg-surface-muted px-2.5 py-1 text-muted-foreground">
                    {getPriorityLabel(
                      task.priority,
                    )}
                  </span>

                  <span className="font-medium">
                    {getStatusLabel(
                      task.status,
                    )}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {t("tasks.empty")}
          </div>
        )}
      </section>
    </div>
  );
}