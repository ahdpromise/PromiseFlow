"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  useLocale,
  useTranslations,
} from "next-intl";
import { X } from "lucide-react";

import { getAccessToken } from "@/lib/auth-storage";
import { getWorkspaceId } from "@/lib/workspace-storage";
import {
  getActivities,
  getAuditLogs,
  type Activity,
  type ActivityAuditFilters,
  type AuditLog,
  type Pagination,
} from "@/services/activity-audit.service";
import {
  getOrganizationMemberDirectory,
  type OrganizationMember,
} from "@/services/memberships.service";

type ActiveTab = "activity" | "audit";

type SelectedRecord =
  | {
      type: "activity";
      data: Activity;
    }
  | {
      type: "audit";
      data: AuditLog;
    };

const ACTION_OPTIONS = [
  "created",
  "updated",
  "deleted",
  "approved",
  "rejected",
  "invited",
  "accepted",
  "revoked",
  "resent",
  "added",
  "removed",
  "reordered",
  "enabled",
  "disabled",
] as const;

const ENTITY_TYPE_OPTIONS = [
  "project",
  "task",
  "team",
  "workflow",
  "workflow_step",
  "approval",
  "comment",
  "file",
  "organization",
  "membership",
  "invitation",
  "automation",
  "notification",
  "team_member",
] as const;

export default function ActivityAuditPage() {
  const t = useTranslations("activityAudit");
  const locale = useLocale();

  const [activeTab, setActiveTab] =
    useState<ActiveTab>("activity");

  const [activities, setActivities] =
    useState<Activity[]>([]);

  const [auditLogs, setAuditLogs] =
    useState<AuditLog[]>([]);

  const [members, setMembers] =
    useState<OrganizationMember[]>([]);

  const [selectedRecord, setSelectedRecord] =
    useState<SelectedRecord | null>(null);

  const [actionFilter, setActionFilter] =
    useState("");

  const [userFilter, setUserFilter] =
    useState("");

  const [
    entityTypeFilter,
    setEntityTypeFilter,
  ] = useState("");

  const [fromFilter, setFromFilter] =
    useState("");

  const [toFilter, setToFilter] =
    useState("");

  const [searchFilter, setSearchFilter] =
    useState("");

  const [activityPage, setActivityPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);

  const [activityPagination, setActivityPagination] =
    useState<Pagination | null>(null);

  const [auditPagination, setAuditPagination] =
    useState<Pagination | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [hasError, setHasError] =
    useState(false);

  const loadData = useCallback(async () => {
    const token = getAccessToken();
    const workspaceId = getWorkspaceId();

    if (!token || !workspaceId) {
      setIsLoading(false);
      return;
    }

    const filters: ActivityAuditFilters = {
      action: actionFilter || undefined,
      userId: userFilter || undefined,
      entityType:
        entityTypeFilter || undefined,
      from: fromFilter || undefined,
      to: toFilter || undefined,
      search: searchFilter || undefined,
    };

    setIsLoading(true);
    setHasError(false);

    try {
      const [
        activityItems,
        auditLogItems,
        memberItems,
      ] = await Promise.all([
        getActivities(
          token,
          workspaceId,
          { ...filters, page: activityPage, limit: 20 },
        ),
        getAuditLogs(
          token,
          workspaceId,
          { ...filters, page: auditPage, limit: 20 },
        ),
        getOrganizationMemberDirectory(
          token,
          workspaceId,
        ),
      ]);

      setActivities(activityItems.data);
      setAuditLogs(auditLogItems.data);
      setActivityPagination(activityItems.pagination);
      setAuditPagination(auditLogItems.pagination);
      setMembers(memberItems);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [
    actionFilter,
    userFilter,
    entityTypeFilter,
    fromFilter,
    toFilter,
    searchFilter,
    activityPage,
    auditPage,
  ]);

  useEffect(() => {
    const timeoutId =
      window.setTimeout(() => {
        void loadData();
      }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadData]);

  useEffect(() => {
    if (!selectedRecord) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setSelectedRecord(null);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [selectedRecord]);

  function formatDate(value: string) {
    return new Date(value).toLocaleString(
      locale === "de"
        ? "de-DE"
        : "en-US",
    );
  }

  function translateAction(
    action: string,
  ) {
    const knownActions: Record<
      string,
      string
    > = {
      created: t("actions.created"),
      updated: t("actions.updated"),
      deleted: t("actions.deleted"),
      approved: t("actions.approved"),
      rejected: t("actions.rejected"),
      invited: t("actions.invited"),
      accepted: t("actions.accepted"),
      revoked: t("actions.revoked"),
      resent: t("actions.resent"),
      added: t("actions.added"),
      removed: t("actions.removed"),
      reordered: t("actions.reordered"),
      enabled: t("actions.enabled"),
      disabled: t("actions.disabled"),
    };

    return knownActions[action] ?? action;
  }

  function translateEntityType(
    entityType: string,
  ) {
    const knownEntities: Record<
      string,
      string
    > = {
      project: t("entities.project"),
      task: t("entities.task"),
      team: t("entities.team"),
      workflow: t("entities.workflow"),
      workflow_step: t(
        "entities.workflowStep",
      ),
      approval: t("entities.approval"),
      comment: t("entities.comment"),
      file: t("entities.file"),
      organization: t(
        "entities.organization",
      ),
      membership: t(
        "entities.membership",
      ),
      invitation: t(
        "entities.invitation",
      ),
      automation: t(
        "entities.automation",
      ),
      notification: t(
        "entities.notification",
      ),
      team_member: t("entities.teamMember"),
    };

    return (
      knownEntities[entityType] ??
      entityType
    );
  }

  function formatMetadata(
    metadata: Record<
      string,
      unknown
    > | null,
  ) {
    if (!metadata) {
      return t("details.noMetadata");
    }

    return JSON.stringify(
      metadata,
      null,
      2,
    );
  }

  function openActivityDetails(
    activity: Activity,
  ) {
    setSelectedRecord({
      type: "activity",
      data: activity,
    });
  }

  function openAuditDetails(
    auditLog: AuditLog,
  ) {
    setSelectedRecord({
      type: "audit",
      data: auditLog,
    });
  }

  function closeDetails() {
    setSelectedRecord(null);
  }

  function clearFilters() {
    setActivityPage(1);
    setAuditPage(1);
    setActionFilter("");
    setUserFilter("");
    setEntityTypeFilter("");
    setFromFilter("");
    setToFilter("");
    setSearchFilter("");
  }

  const hasActiveFilters =
    Boolean(actionFilter) ||
    Boolean(userFilter) ||
    Boolean(entityTypeFilter) ||
    Boolean(fromFilter) ||
    Boolean(toFilter) ||
    Boolean(searchFilter);

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm font-medium text-primary">
          {t("workspace")}
        </p>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {t("title")}
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          {t("description")}
        </p>
      </section>

      <section className="rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <div className="mb-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium">
              {t("filters.search")}
            </span>

            <input
              type="search"
              value={searchFilter}
              onChange={(event) =>
                (
                    setActivityPage(1),
                    setAuditPage(1),
                    setSearchFilter(event.target.value)
                  )
              }
              placeholder={t(
                "filters.searchPlaceholder",
              )}
              className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
            />
          </label>
        </div>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
          <div className="grid flex-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <label className="space-y-2">
              <span className="text-sm font-medium">
                {t("filters.action")}
              </span>

              <select
                value={actionFilter}
                onChange={(event) =>
                  (
                    setActivityPage(1),
                    setAuditPage(1),
                    setActionFilter(event.target.value)
                  )
                }
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
              >
                <option value="">
                  {t("filters.allActions")}
                </option>

                {ACTION_OPTIONS.map(
                  (action) => (
                    <option
                      key={action}
                      value={action}
                    >
                      {translateAction(
                        action,
                      )}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">
                {t("filters.user")}
              </span>

              <select
                value={userFilter}
                onChange={(event) =>
                  (
                    setActivityPage(1),
                    setAuditPage(1),
                    setUserFilter(event.target.value)
                  )
                }
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
              >
                <option value="">
                  {t("filters.allUsers")}
                </option>

                {members.map((member) => (
                  <option
                    key={member.user_id}
                    value={member.user_id}
                  >
                    {`${member.first_name} ${member.last_name} — ${member.email}`}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">
                {t("filters.entityType")}
              </span>

              <select
                value={entityTypeFilter}
                onChange={(event) =>
                  (
                    setActivityPage(1),
                    setAuditPage(1),
                    setEntityTypeFilter(event.target.value)
                  )
                }
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
              >
                <option value="">
                  {t(
                    "filters.allEntityTypes",
                  )}
                </option>

                {ENTITY_TYPE_OPTIONS.map(
                  (entityType) => (
                    <option
                      key={entityType}
                      value={entityType}
                    >
                      {translateEntityType(
                        entityType,
                      )}
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">
                {t("filters.from")}
              </span>

              <input
                type="date"
                value={fromFilter}
                max={toFilter || undefined}
                onChange={(event) =>
                  (
                    setActivityPage(1),
                    setAuditPage(1),
                    setFromFilter(event.target.value)
                  )
                }
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium">
                {t("filters.to")}
              </span>

              <input
                type="date"
                value={toFilter}
                min={fromFilter || undefined}
                onChange={(event) =>
                  (
                    setActivityPage(1),
                    setAuditPage(1),
                    setToFilter(event.target.value)
                  )
                }
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            disabled={!hasActiveFilters}
            className="h-10 shrink-0 rounded-lg border border-border px-4 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("filters.clear")}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="border-b border-border px-4 pt-4 sm:px-5">
          <div
            className="flex gap-2 overflow-x-auto"
            role="tablist"
            aria-label={t("tabs.label")}
          >
            <button
              type="button"
              role="tab"
              aria-selected={
                activeTab === "activity"
              }
              onClick={() =>
                setActiveTab("activity")
              }
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition ${
                activeTab === "activity"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("tabs.activity")}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={
                activeTab === "audit"
              }
              onClick={() =>
                setActiveTab("audit")
              }
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-medium transition ${
                activeTab === "audit"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("tabs.audit")}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {t("loading")}
          </div>
        ) : hasError ? (
          <div className="p-8 text-center text-sm text-red-600">
            {t("error")}
          </div>
        ) : activeTab ===
          "activity" ? (
          activities.length > 0 ? (
            <>
              <div className="divide-y divide-border md:hidden">
                {activities.map(
                  (activity) => (
                    <button
                      key={activity.id}
                      type="button"
                      onClick={() =>
                        openActivityDetails(
                          activity,
                        )
                      }
                      className="block w-full space-y-4 p-5 text-left transition hover:bg-muted/30"
                    >
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {t(
                            "columns.action",
                          )}
                        </p>

                        <p className="mt-1 break-words font-medium">
                          {translateAction(
                            activity.action,
                          )}
                        </p>
                      </div>

                      <dl className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <dt className="text-xs text-muted-foreground">
                            {t(
                              "columns.entity",
                            )}
                          </dt>

                          <dd className="mt-1 break-words text-sm">
                            {translateEntityType(
                              activity.entity_type,
                            )}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-xs text-muted-foreground">
                            {t(
                              "columns.date",
                            )}
                          </dt>

                          <dd className="mt-1 text-sm">
                            {formatDate(
                              activity.created_at,
                            )}
                          </dd>
                        </div>
                      </dl>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          {t(
                            "columns.entityId",
                          )}
                        </p>

                        <p className="mt-1 break-all text-xs">
                          {
                            activity.entity_id
                          }
                        </p>
                      </div>
                    </button>
                  ),
                )}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="border-b border-border bg-muted/30">
                    <tr>
                      <th className="px-5 py-3 font-medium">
                        {t(
                          "columns.action",
                        )}
                      </th>

                      <th className="px-5 py-3 font-medium">
                        {t(
                          "columns.entity",
                        )}
                      </th>

                      <th className="px-5 py-3 font-medium">
                        {t(
                          "columns.entityId",
                        )}
                      </th>

                      <th className="px-5 py-3 font-medium">
                        {t(
                          "columns.date",
                        )}
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-border">
                    {activities.map(
                      (activity) => (
                        <tr
                          key={activity.id}
                          tabIndex={0}
                          role="button"
                          onClick={() =>
                            openActivityDetails(
                              activity,
                            )
                          }
                          onKeyDown={(
                            event,
                          ) => {
                            if (
                              event.key ===
                                "Enter" ||
                              event.key ===
                                " "
                            ) {
                              event.preventDefault();
                              openActivityDetails(
                                activity,
                              );
                            }
                          }}
                          className="cursor-pointer transition hover:bg-muted/30 focus:bg-muted/30 focus:outline-none"
                        >
                          <td className="px-5 py-4 font-medium">
                            {translateAction(
                              activity.action,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {translateEntityType(
                              activity.entity_type,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span className="break-all text-xs text-muted-foreground">
                              {
                                activity.entity_id
                              }
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                            {formatDate(
                              activity.created_at,
                            )}
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
              {t("empty.activity")}
            </div>
          )
        ) : auditLogs.length > 0 ? (
          <>
            <div className="divide-y divide-border md:hidden">
              {auditLogs.map(
                (auditLog) => (
                  <button
                    key={auditLog.id}
                    type="button"
                    onClick={() =>
                      openAuditDetails(
                        auditLog,
                      )
                    }
                    className="block w-full space-y-4 p-5 text-left transition hover:bg-muted/30"
                  >
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t(
                          "columns.action",
                        )}
                      </p>

                      <p className="mt-1 break-words font-medium">
                        {translateAction(
                          auditLog.action,
                        )}
                      </p>
                    </div>

                    <dl className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          {t(
                            "columns.entity",
                          )}
                        </dt>

                        <dd className="mt-1 break-words text-sm">
                          {translateEntityType(
                            auditLog.entity_type,
                          )}
                        </dd>
                      </div>

                      <div>
                        <dt className="text-xs text-muted-foreground">
                          {t(
                            "columns.date",
                          )}
                        </dt>

                        <dd className="mt-1 text-sm">
                          {formatDate(
                            auditLog.created_at,
                          )}
                        </dd>
                      </div>
                    </dl>

                    <div>
                      <p className="text-xs text-muted-foreground">
                        {t(
                          "columns.entityId",
                        )}
                      </p>

                      <p className="mt-1 break-all text-xs">
                        {auditLog.entity_id}
                      </p>
                    </div>
                  </button>
                ),
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="px-5 py-3 font-medium">
                      {t(
                        "columns.action",
                      )}
                    </th>

                    <th className="px-5 py-3 font-medium">
                      {t(
                        "columns.entity",
                      )}
                    </th>

                    <th className="px-5 py-3 font-medium">
                      {t(
                        "columns.entityId",
                      )}
                    </th>

                    <th className="px-5 py-3 font-medium">
                      {t(
                        "columns.date",
                      )}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {auditLogs.map(
                    (auditLog) => (
                      <tr
                        key={auditLog.id}
                        tabIndex={0}
                        role="button"
                        onClick={() =>
                          openAuditDetails(
                            auditLog,
                          )
                        }
                        onKeyDown={(
                          event,
                        ) => {
                          if (
                            event.key ===
                              "Enter" ||
                            event.key ===
                              " "
                          ) {
                            event.preventDefault();
                            openAuditDetails(
                              auditLog,
                            );
                          }
                        }}
                        className="cursor-pointer transition hover:bg-muted/30 focus:bg-muted/30 focus:outline-none"
                      >
                        <td className="px-5 py-4 font-medium">
                          {translateAction(
                            auditLog.action,
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {translateEntityType(
                            auditLog.entity_type,
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className="break-all text-xs text-muted-foreground">
                            {
                              auditLog.entity_id
                            }
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                          {formatDate(
                            auditLog.created_at,
                          )}
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
            {t("empty.audit")}
          </div>
        )}

        {!isLoading && !hasError && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-4 sm:px-5">
            <span className="text-sm text-muted-foreground">
              {t("pagination.page")}{" "}
              {activeTab === "activity" ? activityPage : auditPage}
              {" / "}
              {Math.max(
                1,
                (activeTab === "activity"
                  ? activityPagination
                  : auditPagination)?.totalPages ?? 1,
              )}
              {" · "}
              {(activeTab === "activity"
                ? activityPagination
                : auditPagination)?.total ?? 0}
              {" "}
              {t("pagination.records")}
            </span>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={
                  isLoading ||
                  !(activeTab === "activity"
                    ? activityPagination
                    : auditPagination)?.hasPreviousPage
                }
                onClick={() => {
                  if (activeTab === "activity") {
                    setActivityPage((page) => Math.max(1, page - 1));
                  } else {
                    setAuditPage((page) => Math.max(1, page - 1));
                  }
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("pagination.previous")}
              </button>

              <button
                type="button"
                disabled={
                  isLoading ||
                  !(activeTab === "activity"
                    ? activityPagination
                    : auditPagination)?.hasNextPage
                }
                onClick={() => {
                  if (activeTab === "activity") {
                    setActivityPage((page) => page + 1);
                  } else {
                    setAuditPage((page) => page + 1);
                  }
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                {t("pagination.next")}
              </button>
            </div>
          </div>
        )}
      </section>

      {selectedRecord ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="activity-audit-details-title"
        >
          <button
            type="button"
            aria-label={t("details.close")}
            onClick={closeDetails}
            className="absolute inset-0 bg-black/50"
          />

          <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-background shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-background px-5 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-primary">
                  {selectedRecord.type ===
                  "activity"
                    ? t(
                        "details.activityLabel",
                      )
                    : t(
                        "details.auditLabel",
                      )}
                </p>

                <h2
                  id="activity-audit-details-title"
                  className="mt-1 text-xl font-semibold"
                >
                  {t("details.title")}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                aria-label={t(
                  "details.close",
                )}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <X
                  size={20}
                  strokeWidth={1.8}
                />
              </button>
            </div>

            <div className="space-y-6 p-5">
              <dl className="grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">
                    {t(
                      "columns.action",
                    )}
                  </dt>

                  <dd className="mt-1 break-words text-sm font-medium">
                    {translateAction(
                      selectedRecord.data
                        .action,
                    )}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium text-muted-foreground">
                    {t(
                      "columns.entity",
                    )}
                  </dt>

                  <dd className="mt-1 break-words text-sm">
                    {translateEntityType(
                      selectedRecord.data
                        .entity_type,
                    )}
                  </dd>
                </div>

                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground">
                    {t(
                      "columns.entityId",
                    )}
                  </dt>

                  <dd className="mt-1 break-all text-sm">
                    {
                      selectedRecord.data
                        .entity_id
                    }
                  </dd>
                </div>

                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground">
                    {t(
                      "details.userId",
                    )}
                  </dt>

                  <dd className="mt-1 break-all text-sm">
                    {selectedRecord.data
                      .user_id ??
                      t(
                        "details.systemUser",
                      )}
                  </dd>
                </div>

                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-muted-foreground">
                    {t(
                      "columns.date",
                    )}
                  </dt>

                  <dd className="mt-1 text-sm">
                    {formatDate(
                      selectedRecord.data
                        .created_at,
                    )}
                  </dd>
                </div>

                {selectedRecord.type ===
                "audit" ? (
                  <>
                    <div>
                      <dt className="text-xs font-medium text-muted-foreground">
                        {t(
                          "details.ipAddress",
                        )}
                      </dt>

                      <dd className="mt-1 break-all text-sm">
                        {selectedRecord.data
                          .ip_address ??
                          t(
                            "details.notAvailable",
                          )}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-medium text-muted-foreground">
                        {t(
                          "details.userAgent",
                        )}
                      </dt>

                      <dd className="mt-1 break-words text-sm">
                        {selectedRecord.data
                          .user_agent ??
                          t(
                            "details.notAvailable",
                          )}
                      </dd>
                    </div>
                  </>
                ) : null}
              </dl>

              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  {t(
                    "details.metadata",
                  )}
                </p>

                <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/30 p-4 text-xs">
                  {formatMetadata(
                    selectedRecord.data
                      .metadata,
                  )}
                </pre>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}