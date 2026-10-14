"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { getAccessToken } from "@/lib/auth-storage";
import { getWorkspaceId } from "@/lib/workspace-storage";
import {
  createTeam,
  getTeams,
} from "@/services/teams.service";
import type { Team } from "@/types/dashboard";

type ErrorMessageKey =
  | "loadTeams"
  | "authenticationMissing"
  | "required"
  | "createTeam";

type SuccessMessageKey =
  | "created"
  | "deleted";

export default function TeamsPage() {
  const t = useTranslations("teams");

  const [teams, setTeams] =
    useState<Team[]>([]);

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

  const [name, setName] =
    useState("");

  const [slug, setSlug] =
    useState("");

  const [isCreating, setIsCreating] =
    useState(false);

  useEffect(() => {
    async function loadTeams() {
      const token = getAccessToken();
      const workspaceId =
        getWorkspaceId();

      if (!token || !workspaceId) {
        setIsLoading(false);
        return;
      }

      try {
        const items =
          await getTeams(
            token,
            workspaceId,
          );

        setTeams(items);

        const deleted =
          sessionStorage.getItem(
            "team-deleted-success",
          );

        if (deleted === "1") {
          sessionStorage.removeItem(
            "team-deleted-success",
          );

          setSuccessMessageKey(
            "deleted",
          );
        }
      } catch {
        setErrorMessageKey(
          "loadTeams",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadTeams();
  }, []);

  const errorMessage = errorMessageKey
    ? t(`errors.${errorMessageKey}`)
    : "";

  const successMessage =
    successMessageKey
      ? t(
          `success.${successMessageKey}`,
        )
      : "";

  async function handleCreateTeam(
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
      const team =
        await createTeam(
          token,
          {
            organization_id:
              workspaceId,
            name: name.trim(),
            slug: slug.trim(),
          },
        );

      setTeams(
        (currentTeams) => [
          team,
          ...currentTeams,
        ],
      );

      setName("");
      setSlug("");
      setShowCreateForm(false);

      setSuccessMessageKey(
        "created",
      );
    } catch {
      setErrorMessageKey(
        "createTeam",
      );
    } finally {
      setIsCreating(false);
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
          onClick={() => {
            setShowCreateForm(
              (current) =>
                !current,
            );

            setErrorMessageKey(null);
            setSuccessMessageKey(null);
          }}
          className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          {showCreateForm
            ? t("cancel")
            : t("newTeam")}
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

      {showCreateForm ? (
        <form
          onSubmit={
            handleCreateTeam
          }
          className="rounded-xl border border-border bg-surface p-6 shadow-sm"
        >
          <div>
            <h2 className="font-semibold">
              {t(
                "create.title",
              )}
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
                htmlFor="team-name"
                className="text-sm font-medium"
              >
                {t(
                  "create.teamName",
                )}
              </label>

              <input
                id="team-name"
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
                className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="team-slug"
                className="text-sm font-medium"
              >
                {t(
                  "create.slug",
                )}
              </label>

              <input
                id="team-slug"
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
                className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-60"
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

      {teams.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {teams.map(
            (team) => (
              <Link
                key={team.id}
                href={`/teams/${team.id}`}
                className="block min-w-0 rounded-xl border border-border bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <h2 className="break-words font-semibold">
                  {team.name}
                </h2>

                <p className="mt-2 break-words text-sm text-muted-foreground">
                  {team.description ??
                    t(
                      "noDescription",
                    )}
                </p>

                <div className="mt-5 min-w-0 border-t border-border pt-4">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {t("slug")}
                  </p>

                  <p className="mt-1 break-all text-sm">
                    {team.slug}
                  </p>
                </div>
              </Link>
            ),
          )}
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <h2 className="font-semibold">
            {t("empty.title")}
          </h2>

          <p className="mt-2 text-sm text-muted-foreground">
            {t(
              "empty.description",
            )}
          </p>
        </section>
      )}
    </div>
  );
}