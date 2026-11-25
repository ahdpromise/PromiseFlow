import { apiRequest } from "@/lib/api";

export type LoginPayload = {
  email: string;
  password: string;
};

export type RequestEmailVerificationPayload = {
  email: string;
};

export type RequestEmailVerificationResponse = {
  message: string;
};

export type RegisterPayload = {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  verification_token: string;
};

export type AuthUser = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
};

export type LoginResponse = {
  message: string;
  access_token: string;
  user: AuthUser;
};

export type RegisterResponse = AuthUser;

export async function login(
  payload: LoginPayload,
) {
  return apiRequest<LoginResponse>(
    "/users/login",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function demoLogin() {
  return apiRequest<LoginResponse>(
    "/users/demo-login",
    {
      method: "POST",
    },
  );
}

export async function requestEmailVerification(
  payload: RequestEmailVerificationPayload,
) {
  return apiRequest<RequestEmailVerificationResponse>(
    "/users/request-email-verification",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function register(
  payload: RegisterPayload,
) {
  return apiRequest<RegisterResponse>(
    "/users",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}