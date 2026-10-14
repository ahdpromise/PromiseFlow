"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { getAccessToken } from "@/lib/auth-storage";
import { getWorkspaceId } from "@/lib/workspace-storage";
import {
  getDashboardData,
  type DashboardData,
} from "@/services/dashboard.service";

type ErrorMessageKey =
  | "loadError";

export default function DashboardPage() {
  const t = useTranslations("dashboard");

  const [data, setData] =
    useState<DashboardData | null>(null);

  const [
    errorMessageKey,
    setErrorMessageKey,
  ] = useState<ErrorMessageKey | null>(
    null,
  );

  const [isLoading, setIsLoading] =
    useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const token = getAccessToken();
      const workspaceId =
        getWorkspaceId();

      if (!token || !workspaceId) {
        setIsLoading(false);
        return;
      }

      try {
        const dashboardData =
          await getDashboardData(
            token,
            workspaceId,
          );

        setData(dashboardData);
      } catch {
        setErrorMessageKey(
          "loadError",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadDashboard();
  }, []);

  const errorMessage =
    errorMessageKey
      ? t(errorMessageKey)
      : "";

  const pendingApprovals = useMemo(
    () =>
      data?.approvals.filter(
        (approval) =>
          approval.status === "pending",
      ).length ?? 0,
    [data],
  );

  const openTasks = useMemo(
    () =>
      data?.tasks.filter(
        (task) =>
          task.status !== "completed",
      ).length ?? 0,
    [data],
  );

  const stats = [
    {
      label: t("activeProjects"),
      value: data?.projects.length ?? 0,
      change: data
        ? t("totalProjects", {
            count: data.projects.length,
          })
        : t("loading"),
    },
    {
      label: t("openTasks"),
      value: openTasks,
      change: data
        ? t("totalTasks", {
            count: data.tasks.length,
          })
        : t("loading"),
    },
    {
      label: t("teams"),
      value: data?.teams.length ?? 0,
      change: data
        ? t("activeTeams", {
            count: data.teams.length,
          })
        : t("loading"),
    },
    {
      label: t("pendingApprovals"),
      value: pendingApprovals,
      change: data
        ? t("totalApprovals", {
            count: data.approvals.length,
          })
        : t("loading"),
    },
  ];

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {errorMessage}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
        {t("noData")}
      </div>
    );
  }

  const recentProjects =
    data.projects.slice(0, 3);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium text-primary">
          {t("overview")}
        </p>

        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {t("title")}
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              {t("description", {
                organization:
                  data.organization.name,
              })}
            </p>
          </div>

          <Link
            href="/projects"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            {t("newProject")}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-xl border border-border bg-surface p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </p>

            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {stat.value}
            </p>

            <p className="mt-2 text-sm text-muted-foreground">
              {stat.change}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="font-semibold">
                {t("recentProjects")}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                {t(
                  "recentProjectsDescription",
                )}
              </p>
            </div>

            <Link
              href="/projects"
              className="text-sm font-medium text-primary hover:underline"
            >
              {t("viewAll")}
            </Link>
          </div>

          {recentProjects.length > 0 ? (
            <div className="divide-y divide-border">
              {recentProjects.map(
                (project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block p-5 transition hover:bg-surface-muted"
                  >
                    <p className="break-words font-medium">
                      {project.name}
                    </p>

                    <p className="mt-1 break-words text-sm text-muted-foreground">
                      {project.description ??
                        t("noDescription")}
                    </p>
                  </Link>
                ),
              )}
            </div>
          ) : (
            <div className="p-5 text-sm text-muted-foreground">
              {t("noProjects")}
            </div>
          )}
        </div>

        <aside className="rounded-xl border border-border bg-surface p-5">
          <h2 className="font-semibold">
            {t("workspaceSummary")}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {t("liveData", {
              organization:
                data.organization.name,
            })}
          </p>

          <div className="mt-6 space-y-5">
            <div>
              <p className="text-2xl font-semibold">
                {data.projects.length}
              </p>

              <p className="text-sm text-muted-foreground">
                {t("projects")}
              </p>
            </div>

            <div>
              <p className="text-2xl font-semibold">
                {data.tasks.length}
              </p>

              <p className="text-sm text-muted-foreground">
                {t("tasks")}
              </p>
            </div>

            <div>
              <p className="text-2xl font-semibold">
                {data.teams.length}
              </p>

              <p className="text-sm text-muted-foreground">
                {t("teams")}
              </p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}