import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { persistStatsMorphKey } from "@/lib/stats/compare";
import { loadLocalEnv, supabasePublishableKeyFromEnv, supabaseSecretKeyFromEnv, supabaseUrlFromEnv } from "@/lib/supabase/load-local-env";

loadLocalEnv();

const url = supabaseUrlFromEnv();
const secret = supabaseSecretKeyFromEnv();
const publishable = supabasePublishableKeyFromEnv();
const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = createClient(url, publishable, { auth: { persistSession: false, autoRefreshToken: false } });

const results: string[] = [];
function ok(label: string, detail = "") {
  results.push(`PASS ${label}${detail ? ` — ${detail}` : ""}`);
}
function fail(label: string, detail: string): never {
  results.push(`FAIL ${label} — ${detail}`);
  throw new Error(results.join("\n"));
}

async function rpcExists(): Promise<boolean> {
  const { error } = await admin.rpc("japan_crest_stats");
  if (!error) return true;
  if (/could not find the function/i.test(error.message) || error.code === "PGRST202") return false;
  fail("RPC probe", error.message);
}

async function main() {
  const hasRpc = await rpcExists();
  if (!hasRpc) {
    fail(
      "SQL migration",
      "japan_crest_stats が未適用です。Supabase SQL Editor で anonymous-stats.sql を実行してください。",
    );
  }
  ok("SQL migration", "japan_crest_stats が呼べる");

  const run = `e2e${Date.now()}`;
  const password = `E2e!${run}Aa1`;
  const emailA = `crest-e2e-a-${run}@ncrest.test`;
  const emailB = `crest-e2e-b-${run}@ncrest.test`;
  const morph = `e2e-priv-${run}`;
  const publicMorph = `e2e-pub-${run}`;
  const privateName = `秘密のクレス-${run}`;
  const privateNotes = `非公開メモ-${run}`;
  const privateSlug = `priv${run}`.slice(0, 12);
  const publicSlug = `pub${run}`.slice(0, 12);

  const created: { userIds: string[]; animalIds: string[]; photoKeys: string[] } = {
    userIds: [],
    animalIds: [],
    photoKeys: [],
  };

  try {
    const userA = await createUser(emailA, password);
    const userB = await createUser(emailB, password);
    created.userIds.push(userA, userB);
    await upsertProfile(userA, "Account A");
    await upsertProfile(userB, "Account B");

    const before = await statsAs(emailB, password);
    const privateId = crypto.randomUUID();
    const publicId = crypto.randomUUID();
    created.animalIds.push(privateId, publicId);

    const privateAnimal = {
      id: privateId,
      name: privateName,
      sex: "female" as const,
      hatchDate: "2025-03-15",
      morphLabel: morph,
      notes: privateNotes,
      isPublic: false,
      shareSlug: privateSlug,
      prefecture: "東京都",
    };
    await insertAnimal(userA, privateAnimal);
    const weightId = crypto.randomUUID();
    const { error: weightError } = await admin.from("weight_logs").insert({
      id: weightId,
      animal_id: privateId,
      weighed_on: "2026-09-15",
      weight_g: 27.4,
      notes: "体重メモは出さない",
    });
    if (weightError) fail("private weight insert", weightError.message);

    const photoPath = `${privateId}/probe.jpg`;
    created.photoKeys.push(photoPath);
    const jpeg = Buffer.from(
      "/9j/4AAQSkZJRgABAQAAAQABAAD/2wAAABxpY3QAAElJKgAIAAAABQASAQMAAQAAAAEAAAAA",
      "base64",
    );
    const uploaded = await admin.storage.from("animal-photos").upload(photoPath, jpeg, {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (uploaded.error) fail("private photo upload", uploaded.error.message);
    const publicPhotoUrl = admin.storage.from("animal-photos").getPublicUrl(photoPath).data.publicUrl;
    const { error: photoUrlError } = await admin
      .from("animals")
      .update({ photo_url: publicPhotoUrl })
      .eq("id", privateId);
    if (photoUrlError) fail("private photo_url", photoUrlError.message);

    await insertAnimal(userA, {
      id: publicId,
      name: `公開クレス-${run}`,
      sex: "male",
      hatchDate: "2024-06-01",
      morphLabel: publicMorph,
      notes: "公開メモ",
      isPublic: true,
      shareSlug: publicSlug,
      prefecture: "大阪府",
    });
    const { error: publicWeightError } = await admin.from("weight_logs").insert({
      id: crypto.randomUUID(),
      animal_id: publicId,
      weighed_on: "2026-09-15",
      weight_g: 42.0,
      notes: "",
    });
    if (publicWeightError) fail("public weight insert", publicWeightError.message);

    const after = await statsAs(emailB, password);
    if (after.registered !== before.registered + 2) {
      fail(
        "匿名統計に非公開個体が含まれる",
        `registered ${before.registered} → ${after.registered}（+2 を期待。非公開+公開）`,
      );
    }
    if (after.living < before.living + 2) {
      fail("匿名統計 living", `${before.living} → ${after.living}`);
    }
    const afterA = await statsAs(emailA, password);
    if (afterA.registered !== after.registered) {
      fail(
        "ユーザーAとBで全国件数が一致しない",
        `A=${afterA.registered} B=${after.registered}`,
      );
    }
    const asAdmin = await admin.rpc("japan_crest_stats");
    if (asAdmin.error) fail("japan_crest_stats as service role", asAdmin.error.message);
    const adminRegistered = Number(
      (asAdmin.data as { registered?: number } | null)?.registered ?? NaN,
    );
    if (adminRegistered !== after.registered) {
      fail(
        "service role とログインユーザーで件数が違う",
        `admin=${adminRegistered} user=${after.registered}`,
      );
    }
    ok("非公開個体が匿名統計に入った", `registered ${before.registered} → ${after.registered}`);

    const sessionB = await signIn(emailB, password);
    const compare = await sessionB.rpc("compare_cohort_stats", {
      p_exclude_animal_id: crypto.randomUUID(),
      p_sex: "female",
      p_morph_key: morph,
      p_age_months: 18,
    });
    if (compare.error) fail("compare_cohort_stats as B", compare.error.message);
    const sampleSize = Number((compare.data as { sampleSize?: number })?.sampleSize ?? 0);
    if (sampleSize < 1) {
      fail("比較RPCが非公開個体を含む", `sampleSize=${sampleSize} morph=${morph}`);
    }
    const compareJson = JSON.stringify(compare.data);
    if (compareJson.includes(privateName) || compareJson.includes(userA) || compareJson.includes(privateNotes)) {
      fail("比較RPCが識別情報を返した", compareJson);
    }
    ok("全国個体比較RPC", `非公開モルフ ${morph} の sampleSize=${sampleSize}`);

    const statsJson = JSON.stringify(after);
    if (statsJson.includes(privateName) || statsJson.includes(userA) || statsJson.includes(privateNotes)) {
      fail("統計RPCが識別情報を返した", statsJson);
    }

    const hidden = await sessionB.from("animals").select("id,name,notes,photo_url,user_id").eq("id", privateId);
    if (hidden.error) fail("B SELECT private animal", hidden.error.message);
    if ((hidden.data ?? []).length > 0) {
      fail("Bから非公開個体行が見える", JSON.stringify(hidden.data));
    }
    ok("別アカウントから非公開個体行は見えない");

    const genes = await sessionB.from("animal_genes").select("*").eq("animal_id", privateId);
    if ((genes.data ?? []).length > 0) fail("Bから非公開遺伝子が見える", JSON.stringify(genes.data));
    const weights = await sessionB.from("weight_logs").select("*").eq("animal_id", privateId);
    if ((weights.data ?? []).length > 0) fail("Bから非公開体重が見える", JSON.stringify(weights.data));
    ok("別アカウントから非公開の遺伝子・体重は見えない");

    const photoDirect = await fetch(publicPhotoUrl);
    if (photoDirect.ok) {
      fail("非公開写真の直URL", `HTTP ${photoDirect.status} で取得できてしまった`);
    }
    ok("非公開写真の直URLはB/未ログインで取れない", `HTTP ${photoDirect.status}`);

    const storageAsB = await sessionB.storage.from("animal-photos").download(photoPath);
    if (!storageAsB.error) {
      fail("Storage download as B", "非公開オブジェクトをダウンロードできた");
    }
    ok("Storage API でもBは非公開写真を取れない");

    const published = await sessionB
      .from("animals")
      .select("id,name,is_public,share_slug")
      .eq("id", publicId)
      .maybeSingle();
    if (published.error) fail("B SELECT public animal", published.error.message);
    if (!published.data || published.data.name !== `公開クレス-${run}` || published.data.is_public !== true) {
      fail("公開個体のRLS表示", JSON.stringify(published.data));
    }
    ok("公開個体はBから名前を含めて見える", published.data.name);

    const publicWeights = await sessionB.from("weight_logs").select("id").eq("animal_id", publicId);
    if (publicWeights.error) fail("public weights", publicWeights.error.message);

    const sessionA = await signIn(emailA, password);
    const ownPrivate = await sessionA.from("animals").select("id,name").eq("id", privateId).maybeSingle();
    if (!ownPrivate.data || ownPrivate.data.name !== privateName) {
      fail("Aが自分の非公開個体を管理できない", JSON.stringify(ownPrivate));
    }
    ok("Aは自分の非公開個体を読める");

    const comparePublic = await sessionB.rpc("compare_cohort_stats", {
      p_exclude_animal_id: crypto.randomUUID(),
      p_sex: "male",
      p_morph_key: publicMorph.toLowerCase(),
      p_age_months: 27,
    });
    if (comparePublic.error) fail("compare public morph", comparePublic.error.message);
    const publicSample = Number((comparePublic.data as { sampleSize?: number })?.sampleSize ?? 0);
    if (publicSample < 1) {
      fail("公開個体が比較に入らない", `sampleSize=${publicSample}`);
    }
    ok("公開個体も比較RPCに入る", `sampleSize=${publicSample}`);
  } finally {
    for (const key of created.photoKeys) {
      await admin.storage.from("animal-photos").remove([key]);
    }
    if (created.animalIds.length) {
      await admin.from("weight_logs").delete().in("animal_id", created.animalIds);
      await admin.from("animal_genes").delete().in("animal_id", created.animalIds);
      await admin.from("animals").delete().in("id", created.animalIds);
    }
    for (const id of created.userIds) {
      await admin.from("profiles").delete().eq("id", id);
      await admin.auth.admin.deleteUser(id);
    }
  }

  console.log(results.join("\n"));
  console.log("ALL CHECKS PASSED");
}

async function createUser(email: string, password: string) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { source: "anonymous-stats-e2e" },
  });
  if (error || !data.user?.id) fail(`createUser ${email}`, error?.message ?? "no id");
  return data.user.id;
}

async function upsertProfile(id: string, name: string) {
  const { error } = await admin.from("profiles").upsert({
    id,
    display_name: name,
    collection_name: "クレスノート",
    prefecture: "東京都",
    public_by_default: false,
  });
  if (error) fail(`profile ${name}`, error.message);
}

async function insertAnimal(
  userId: string,
  row: {
    id: string;
    name: string;
    sex: "male" | "female";
    hatchDate: string;
    morphLabel: string;
    notes: string;
    isPublic: boolean;
    shareSlug: string;
    prefecture: string;
  },
) {
  const morphKey = persistStatsMorphKey(
    { id: row.id, morphLabel: row.morphLabel, traits: [] },
    [],
  );
  const { error } = await admin.from("animals").insert({
    id: row.id,
    user_id: userId,
    crest_link_id: "",
    code: "NC-000001",
    name: row.name,
    sex: row.sex,
    hatch_date: row.hatchDate,
    status: "active",
    morph_label: row.morphLabel,
    traits: [],
    trait_levels: {},
    notes: row.notes,
    photo_url: "",
    is_public: row.isPublic,
    share_slug: row.shareSlug,
    prefecture: row.prefecture,
    stats_morph_key: morphKey,
  });
  if (error) fail(`insert animal ${row.name}`, error.message);
}

async function signIn(email: string, password: string) {
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) fail(`signIn ${email}`, error?.message ?? "no session");
  return createClient(url, publishable, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
}

async function statsAs(email: string, password: string) {
  const client = await signIn(email, password);
  const { data, error } = await client.rpc("japan_crest_stats");
  if (error) fail("japan_crest_stats", error.message);
  return data as { registered: number; living: number };
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
