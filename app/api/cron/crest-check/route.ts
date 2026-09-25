import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/push/cron-auth";
import { sendDueCheckPushes } from "@/lib/push/send-due";
import { vapidReady } from "@/lib/push/vapid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function run(request: Request) {
  if (!cronAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!vapidReady()) {
    return NextResponse.json({ error: "vapid_missing" }, { status: 503 });
  }
  try {
    const result = await sendDueCheckPushes();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
