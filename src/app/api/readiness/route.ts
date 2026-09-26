import { NextResponse } from "next/server";

import { checkReadiness } from "@/lib/observability/readiness";

export async function GET() {
  const result = await checkReadiness();

  return NextResponse.json(result, {
    status: result.status === "ready" ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
