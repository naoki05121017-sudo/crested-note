import Link from "next/link";
import {
  IssueTransferButton,
  RevokeTransferButton,
} from "@/app/animals/crest-link-buttons";
import { Card, SectionTitle } from "@/app/components/ui";
import { animalTitle } from "@/lib/db/labels";
import type { CrestLinkView } from "@/lib/crest-link/core";

function RelativeLine({
  label,
  relative,
}: {
  label: string;
  relative: CrestLinkView["sire"];
}) {
  return (
    <p className="text-sm">
      <span className="text-muted">{label}：</span>
      {relative ? (
        <Link href={`/animals/${relative.animalId}`} className="hover:underline">
          {animalTitle(relative)}
        </Link>
      ) : (
        <span>未登録</span>
      )}
    </p>
  );
}

export function CrestLinkPanel({
  animalId,
  view,
}: {
  animalId: string;
  view: CrestLinkView;
}) {
  return (
    <Card>
      <SectionTitle hint="生涯データは個体IDで管理します">引き継ぎ</SectionTitle>
      <p className="mt-2 text-sm text-muted">
        所有者が変わっても個体IDは変わりません。次の飼育者へデータを渡すときに使います。
      </p>
      <p className="mt-4 text-sm">
        <span className="text-muted">現在の所有者：</span>
        {view.currentOwnerLabel}
      </p>
      {view.ownerHistory.length > 0 ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-muted">所有者履歴</summary>
          <ul className="mt-2 space-y-1 text-sm">
            {view.ownerHistory.map((entry, index) => (
              <li key={`${entry.at}-${index}`}>
                {entry.ownerLabel}
                {entry.at ? (
                  <span className="text-muted">（{entry.at.slice(0, 10)}）</span>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      <p className="mt-4 text-sm">この個体のデータを次の飼育者へ引き継ぐ</p>

      {view.pendingCode ? (
        <div className="mt-3 rounded-2xl border border-line bg-sand/60 px-4 py-3">
          <p className="text-xs text-muted">引き継ぎコード（14日間有効）</p>
          <p className="mt-1 font-mono text-xl font-semibold tracking-widest">
            {view.pendingCode}
          </p>
          <div className="mt-3">
            <RevokeTransferButton animalId={animalId} />
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <IssueTransferButton animalId={animalId} />
        </div>
      )}

      <div className="mt-6 grid gap-1">
        <RelativeLine label="父" relative={view.sire} />
        <RelativeLine label="母" relative={view.dam} />
        {view.grandparents.length > 0 ? (
          <div className="mt-2">
            <p className="text-sm text-muted">祖父母</p>
            <ul className="mt-1 text-sm">
              {view.grandparents.map((row) => (
                <li key={row.animalId}>
                  <Link href={`/animals/${row.animalId}`} className="hover:underline">
                    {animalTitle(row)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {view.children.length > 0 ? (
          <div className="mt-2">
            <p className="text-sm text-muted">子</p>
            <ul className="mt-1 text-sm">
              {view.children.map((child) => (
                <li key={child.animalId}>
                  <Link href={`/animals/${child.animalId}`} className="hover:underline">
                    {animalTitle(child)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {view.grandchildren.length > 0 ? (
          <div className="mt-2">
            <p className="text-sm text-muted">孫</p>
            <ul className="mt-1 text-sm">
              {view.grandchildren.map((row) => (
                <li key={row.animalId}>
                  <Link href={`/animals/${row.animalId}`} className="hover:underline">
                    {animalTitle(row)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {view.greatGrandchildren.length > 0 ? (
          <div className="mt-2">
            <p className="text-sm text-muted">ひ孫</p>
            <ul className="mt-1 text-sm">
              {view.greatGrandchildren.map((row) => (
                <li key={row.animalId}>
                  <Link href={`/animals/${row.animalId}`} className="hover:underline">
                    {animalTitle(row)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <p className="mt-4 text-xs text-muted">QR / 公開用パス（準備）：{view.publicPath}</p>
    </Card>
  );
}
