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
  createAutomation,
  deleteAutomation,
  getAutomationRuns,
  getAutomations,
  setAutomationEnabled,
  updateAutomation,
  type AutomationActionType,
  type AutomationListItem,
  type AutomationRun,
  type AutomationTriggerType,
} from "@/services/automations.service";
import {
  getOrganizationMemberDirectory,
  type OrganizationMember,
} from "@/services/memberships.service";
import { getProjects } from "@/services/projects.service";

import type { Project } from "@/types/dashboard";

type ErrorMessageKey =
  | "loadError"
  | "authenticationMissing"
  | "createError"
  | "editError"
  | "toggleError"
  | "deleteError";

type SuccessMessageKey =
  | "createSuccess"
  | "editSuccess"
  | "deleteSuccess";

type AutomationFormMode =
  | "create"
  | "edit";

type AutomationTaskStatus =
  | "pending"
  | "in_progress"
  | "completed";

export default function AutomationsPage() {
  const t = useTranslations("automations");

  const [automations, setAutomations] =
    useState<AutomationListItem[]>([]);

  const [projects, setProjects] =
    useState<Project[]>([]);

  const [
    organizationMembers,
    setOrganizationMembers,
  ] = useState<OrganizationMember[]>([]);

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

  const [formMode, setFormMode] =
    useState<AutomationFormMode | null>(
      null,
    );

  const [
    editingAutomationId,
    setEditingAutomationId,
  ] = useState<string | null>(null);

  const [
    automationToDelete,
    setAutomationToDelete,
  ] =
    useState<AutomationListItem | null>(
      null,
    );

  const [
    historyAutomation,
    setHistoryAutomation,
  ] =
    useState<AutomationListItem | null>(
      null,
    );

  const [
    automationRuns,
    setAutomationRuns,
  ] = useState<AutomationRun[]>([]);

  const [
    isHistoryLoading,
    setIsHistoryLoading,
  ] = useState(false);

  const [
    historyLoadError,
    setHistoryLoadError,
  ] = useState(false);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [name, setName] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [triggerType, setTriggerType] =
    useState<AutomationTriggerType>(
      "task_created",
    );

  const [
    selectedProjectId,
    setSelectedProjectId,
  ] = useState("");

  const [
    taskStatusTrigger,
    setTaskStatusTrigger,
  ] =
    useState<AutomationTaskStatus>(
      "pending",
    );

  const [actionType, setActionType] =
    useState<AutomationActionType>(
      "create_notification",
    );

  const [
    taskStatusAction,
    setTaskStatusAction,
  ] =
    useState<AutomationTaskStatus>(
      "pending",
    );

  const [
    notificationTitle,
    setNotificationTitle,
  ] = useState("");

  const [
    notificationMessage,
    setNotificationMessage,
  ] = useState("");

  const [
    selectedApproverId,
    setSelectedApproverId,
  ] = useState("");

  const [isSaving, setIsSaving] =
    useState(false);

  const [
    togglingAutomationId,
    setTogglingAutomationId,
  ] = useState<string | null>(null);

  useEffect(() => {
    async function loadPageData() {
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
          automationItems,
          projectItems,
          memberItems,
        ] = await Promise.all([
          getAutomations(
            token,
            workspaceId,
          ),
          getProjects(
            token,
            workspaceId,
          ),
          getOrganizationMemberDirectory(
            token,
            workspaceId,
          ),
        ]);

        setAutomations(
          automationItems,
        );
        setProjects(projectItems);
        setOrganizationMembers(
          memberItems,
        );
      } catch {
        setErrorMessageKey(
          "loadError",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadPageData();
  }, []);

  const enabledCount = useMemo(
    () =>
      automations.filter(
        (automation) =>
          automation.is_enabled,
      ).length,
    [automations],
  );

  const disabledCount =
    automations.length - enabledCount;

  const errorMessage =
    errorMessageKey
      ? t(errorMessageKey)
      : "";

  const successMessage =
    successMessageKey
      ? t(successMessageKey)
      : "";

  function resetForm() {
    setName("");
    setDescription("");
    setTriggerType("task_created");
    setSelectedProjectId("");
    setTaskStatusTrigger("pending");
    setActionType(
      "create_notification",
    );
    setTaskStatusAction("pending");
    setNotificationTitle("");
    setNotificationMessage("");
    setSelectedApproverId("");
    setEditingAutomationId(null);
  }

  function openCreateForm() {
    setErrorMessageKey(null);
    setSuccessMessageKey(null);
    resetForm();
    setFormMode("create");
  }

  function openEditForm(
    automation: AutomationListItem,
  ) {
    setErrorMessageKey(null);
    setSuccessMessageKey(null);

    setEditingAutomationId(
      automation.id,
    );
    setName(automation.name);
    setDescription(
      automation.description ?? "",
    );

    setTriggerType(
      automation.trigger_type as AutomationTriggerType,
    );

    const projectId =
      automation.trigger_config
        ?.project_id;

    setSelectedProjectId(
      typeof projectId === "string"
        ? projectId
        : "",
    );

    const triggerStatus =
      automation.trigger_config?.status;

    if (
      triggerStatus === "pending" ||
      triggerStatus ===
        "in_progress" ||
      triggerStatus === "completed"
    ) {
      setTaskStatusTrigger(
        triggerStatus,
      );
    } else {
      setTaskStatusTrigger("pending");
    }

    setActionType(
      automation.action_type as AutomationActionType,
    );

    const actionStatus =
      automation.action_config?.status;

    if (
      actionStatus === "pending" ||
      actionStatus ===
        "in_progress" ||
      actionStatus === "completed"
    ) {
      setTaskStatusAction(
        actionStatus,
      );
    } else {
      setTaskStatusAction("pending");
    }

    const savedNotificationTitle =
      automation.action_config?.title;

    setNotificationTitle(
      typeof savedNotificationTitle ===
        "string"
        ? savedNotificationTitle
        : "",
    );

    const savedNotificationMessage =
      automation.action_config
        ?.message;

    setNotificationMessage(
      typeof savedNotificationMessage ===
        "string"
        ? savedNotificationMessage
        : "",
    );

    const savedApproverId =
      automation.action_config
        ?.approver_id;

    setSelectedApproverId(
      typeof savedApproverId ===
        "string"
        ? savedApproverId
        : "",
    );

    setFormMode("edit");
  }

  function closeForm() {
    if (isSaving) {
      return;
    }

    resetForm();
    setFormMode(null);
  }

  function openDeleteConfirmation(
    automation: AutomationListItem,
  ) {
    setErrorMessageKey(null);
    setSuccessMessageKey(null);
    setAutomationToDelete(
      automation,
    );
  }

  function closeDeleteConfirmation() {
    if (isDeleting) {
      return;
    }

    setAutomationToDelete(null);
  }

  async function openRunHistory(
    automation: AutomationListItem,
  ) {
    const token = getAccessToken();

    setErrorMessageKey(null);
    setSuccessMessageKey(null);
    setHistoryAutomation(
      automation,
    );
    setAutomationRuns([]);
    setHistoryLoadError(false);

    if (!token) {
      setHistoryLoadError(true);
      return;
    }

    setIsHistoryLoading(true);

    try {
      const runs =
        await getAutomationRuns(
          token,
          automation.id,
        );

      setAutomationRuns(runs);
    } catch {
      setHistoryLoadError(true);
    } finally {
      setIsHistoryLoading(false);
    }
  }

  function closeRunHistory() {
    if (isHistoryLoading) {
      return;
    }

    setHistoryAutomation(null);
    setAutomationRuns([]);
    setHistoryLoadError(false);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const token = getAccessToken();
    const workspaceId =
      getWorkspaceId();

    if (!token || !workspaceId) {
      setErrorMessageKey(
        "authenticationMissing",
      );
      return;
    }

    if (!name.trim()) {
      return;
    }

    if (
      actionType ===
        "create_notification" &&
      (!notificationTitle.trim() ||
        !notificationMessage.trim())
    ) {
      return;
    }

    if (
      actionType ===
        "create_approval_request" &&
      !selectedApproverId
    ) {
      return;
    }

    const triggerConfig =
      triggerType === "task_created"
        ? selectedProjectId
          ? {
              project_id:
                selectedProjectId,
            }
          : {}
        : triggerType ===
            "task_status_changed"
          ? {
              status:
                taskStatusTrigger,
            }
          : {};

    const actionConfig =
      actionType ===
      "create_notification"
        ? {
            title:
              notificationTitle.trim(),
            message:
              notificationMessage.trim(),
          }
        : actionType ===
            "update_task_status"
          ? {
              status:
                taskStatusAction,
            }
          : actionType ===
              "create_approval_request"
            ? {
                approver_id:
                  selectedApproverId,
              }
            : {};

    setErrorMessageKey(null);
    setSuccessMessageKey(null);
    setIsSaving(true);

    try {
      if (
        formMode === "edit" &&
        editingAutomationId
      ) {
        const updatedAutomation =
          await updateAutomation(
            token,
            editingAutomationId,
            {
              name: name.trim(),
              description:
                description.trim() ||
                undefined,
              trigger_type:
                triggerType,
              trigger_config:
                triggerConfig,
              action_type:
                actionType,
              action_config:
                actionConfig,
            },
          );

        setAutomations(
          (current) =>
            current.map(
              (automation) =>
                automation.id ===
                editingAutomationId
                  ? {
                      ...automation,
                      ...updatedAutomation,
                      creator:
                        automation.creator,
                    }
                  : automation,
            ),
        );

        setSuccessMessageKey(
          "editSuccess",
        );
      } else {
        const automation =
          await createAutomation(
            token,
            {
              organization_id:
                workspaceId,
              name: name.trim(),
              description:
                description.trim() ||
                undefined,
              trigger_type:
                triggerType,
              trigger_config:
                triggerConfig,
              action_type:
                actionType,
              action_config:
                actionConfig,
            },
          );

        setAutomations(
          (current) => [
            automation,
            ...current,
          ],
        );

        setSuccessMessageKey(
          "createSuccess",
        );
      }

      resetForm();
      setFormMode(null);
    } catch {
      setSuccessMessageKey(null);
      setErrorMessageKey(
        formMode === "edit"
          ? "editError"
          : "createError",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleEnabled(
    automation: AutomationListItem,
  ) {
    const token = getAccessToken();

    if (!token) {
      setErrorMessageKey(
        "authenticationMissing",
      );
      return;
    }

    setErrorMessageKey(null);
    setSuccessMessageKey(null);
    setTogglingAutomationId(
      automation.id,
    );

    try {
      const updatedAutomation =
        await setAutomationEnabled(
          token,
          automation.id,
          !automation.is_enabled,
        );

      setAutomations(
        (current) =>
          current.map((item) =>
            item.id === automation.id
              ? {
                  ...item,
                  ...updatedAutomation,
                  creator:
                    item.creator,
                }
              : item,
          ),
      );
    } catch {
      setErrorMessageKey(
        "toggleError",
      );
    } finally {
      setTogglingAutomationId(
        null,
      );
    }
  }

  async function handleDelete() {
    if (!automationToDelete) {
      return;
    }

    const token = getAccessToken();

    if (!token) {
      setAutomationToDelete(null);
      setErrorMessageKey(
        "authenticationMissing",
      );
      return;
    }

    setErrorMessageKey(null);
    setSuccessMessageKey(null);
    setIsDeleting(true);

    try {
      await deleteAutomation(
        token,
        automationToDelete.id,
      );

      setAutomations(
        (current) =>
          current.filter(
            (automation) =>
              automation.id !==
              automationToDelete.id,
          ),
      );

      setAutomationToDelete(null);
      setSuccessMessageKey(
        "deleteSuccess",
      );
    } catch {
      setAutomationToDelete(null);
      setSuccessMessageKey(null);
      setErrorMessageKey(
        "deleteError",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function getTriggerLabel(
    value: string,
  ) {
    switch (value) {
      case "task_status_changed":
        return t(
          "triggers.taskStatusChanged",
        );
      case "approval_approved":
        return t(
          "triggers.approvalApproved",
        );
      case "approval_rejected":
        return t(
          "triggers.approvalRejected",
        );
      default:
        return t(
          "triggers.taskCreated",
        );
    }
  }

  function getActionLabel(
    value: string,
  ) {
    switch (value) {
      case "update_task_status":
        return t(
          "actions.updateTaskStatus",
        );
      case "create_approval_request":
        return t(
          "actions.createApprovalRequest",
        );
      default:
        return t(
          "actions.createNotification",
        );
    }
  }

  function getRunStatusLabel(
    status: AutomationRun["status"],
  ) {
    switch (status) {
      case "running":
        return t(
          "runHistory.statuses.running",
        );
      case "succeeded":
        return t(
          "runHistory.statuses.succeeded",
        );
      case "failed":
        return t(
          "runHistory.statuses.failed",
        );
      default:
        return t(
          "runHistory.statuses.pending",
        );
    }
  }

  function formatRunDate(
    value: string | null,
  ) {
    if (!value) {
      return "—";
    }

    return new Intl.DateTimeFormat(
      undefined,
      {
        dateStyle: "medium",
        timeStyle: "medium",
      },
    ).format(new Date(value));
  }

  function formatRunDuration(
    startedAt: string,
    finishedAt: string | null,
  ) {
    if (!finishedAt) {
      return "—";
    }

    const milliseconds =
      new Date(
        finishedAt,
      ).getTime() -
      new Date(
        startedAt,
      ).getTime();

    if (
      !Number.isFinite(milliseconds) ||
      milliseconds < 0
    ) {
      return "—";
    }

    if (milliseconds < 1000) {
      return `${milliseconds} ms`;
    }

    return `${(
      milliseconds / 1000
    ).toFixed(2)} s`;
  }

  function formatJsonValue(
    value: Record<
      string,
      unknown
    > | null,
  ) {
    if (!value) {
      return "—";
    }

    return JSON.stringify(
      value,
      null,
      2,
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
          onClick={openCreateForm}
          className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {t("createAutomation")}
        </button>
      </section>

      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700">
          {successMessage}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            {t("totalAutomations")}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">
            {automations.length}
          </p>
        </article>

        <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            {t("enabled")}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">
            {enabledCount}
          </p>
        </article>

        <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-sm font-medium text-muted-foreground">
            {t("disabled")}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">
            {disabledCount}
          </p>
        </article>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">
            {t("listTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("listDescription")}
          </p>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {t("loading")}
          </div>
        ) : automations.length > 0 ? (
          <div className="divide-y divide-border">
            {automations.map(
              (automation) => (
                <article
                  key={automation.id}
                  className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="break-words font-medium">
                        {automation.name}
                      </h3>

                      <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-medium">
                        {automation.is_enabled
                          ? t("enabled")
                          : t("disabled")}
                      </span>
                    </div>

                    {automation.description ? (
                      <p className="mt-2 break-words text-sm text-muted-foreground">
                        {automation.description}
                      </p>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                      <p>
                        {t("trigger")}:{" "}
                        <span className="font-medium text-foreground">
                          {getTriggerLabel(
                            automation.trigger_type,
                          )}
                        </span>
                      </p>

                      <p>
                        {t("action")}:{" "}
                        <span className="font-medium text-foreground">
                          {getActionLabel(
                            automation.action_type,
                          )}
                        </span>
                      </p>
                    </div>

                    {automation.creator ? (
                      <p className="mt-3 break-words text-xs text-muted-foreground">
                        {t("createdBy")}:{" "}
                        {
                          automation
                            .creator
                            .first_name
                        }{" "}
                        {
                          automation
                            .creator
                            .last_name
                        }{" "}
                        —{" "}
                        {
                          automation
                            .creator
                            .email
                        }
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void openRunHistory(
                          automation,
                        )
                      }
                      disabled={
                        togglingAutomationId ===
                        automation.id
                      }
                      className="h-9 rounded-lg border border-border px-4 text-sm font-semibold transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t("history")}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void handleToggleEnabled(
                          automation,
                        )
                      }
                      disabled={
                        togglingAutomationId ===
                        automation.id
                      }
                      className="h-9 rounded-lg border border-border px-4 text-sm font-semibold transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {togglingAutomationId ===
                      automation.id
                        ? t(
                            "updatingStatus",
                          )
                        : automation.is_enabled
                          ? t("disable")
                          : t("enable")}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openEditForm(
                          automation,
                        )
                      }
                      disabled={
                        togglingAutomationId ===
                        automation.id
                      }
                      className="h-9 rounded-lg border border-border px-4 text-sm font-semibold transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t("edit")}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openDeleteConfirmation(
                          automation,
                        )
                      }
                      disabled={
                        togglingAutomationId ===
                        automation.id
                      }
                      className="h-9 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t("delete")}
                    </button>
                  </div>
                </article>
              ),
            )}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm font-medium">
              {t("emptyTitle")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t(
                "emptyDescription",
              )}
            </p>
          </div>
        )}
      </section>

      {historyAutomation ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onMouseDown={
            closeRunHistory
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="automation-run-history-title"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-xl"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div>
              <h2
                id="automation-run-history-title"
                className="text-xl font-semibold"
              >
                {t(
                  "runHistory.title",
                )}
              </h2>

              <p className="mt-1 font-medium">
                {
                  historyAutomation.name
                }
              </p>

              <p className="mt-2 text-sm text-muted-foreground">
                {t(
                  "runHistory.description",
                )}
              </p>
            </div>

            <div className="mt-6">
              {isHistoryLoading ? (
                <div className="rounded-xl border border-border p-8 text-center text-sm text-muted-foreground">
                  {t(
                    "runHistory.loading",
                  )}
                </div>
              ) : historyLoadError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {t(
                    "runHistory.loadError",
                  )}
                </div>
              ) : automationRuns.length ===
                0 ? (
                <div className="rounded-xl border border-border p-8 text-center">
                  <p className="text-sm font-medium">
                    {t(
                      "runHistory.emptyTitle",
                    )}
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {t(
                      "runHistory.emptyDescription",
                    )}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {automationRuns.map(
                    (run) => (
                      <article
                        key={run.id}
                        className="rounded-xl border border-border p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">
                              {t(
                                "runHistory.status",
                              )}
                            </p>

                            <p className="mt-1 font-semibold">
                              {getRunStatusLabel(
                                run.status,
                              )}
                            </p>
                          </div>

                          <span className="w-fit rounded-full bg-surface-muted px-3 py-1 text-xs font-medium">
                            {getRunStatusLabel(
                              run.status,
                            )}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-4 sm:grid-cols-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">
                              {t(
                                "runHistory.startedAt",
                              )}
                            </p>

                            <p className="mt-1 break-words text-sm">
                              {formatRunDate(
                                run.started_at,
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-muted-foreground">
                              {t(
                                "runHistory.finishedAt",
                              )}
                            </p>

                            <p className="mt-1 break-words text-sm">
                              {formatRunDate(
                                run.finished_at,
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium text-muted-foreground">
                              {t(
                                "runHistory.duration",
                              )}
                            </p>

                            <p className="mt-1 text-sm">
                              {formatRunDuration(
                                run.started_at,
                                run.finished_at,
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <p className="text-xs font-medium text-muted-foreground">
                            {t(
                              "runHistory.triggerPayload",
                            )}
                          </p>

                          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-surface-muted p-3 text-xs">
                            {formatJsonValue(
                              run.trigger_payload,
                            )}
                          </pre>
                        </div>

                        {run.result ? (
                          <div className="mt-4">
                            <p className="text-xs font-medium text-muted-foreground">
                              {t(
                                "runHistory.result",
                              )}
                            </p>

                            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-surface-muted p-3 text-xs">
                              {formatJsonValue(
                                run.result,
                              )}
                            </pre>
                          </div>
                        ) : null}

                        {run.error_message ? (
                          <div className="mt-4">
                            <p className="text-xs font-medium text-red-600">
                              {t(
                                "runHistory.error",
                              )}
                            </p>

                            <p className="mt-2 break-words rounded-lg bg-red-50 p-3 text-sm text-red-700">
                              {
                                run.error_message
                              }
                            </p>
                          </div>
                        ) : null}
                      </article>
                    ),
                  )}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={closeRunHistory}
                disabled={
                  isHistoryLoading
                }
                className="h-10 rounded-lg border border-border px-4 text-sm font-semibold transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t(
                  "runHistory.close",
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {formMode ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onMouseDown={closeForm}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="automation-form-title"
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-xl"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <h2
              id="automation-form-title"
              className="text-xl font-semibold"
            >
              {formMode === "edit"
                ? t("editForm.title")
                : t("create.title")}
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              {formMode === "edit"
                ? t(
                    "editForm.description",
                  )
                : t(
                    "create.description",
                  )}
            </p>

            <form
              className="mt-6 space-y-5"
              onSubmit={handleSubmit}
            >
              <div>
                <label
                  htmlFor="automation-name"
                  className="text-sm font-medium"
                >
                  {t("create.name")}
                </label>

                <input
                  id="automation-name"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value,
                    )
                  }
                  required
                  maxLength={150}
                  disabled={isSaving}
                  className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary disabled:opacity-50"
                />
              </div>

              <div>
                <label
                  htmlFor="automation-description"
                  className="text-sm font-medium"
                >
                  {t(
                    "create.automationDescription",
                  )}
                </label>

                <textarea
                  id="automation-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value,
                    )
                  }
                  disabled={isSaving}
                  rows={3}
                  className="mt-2 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary disabled:opacity-50"
                />
              </div>

              <div>
                <label
                  htmlFor="automation-trigger"
                  className="text-sm font-medium"
                >
                  {t(
                    "create.trigger",
                  )}
                </label>

                <select
                  id="automation-trigger"
                  value={triggerType}
                  onChange={(event) => {
                    const nextTrigger =
                      event.target
                        .value as AutomationTriggerType;

                    setTriggerType(
                      nextTrigger,
                    );

                    if (
                      nextTrigger !==
                      "task_created"
                    ) {
                      setSelectedProjectId(
                        "",
                      );
                    }

                    if (
                      nextTrigger !==
                      "task_status_changed"
                    ) {
                      setTaskStatusTrigger(
                        "pending",
                      );
                    }
                  }}
                  disabled={isSaving}
                  className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary disabled:opacity-50"
                >
                  <option value="task_created">
                    {t(
                      "triggers.taskCreated",
                    )}
                  </option>

                  <option value="task_status_changed">
                    {t(
                      "triggers.taskStatusChanged",
                    )}
                  </option>

                  <option value="approval_approved">
                    {t(
                      "triggers.approvalApproved",
                    )}
                  </option>

                  <option value="approval_rejected">
                    {t(
                      "triggers.approvalRejected",
                    )}
                  </option>
                </select>
              </div>

              {triggerType ===
              "task_created" ? (
                <div>
                  <label
                    htmlFor="automation-trigger-project"
                    className="text-sm font-medium"
                  >
                    {t(
                      "configuration.project",
                    )}
                  </label>

                  <select
                    id="automation-trigger-project"
                    value={
                      selectedProjectId
                    }
                    onChange={(event) =>
                      setSelectedProjectId(
                        event.target.value,
                      )
                    }
                    disabled={isSaving}
                    className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary disabled:opacity-50"
                  >
                    <option value="">
                      {t(
                        "configuration.allProjects",
                      )}
                    </option>

                    {projects.map(
                      (project) => (
                        <option
                          key={project.id}
                          value={
                            project.id
                          }
                        >
                          {
                            project.name
                          }
                        </option>
                      ),
                    )}
                  </select>

                  <p className="mt-2 text-xs text-muted-foreground">
                    {t(
                      "configuration.projectHelp",
                    )}
                  </p>
                </div>
              ) : null}

              {triggerType ===
              "task_status_changed" ? (
                <div>
                  <label
                    htmlFor="automation-trigger-status"
                    className="text-sm font-medium"
                  >
                    {t(
                      "configuration.newStatus",
                    )}
                  </label>

                  <select
                    id="automation-trigger-status"
                    value={
                      taskStatusTrigger
                    }
                    onChange={(event) =>
                      setTaskStatusTrigger(
                        event.target
                          .value as AutomationTaskStatus,
                      )
                    }
                    disabled={isSaving}
                    className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary disabled:opacity-50"
                  >
                    <option value="pending">
                      {t(
                        "configuration.statusPending",
                      )}
                    </option>

                    <option value="in_progress">
                      {t(
                        "configuration.statusInProgress",
                      )}
                    </option>

                    <option value="completed">
                      {t(
                        "configuration.statusCompleted",
                      )}
                    </option>
                  </select>

                  <p className="mt-2 text-xs text-muted-foreground">
                    {t(
                      "configuration.statusHelp",
                    )}
                  </p>
                </div>
              ) : null}

              <div>
                <label
                  htmlFor="automation-action"
                  className="text-sm font-medium"
                >
                  {t(
                    "create.action",
                  )}
                </label>

                <select
                  id="automation-action"
                  value={actionType}
                  onChange={(event) => {
                    const nextAction =
                      event.target
                        .value as AutomationActionType;

                    setActionType(
                      nextAction,
                    );

                    if (
                      nextAction !==
                      "create_notification"
                    ) {
                      setNotificationTitle(
                        "",
                      );
                      setNotificationMessage(
                        "",
                      );
                    }

                    if (
                      nextAction !==
                      "update_task_status"
                    ) {
                      setTaskStatusAction(
                        "pending",
                      );
                    }

                    if (
                      nextAction !==
                      "create_approval_request"
                    ) {
                      setSelectedApproverId(
                        "",
                      );
                    }
                  }}
                  disabled={isSaving}
                  className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary disabled:opacity-50"
                >
                  <option value="create_notification">
                    {t(
                      "actions.createNotification",
                    )}
                  </option>

                  <option value="update_task_status">
                    {t(
                      "actions.updateTaskStatus",
                    )}
                  </option>

                  <option value="create_approval_request">
                    {t(
                      "actions.createApprovalRequest",
                    )}
                  </option>
                </select>
              </div>

              {actionType ===
              "create_notification" ? (
                <>
                  <div>
                    <label
                      htmlFor="automation-notification-title"
                      className="text-sm font-medium"
                    >
                      {t(
                        "configuration.notificationTitle",
                      )}
                    </label>

                    <input
                      id="automation-notification-title"
                      value={
                        notificationTitle
                      }
                      onChange={(event) =>
                        setNotificationTitle(
                          event.target.value,
                        )
                      }
                      required
                      maxLength={150}
                      disabled={isSaving}
                      className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="automation-notification-message"
                      className="text-sm font-medium"
                    >
                      {t(
                        "configuration.notificationMessage",
                      )}
                    </label>

                    <textarea
                      id="automation-notification-message"
                      value={
                        notificationMessage
                      }
                      onChange={(event) =>
                        setNotificationMessage(
                          event.target.value,
                        )
                      }
                      required
                      maxLength={1000}
                      rows={3}
                      disabled={isSaving}
                      className="mt-2 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary disabled:opacity-50"
                    />

                    <p className="mt-2 text-xs text-muted-foreground">
                      {t(
                        "configuration.notificationHelp",
                      )}
                    </p>
                  </div>
                </>
              ) : null}

              {actionType ===
              "update_task_status" ? (
                <div>
                  <label
                    htmlFor="automation-action-status"
                    className="text-sm font-medium"
                  >
                    {t(
                      "configuration.newStatus",
                    )}
                  </label>

                  <select
                    id="automation-action-status"
                    value={
                      taskStatusAction
                    }
                    onChange={(event) =>
                      setTaskStatusAction(
                        event.target
                          .value as AutomationTaskStatus,
                      )
                    }
                    disabled={isSaving}
                    className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary disabled:opacity-50"
                  >
                    <option value="pending">
                      {t(
                        "configuration.statusPending",
                      )}
                    </option>

                    <option value="in_progress">
                      {t(
                        "configuration.statusInProgress",
                      )}
                    </option>

                    <option value="completed">
                      {t(
                        "configuration.statusCompleted",
                      )}
                    </option>
                  </select>

                  <p className="mt-2 text-xs text-muted-foreground">
                    {t(
                      "configuration.updateTaskStatusHelp",
                    )}
                  </p>
                </div>
              ) : null}

              {actionType ===
              "create_approval_request" ? (
                <div>
                  <label
                    htmlFor="automation-approver"
                    className="text-sm font-medium"
                  >
                    {t(
                      "configuration.approver",
                    )}
                  </label>

                  <select
                    id="automation-approver"
                    value={
                      selectedApproverId
                    }
                    onChange={(event) =>
                      setSelectedApproverId(
                        event.target.value,
                      )
                    }
                    required
                    disabled={isSaving}
                    className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary disabled:opacity-50"
                  >
                    <option value="">
                      {t(
                        "configuration.selectApprover",
                      )}
                    </option>

                    {organizationMembers.map(
                      (member) => {
                        const fullName =
                          `${member.first_name} ${member.last_name}`.trim();

                        return (
                          <option
                            key={
                              member.membership_id
                            }
                            value={
                              member.user_id
                            }
                          >
                            {fullName
                              ? `${fullName} — ${member.email}`
                              : member.email}
                          </option>
                        );
                      },
                    )}
                  </select>

                  <p className="mt-2 text-xs text-muted-foreground">
                    {t(
                      "configuration.approverHelp",
                    )}
                  </p>
                </div>
              ) : null}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSaving}
                  className="h-10 rounded-lg border border-border px-4 text-sm font-semibold transition hover:bg-surface-muted disabled:opacity-50"
                >
                  {t(
                    "create.cancel",
                  )}
                </button>

                <button
                  type="submit"
                  disabled={
                    isSaving ||
                    !name.trim() ||
                    (actionType ===
                      "create_notification" &&
                      (!notificationTitle.trim() ||
                        !notificationMessage.trim())) ||
                    (actionType ===
                      "create_approval_request" &&
                      !selectedApproverId)
                  }
                  className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving
                    ? t("saving")
                    : formMode ===
                        "edit"
                      ? t(
                          "editForm.submit",
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

      {automationToDelete ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onMouseDown={
            closeDeleteConfirmation
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-automation-title"
            className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <h2
              id="delete-automation-title"
              className="text-xl font-semibold"
            >
              {t(
                "deleteConfirmation.title",
              )}
            </h2>

            <p className="mt-3 text-sm text-muted-foreground">
              {t(
                "deleteConfirmation.description",
                {
                  name:
                    automationToDelete.name,
                },
              )}
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={
                  closeDeleteConfirmation
                }
                disabled={isDeleting}
                className="h-10 rounded-lg border border-border px-4 text-sm font-semibold transition hover:bg-surface-muted disabled:opacity-50"
              >
                {t(
                  "deleteConfirmation.cancel",
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleDelete()
                }
                disabled={isDeleting}
                className="h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting
                  ? t(
                      "deleteConfirmation.deleting",
                    )
                  : t(
                      "deleteConfirmation.confirm",
                    )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}