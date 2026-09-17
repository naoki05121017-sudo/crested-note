import { backupLocalJson } from "@/lib/db/backup-json";

const dest = backupLocalJson();
console.log(`控えを作りました: ${dest}`);
console.log("元の data/n-crest.json はそのままです。");
