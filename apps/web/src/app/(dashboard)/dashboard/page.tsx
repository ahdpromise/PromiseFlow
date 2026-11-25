"use client";

import Link from "next/link";
import {
  Building2,
  Mail,
  UserCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import { getAccessToken } from "@/lib/auth-storage";

import {
  getWorkspaceId,
  setWorkspaceId,
  subscribeToWorkspace,
} from "@/lib/workspace-storage";

import {
  getDashboardData,
  getOrganizations,
  type DashboardData,
} from "@/services/dashboard.service";

type DashboardState =
  | { status: "loading" }
  | { status: "welcome" }
  | { status: "error" }
  | {
      status: "ready";
      workspaceId: string;
      data: DashboardData;
    };

function getServerSnapshot() {
  return null;
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");

  const workspaceId = useSyncExternalStore(
    subscribeToWorkspace,
    getWorkspaceId,
    getServerSnapshot,
  );

  const [state, setState] =
    useState<DashboardState>({
      status: "loading",
    });

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      const token = getAccessToken();

      if (!token) {
        if (!cancelled) {
          setState({ status: "error" });
        }

        return;
      }

      try {
        if (!workspaceId) {
          const organizations =
            await getOrganizations(token);

          if (cancelled) {
            return;
          }

          if (getWorkspaceId()) {
            return;
          }

          const selected =
            organizations.find(
              (item) =>
                item.slug === "promiseflow",
            ) ?? organizations[0];

          if (selected) {
            setWorkspaceId(selected.id);
            return;
          }

          setState({ status: "welcome" });
          return;
        }

        const dashboardData =
          await getDashboardData(
            token,
            workspaceId,
          );

        if (!cancelled) {
          setState({
            status: "ready",
            workspaceId,
            data: dashboardData,
          });
        }
      } catch {
        if (!cancelled) {
          setState({ status: "error" });
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  const data =
    state.status === "ready" &&
    state.workspaceId === workspaceId
      ? state.data
      : null;

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
      change: t("totalProjects", {
        count: data?.projects.length ?? 0,
      }),
    },
    {
      label: t("openTasks"),
      value: openTasks,
      change: t("totalTasks", {
        count: data?.tasks.length ?? 0,
      }),
    },
    {
      label: t("teams"),
      value: data?.teams.length ?? 0,
      change: t("activeTeams", {
        count: data?.teams.length ?? 0,
      }),
    },
    {
      label: t("pendingApprovals"),
      value: pendingApprovals,
      change: t("totalApprovals", {
        count: data?.approvals.length ?? 0,
      }),
    },
  ];

  if (state.status === "error") {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"
      >
        {t("loadError")}
      </div>
    );
  }

  if (
    state.status === "welcome" &&
    !workspaceId
  ) {
    return (
      <div className="mx-auto max-w-3xl py-8 sm:py-16">
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-10">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Building2
                size={32}
                strokeWidth={1.7}
              />
            </div>

            <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("welcome.title")}
            </h1>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">
              {t("welcome.description")}
            </p>
          </div>

          <div className="mt-8 space-y-4 border-t border-border pt-8">
            <article className="flex items-start gap-4 rounded-xl border border-border p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Mail size={22} />
              </div>

              <div>
                <h2 className="font-semibold">
                  {t("welcome.invitationTitle")}
                </h2>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {t("welcome.invitationDescription")}
                </p>
              </div>
            </article>

            <article className="flex items-start gap-4 rounded-xl border border-border p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-green-500/10 text-green-600">
                <UserCheck size={22} />
              </div>

              <div>
                <h2 className="font-semibold">
                  {t("welcome.accountTitle")}
                </h2>

                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {t("welcome.accountDescription")}
                </p>
              </div>
            </article>
          </div>

          <p className="mt-8 text-center text-xs leading-6 text-muted-foreground">
            {t("welcome.footer")}
          </p>
        </section>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        role="status"
        className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground"
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
          />

          {t("loading")}
        </div>
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
                {t("recentProjectsDescription")}
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