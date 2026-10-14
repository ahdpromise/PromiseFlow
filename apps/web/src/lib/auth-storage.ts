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