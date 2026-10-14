"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useEffect,
  useState,
} from "react";

import { getAccessToken } from "@/lib/auth-storage";
import {
  getApproval,
  type ApprovalDetails,
} from "@/services/approvals.service";

type ErrorMessageKey =
  | "authenticationMissing"
  | "loadError";

export default function ApprovalDetailsPage() {
  const t = useTranslations(
    "approvalDetails",
  );

  const params = useParams<{
    approvalId: string;
  }>();

  const approvalId =
    params.approvalId;

  const [approval, setApproval] =
    useState<ApprovalDetails | null>(
      null,
    );

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    errorMessageKey,
    setErrorMessageKey,
  ] = useState<ErrorMessageKey | null>(
    null,
  );

  useEffect(() => {
    async function loadApproval() {
      const token = getAccessToken();

      if (!token) {
        setErrorMessageKey(
          "authenticationMissing",
        );
        setIsLoading(false);
        return;
      }

      try {
        const approvalDetails =
          await getApproval(
            token,
            approvalId,
          );

        setApproval(
          approvalDetails,
        );
      } catch {
        setErrorMessageKey(
          "loadError",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadApproval();
  }, [approvalId]);

  function getStatusLabel(
    status: string,
  ) {
    if (status === "approved") {
      return t("status.approved");
    }

    if (status === "rejected") {
      return t("status.rejected");
    }

    return t("status.pending");
  }

  function getTaskStatusLabel(
    status: string,
  ) {
    if (status === "in_progress") {
      return t(
        "taskStatus.inProgress",
      );
    }

    if (status === "completed") {
      return t(
        "taskStatus.completed",
      );
    }

    if (status === "canceled") {
      return t(
        "taskStatus.canceled",
      );
    }

    return t("taskStatus.pending");
  }

  function getPriorityLabel(
    priority: string,
  ) {
    if (priority === "low") {
      return t("priority.low");
    }

    if (priority === "high") {
      return t("priority.high");
    }

    if (priority === "urgent") {
      return t("priority.urgent");
    }

    return t("priority.medium");
  }

  function formatDate(
    value: string | null,
  ) {
    if (!value) {
      return t("notAvailable");
    }

    return new Intl.DateTimeFormat(
      undefined,
      {
        dateStyle: "medium",
        timeStyle: "short",
      },
    ).format(new Date(value));
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  if (errorMessageKey || !approval) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {t(
            errorMessageKey ??
              "loadError",
          )}
        </div>

        <Link
          href="/approvals"
          className="inline-flex text-sm font-medium text-primary hover:underline"
        >
          {t("back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <Link
          href="/approvals"
          className="text-sm font-medium text-primary hover:underline"
        >
          {t("back")}
        </Link>

        <p className="mt-6 text-sm font-medium text-primary">
          {t("workspace")}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">
            {t("title")}
          </h1>

          <span className="rounded-full bg-surface-muted px-3 py-1 text-sm font-medium">
            {getStatusLabel(
              approval.status,
            )}
          </span>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">
          {t("description")}
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            {t("request.title")}
          </h2>

          <dl className="mt-5 space-y-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {t("request.project")}
              </dt>

              <dd className="mt-1 break-words">
                {
                  approval.task.project
                    .name
                }
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {t("request.approver")}
              </dt>

              <dd className="mt-1 break-words">
                {
                  approval.approver_user
                    .first_name
                }{" "}
                {
                  approval.approver_user
                    .last_name
                }{" "}
                —{" "}
                {
                  approval.approver_user
                    .email
                }
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {t(
                  "request.requestedBy",
                )}
              </dt>

              <dd className="mt-1 break-words">
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
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {t("request.createdAt")}
              </dt>

              <dd className="mt-1">
                {formatDate(
                  approval.created_at,
                )}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {t("request.decidedAt")}
              </dt>

              <dd className="mt-1">
                {formatDate(
                  approval.decided_at,
                )}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {t("request.comment")}
              </dt>

              <dd className="mt-1 whitespace-pre-wrap break-words">
                {approval.comment ||
                  t("noComment")}
              </dd>
            </div>
          </dl>
        </article>

        <article className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold">
            {t("task.title")}
          </h2>

          <dl className="mt-5 space-y-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {t("task.name")}
              </dt>

              <dd className="mt-1">
                <Link
                  href={`/tasks/${approval.task.id}`}
                  className="break-words font-medium text-primary hover:underline"
                >
                  {approval.task.title}
                </Link>
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {t("task.status")}
              </dt>

              <dd className="mt-1">
                {getTaskStatusLabel(
                  approval.task.status,
                )}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {t("task.priority")}
              </dt>

              <dd className="mt-1">
                {getPriorityLabel(
                  approval.task.priority,
                )}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {t("task.dueAt")}
              </dt>

              <dd className="mt-1">
                {formatDate(
                  approval.task.due_at,
                )}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                {t("task.description")}
              </dt>

              <dd className="mt-1 whitespace-pre-wrap break-words">
                {approval.task
                  .description ||
                  t(
                    "task.noDescription",
                  )}
              </dd>
            </div>
          </dl>
        </article>
      </section>
    </div>
  );
}