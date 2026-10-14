"use client";

import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useEffect,
  useState,
} from "react";

import { getAccessToken } from "@/lib/auth-storage";
import {
  getWorkspaceId,
  setWorkspaceId,
} from "@/lib/workspace-storage";
import { getOrganizations } from "@/services/dashboard.service";
import type { Organization } from "@/types/dashboard";

export function WorkspaceSwitcher() {
  const t = useTranslations(
    "workspaceSwitcher",
  );

  const [
    organizations,
    setOrganizations,
  ] = useState<Organization[]>([]);

  const [
    selectedId,
    setSelectedId,
  ] = useState("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(true);

  useEffect(() => {
    async function loadOrganizations() {
      const token =
        getAccessToken();

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const items =
          await getOrganizations(
            token,
          );

        setOrganizations(
          items,
        );

        const storedId =
          getWorkspaceId();

        const selected =
          items.find(
            (item) =>
              item.id ===
              storedId,
          ) ??
          items.find(
            (item) =>
              item.slug ===
              "promiseflow",
          ) ??
          items[0];

        if (selected) {
          setSelectedId(
            selected.id,
          );

          setWorkspaceId(
            selected.id,
          );
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadOrganizations();
  }, []);

  function handleChange(
    event: React.ChangeEvent<HTMLSelectElement>,
  ) {
    const workspaceId =
      event.target.value;

    setSelectedId(
      workspaceId,
    );

    setWorkspaceId(
      workspaceId,
    );

    window.location.reload();
  }

  if (isLoading) {
    return (
      <div className="truncate text-sm text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  if (
    organizations.length === 0
  ) {
    return (
      <div className="truncate text-sm text-muted-foreground">
        {t("empty")}
      </div>
    );
  }

  return (
    <div className="relative max-w-[210px] sm:max-w-xs">
      <select
        value={selectedId}
        onChange={handleChange}
        className="h-10 w-full appearance-none truncate rounded-lg border border-border bg-surface pl-3 pr-9 text-sm font-medium outline-none transition hover:bg-surface-muted focus:border-primary"
        aria-label={t("select")}
      >
        {organizations.map(
          (organization) => (
            <option
              key={
                organization.id
              }
              value={
                organization.id
              }
            >
              {
                organization.name
              }
            </option>
          ),
        )}
      </select>

      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}