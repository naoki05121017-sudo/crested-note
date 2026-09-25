import { NextResponse } from "next/server";
import { vapidPublicKey } from "@/lib/push/vapid";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = vapidPublicKey();
  if (!key) {
    return NextResponse.json({ error: "unset" }, { status: 503 });
  }
  return NextResponse.json({ publicKey: key });
}
