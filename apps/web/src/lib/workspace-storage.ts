const WORKSPACE_ID_KEY =
  "promiseflow_workspace_id";

const WORKSPACE_CHANGE_EVENT =
  "promiseflow:workspace-change";

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
  const previousId = getWorkspaceId();

  sessionStorage.setItem(
    WORKSPACE_ID_KEY,
    workspaceId,
  );

  if (previousId !== workspaceId) {
    window.dispatchEvent(
      new Event(WORKSPACE_CHANGE_EVENT),
    );
  }
}

export function clearWorkspaceId() {
  const previousId = getWorkspaceId();

  sessionStorage.removeItem(
    WORKSPACE_ID_KEY,
  );

  if (previousId !== null) {
    window.dispatchEvent(
      new Event(WORKSPACE_CHANGE_EVENT),
    );
  }
}

export function subscribeToWorkspace(
  callback: () => void,
) {
  window.addEventListener(
    WORKSPACE_CHANGE_EVENT,
    callback,
  );

  return () => {
    window.removeEventListener(
      WORKSPACE_CHANGE_EVENT,
      callback,
    );
  };
}