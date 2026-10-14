const WORKSPACE_ID_KEY =
  "promiseflow_workspace_id";

export function getWorkspaceId() {
  if (typeof window === "undefined") {
    return null;
  }

  return sessionStorage.getItem(
    WORKSPACE_ID_KEY,
  );
}

export function setWorkspaceId(
  workspaceId: string,
) {
  sessionStorage.setItem(
    WORKSPACE_ID_KEY,
    workspaceId,
  );
}

export function clearWorkspaceId() {
  sessionStorage.removeItem(
    WORKSPACE_ID_KEY,
  );
}