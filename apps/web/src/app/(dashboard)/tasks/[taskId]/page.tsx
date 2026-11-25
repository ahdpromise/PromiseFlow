"use client";

import { DemoActionButton, DemoSelect, DemoTextarea, DemoInput } from "@/components/demo/demo-controls";

import { isDemoSession } from "@/lib/auth-storage";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  MessageSquare,
  Upload,
} from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { getAccessToken } from "@/lib/auth-storage";
import { getWorkspaceId } from "@/lib/workspace-storage";

import {
  createApproval,
  getApprovals,
} from "@/services/approvals.service";

import {
  createComment,
  getComments,
  type Comment,
} from "@/services/comments.service";

import {
  getFiles,
  uploadFile,
  type TaskFile,
} from "@/services/files.service";

import {
  getOrganizationMemberDirectory,
  type OrganizationMember,
} from "@/services/memberships.service";

import {
  getTask,
  updateTask,
} from "@/services/tasks.service";

import type {
  Approval,
  Task,
} from "@/types/dashboard";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

type ErrorMessageKey =
  | "loadTask"
  | "updateTask"
  | "selectApprover"
  | "createApproval"
  | "emptyComment"
  | "addComment"
  | "fileSize"
  | "uploadFile";

type SuccessMessageKey =
  | "taskUpdated"
  | "approvalCreated"
  | "commentAdded"
  | "fileUploaded";

export default function TaskDetailsPage() {
  const t = useTranslations("taskDetails");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const params = useParams<{ taskId: string }>();
  const taskId = params.taskId;

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [task, setTask] = useState<Task | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [files, setFiles] = useState<TaskFile[]>([]);
  const [directory, setDirectory] = useState<OrganizationMember[]>([]);

  const [selectedApproverId, setSelectedApproverId] = useState("");
  const [approvalComment, setApprovalComment] = useState("");
  const [showApprovalForm, setShowApprovalForm] = useState(false);

  const [commentContent, setCommentContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("pending");
  const [priority, setPriority] = useState("medium");
  const [dueAt, setDueAt] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingApproval, setIsCreatingApproval] = useState(false);
  const [isCreatingComment, setIsCreatingComment] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  const [errorMessageKey, setErrorMessageKey] =
    useState<ErrorMessageKey | null>(null);

  const [backendError, setBackendError] = useState("");

  const [successMessageKey, setSuccessMessageKey] =
    useState<SuccessMessageKey | null>(null);

  const errorMessage =
    backendError ||
    (errorMessageKey ? t(`errors.${errorMessageKey}`) : "");

  const successMessage =
    successMessageKey ? t(`success.${successMessageKey}`) : "";

  function clearMessages() {
    setErrorMessageKey(null);
    setBackendError("");
    setSuccessMessageKey(null);
  }

  function setCaughtError(
    error: unknown,
    fallbackKey: ErrorMessageKey,
  ) {
    if (error instanceof Error) {
      setBackendError(error.message);
      setErrorMessageKey(null);
      return;
    }

    setBackendError("");
    setErrorMessageKey(fallbackKey);
  }

  function formatDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    if (locale === "ar") {
      const datePart = new Intl.DateTimeFormat("ar", {
        day: "numeric",
        month: "long",
        year: "numeric",
        numberingSystem: "latn",
      }).format(date);

      const timePart = new Intl.DateTimeFormat("ar", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        numberingSystem: "latn",
      }).format(date);

      return `⁧${datePart}، ${timePart}⁩`;
    }

    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  function formatFileType(fileName: string, mimeType: string) {
    const extension = fileName.split(".").pop()?.toLowerCase();

    const types: Record<string, string> = {
      pdf: "PDF",
      md: "Markdown (.md)",
      txt: "Text (.txt)",
      doc: "Word (.doc)",
      docx: "Word (.docx)",
      xls: "Excel (.xls)",
      xlsx: "Excel (.xlsx)",
      csv: "CSV",
      png: "PNG",
      jpg: "JPEG",
      jpeg: "JPEG",
      gif: "GIF",
      webp: "WebP",
      svg: "SVG",
      zip: "ZIP",
      json: "JSON",
    };

    return extension && types[extension]
      ? types[extension]
      : mimeType || "File";
  }

  function formatFileSize(value: number) {
    const bytes = Number(value);

    if (!Number.isFinite(bytes)) {
      return t("files.unknownSize");
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function translateStatus(value: string) {
    switch (value) {
      case "pending":
        return t("status.pending");
      case "in_progress":
        return t("status.inProgress");
      case "completed":
        return t("status.completed");
      case "canceled":
        return t("status.canceled");
      case "approved":
        return t("status.approved");
      case "rejected":
        return t("status.rejected");
      default:
        return value;
    }
  }

  function getMember(userId: string) {
    return directory.find((member) => member.user_id === userId);
  }

  useEffect(() => {
    async function loadTask() {
      const token = getAccessToken();
      const workspaceId = getWorkspaceId();

      if (!token || !workspaceId) {
        setIsLoading(false);
        return;
      }

      try {
        const [
          item,
          taskApprovals,
          taskComments,
          taskFiles,
          organizationMembers,
        ] = await Promise.all([
          getTask(token, taskId),
          (isDemoSession() ? Promise.resolve([]) : getApprovals(token, taskId)),
          (isDemoSession() ? Promise.resolve([]) : getComments(token, taskId)),
          (isDemoSession() ? Promise.resolve([]) : getFiles(token, taskId)),
          (isDemoSession() ? Promise.resolve([]) : getOrganizationMemberDirectory(token, workspaceId)),
        ]);

        setTask(item);
        setApprovals(taskApprovals);
        setComments(taskComments);
        setFiles(taskFiles);
        setDirectory(organizationMembers);

        setTitle(item.title);
        setDescription(item.description ?? "");
        setStatus(item.status);
        setPriority(item.priority);

        if (item.due_at) {
          const date = new Date(item.due_at);

          const localValue = new Date(
            date.getTime() - date.getTimezoneOffset() * 60000,
          )
            .toISOString()
            .slice(0, 16);

          setDueAt(localValue);
        } else {
          setDueAt("");
        }
      } catch (error) {
        setCaughtError(error, "loadTask");
      } finally {
        setIsLoading(false);
      }
    }

    void loadTask();
  }, [taskId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = getAccessToken();

    if (!token || !task) {
      return;
    }

    clearMessages();
    setIsSaving(true);

    try {
      const updatedTask = await updateTask(token, task.id, {
        title,
        description: description.trim() || null,
        status,
        priority,
        due_at: dueAt || null,
      });

      setTask(updatedTask);
      setSuccessMessageKey("taskUpdated");
    } catch (error) {
      setCaughtError(error, "updateTask");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreateApproval(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const token = getAccessToken();

    if (!token || !task) {
      return;
    }

    if (!selectedApproverId) {
      setBackendError("");
      setErrorMessageKey("selectApprover");
      return;
    }

    clearMessages();
    setIsCreatingApproval(true);

    try {
      const approval = await createApproval(token, {
        task_id: task.id,
        approver_user_id: selectedApproverId,
        comment: approvalComment.trim() || undefined,
      });

      setApprovals((current) => [approval, ...current]);

      setSelectedApproverId("");
      setApprovalComment("");
      setShowApprovalForm(false);
      setSuccessMessageKey("approvalCreated");
    } catch (error) {
      setCaughtError(error, "createApproval");
    } finally {
      setIsCreatingApproval(false);
    }
  }

  async function handleCreateComment(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const token = getAccessToken();

    if (!token || !task) {
      return;
    }

    if (!commentContent.trim()) {
      setBackendError("");
      setErrorMessageKey("emptyComment");
      return;
    }

    clearMessages();
    setIsCreatingComment(true);

    try {
      const comment = await createComment(token, {
        task_id: task.id,
        content: commentContent.trim(),
      });

      setComments((current) => [...current, comment]);
      setCommentContent("");
      setSuccessMessageKey("commentAdded");
    } catch (error) {
      setCaughtError(error, "addComment");
    } finally {
      setIsCreatingComment(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    clearMessages();

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setErrorMessageKey("fileSize");
      return;
    }

    setSelectedFile(file);
  }

  async function handleUploadFile(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const token = getAccessToken();

    if (!token || !task || !selectedFile) {
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setBackendError("");
      setErrorMessageKey("fileSize");
      return;
    }

    clearMessages();
    setIsUploadingFile(true);

    try {
      const uploadedFile = await uploadFile(
        token,
        task.id,
        selectedFile,
      );

      setFiles((current) => [uploadedFile, ...current]);
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setSuccessMessageKey("fileUploaded");
    } catch (error) {
      setCaughtError(error, "uploadFile");
    } finally {
      setIsUploadingFile(false);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
        {t("loading")}
      </div>
    );
  }

  if (errorMessage && !task) {
    return (
      <div className="space-y-4">
        <Link
          href="/tasks"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft
            size={16}
            className={isRtl ? "rotate-180" : ""}
          />
          {t("backToTasks")}
        </Link>

        <div className="break-words rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {errorMessage}
        </div>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <div className="min-w-0 space-y-8">
      {/* Task header */}
      <section className="min-w-0">
        <Link
          href="/tasks"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft
            size={16}
            className={isRtl ? "rotate-180" : ""}
          />
          {t("backToTasks")}
        </Link>

        <div className="mt-5 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary">
              {t("task")}
            </p>

            <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight">
              {task.title}
            </h1>

            <p className="mt-2 break-words text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>

          <DemoActionButton
            type="button"
            onClick={() => {
              setShowApprovalForm((current) => !current);
              clearMessages();
            }}
            className="h-10 shrink-0 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            {showApprovalForm
              ? t("cancel")
              : t("requestApproval")}
          </DemoActionButton>
        </div>
      </section>

      {/* Messages */}
      {errorMessage ? (
        <div
          role="alert"
          className="break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      ) : null}

      {successMessage ? (
        <div
          role="status"
          className="break-words rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
        >
          {successMessage}
        </div>
      ) : null}

      {/* Approval creation */}
      {showApprovalForm ? (
        <section className="min-w-0 rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="font-semibold">
            {t("approvalForm.title")}
          </h2>

          <p className="mt-1 break-words text-sm text-muted-foreground">
            {t("approvalForm.description")}
          </p>

          <form
            onSubmit={handleCreateApproval}
            className="mt-6 min-w-0 space-y-5"
          >
            <div className="min-w-0">
              <label
                htmlFor="approval-approver"
                className="mb-2 block text-sm font-medium"
              >
                {t("approvalForm.approver")}
              </label>

              <DemoSelect
                id="approval-approver"
                value={selectedApproverId}
                disabled={isCreatingApproval}
                onChange={(event) =>
                  setSelectedApproverId(event.target.value)
                }
                className="h-11 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary disabled:opacity-60"
              >
                <option value="">
                  {t("approvalForm.selectApprover")}
                </option>

                {directory.map((member) => (
                  <option
                    key={member.membership_id}
                    value={member.user_id}
                  >
                    {member.first_name} {member.last_name} —{" "}
                    {member.email}
                  </option>
                ))}
              </DemoSelect>
            </div>

            <div className="min-w-0">
              <label
                htmlFor="approval-comment"
                className="mb-2 block text-sm font-medium"
              >
                {t("approvalForm.comment")}
              </label>

              <DemoTextarea
                id="approval-comment"
                rows={3}
                value={approvalComment}
                disabled={isCreatingApproval}
                onChange={(event) =>
                  setApprovalComment(event.target.value)
                }
                placeholder={t("approvalForm.commentPlaceholder")}
                className="w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-3 text-sm outline-none transition focus:border-primary disabled:opacity-60"
              />
            </div>

            <div className="flex justify-end">
              <DemoActionButton
                type="submit"
                disabled={
                  isCreatingApproval || !selectedApproverId
                }
                className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreatingApproval
                  ? t("approvalForm.creating")
                  : t("approvalForm.create")}
              </DemoActionButton>
            </div>
          </form>
        </section>
      ) : null}

      {/* Task editing */}
      <section className="min-w-0 rounded-xl border border-border bg-surface p-6 shadow-sm">
        <form
          onSubmit={handleSubmit}
          className="min-w-0 space-y-6"
        >
          <div className="min-w-0">
            <label
              htmlFor="task-title"
              className="mb-2 block text-sm font-medium"
            >
              {t("form.title")}
            </label>

            <DemoInput
              id="task-title"
              type="text"
              required
              disabled={isSaving}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-11 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
            />
          </div>

          <div className="min-w-0">
            <label
              htmlFor="task-description"
              className="mb-2 block text-sm font-medium"
            >
              {t("form.description")}
            </label>

            <DemoTextarea
              id="task-description"
              rows={5}
              disabled={isSaving}
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              className="w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
            />
          </div>

          <div className="grid min-w-0 gap-5 md:grid-cols-3">
            <div className="min-w-0">
              <label
                htmlFor="task-status"
                className="mb-2 block text-sm font-medium"
              >
                {t("form.status")}
              </label>

              <DemoSelect
                id="task-status"
                value={status}
                disabled={isSaving}
                onChange={(event) =>
                  setStatus(event.target.value)
                }
                className="h-11 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary disabled:opacity-60"
              >
                <option value="pending">
                  {t("status.pending")}
                </option>
                <option value="in_progress">
                  {t("status.inProgress")}
                </option>
                <option value="completed">
                  {t("status.completed")}
                </option>
                <option value="canceled">
                  {t("status.canceled")}
                </option>
              </DemoSelect>
            </div>

            <div className="min-w-0">
              <label
                htmlFor="task-priority"
                className="mb-2 block text-sm font-medium"
              >
                {t("form.priority")}
              </label>

              <DemoSelect
                id="task-priority"
                value={priority}
                disabled={isSaving}
                onChange={(event) =>
                  setPriority(event.target.value)
                }
                className="h-11 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary disabled:opacity-60"
              >
                <option value="low">
                  {t("priority.low")}
                </option>
                <option value="medium">
                  {t("priority.medium")}
                </option>
                <option value="high">
                  {t("priority.high")}
                </option>
                <option value="urgent">
                  {t("priority.urgent")}
                </option>
              </DemoSelect>
            </div>

            <div className="min-w-0">
              <label
                htmlFor="task-due-at"
                className="mb-2 block text-sm font-medium"
              >
                {t("form.dueDate")}
              </label>

              <DemoInput
                id="task-due-at"
                type="datetime-local"
                dir="ltr"
                disabled={isSaving}
                value={dueAt}
                onChange={(event) =>
                  setDueAt(event.target.value)
                }
                className="h-11 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary disabled:opacity-60"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <DemoActionButton
              type="submit"
              disabled={isSaving}
              className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? t("form.saving")
                : t("form.saveChanges")}
            </DemoActionButton>
          </div>
        </form>
      </section>

      {/* Approvals list */}
      <section className="min-w-0 rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-semibold">
              {t("approvals.title")}
            </h2>

            <p className="mt-1 break-words text-sm text-muted-foreground">
              {t("approvals.description")}
            </p>
          </div>

          <CheckCircle2
            size={20}
            className="shrink-0 text-muted-foreground"
          />
        </div>

        {approvals.length > 0 ? (
          <div className="divide-y divide-border">
            {approvals.map((approval) => {
              const approver = getMember(
                approval.approver_user_id,
              );

              return (
                <div
                  key={approval.id}
                  className="flex min-w-0 flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="break-words font-medium">
                      {approver
                        ? `${approver.first_name} ${approver.last_name}`
                        : t("workspaceMember")}
                    </p>

                    <p className="mt-1 break-all text-sm text-muted-foreground">
                      {approver?.email ??
                        approval.approver_user_id}
                    </p>

                    {approval.comment ? (
                      <p className="mt-2 break-words text-sm text-muted-foreground">
                        {approval.comment}
                      </p>
                    ) : null}
                  </div>

                  <span className="shrink-0 rounded-full bg-surface-muted px-3 py-1 text-sm font-medium">
                    {translateStatus(approval.status)}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm font-medium">
              {t("approvals.empty")}
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {t("approvals.emptyDescription")}
            </p>
          </div>
        )}
      </section>

      {/* Files */}
      <section className="min-w-0 rounded-xl border border-border bg-surface">
        <div className="flex min-w-0 flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <FileText
              size={20}
              className="shrink-0 text-muted-foreground"
            />

            <div className="min-w-0">
              <h2 className="font-semibold">
                {t("files.title")}
              </h2>

              <p className="mt-1 break-words text-sm text-muted-foreground">
                {t("files.description")}
              </p>
            </div>
          </div>

          <form
            onSubmit={handleUploadFile}
            className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center"
          >
            <DemoInput
              ref={fileInputRef}
              id="task-file-upload"
              type="file"
              disabled={isUploadingFile}
              onChange={handleFileChange}
              className="sr-only"
            />

            <label
              htmlFor="task-file-upload"
              className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface-muted px-4 py-2 text-sm font-medium transition hover:bg-border"
            >
              {t("files.chooseFile")}
            </label>

            <span
              dir="auto"
              className="min-w-0 break-all text-sm text-muted-foreground"
            >
              {selectedFile
                ? selectedFile.name
                : t("files.noFileSelected")}
            </span>

            <DemoActionButton
              type="submit"
              disabled={isUploadingFile || !selectedFile}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload size={16} />

              {isUploadingFile
                ? t("files.uploading")
                : t("files.upload")}
            </DemoActionButton>
          </form>
        </div>

        <div className="border-b border-border px-5 py-3 text-xs text-muted-foreground">
          {t("files.maxSize")}
        </div>

        {files.length > 0 ? (
          <div className="divide-y divide-border">
            {files.map((file) => {
              const uploader = getMember(
                file.uploaded_by_user_id,
              );

              return (
                <div
                  key={file.id}
                  className="flex min-w-0 flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
                      <FileText
                        size={18}
                        className="text-muted-foreground"
                      />
                    </div>

                    <div className="min-w-0">
                      <p className="break-all font-medium">
                        {file.file_name}
                      </p>

                      <p className="mt-1 break-words text-sm text-muted-foreground">
                        {formatFileType(
                          file.file_name,
                          file.mime_type,
                        )}{" "}
                        · {formatFileSize(file.file_size)}
                      </p>

                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {t("files.uploadedBy")}{" "}
                        {uploader
                          ? `${uploader.first_name} ${uploader.last_name}`
                          : file.uploaded_by_user_id}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-3">
                    <p
                      dir={isRtl ? "rtl" : "ltr"}
                      className="text-xs text-muted-foreground [unicode-bidi:isolate]"
                    >
                      {formatDate(file.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm font-medium">
              {t("files.empty")}
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {t("files.emptyDescription")}
            </p>
          </div>
        )}
      </section>

      {/* Comments */}
      <section className="min-w-0 rounded-xl border border-border bg-surface">
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-semibold">
              {t("comments.title")}
            </h2>

            <p className="mt-1 break-words text-sm text-muted-foreground">
              {t("comments.description")}
            </p>
          </div>

          <MessageSquare
            size={20}
            className="shrink-0 text-muted-foreground"
          />
        </div>

        {comments.length > 0 ? (
          <div className="divide-y divide-border">
            {comments.map((comment) => {
              const author = getMember(comment.user_id);

              return (
                <div
                  key={comment.id}
                  className="min-w-0 p-5"
                >
                  <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words font-medium">
                        {author
                          ? `${author.first_name} ${author.last_name}`
                          : t("workspaceMember")}
                      </p>

                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        {author?.email ?? comment.user_id}
                      </p>
                    </div>

                    <p
                      dir={isRtl ? "rtl" : "ltr"}
                      className="shrink-0 text-xs text-muted-foreground [unicode-bidi:isolate]"
                    >
                      {formatDate(comment.created_at)}
                    </p>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6">
                    {comment.content}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="text-sm font-medium">
              {t("comments.empty")}
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              {t("comments.emptyDescription")}
            </p>
          </div>
        )}

        <form
          onSubmit={handleCreateComment}
          className="min-w-0 border-t border-border p-5"
        >
          <label
            htmlFor="task-comment"
            className="mb-2 block text-sm font-medium"
          >
            {t("comments.add")}
          </label>

          <DemoTextarea
            id="task-comment"
            rows={4}
            value={commentContent}
            disabled={isCreatingComment}
            onChange={(event) =>
              setCommentContent(event.target.value)
            }
            placeholder={t("comments.placeholder")}
            className="w-full min-w-0 rounded-lg border border-border bg-surface px-3 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
          />

          <div className="mt-3 flex justify-end">
            <DemoActionButton
              type="submit"
              disabled={
                isCreatingComment || !commentContent.trim()
              }
              className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreatingComment
                ? t("comments.adding")
                : t("comments.add")}
            </DemoActionButton>
          </div>
        </form>
      </section>
    </div>
  );
}