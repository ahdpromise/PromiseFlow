"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import { getAccessToken } from "@/lib/auth-storage";
import { getWorkspaceId } from "@/lib/workspace-storage";
import { getProjects } from "@/services/projects.service";
import {
  createTask,
  deleteTask,
  getTasks,
} from "@/services/tasks.service";
import type {
  Project,
  Task,
} from "@/types/dashboard";

type TaskWithProject = Task & {
  project_name: string;
};

type ErrorMessageKey =
  | "loadError"
  | "deleteError"
  | "createError"
  | "authenticationMissing"
  | "createRequired";

export default function TasksPage() {
  const t = useTranslations("tasks");

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [tasks, setTasks] =
    useState<TaskWithProject[]>([]);

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    errorMessageKey,
    setErrorMessageKey,
  ] = useState<ErrorMessageKey | null>(
    null,
  );

  const [successMessageKey, setSuccessMessageKey] = useState<"deleteSuccess" | null>(null);

  const [
    taskToDelete,
    setTaskToDelete,
  ] = useState<TaskWithProject | null>(
    null,
  );

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [
    isCreateModalOpen,
    setIsCreateModalOpen,
  ] = useState(false);

  const [isCreating, setIsCreating] =
    useState(false);

  const [
    selectedProjectId,
    setSelectedProjectId,
  ] = useState("");

  const [title, setTitle] =
    useState("");

  const [
    description,
    setDescription,
  ] = useState("");

  const [status, setStatus] =
    useState("pending");

  const [priority, setPriority] =
    useState("medium");

  const [dueAt, setDueAt] =
    useState("");

  const [
    projectFilter,
    setProjectFilter,
  ] = useState("all");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    priorityFilter,
    setPriorityFilter,
  ] = useState("all");

  useEffect(() => {
    async function loadTasks() {
      const token = getAccessToken();
      const workspaceId =
        getWorkspaceId();

      if (!token || !workspaceId) {
        setIsLoading(false);
        return;
      }

      try {
        const loadedProjects =
          await getProjects(
            token,
            workspaceId,
          );

        setProjects(loadedProjects);

        const tasksByProject =
          await Promise.all(
            loadedProjects.map(
              async (
                project: Project,
              ) => {
                const projectTasks =
                  await getTasks(
                    token,
                    project.id,
                  );

                return projectTasks.map(
                  (task) => ({
                    ...task,
                    project_name:
                      project.name,
                  }),
                );
              },
            ),
          );

        setTasks(
          tasksByProject.flat(),
        );
      } catch {
        setErrorMessageKey(
          "loadError",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadTasks();
  }, []);

  const errorMessage =
    errorMessageKey
      ? t(errorMessageKey)
      : "";

  const successMessage = successMessageKey ? t(successMessageKey) : "";

  const openTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.status !== "completed" &&
          task.status !== "canceled",
      ).length,
    [tasks],
  );

  const completedTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.status === "completed",
      ).length,
    [tasks],
  );

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const matchesProject =
          projectFilter === "all" ||
          task.project_id ===
            projectFilter;

        const matchesStatus =
          statusFilter === "all" ||
          task.status === statusFilter;

        const matchesPriority =
          priorityFilter === "all" ||
          task.priority ===
            priorityFilter;

        return (
          matchesProject &&
          matchesStatus &&
          matchesPriority
        );
      }),
    [
      tasks,
      projectFilter,
      statusFilter,
      priorityFilter,
    ],
  );

  const hasActiveFilters =
    projectFilter !== "all" ||
    statusFilter !== "all" ||
    priorityFilter !== "all";

  function getStatusLabel(
    value: string,
  ) {
    switch (value) {
      case "pending":
        return t("status.pending");

      case "in_progress":
        return t(
          "status.inProgress",
        );

      case "completed":
        return t(
          "status.completed",
        );

      case "canceled":
        return t(
          "status.canceled",
        );

      default:
        return value;
    }
  }

  function getPriorityLabel(
    value: string,
  ) {
    switch (value) {
      case "low":
        return t("priority.low");

      case "medium":
        return t(
          "priority.medium",
        );

      case "high":
        return t("priority.high");

      case "urgent":
        return t(
          "priority.urgent",
        );

      default:
        return value;
    }
  }

  function resetFilters() {
    setProjectFilter("all");
    setStatusFilter("all");
    setPriorityFilter("all");
  }

  function openCreateModal() {
    setErrorMessageKey(null);

    setSelectedProjectId(
      projects[0]?.id ?? "",
    );

    setTitle("");
    setDescription("");
    setStatus("pending");
    setPriority("medium");
    setDueAt("");

    setIsCreateModalOpen(true);
  }

  function closeCreateModal() {
    if (isCreating) {
      return;
    }

    setIsCreateModalOpen(false);
  }

  async function handleCreateTask(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const token = getAccessToken();

    if (!token) {
      setErrorMessageKey(
        "authenticationMissing",
      );
      setIsCreateModalOpen(false);
      return;
    }

    if (
      !selectedProjectId ||
      !title.trim()
    ) {
      setErrorMessageKey(
        "createRequired",
      );
      return;
    }

    const selectedProject =
      projects.find(
        (project) =>
          project.id ===
          selectedProjectId,
      );

    if (!selectedProject) {
      setErrorMessageKey(
        "createError",
      );
      return;
    }

    setIsCreating(true);
    setErrorMessageKey(null);

    try {
      const createdTask =
        await createTask(token, {
          project_id:
            selectedProjectId,
          title: title.trim(),
          description:
            description.trim() ||
            undefined,
          status,
          priority,
          due_at: dueAt
            ? new Date(
                `${dueAt}T12:00:00`,
              ).toISOString()
            : undefined,
        });

      setTasks((currentTasks) => [
        {
          ...createdTask,
          project_name:
            selectedProject.name,
        },
        ...currentTasks,
      ]);

      setIsCreateModalOpen(false);

      setSelectedProjectId("");
      setTitle("");
      setDescription("");
      setStatus("pending");
      setPriority("medium");
      setDueAt("");
    } catch {
      setErrorMessageKey(
        "createError",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteTask() {
    if (!taskToDelete) {
      return;
    }

    const token = getAccessToken();

    if (!token) {
      setErrorMessageKey(
        "deleteError",
      );
      setTaskToDelete(null);
      return;
    }

    setIsDeleting(true);
    setErrorMessageKey(null);
    setSuccessMessageKey(null);

    try {
      await deleteTask(
        token,
        taskToDelete.id,
      );

      setTasks((currentTasks) =>
        currentTasks.filter(
          (task) =>
            task.id !==
            taskToDelete.id,
        ),
      );

      setTaskToDelete(null);
      setSuccessMessageKey("deleteSuccess");
    } catch {
      setErrorMessageKey(
        "deleteError",
      );
      setTaskToDelete(null);
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
    <>
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
            onClick={openCreateModal}
            disabled={projects.length === 0}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("newTask")}
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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              {t("totalTasks")}
            </p>

            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {tasks.length}
            </p>
          </article>

          <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              {t("openTasks")}
            </p>

            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {openTasks}
            </p>
          </article>

          <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              {t("completedTasks")}
            </p>

            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {completedTasks}
            </p>
          </article>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
            <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label
                  htmlFor="project-filter"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t("filters.project")}
                </label>

                <select
                  id="project-filter"
                  value={projectFilter}
                  onChange={(event) =>
                    setProjectFilter(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                >
                  <option value="all">
                    {t(
                      "filters.allProjects",
                    )}
                  </option>

                  {projects.map(
                    (project) => (
                      <option
                        key={project.id}
                        value={project.id}
                      >
                        {project.name}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="status-filter"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t("filters.status")}
                </label>

                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                >
                  <option value="all">
                    {t(
                      "filters.allStatuses",
                    )}
                  </option>

                  <option value="pending">
                    {t("status.pending")}
                  </option>

                  <option value="in_progress">
                    {t(
                      "status.inProgress",
                    )}
                  </option>

                  <option value="completed">
                    {t(
                      "status.completed",
                    )}
                  </option>

                  <option value="canceled">
                    {t(
                      "status.canceled",
                    )}
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="priority-filter"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t(
                    "filters.priority",
                  )}
                </label>

                <select
                  id="priority-filter"
                  value={priorityFilter}
                  onChange={(event) =>
                    setPriorityFilter(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                >
                  <option value="all">
                    {t(
                      "filters.allPriorities",
                    )}
                  </option>

                  <option value="low">
                    {t("priority.low")}
                  </option>

                  <option value="medium">
                    {t(
                      "priority.medium",
                    )}
                  </option>

                  <option value="high">
                    {t("priority.high")}
                  </option>

                  <option value="urgent">
                    {t(
                      "priority.urgent",
                    )}
                  </option>
                </select>
              </div>
            </div>

            {hasActiveFilters ? (
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-surface-muted"
              >
                {t("filters.clear")}
              </button>
            ) : null}
          </div>
        </section>

        <section className="min-w-0 rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold">
              {t("allTasks")}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                "allTasksDescription",
              )}
            </p>
          </div>

          {filteredTasks.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredTasks.map(
                (task) => (
                  <div
                    key={task.id}
                    className="flex min-w-0 flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/tasks/${task.id}`}
                        className="break-words font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {task.title}
                      </Link>

                      <p className="mt-1 break-words text-sm text-muted-foreground">
                        {task.description ??
                          t(
                            "noDescription",
                          )}
                      </p>

                      <Link
                        href={`/projects/${task.project_id}`}
                        className="mt-2 inline-block break-words text-xs font-medium text-primary hover:underline"
                      >
                        {
                          task.project_name
                        }
                      </Link>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-3 text-sm">
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

                      <button
                        type="button"
                        onClick={() =>
                          setTaskToDelete(
                            task,
                          )
                        }
                        className="rounded-lg border border-red-200 px-3 py-1.5 font-medium text-red-600 transition hover:bg-red-50"
                      >
                        {t("delete")}
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {hasActiveFilters
                ? t("filters.noResults")
                : t("empty")}
            </div>
          )}
        </section>
      </div>

      {isCreateModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-xl">
            <div>
              <h2 className="text-lg font-semibold">
                {t("create.title")}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  "create.description",
                )}
              </p>
            </div>

            <form
              onSubmit={
                handleCreateTask
              }
              className="mt-6 space-y-4"
            >
              <div>
                <label
                  htmlFor="task-project"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t("create.project")}
                </label>

                <select
                  id="task-project"
                  value={
                    selectedProjectId
                  }
                  onChange={(event) =>
                    setSelectedProjectId(
                      event.target.value,
                    )
                  }
                  disabled={isCreating}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                >
                  {projects.map(
                    (project) => (
                      <option
                        key={project.id}
                        value={project.id}
                      >
                        {project.name}
                      </option>
                    ),
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="task-title"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t("create.taskTitle")}
                </label>

                <input
                  id="task-title"
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value,
                    )
                  }
                  disabled={isCreating}
                  placeholder={t(
                    "create.titlePlaceholder",
                  )}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                />
              </div>

              <div>
                <label
                  htmlFor="task-description"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t(
                    "create.taskDescription",
                  )}
                </label>

                <textarea
                  id="task-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value,
                    )
                  }
                  disabled={isCreating}
                  placeholder={t(
                    "create.descriptionPlaceholder",
                  )}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="task-status"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    {t("create.status")}
                  </label>

                  <select
                    id="task-status"
                    value={status}
                    onChange={(event) =>
                      setStatus(
                        event.target.value,
                      )
                    }
                    disabled={isCreating}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                  >
                    <option value="pending">
                      {t(
                        "status.pending",
                      )}
                    </option>

                    <option value="in_progress">
                      {t(
                        "status.inProgress",
                      )}
                    </option>

                    <option value="completed">
                      {t(
                        "status.completed",
                      )}
                    </option>

                    <option value="canceled">
                      {t(
                        "status.canceled",
                      )}
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="task-priority"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    {t(
                      "create.priority",
                    )}
                  </label>

                  <select
                    id="task-priority"
                    value={priority}
                    onChange={(event) =>
                      setPriority(
                        event.target.value,
                      )
                    }
                    disabled={isCreating}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                  >
                    <option value="low">
                      {t("priority.low")}
                    </option>

                    <option value="medium">
                      {t(
                        "priority.medium",
                      )}
                    </option>

                    <option value="high">
                      {t("priority.high")}
                    </option>

                    <option value="urgent">
                      {t(
                        "priority.urgent",
                      )}
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="task-due-date"
                  className="mb-1.5 block text-sm font-medium"
                >
                  {t("create.dueDate")}
                </label>

                <input
                  id="task-due-date"
                  type="date"
                  value={dueAt}
                  onChange={(event) =>
                    setDueAt(
                      event.target.value,
                    )
                  }
                  disabled={isCreating}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={
                    closeCreateModal
                  }
                  disabled={isCreating}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("cancel")}
                </button>

                <button
                  type="submit"
                  disabled={isCreating}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
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
          </div>
        </div>
      ) : null}

      {taskToDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl">
            <h2 className="text-lg font-semibold">
              {t("deleteTitle")}
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              {t("deleteConfirmation")}
            </p>

            <p className="mt-3 break-words font-medium">
              {taskToDelete.title}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() =>
                  setTaskToDelete(null)
                }
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("cancel")}
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={() =>
                  void handleDeleteTask()
                }
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting
                  ? t("deleting")
                  : t("delete")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}