"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { getAccessToken } from "@/lib/auth-storage";
import {
  decideApproval,
  getApprovals,
  type ApprovalListItem,
} from "@/services/approvals.service";

type ErrorMessageKey =
  | "loadError"
  | "authenticationMissing"
  | "updateError";

type SuccessMessageKey =
  | "approvedSuccess"
  | "rejectedSuccess";

type DecisionStatus =
  | "approved"
  | "rejected";

type StatusFilter =
  | ""
  | "pending"
  | "approved"
  | "rejected";

type PendingDecision = {
  approval: ApprovalListItem;
  status: DecisionStatus;
};

type ProjectOption = {
  id: string;
  name: string;
};

export default function ApprovalsPage() {
  const t = useTranslations("approvals");

  const [approvals, setApprovals] =
    useState<ApprovalListItem[]>([]);

  const [projects, setProjects] =
    useState<ProjectOption[]>([]);

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<StatusFilter>("");

  const [
    projectFilter,
    setProjectFilter,
  ] = useState("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    decidingApprovalId,
    setDecidingApprovalId,
  ] = useState<string | null>(null);

  const [
    pendingDecision,
    setPendingDecision,
  ] = useState<PendingDecision | null>(
    null,
  );

  const [
    decisionComment,
    setDecisionComment,
  ] = useState("");

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
    async function loadProjectOptions() {
      const token = getAccessToken();

      if (!token) {
        return;
      }

      try {
        const approvalItems =
          await getApprovals(token);

        const uniqueProjects =
          new Map<string, string>();

        for (const approval of approvalItems) {
          uniqueProjects.set(
            approval.task.project.id,
            approval.task.project.name,
          );
        }

        setProjects(
          Array.from(
            uniqueProjects.entries(),
          )
            .map(([id, name]) => ({
              id,
              name,
            }))
            .sort((a, b) =>
              a.name.localeCompare(b.name),
            ),
        );
      } catch {
        // The main approvals request handles
        // the visible loading error.
      }
    }

    void loadProjectOptions();
  }, []);

  useEffect(() => {
    async function loadApprovals() {
      const token = getAccessToken();

      if (!token) {
        setErrorMessageKey(
          "authenticationMissing",
        );
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessageKey(null);

      try {
        const approvalItems =
          await getApprovals(token, {
            status:
              statusFilter ||
              undefined,
            projectId:
              projectFilter ||
              undefined,
          });

        setApprovals(approvalItems);
      } catch {
        setErrorMessageKey(
          "loadError",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadApprovals();
  }, [
    statusFilter,
    projectFilter,
  ]);

  const pendingCount = useMemo(
    () =>
      approvals.filter(
        (approval) =>
          approval.status === "pending",
      ).length,
    [approvals],
  );

  const approvedCount = useMemo(
    () =>
      approvals.filter(
        (approval) =>
          approval.status === "approved",
      ).length,
    [approvals],
  );

  const rejectedCount = useMemo(
    () =>
      approvals.filter(
        (approval) =>
          approval.status === "rejected",
      ).length,
    [approvals],
  );

  const errorMessage =
    errorMessageKey
      ? t(errorMessageKey)
      : "";

  const successMessage =
    successMessageKey
      ? t(successMessageKey)
      : "";

  const hasActiveFilters =
    statusFilter !== "" ||
    projectFilter !== "";

  function getStatusLabel(
    status: string,
  ) {
    if (status === "approved") {
      return t("approved");
    }

    if (status === "rejected") {
      return t("rejected");
    }

    return t("pending");
  }

  function openDecisionConfirmation(
    approval: ApprovalListItem,
    status: DecisionStatus,
  ) {
    setErrorMessageKey(null);
    setSuccessMessageKey(null);
    setDecisionComment("");

    setPendingDecision({
      approval,
      status,
    });
  }

  function closeDecisionConfirmation() {
    if (decidingApprovalId) {
      return;
    }

    setPendingDecision(null);
    setDecisionComment("");
  }

  function clearFilters() {
    setStatusFilter("");
    setProjectFilter("");
  }

  async function handleDecision() {
    if (!pendingDecision) {
      return;
    }

    const token = getAccessToken();

    if (!token) {
      setErrorMessageKey(
        "authenticationMissing",
      );
      setPendingDecision(null);
      setDecisionComment("");
      return;
    }

    const {
      approval,
      status,
    } = pendingDecision;

    setErrorMessageKey(null);
    setSuccessMessageKey(null);
    setDecidingApprovalId(
      approval.id,
    );

    try {
      const updatedApproval =
        await decideApproval(
          token,
          approval.id,
          {
            status,
            decision_comment:
              decisionComment.trim() ||
              undefined,
          },
        );

      setApprovals(
        (currentApprovals) =>
          currentApprovals
            .map((item) =>
              item.id === approval.id
                ? {
                    ...item,
                    ...updatedApproval,
                  }
                : item,
            )
            .filter((item) => {
              if (
                statusFilter &&
                item.status !==
                  statusFilter
              ) {
                return false;
              }

              if (
                projectFilter &&
                item.task.project.id !==
                  projectFilter
              ) {
                return false;
              }

              return true;
            }),
      );

      setSuccessMessageKey(
        status === "approved"
          ? "approvedSuccess"
          : "rejectedSuccess",
      );

      setPendingDecision(null);
      setDecisionComment("");
    } catch {
      setErrorMessageKey(
        "updateError",
      );
    } finally {
      setDecidingApprovalId(
        null,
      );
    }
  }

  return (
    <>
      <div className="space-y-8">
        <section>
          <p className="text-sm font-medium text-primary">
            {t("workspace")}
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

        <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label
                htmlFor="approval-status-filter"
                className="text-sm font-medium"
              >
                {t("filters.status")}
              </label>

              <select
                id="approval-status-filter"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target
                      .value as StatusFilter,
                  )
                }
                className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
              >
                <option value="">
                  {t(
                    "filters.allStatuses",
                  )}
                </option>

                <option value="pending">
                  {t("pending")}
                </option>

                <option value="approved">
                  {t("approved")}
                </option>

                <option value="rejected">
                  {t("rejected")}
                </option>
              </select>
            </div>

            <div className="flex-1">
              <label
                htmlFor="approval-project-filter"
                className="text-sm font-medium"
              >
                {t("filters.project")}
              </label>

              <select
                id="approval-project-filter"
                value={projectFilter}
                onChange={(event) =>
                  setProjectFilter(
                    event.target.value,
                  )
                }
                className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
              >
                <option value="">
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

            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="h-10 rounded-lg border border-border px-4 text-sm font-semibold transition hover:bg-surface-muted"
              >
                {t(
                  "filters.clear",
                )}
              </button>
            ) : null}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              {t("totalApprovals")}
            </p>

            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {approvals.length}
            </p>
          </article>

          <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              {t("pending")}
            </p>

            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {pendingCount}
            </p>
          </article>

          <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              {t("approved")}
            </p>

            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {approvedCount}
            </p>
          </article>

          <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-muted-foreground">
              {t("rejected")}
            </p>

            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {rejectedCount}
            </p>
          </article>
        </section>

        <section className="rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold">
              {t("requestsTitle")}
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              {t("requestsDescription")}
            </p>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {t("loading")}
            </div>
          ) : approvals.length > 0 ? (
            <div className="divide-y divide-border">
              {approvals.map(
                (approval) => {
                  const isDeciding =
                    decidingApprovalId ===
                    approval.id;

                  return (
                    <div
                      key={approval.id}
                      className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/approvals/${approval.id}`}
                          className="break-words font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {approval.task.title}
                        </Link>

                        <p className="mt-1 break-words text-sm text-muted-foreground">
                          {t("project")}:{" "}
                          {
                            approval.task
                              .project.name
                          }
                        </p>

                        <p className="mt-2 break-words text-sm text-muted-foreground">
                          {t("approver")}:{" "}
                          {
                            approval
                              .approver_user
                              .first_name
                          }{" "}
                          {
                            approval
                              .approver_user
                              .last_name
                          }{" "}
                          —{" "}
                          {
                            approval
                              .approver_user
                              .email
                          }
                        </p>

                        <p className="mt-2 break-words text-sm text-muted-foreground">
                          {t("requestedBy")}:{" "}
                          {
                            approval
                              .requested_by_user
                              .first_name
                          }{" "}
                          {
                            approval
                              .requested_by_user
                              .last_name
                          }{" "}
                          —{" "}
                          {
                            approval
                              .requested_by_user
                              .email
                          }
                        </p>

                        {approval.comment ? (
                          <p className="mt-2 break-words text-sm text-muted-foreground">
                            {t("comment")}:{" "}
                            {approval.comment}
                          </p>
                        ) : null}

                        {approval.decision_comment ? (
                          <p className="mt-2 break-words text-sm text-muted-foreground">
                            {t("decisionComment")}:{" "}
                            {
                              approval.decision_comment
                            }
                          </p>
                        ) : null}

                        <Link
                          href={`/tasks/${approval.task.id}`}
                          className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
                        >
                          {t("viewTask")}
                        </Link>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-surface-muted px-3 py-1 text-sm font-medium">
                          {getStatusLabel(
                            approval.status,
                          )}
                        </span>

                        {approval.status ===
                        "pending" ? (
                          <>
                            <button
                              type="button"
                              disabled={
                                isDeciding
                              }
                              onClick={() =>
                                openDecisionConfirmation(
                                  approval,
                                  "approved",
                                )
                              }
                              className="h-9 rounded-lg bg-green-600 px-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {t("approve")}
                            </button>

                            <button
                              type="button"
                              disabled={
                                isDeciding
                              }
                              onClick={() =>
                                openDecisionConfirmation(
                                  approval,
                                  "rejected",
                                )
                              }
                              className="h-9 rounded-lg border border-red-300 bg-red-50 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {t("reject")}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm font-medium">
                {hasActiveFilters
                  ? t(
                      "filters.noResults",
                    )
                  : t("emptyTitle")}
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {hasActiveFilters
                  ? t(
                      "filters.noResultsDescription",
                    )
                  : t(
                      "emptyDescription",
                    )}
              </p>
            </div>
          )}
        </section>
      </div>

      {pendingDecision ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="presentation"
          onMouseDown={
            closeDecisionConfirmation
          }
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="approval-decision-title"
            className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <h2
              id="approval-decision-title"
              className="text-xl font-semibold"
            >
              {pendingDecision.status ===
              "approved"
                ? t(
                    "confirmation.approveTitle",
                  )
                : t(
                    "confirmation.rejectTitle",
                  )}
            </h2>

            <p className="mt-3 text-sm text-muted-foreground">
              {pendingDecision.status ===
              "approved"
                ? t(
                    "confirmation.approveDescription",
                    {
                      task:
                        pendingDecision
                          .approval.task
                          .title,
                    },
                  )
                : t(
                    "confirmation.rejectDescription",
                    {
                      task:
                        pendingDecision
                          .approval.task
                          .title,
                    },
                  )}
            </p>

            <div className="mt-5">
              <label
                htmlFor="decision-comment"
                className="text-sm font-medium"
              >
                {t(
                  "confirmation.reasonLabel",
                )}
              </label>

              <textarea
                id="decision-comment"
                value={decisionComment}
                onChange={(event) =>
                  setDecisionComment(
                    event.target.value,
                  )
                }
                disabled={
                  decidingApprovalId !==
                  null
                }
                rows={4}
                placeholder={t(
                  "confirmation.reasonPlaceholder",
                )}
                className="mt-2 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
              />

              <p className="mt-1 text-xs text-muted-foreground">
                {t(
                  "confirmation.reasonHelp",
                )}
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={
                  decidingApprovalId !==
                  null
                }
                onClick={
                  closeDecisionConfirmation
                }
                className="h-10 rounded-lg border border-border px-4 text-sm font-semibold transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t(
                  "confirmation.cancel",
                )}
              </button>

              <button
                type="button"
                disabled={
                  decidingApprovalId !==
                  null
                }
                onClick={() =>
                  void handleDecision()
                }
                className={
                  pendingDecision.status ===
                  "approved"
                    ? "h-10 rounded-lg bg-green-600 px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    : "h-10 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                }
              >
                {decidingApprovalId
                  ? t("saving")
                  : pendingDecision.status ===
                      "approved"
                    ? t(
                        "confirmation.confirmApprove",
                      )
                    : t(
                        "confirmation.confirmReject",
                      )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}