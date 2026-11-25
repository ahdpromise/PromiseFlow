"use client";

import { DemoActionButton } from "@/components/demo/demo-controls";

import { Bell, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useLocale } from "@/i18n/locale-provider";
import { getAccessToken, isDemoSession } from "@/lib/auth-storage";
import {
  deleteNotification,
  getNotifications,
  markNotificationAsRead,
  type Notification,
} from "@/services/notifications.service";

const NOTIFICATIONS_POLL_INTERVAL_MS = 10_000;

export function NotificationBell() {
  const router = useRouter();
  const t = useTranslations("notifications");
  const { locale } = useLocale();
  const isRtl = locale === "ar";

  const containerRef = useRef<HTMLDivElement | null>(null);

  const [notifications, setNotifications] =
    useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    const token = getAccessToken();

    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const items = await getNotifications(token);
      setNotifications(items);
      setError("");
    } catch {
      setError(t("loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const initialLoadId = window.setTimeout(() => {
      void loadNotifications();
    }, 0);

    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, NOTIFICATIONS_POLL_INTERVAL_MS);

    return () => {
      window.clearTimeout(initialLoadId);
      window.clearInterval(intervalId);
    };
  }, [loadNotifications]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (
        containerRef.current &&
        !containerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );
    };
  }, [isOpen]);

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) => !notification.read_at,
      ).length,
    [notifications],
  );

  function getNotificationContent(
    notification: Notification,
  ) {
    const taskTitle = notification.metadata?.taskTitle;

    if (notification.type === "approval_approved") {
      return {
        title: t("content.approvalApproved.title"),
        message: taskTitle
          ? t("content.approvalApproved.message", {
              taskTitle,
            })
          : t("content.approvalApproved.messageWithoutTask"),
      };
    }

    if (notification.type === "approval_rejected") {
      return {
        title: t("content.approvalRejected.title"),
        message: taskTitle
          ? t("content.approvalRejected.message", {
              taskTitle,
            })
          : t("content.approvalRejected.messageWithoutTask"),
      };
    }

    // Preserve user-defined automation messages.
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
      if (!notification.read_at && !isDemoSession()) {
        const updatedNotification =
          await markNotificationAsRead(
            token,
            notification.id,
          );

        setNotifications((currentNotifications) =>
          currentNotifications.map((item) =>
            item.id === notification.id
              ? updatedNotification
              : item,
          ),
        );
      }

      setError("");
      setSuccessMessage("");
      setIsOpen(false);

      if (notification.target_path) {
        router.push(notification.target_path);
      }
    } catch {
      setError(t("openError"));
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
      await deleteNotification(token, notificationId);

      setNotifications((currentNotifications) =>
        currentNotifications.filter(
          (notification) =>
            notification.id !== notificationId,
        ),
      );

      setSuccessMessage(t("deleteSuccess"));
    } catch {
      setError(t("deleteError"));
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
        onClick={() => void handleToggle()}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
        aria-label={t("open")}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Bell size={19} strokeWidth={1.8} />

        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div
          role="dialog"
          aria-label={t("title")}
          dir={isRtl ? "rtl" : "ltr"}
          className={`fixed inset-x-3 top-[4.5rem] z-50 flex max-h-[calc(100dvh-5.25rem)] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl sm:absolute sm:inset-x-auto sm:top-12 sm:w-80 sm:max-h-[min(32rem,calc(100dvh-6rem))] ${
            isRtl ? "sm:left-0" : "sm:right-0"
          }`}
        >
          <div className="shrink-0 border-b border-border px-4 py-3 text-start">
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
            <div
              role="status"
              className="shrink-0 border-b border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
            >
              {successMessage}
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">
                {t("loading")}
              </div>
            ) : notifications.length > 0 ? (
              <div>
                {notifications.map((notification) => {
                  const content =
                    getNotificationContent(notification);

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
                        className="min-w-0 flex-1 px-4 py-3 text-start transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p
                              dir="auto"
                              className="break-words text-start text-sm font-medium"
                            >
                              {content.title}
                            </p>

                            <p
                              dir={isRtl ? "rtl" : "ltr"}
                              className="mt-1 break-words text-start text-sm leading-5 text-muted-foreground [unicode-bidi:plaintext]"
                            >
                              {content.message}
                            </p>

                            <p
                              dir="ltr"
                              className={`mt-2 text-xs text-muted-foreground ${
                                isRtl
                                  ? "text-right"
                                  : "text-left"
                              }`}
                            >
                              <span
                                dir="ltr"
                                className="inline-block"
                              >
                                {new Intl.DateTimeFormat(
                                  locale === "ar"
                                    ? "ar-EG-u-nu-latn"
                                    : locale,
                                  {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                ).format(
                                  new Date(
                                    notification.created_at,
                                  ),
                                )}
                              </span>
                            </p>
                          </div>

                          {!notification.read_at ? (
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                          ) : null}
                        </div>
                      </button>

                      <DemoActionButton
                        type="button"
                        onClick={() =>
                          void handleDeleteNotification(
                            notification.id,
                          )
                        }
                        disabled={
                          deletingId === notification.id
                        }
                        className="flex w-11 shrink-0 items-center justify-center text-muted-foreground transition hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label={t("delete")}
                        title={t("delete")}
                      >
                        <Trash2
                          size={16}
                          strokeWidth={1.8}
                        />
                      </DemoActionButton>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {t("empty")}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}