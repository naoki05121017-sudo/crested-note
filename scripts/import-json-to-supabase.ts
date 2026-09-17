import { backupLocalJson } from "@/lib/db/backup-json";
import { createImportClient, importLocalJsonToSupabase } from "@/lib/db/supabase-import";
import {
  describeImportEnv,
  loadLocalEnv,
  supabaseSecretKeyFromEnv,
  supabaseUrlFromEnv,
} from "@/lib/supabase/load-local-env";

async function main() {
  loadLocalEnv();
  const envInfo = describeImportEnv();
  console.log(
    `env: file=${envInfo.envLocalExists ? ".env.local" : "missing"} urlVar=${envInfo.urlName} secretVar=${envInfo.secretName} secretKind=${envInfo.secretKind} secretLength=${envInfo.secretLength} sameAsPublishable=${envInfo.sameAsPublishable}`,
  );

  const backupPath = backupLocalJson();
  console.log(`控えを作りました: ${backupPath}`);
  console.log("元の data/n-crest.json は削除も上書きもしていません。");

  const client = createImportClient(supabaseUrlFromEnv(), supabaseSecretKeyFromEnv());
  const summary = await importLocalJsonToSupabase(client);

  console.log("Supabase へ取り込みました（同じIDなら上書き、新しいIDは発行しません）。");
  console.log(
    JSON.stringify(
      {
        animals: summary.animals,
        weights: summary.weights,
        genes: summary.genes,
        crestLinks: summary.crestLinks,
        crestLinkTransfers: summary.crestLinkTransfers,
        breedings: summary.breedings,
        crestLinkSeq: summary.crestLinkSeq,
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
