import { revalidatePath } from "next/cache";

export type ActionResult = {
  error: string | null;
  redirectTo?: string;
};

export function actionError(
  error: unknown,
  fallback = "保存できませんでした。",
): ActionResult {
  if (typeof error === "string" && error.trim()) {
    return { error: error.trim() };
  }
  if (error instanceof Error) {
    const message = error.message.trim();
    if (
      message &&
      !message.includes("Minified React error") &&
      !message.includes("An error occurred in the Server Components")
    ) {
      return { error: message };
    }
  }
  return { error: fallback };
}

export function actionOk(redirectTo?: string): ActionResult {
  return redirectTo ? { error: null, redirectTo } : { error: null };
}

export function revalidateApp(...paths: string[]) {
  try {
    revalidatePath("/", "layout");
    for (const path of paths) {
      revalidatePath(path);
    }
  } catch {
    // Next request 外では cache store が無い。保存自体は完了している。
  }
}
