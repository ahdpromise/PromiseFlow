import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

function validateProductionApiUrl(): void {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl || apiUrl.trim().length === 0) {
    throw new Error(
      "Production NEXT_PUBLIC_API_URL is required",
    );
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(apiUrl);
  } catch {
    throw new Error(
      "Production NEXT_PUBLIC_API_URL must be a valid URL",
    );
  }

  const hostname = parsedUrl.hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.+$/, "");

  const isLocalHostname =
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    (hostname.startsWith("127.") &&
      /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "::" ||
    hostname.startsWith("::ffff:");

  if (
    parsedUrl.protocol !== "https:" ||
    isLocalHostname
  ) {
    throw new Error(
      "Production NEXT_PUBLIC_API_URL must use HTTPS and a non-local hostname",
    );
  }

  if (
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.search ||
    parsedUrl.hash ||
    apiUrl !== apiUrl.trim() ||
    apiUrl.endsWith("/")
  ) {
    throw new Error(
      "Production NEXT_PUBLIC_API_URL has an invalid format",
    );
  }
}

export default function nextConfig(
  phase: string,
): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD) {
    validateProductionApiUrl();
  }

  return {};
}