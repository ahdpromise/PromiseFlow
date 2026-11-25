import type { AuthUser } from "@/services/auth.service";

const ACCESS_TOKEN_KEY =
  "promiseflow_access_token";

const USER_KEY =
  "promiseflow_user";

export function getAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return sessionStorage.getItem(
    ACCESS_TOKEN_KEY,
  );
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedUser =
    sessionStorage.getItem(USER_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    sessionStorage.removeItem(USER_KEY);

    return null;
  }
}

export function isDemoSession(): boolean {
  return getStoredUser()?.email?.trim().toLowerCase() ===
    "demo@promiseflow.invalid";
}

export function getDemoSessionExpiresAt(): number | null {
  if (!isDemoSession()) {
    return null;
  }

  const token = getAccessToken();

  if (!token) {
    return 0;
  }

  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return 0;
    }

    const normalized = payload
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padded = normalized.padEnd(
      Math.ceil(normalized.length / 4) * 4,
      "=",
    );

    const decoded = JSON.parse(atob(padded));

    if (
      typeof decoded.exp !== "number" ||
      !Number.isFinite(decoded.exp)
    ) {
      return 0;
    }

    return decoded.exp * 1000;
  } catch {
    return 0;
  }
}

export function isDemoSessionExpired(): boolean {
  const expiresAt = getDemoSessionExpiresAt();

  return expiresAt !== null &&
    Date.now() >= expiresAt;
}

export function saveAuthSession(
  accessToken: string,
  user: AuthUser,
) {
  sessionStorage.setItem(
    ACCESS_TOKEN_KEY,
    accessToken,
  );

  sessionStorage.setItem(
    USER_KEY,
    JSON.stringify(user),
  );
}

export function clearAuthSession() {
  sessionStorage.removeItem(
    ACCESS_TOKEN_KEY,
  );

  sessionStorage.removeItem(
    USER_KEY,
  );
}