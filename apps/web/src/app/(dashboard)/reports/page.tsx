"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useLocale,
  useTranslations,
} from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { jsPDF } from "jspdf";

import { getAccessToken } from "@/lib/auth-storage";
import { getWorkspaceId } from "@/lib/workspace-storage";
import {
  getActivities,
  getApprovalStatistics,
  getAuditLogs,
  getProjectPerformance,
  getReportsOverview,
  getTasksByPriority,
  getTasksByStatus,
  type Activity,
  type ApprovalStatistics,
  type AuditLog,
  type ProjectPerformance,
  type ReportDateRange,
  type ReportsOverview,
  type TasksByPriority,
  type TasksByStatus,
} from "@/services/reports.service";

type ErrorMessageKey =
  | "errors.loadReports";

const EMPTY_OVERVIEW: ReportsOverview = {
  totalProjects: 0,
  totalTasks: 0,
  completedTasks: 0,
  activeTasks: 0,
  completionRate: 0,
};

const EMPTY_TASKS_BY_STATUS: TasksByStatus = {
  pending: 0,
  inProgress: 0,
  completed: 0,
  canceled: 0,
};

const EMPTY_TASKS_BY_PRIORITY: TasksByPriority = {
  low: 0,
  medium: 0,
  high: 0,
  urgent: 0,
};

const EMPTY_APPROVAL_STATISTICS: ApprovalStatistics = {
  totalApprovals: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  approvalRate: 0,
};

export default function ReportsPage() {
  const t = useTranslations("reports");
  const locale = useLocale();

  const [overview, setOverview] =
    useState<ReportsOverview>(
      EMPTY_OVERVIEW,
    );

  const [
    tasksByStatus,
    setTasksByStatus,
  ] = useState<TasksByStatus>(
    EMPTY_TASKS_BY_STATUS,
  );

  const [
    tasksByPriority,
    setTasksByPriority,
  ] = useState<TasksByPriority>(
    EMPTY_TASKS_BY_PRIORITY,
  );

  const [
    projectPerformance,
    setProjectPerformance,
  ] = useState<ProjectPerformance[]>([]);

  const [
    approvalStatistics,
    setApprovalStatistics,
  ] = useState<ApprovalStatistics>(
    EMPTY_APPROVAL_STATISTICS,
  );

  const [activities, setActivities] =
    useState<Activity[]>([]);

  const [auditLogs, setAuditLogs] =
    useState<AuditLog[]>([]);

  const [fromDate, setFromDate] =
    useState("");

  const [toDate, setToDate] =
    useState("");

  const [
    appliedDateRange,
    setAppliedDateRange,
  ] = useState<ReportDateRange>({});

  const [isLoading, setIsLoading] =
    useState(true);

  const [
    errorMessageKey,
    setErrorMessageKey,
  ] = useState<ErrorMessageKey | null>(
    null,
  );

  const loadReports = useCallback(
    async (
      dateRange: ReportDateRange,
    ) => {
      const token = getAccessToken();
      const workspaceId =
        getWorkspaceId();

      if (!token || !workspaceId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessageKey(null);

      try {
        const [
          overviewData,
          statusData,
          priorityData,
          projectPerformanceData,
          approvalStatisticsData,
          activityItems,
          auditLogItems,
        ] = await Promise.all([
          getReportsOverview(
            token,
            workspaceId,
            dateRange,
          ),
          getTasksByStatus(
            token,
            workspaceId,
            dateRange,
          ),
          getTasksByPriority(
            token,
            workspaceId,
            dateRange,
          ),
          getProjectPerformance(
            token,
            workspaceId,
            dateRange,
          ),
          getApprovalStatistics(
            token,
            workspaceId,
            dateRange,
          ),
          getActivities(
            token,
            workspaceId,
          ),
          getAuditLogs(
            token,
            workspaceId,
          ),
        ]);

        setOverview(overviewData);
        setTasksByStatus(statusData);
        setTasksByPriority(priorityData);
        setProjectPerformance(
          projectPerformanceData,
        );
        setApprovalStatistics(
          approvalStatisticsData,
        );
        setActivities(activityItems);
        setAuditLogs(auditLogItems);
      } catch {
        setErrorMessageKey(
          "errors.loadReports",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadReports(
        appliedDateRange,
      );
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [appliedDateRange, loadReports]);

  const taskStatusChartData =
    useMemo(
      () => [
        {
          name: t(
            "tasksByStatus.status.pending",
          ),
          value: tasksByStatus.pending,
        },
        {
          name: t(
            "tasksByStatus.status.inProgress",
          ),
          value:
            tasksByStatus.inProgress,
        },
        {
          name: t(
            "tasksByStatus.status.completed",
          ),
          value:
            tasksByStatus.completed,
        },
        {
          name: t(
            "tasksByStatus.status.canceled",
          ),
          value:
            tasksByStatus.canceled,
        },
      ],
      [t, tasksByStatus],
    );

  const taskPriorityChartData =
    useMemo(
      () => [
        {
          name: t(
            "tasksByPriority.priority.low",
          ),
          value: tasksByPriority.low,
        },
        {
          name: t(
            "tasksByPriority.priority.medium",
          ),
          value:
            tasksByPriority.medium,
        },
        {
          name: t(
            "tasksByPriority.priority.high",
          ),
          value: tasksByPriority.high,
        },
        {
          name: t(
            "tasksByPriority.priority.urgent",
          ),
          value:
            tasksByPriority.urgent,
        },
      ],
      [t, tasksByPriority],
    );

  const approvalChartData =
    useMemo(
      () => [
        {
          name: t(
            "approvalStatistics.status.pending",
          ),
          value:
            approvalStatistics.pending,
        },
        {
          name: t(
            "approvalStatistics.status.approved",
          ),
          value:
            approvalStatistics.approved,
        },
        {
          name: t(
            "approvalStatistics.status.rejected",
          ),
          value:
            approvalStatistics.rejected,
        },
      ],
      [t, approvalStatistics],
    );

  const errorMessage =
    errorMessageKey
      ? t(errorMessageKey)
      : "";

  const hasInvalidDateRange =
    Boolean(
      fromDate &&
        toDate &&
        fromDate > toDate,
    );

  function handleApplyDateRange() {
    if (hasInvalidDateRange) {
      return;
    }

    setAppliedDateRange({
      from: fromDate || undefined,
      to: toDate || undefined,
    });
  }

  function handleClearDateRange() {
    setFromDate("");
    setToDate("");
    setAppliedDateRange({});
  }

  function handleExportCsv() {
    function escapeCsvValue(
      value: string | number,
    ) {
      const rawValue = String(value);

      const safeValue =
        ["=", "+", "-", "@"].some(
          (prefix) =>
            rawValue.startsWith(prefix),
        )
          ? `'${rawValue}`
          : rawValue;

      return `"${safeValue.replaceAll(
        '"',
        '""',
      )}"`;
    }

    const rows: Array<
      Array<string | number>
    > = [
      [t("exportCsv.report")],
      [],
      [
        t("exportCsv.dateRange"),
        appliedDateRange.from ||
          t("exportCsv.allDates"),
        appliedDateRange.to ||
          t("exportCsv.allDates"),
      ],
      [],
      [t("overview.title")],
      [
        t("overview.totalProjects"),
        overview.totalProjects,
      ],
      [
        t("overview.totalTasks"),
        overview.totalTasks,
      ],
      [
        t("overview.completedTasks"),
        overview.completedTasks,
      ],
      [
        t("overview.activeTasks"),
        overview.activeTasks,
      ],
      [
        t("overview.completionRate"),
        `${overview.completionRate}%`,
      ],
      [],
      [t("tasksByStatus.title")],
      [
        t("tasksByStatus.status.pending"),
        tasksByStatus.pending,
      ],
      [
        t("tasksByStatus.status.inProgress"),
        tasksByStatus.inProgress,
      ],
      [
        t("tasksByStatus.status.completed"),
        tasksByStatus.completed,
      ],
      [
        t("tasksByStatus.status.canceled"),
        tasksByStatus.canceled,
      ],
      [],
      [t("tasksByPriority.title")],
      [
        t("tasksByPriority.priority.low"),
        tasksByPriority.low,
      ],
      [
        t("tasksByPriority.priority.medium"),
        tasksByPriority.medium,
      ],
      [
        t("tasksByPriority.priority.high"),
        tasksByPriority.high,
      ],
      [
        t("tasksByPriority.priority.urgent"),
        tasksByPriority.urgent,
      ],
      [],
      [t("projectPerformance.title")],
      [
        t("projectPerformance.columns.project"),
        t("projectPerformance.columns.totalTasks"),
        t("projectPerformance.columns.completed"),
        t("projectPerformance.columns.active"),
        t("projectPerformance.columns.completionRate"),
      ],
      ...projectPerformance.map(
        (project) => [
          project.projectName,
          project.totalTasks,
          project.completedTasks,
          project.activeTasks,
          `${project.completionRate}%`,
        ],
      ),
      [],
      [t("approvalStatistics.title")],
      [
        t("approvalStatistics.total"),
        approvalStatistics.totalApprovals,
      ],
      [
        t("approvalStatistics.status.pending"),
        approvalStatistics.pending,
      ],
      [
        t("approvalStatistics.status.approved"),
        approvalStatistics.approved,
      ],
      [
        t("approvalStatistics.status.rejected"),
        approvalStatistics.rejected,
      ],
      [
        t("approvalStatistics.approvalRate"),
        `${approvalStatistics.approvalRate}%`,
      ],
    ];

    const csv =
      "\uFEFF" +
      rows
        .map((row) =>
          row
            .map((value) =>
              escapeCsvValue(value),
            )
            .join(","),
        )
        .join("\r\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8",
    });

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    const today = new Date()
      .toISOString()
      .slice(0, 10);

    link.href = url;
    link.download =
      `promiseflow-report-${today}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  }

  function handleExportPdf() {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageHeight =
      doc.internal.pageSize.getHeight();

    const left = 18;
    let y = 20;

    function ensureSpace(
      requiredHeight = 10,
    ) {
      if (
        y + requiredHeight >
        pageHeight - 18
      ) {
        doc.addPage();
        y = 20;
      }
    }

    function addTitle(
      text: string,
    ) {
      ensureSpace(14);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(text, left, y);

      y += 9;
    }

    function addRow(
      label: string,
      value: string | number,
    ) {
      ensureSpace(8);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);

      doc.text(
        `${label}: ${value}`,
        left,
        y,
      );

      y += 6;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);

    doc.text(
      t("exportPdf.report"),
      left,
      y,
    );

    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const from =
      appliedDateRange.from ||
      t("exportPdf.allDates");

    const to =
      appliedDateRange.to ||
      t("exportPdf.allDates");

    doc.text(
      `${t(
        "exportPdf.dateRange",
      )}: ${from} - ${to}`,
      left,
      y,
    );

    y += 14;

    addTitle(t("overview.title"));

    addRow(
      t("overview.totalProjects"),
      overview.totalProjects,
    );

    addRow(
      t("overview.totalTasks"),
      overview.totalTasks,
    );

    addRow(
      t("overview.completedTasks"),
      overview.completedTasks,
    );

    addRow(
      t("overview.activeTasks"),
      overview.activeTasks,
    );

    addRow(
      t("overview.completionRate"),
      `${formatPercentage(
        overview.completionRate,
      )}%`,
    );

    y += 5;

    addTitle(
      t("tasksByStatus.title"),
    );

    addRow(
      t("tasksByStatus.status.pending"),
      tasksByStatus.pending,
    );

    addRow(
      t(
        "tasksByStatus.status.inProgress",
      ),
      tasksByStatus.inProgress,
    );

    addRow(
      t(
        "tasksByStatus.status.completed",
      ),
      tasksByStatus.completed,
    );

    addRow(
      t(
        "tasksByStatus.status.canceled",
      ),
      tasksByStatus.canceled,
    );

    y += 5;

    addTitle(
      t("tasksByPriority.title"),
    );

    addRow(
      t("tasksByPriority.priority.low"),
      tasksByPriority.low,
    );

    addRow(
      t(
        "tasksByPriority.priority.medium",
      ),
      tasksByPriority.medium,
    );

    addRow(
      t("tasksByPriority.priority.high"),
      tasksByPriority.high,
    );

    addRow(
      t(
        "tasksByPriority.priority.urgent",
      ),
      tasksByPriority.urgent,
    );

    y += 5;

    addTitle(
      t("projectPerformance.title"),
    );

    if (projectPerformance.length === 0) {
      addRow(
        t("projectPerformance.empty"),
        "-",
      );
    } else {
      projectPerformance.forEach(
        (project) => {
          ensureSpace(30);

          doc.setFont(
            "helvetica",
            "bold",
          );
          doc.setFontSize(11);

          doc.text(
            project.projectName,
            left,
            y,
          );

          y += 6;

          addRow(
            t(
              "projectPerformance.columns.totalTasks",
            ),
            project.totalTasks,
          );

          addRow(
            t(
              "projectPerformance.columns.completed",
            ),
            project.completedTasks,
          );

          addRow(
            t(
              "projectPerformance.columns.active",
            ),
            project.activeTasks,
          );

          addRow(
            t(
              "projectPerformance.columns.completionRate",
            ),
            `${formatPercentage(
              project.completionRate,
            )}%`,
          );

          y += 4;
        },
      );
    }

    y += 3;

    addTitle(
      t("approvalStatistics.title"),
    );

    addRow(
      t("approvalStatistics.total"),
      approvalStatistics.totalApprovals,
    );

    addRow(
      t(
        "approvalStatistics.status.pending",
      ),
      approvalStatistics.pending,
    );

    addRow(
      t(
        "approvalStatistics.status.approved",
      ),
      approvalStatistics.approved,
    );

    addRow(
      t(
        "approvalStatistics.status.rejected",
      ),
      approvalStatistics.rejected,
    );

    addRow(
      t(
        "approvalStatistics.approvalRate",
      ),
      `${formatPercentage(
        approvalStatistics.approvalRate,
      )}%`,
    );

    const today = new Date()
      .toISOString()
      .slice(0, 10);

    doc.save(
      `promiseflow-report-${today}.pdf`,
    );
  }

  function translateAction(
    action: string,
  ) {
    switch (action) {
      case "created":
        return t("actions.created");

      case "updated":
        return t("actions.updated");

      case "deleted":
        return t("actions.deleted");

      default:
        return action;
    }
  }

  function translateEntityType(
    entityType: string,
  ) {
    switch (entityType) {
      case "project":
        return t("entities.project");

      case "task":
        return t("entities.task");

      case "team":
        return t("entities.team");

      case "workflow":
        return t("entities.workflow");

      case "workflow_step":
        return t(
          "entities.workflowStep",
        );

      case "approval":
        return t("entities.approval");

      case "comment":
        return t("entities.comment");

      case "file":
        return t("entities.file");

      case "organization":
        return t(
          "entities.organization",
        );

      case "membership":
        return t(
          "entities.membership",
        );

      default:
        return entityType;
    }
  }

  function formatDate(
    value: string,
  ) {
    return new Date(
      value,
    ).toLocaleString(
      locale === "de"
        ? "de-DE"
        : "en-US",
    );
  }

  function formatPercentage(
    value: number,
  ) {
    return new Intl.NumberFormat(
      locale === "de"
        ? "de-DE"
        : "en-US",
      {
        maximumFractionDigits: 1,
      },
    ).format(value);
  }

  return (
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

      <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <div>
          <h2 className="font-semibold">
            {t("dateRange.title")}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {t("dateRange.description")}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end">
          <label className="flex flex-1 flex-col gap-2 text-sm">
            <span className="font-medium">
              {t("dateRange.from")}
            </span>

            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(event) =>
                setFromDate(
                  event.target.value,
                )
              }
              className="h-10 rounded-lg border border-border bg-background px-3 outline-none focus:border-primary"
            />
          </label>

          <label className="flex flex-1 flex-col gap-2 text-sm">
            <span className="font-medium">
              {t("dateRange.to")}
            </span>

            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) =>
                setToDate(
                  event.target.value,
                )
              }
              className="h-10 rounded-lg border border-border bg-background px-3 outline-none focus:border-primary"
            />
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              disabled={
                hasInvalidDateRange ||
                isLoading
              }
              onClick={
                handleApplyDateRange
              }
              className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("dateRange.apply")}
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={
                handleClearDateRange
              }
              className="h-10 rounded-lg border border-border px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("dateRange.clear")}
            </button>
          </div>
        </div>

        {hasInvalidDateRange && (
          <p className="mt-3 text-sm text-red-600">
            {t("dateRange.invalid")}
          </p>
        )}


        <div className="mt-5 border-t border-border pt-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">
                {t("exportCsv.title")}
              </p>

              <p className="mt-1 text-sm text-muted-foreground">
                {t("exportCsv.description")}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={isLoading}
                onClick={handleExportCsv}
                className="h-10 shrink-0 rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("exportCsv.button")}
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={handleExportPdf}
                className="h-10 shrink-0 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("exportPdf.button")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
          {t("loading")}
        </div>
      ) : errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : (
        <>
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold">
                {t("overview.title")}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  "overview.description",
                )}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">
                  {t(
                    "overview.totalProjects",
                  )}
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight">
                  {overview.totalProjects}
                </p>
              </article>

              <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">
                  {t(
                    "overview.totalTasks",
                  )}
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight">
                  {overview.totalTasks}
                </p>
              </article>

              <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">
                  {t(
                    "overview.completedTasks",
                  )}
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight">
                  {
                    overview.completedTasks
                  }
                </p>
              </article>

              <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">
                  {t(
                    "overview.activeTasks",
                  )}
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight">
                  {overview.activeTasks}
                </p>
              </article>

              <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
                <p className="text-sm font-medium text-muted-foreground">
                  {t(
                    "overview.completionRate",
                  )}
                </p>
                <p className="mt-3 text-3xl font-semibold tracking-tight">
                  {formatPercentage(
                    overview.completionRate,
                  )}
                  %
                </p>
              </article>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-semibold">
                {t("tasksByStatus.title")}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  "tasksByStatus.description",
                )}
              </p>
            </div>

            <div className="p-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {taskStatusChartData.map(
                  (item) => (
                    <div
                      key={item.name}
                      className="rounded-lg border border-border p-4"
                    >
                      <p className="text-sm text-muted-foreground">
                        {item.name}
                      </p>

                      <p className="mt-2 text-2xl font-semibold">
                        {item.value}
                      </p>
                    </div>
                  ),
                )}
              </div>

              <div className="mt-8 h-80 w-full">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={
                      taskStatusChartData
                    }
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      minTickGap={0}
                      angle={-25}
                      textAnchor="end"
                      height={55}
                      tick={{
                        fontSize: 11,
                      }}
                      tickMargin={8}
                    />

                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="value"
                      fill="currentColor"
                      className="text-primary"
                      radius={[
                        6,
                        6,
                        0,
                        0,
                      ]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-semibold">
                {t(
                  "tasksByPriority.title",
                )}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  "tasksByPriority.description",
                )}
              </p>
            </div>

            <div className="p-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {taskPriorityChartData.map(
                  (item) => (
                    <div
                      key={item.name}
                      className="rounded-lg border border-border p-4"
                    >
                      <p className="text-sm text-muted-foreground">
                        {item.name}
                      </p>

                      <p className="mt-2 text-2xl font-semibold">
                        {item.value}
                      </p>
                    </div>
                  ),
                )}
              </div>

              <div className="mt-8 h-80 w-full">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={
                      taskPriorityChartData
                    }
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      minTickGap={0}
                      tick={{
                        fontSize: 11,
                      }}
                      tickMargin={8}
                    />

                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="value"
                      fill="currentColor"
                      className="text-primary"
                      radius={[
                        6,
                        6,
                        0,
                        0,
                      ]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-semibold">
                {t(
                  "projectPerformance.title",
                )}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  "projectPerformance.description",
                )}
              </p>
            </div>

            {projectPerformance.length >
            0 ? (
              <>
                <div className="divide-y divide-border md:hidden">
                  {projectPerformance.map(
                    (project) => (
                      <article
                        key={project.projectId}
                        className="space-y-4 p-5"
                      >
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {t(
                              "projectPerformance.columns.project",
                            )}
                          </p>

                          <p className="mt-1 break-words font-medium">
                            {project.projectName}
                          </p>
                        </div>

                        <dl className="grid grid-cols-2 gap-4">
                          <div>
                            <dt className="text-xs text-muted-foreground">
                              {t(
                                "projectPerformance.columns.totalTasks",
                              )}
                            </dt>
                            <dd className="mt-1 font-medium">
                              {project.totalTasks}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-xs text-muted-foreground">
                              {t(
                                "projectPerformance.columns.completed",
                              )}
                            </dt>
                            <dd className="mt-1 font-medium">
                              {project.completedTasks}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-xs text-muted-foreground">
                              {t(
                                "projectPerformance.columns.active",
                              )}
                            </dt>
                            <dd className="mt-1 font-medium">
                              {project.activeTasks}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-xs text-muted-foreground">
                              {t(
                                "projectPerformance.columns.completionRate",
                              )}
                            </dt>
                            <dd className="mt-1 font-medium">
                              {formatPercentage(
                                project.completionRate,
                              )}
                              %
                            </dd>
                          </div>
                        </dl>
                      </article>
                    ),
                  )}
                </div>

                <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-border bg-muted/30">
                    <tr>
                      <th className="px-5 py-3 font-medium">
                        {t(
                          "projectPerformance.columns.project",
                        )}
                      </th>

                      <th className="px-5 py-3 font-medium">
                        {t(
                          "projectPerformance.columns.totalTasks",
                        )}
                      </th>

                      <th className="px-5 py-3 font-medium">
                        {t(
                          "projectPerformance.columns.completed",
                        )}
                      </th>

                      <th className="px-5 py-3 font-medium">
                        {t(
                          "projectPerformance.columns.active",
                        )}
                      </th>

                      <th className="px-5 py-3 font-medium">
                        {t(
                          "projectPerformance.columns.completionRate",
                        )}
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border">
                    {projectPerformance.map(
                      (project) => (
                        <tr
                          key={
                            project.projectId
                          }
                        >
                          <td className="px-5 py-4 font-medium">
                            {
                              project.projectName
                            }
                          </td>

                          <td className="px-5 py-4">
                            {
                              project.totalTasks
                            }
                          </td>

                          <td className="px-5 py-4">
                            {
                              project.completedTasks
                            }
                          </td>

                          <td className="px-5 py-4">
                            {
                              project.activeTasks
                            }
                          </td>

                          <td className="px-5 py-4">
                            {formatPercentage(
                              project.completionRate,
                            )}
                            %
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {t(
                  "projectPerformance.empty",
                )}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-surface shadow-sm">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-semibold">
                {t(
                  "approvalStatistics.title",
                )}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  "approvalStatistics.description",
                )}
              </p>
            </div>

            <div className="p-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "approvalStatistics.total",
                    )}
                  </p>

                  <p className="mt-2 text-2xl font-semibold">
                    {
                      approvalStatistics.totalApprovals
                    }
                  </p>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "approvalStatistics.status.pending",
                    )}
                  </p>

                  <p className="mt-2 text-2xl font-semibold">
                    {
                      approvalStatistics.pending
                    }
                  </p>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "approvalStatistics.status.approved",
                    )}
                  </p>

                  <p className="mt-2 text-2xl font-semibold">
                    {
                      approvalStatistics.approved
                    }
                  </p>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "approvalStatistics.status.rejected",
                    )}
                  </p>

                  <p className="mt-2 text-2xl font-semibold">
                    {
                      approvalStatistics.rejected
                    }
                  </p>
                </div>

                <div className="rounded-lg border border-border p-4">
                  <p className="text-sm text-muted-foreground">
                    {t(
                      "approvalStatistics.approvalRate",
                    )}
                  </p>

                  <p className="mt-2 text-2xl font-semibold">
                    {formatPercentage(
                      approvalStatistics.approvalRate,
                    )}
                    %
                  </p>
                </div>
              </div>

              <div className="mt-8 h-80 w-full">
                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >
                  <BarChart
                    data={
                      approvalChartData
                    }
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="name"
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      minTickGap={0}
                      tick={{
                        fontSize: 11,
                      }}
                      tickMargin={8}
                    />

                    <YAxis
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                    />

                    <Tooltip />

                    <Bar
                      dataKey="value"
                      fill="currentColor"
                      className="text-primary"
                      radius={[
                        6,
                        6,
                        0,
                        0,
                      ]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="min-w-0 rounded-xl border border-border bg-surface">
              <div className="border-b border-border px-5 py-4">
                <h2 className="font-semibold">
                  {t("activity.title")}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {t(
                    "activity.description",
                  )}
                </p>
              </div>

              {activities.length > 0 ? (
                <div className="divide-y divide-border">
                  {activities
                    .slice(0, 10)
                    .map((activity) => (
                      <div
                        key={activity.id}
                        className="p-5"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="min-w-0">
                            <p className="break-words font-medium">
                              {translateAction(
                                activity.action,
                              )}
                            </p>

                            <p className="mt-1 break-words text-sm text-muted-foreground">
                              {translateEntityType(
                                activity.entity_type,
                              )}
                            </p>
                          </div>

                          <p className="shrink-0 text-xs text-muted-foreground">
                            {formatDate(
                              activity.created_at,
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {t("activity.empty")}
                </div>
              )}
            </div>

            <div className="min-w-0 rounded-xl border border-border bg-surface">
              <div className="border-b border-border px-5 py-4">
                <h2 className="font-semibold">
                  {t("audit.title")}
                </h2>

                <p className="mt-1 text-sm text-muted-foreground">
                  {t(
                    "audit.description",
                  )}
                </p>
              </div>

              {auditLogs.length > 0 ? (
                <div className="divide-y divide-border">
                  {auditLogs
                    .slice(0, 10)
                    .map((auditLog) => (
                      <div
                        key={auditLog.id}
                        className="p-5"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="break-words font-medium">
                              {translateAction(
                                auditLog.action,
                              )}
                            </p>

                            <p className="mt-1 break-words text-sm text-muted-foreground">
                              {translateEntityType(
                                auditLog.entity_type,
                              )}
                            </p>

                            <p className="mt-2 break-all text-xs text-muted-foreground">
                              {t(
                                "audit.entityId",
                              )}
                              :{" "}
                              {
                                auditLog.entity_id
                              }
                            </p>
                          </div>

                          <p className="shrink-0 text-xs text-muted-foreground">
                            {formatDate(
                              auditLog.created_at,
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {t("audit.empty")}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}