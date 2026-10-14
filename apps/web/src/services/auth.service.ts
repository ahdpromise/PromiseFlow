import { apiRequest } from "@/lib/api";

export type LoginPayload = {
  email: string;
  password: string;
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