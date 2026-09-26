import "server-only";

import { isIP } from "node:net";
import { headers } from "next/headers";

const LOCAL_DEVELOPMENT_IP_SENTINEL = "local-development";

export class TrustedClientIpError extends Error {
  readonly code = "trusted_client_ip_unavailable";

  constructor() {
    super("Trusted client IP unavailable");
    this.name = "TrustedClientIpError";
  }
}

export async function getTrustedClientIp() {
  const headerValue = (await headers()).get("x-forwarded-for")?.trim();

  if (!headerValue) {
    if (process.env.VERCEL === "1") {
      throw new TrustedClientIpError();
    }

    return LOCAL_DEVELOPMENT_IP_SENTINEL;
  }

  const clientIp = headerValue.split(",")[0]?.trim();

  if (!clientIp || isIP(clientIp) === 0) {
    throw new TrustedClientIpError();
  }

  return clientIp;
}
