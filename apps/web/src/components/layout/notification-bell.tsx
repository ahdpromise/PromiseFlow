"use client";

import {
  Bell,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getAccessToken } from "@/lib/auth-storage";
import {
  deleteNotification,
  getNotifications,
  markNotificationAsRead,
  type Notification,
} from "@/services/notifications.service";

const NOTIFICATIONS_POLL_INTERVAL_MS =
  10_000;

export function NotificationBell() {
  const router = useRouter();
  const t = useTranslations("notifications");

  const containerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [isOpen, setIsOpen] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const loadNotifications = useCallback(
    async () => {
      const token = getAccessToken();

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const items =
          await getNotifications(token);

        setNotifications(items);
        setError("");
      } catch {
        setError(
          t("loadError"),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    const initialLoadId =
      window.setTimeout(() => {
        void loadNotifications();
      }, 0);

    const intervalId =
      window.setInterval(() => {
        void loadNotifications();
      }, NOTIFICATIONS_POLL_INTERVAL_MS);

    return () => {
      window.clearTimeout(
        initialLoadId,
      );

      window.clearInterval(
        intervalId,
      );
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    function handlePointerDown(
      event: PointerEvent,
    ) {
      const target =
        event.target as Node;

      if (
        containerRef.current &&
        !containerRef.current.contains(
          target,
        )
      ) {
        setIsOpen(false);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );

      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );
    };
  }, [isOpen]);

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          !notification.read_at,
      ).length,
    [notifications],
  );

  function getNotificationContent(
    notification: Notification,
  ) {
    const taskTitle =
      notification.metadata?.taskTitle;

    if (
      notification.type ===
        "approval_approved" &&
      taskTitle
    ) {
      return {
        title: t(
          "content.approvalApproved.title",
        ),
        message: t(
          "content.approvalApproved.message",
          {
            taskTitle,
          },
        ),
      };
    }

    if (
      notification.type ===
        "approval_rejected" &&
      taskTitle
    ) {
      return {
        title: t(
          "content.approvalRejected.title",
        ),
        message: t(
          "content.approvalRejected.message",
          {
            taskTitle,
          },
        ),
      };
    }

    return {
      title: notification.title,
      message: notification.message,
    };
  }

  async function handleToggle() {
    const nextOpen = !isOpen;

    setIsOpen(nextOpen);

    if (nextOpen) {
      setSuccessMessage("");
      await loadNotifications();
    }
  }

  async function handleNotificationClick(
    notification: Notification,
  ) {
    const token = getAccessToken();

    if (!token) {
      return;
    }

    try {
      if (!notification.read_at) {
        const updatedNotification =
          await markNotificationAsRead(
            token,
            notification.id,
          );

        setNotifications(
          (currentNotifications) =>
            currentNotifications.map(
              (item) =>
                item.id ===
                notification.id
                  ? updatedNotification
                  : item,
            ),
        );
      }

      setError("");
      setSuccessMessage("");
      setIsOpen(false);

      if (notification.target_path) {
        router.push(
          notification.target_path,
        );
      }
    } catch {
      setError(
        t("openError"),
      );
    }
  }

  async function handleDeleteNotification(
    notificationId: string,
  ) {
    const token = getAccessToken();

    if (!token || deletingId) {
      return;
    }

    setDeletingId(notificationId);
    setError("");
    setSuccessMessage("");

    try {
      await deleteNotification(
        token,
        notificationId,
      );

      setNotifications(
        (currentNotifications) =>
          currentNotifications.filter(
            (notification) =>
              notification.id !==
              notificationId,
          ),
      );

      setSuccessMessage(
        t("deleteSuccess"),
      );
    } catch {
      setError(
        t("deleteError"),
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative"
    >
      <button
        type="button"
        onClick={() =>
          void handleToggle()
        }
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
        aria-label={t("open")}
        aria-expanded={isOpen}
      >
        <Bell
          size={19}
          strokeWidth={1.8}
        />

        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
            {unreadCount > 9
              ? "9+"
              : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="fixed left-4 right-4 top-16 z-50 overflow-hidden rounded-xl border border-border bg-surface shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-80">
          <div className="border-b border-border px-4 py-3">
            <h2 className="font-semibold">
              {t("title")}
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              {t("unread", {
                count: unreadCount,
              })}
            </p>
          </div>

          {successMessage ? (
            <div className="border-b border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {successMessage}
            </div>
          ) : null}

          {error ? (
            <div className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">
              {t("loading")}
            </div>
          ) : notifications.length > 0 ? (
            <div className="max-h-96 overflow-y-auto">
              {notifications.map(
                (notification) => {
                  const content =
                    getNotificationContent(
                      notification,
                    );

                  return (
                    <div
                      key={notification.id}
                      className="flex border-b border-border last:border-b-0 hover:bg-surface-muted"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          void handleNotificationClick(
                            notification,
                          )
                        }
                        className="min-w-0 flex-1 px-4 py-3 text-left transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-medium">
                              {
                                content.title
                              }
                            </p>

                            <p className="mt-1 break-words text-sm leading-5 text-muted-foreground">
                              {
                                content.message
                              }
                            </p>

                            <p className="mt-2 text-xs text-muted-foreground">
                              {new Date(
                                notification.created_at,
                              ).toLocaleString()}
                            </p>
                          </div>

                          {!notification.read_at ? (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                          ) : null}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void handleDeleteNotification(
                            notification.id,
                          )
                        }
                        disabled={
                          deletingId ===
                          notification.id
                        }
                        className="flex w-11 shrink-0 items-center justify-center text-muted-foreground transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={t("delete")}
                        title={t("delete")}
                      >
                        <Trash2
                          size={16}
                          strokeWidth={1.8}
                        />
                      </button>
                    </div>
                  );
                },
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {t("empty")}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}