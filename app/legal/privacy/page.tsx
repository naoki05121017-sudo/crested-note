import { LegalArticle, LegalSection } from "@/app/legal/legal-article";
import { legalOperator } from "@/lib/legal/operator";

export const dynamic = "force-dynamic";
export const metadata = { title: "プライバシーポリシー" };

export default function PrivacyPage() {
  const operator = legalOperator();
  const contact =
    operator.email === "未設定"
      ? "特定商取引法に基づく表記に記載の問い合わせ先（メールアドレスは現在未設定です）"
      : operator.email;

  return (
    <LegalArticle
      kicker="PRIVACY"
      title="プライバシーポリシー"
      description="クレスノートにおける個人情報および個体データの取り扱いです。"
    >
      <LegalSection title="1. 取得する情報">
        <p>本サービスは、利用にあたり次のような情報を取得することがあります。</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>アカウント情報（メールアドレス、パスワード、表示名など）</li>
          <li>
            個体に関する記録（名前、コード、性別、孵化日、モルフ、遺伝情報、体重、写真、メモ、公開設定など）
          </li>
          <li>設定情報（コレクション名、都道府県、公開の初期値など）</li>
          <li>ご意見・不具合報告の内容</li>
          <li>ログイン状態を維持するためのCookie等</li>
          <li>サービス提供に通常付随する技術情報（アクセス日時など。運営が別途解析ツールを導入した場合はその範囲）</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. 利用目的">
        <p>取得した情報は、次の目的で利用します。</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>アカウントの認証、本人確認に準ずる連絡</li>
          <li>個体管理、遺伝計算、繁殖記録など本サービスの提供</li>
          <li>公開設定に基づく公開ページの表示</li>
          <li>全国個体比較および日本のクレス統計の作成（公開個体に限る）</li>
          <li>不具合対応、お問い合わせへの回答、サービス改善</li>
          <li>利用規約違反への対応、セキュリティの確保</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. 個体データの取り扱い">
        <p>
          個体データは、登録したアカウントの利用者のものとして保存します。他の利用者の管理画面には表示しません。運営は、障害対応・バックアップ・法令に基づく請求など、サービス運営に必要な場合を除き、個別の非公開データを閲覧する運用はしません。
        </p>
      </LegalSection>

      <LegalSection title="4. 全国個体比較・日本のクレス統計への利用">
        <p>
          公開設定された個体の情報は、性別・モルフ・月齢・体重などの傾向を示す参考値として集計することがあります。比較画面では、他者の個体名を並べたランキングは表示しません。非公開の個体は集計対象にしません。
        </p>
      </LegalSection>

      <LegalSection title="5. 公開設定した情報の扱い">
        <p>
          公開を選んだ個体は、公開用URLから第三者が閲覧できます。表示され得る項目には、名前、個体コード、写真、モルフ、体重の推移などが含まれます。公開の範囲は利用者が設定で変更できます。
        </p>
      </LegalSection>

      <LegalSection title="6. データの保存・安全管理">
        <p>
          運営は、取り扱う情報の漏えい、滅失、改ざんを防ぐため、アクセス制限や通信の暗号化など、状況に応じた安全管理に努めます。ただし、インターネット上の完全な安全を保証するものではありません。利用者側でも、パスワードの使い回しを避けるなど、基本的な管理をお願いします。
        </p>
      </LegalSection>

      <LegalSection title="7. 外部サービス（Supabase 等）の利用">
        <p>
          本サービスは、認証、データベース、ファイル保存などに外部事業者のサービス（例: Supabase、ホスティングに Vercel）を利用します。これらの事業者は、それぞれの約款・データ処理の取り決めに従い、本サービスの提供に必要な範囲で情報を取り扱うことがあります。保存場所や委託先は、当該事業者の仕様に依ります。
        </p>
      </LegalSection>

      <LegalSection title="8. 第三者提供">
        <p>
          運営は、次の場合を除き、個人情報を第三者に提供しません。法令に基づく場合、人の生命・身体・財産の保護に必要で本人の同意を得ることが困難な場合、業務委託先に必要最小限で預ける場合、公開設定により利用者が自ら公開した情報である場合。
        </p>
      </LegalSection>

      <LegalSection title="9. 開示・訂正・削除等の請求">
        <p>
          ご自身の登録情報および個体データは、ログイン後の各画面から確認・訂正・削除できる場合があります。対応できない場合やアカウント全体の削除を希望する場合は、下記の問い合わせ先へご連絡ください。本人確認のため、追加の情報をお願いすることがあります。
        </p>
      </LegalSection>

      <LegalSection title="10. Cookie等">
        <p>
          本サービスは、ログイン状態の維持などにCookieまたはこれに類する技術を使用します。ブラウザの設定でCookieを拒否した場合、ログインを要する機能が使えないことがあります。
        </p>
      </LegalSection>

      <LegalSection title="11. 問い合わせ先">
        <p>個人情報の取り扱いに関する問い合わせ先は、次のとおりです。</p>
        <p>{contact}</p>
        <p>
          氏名・住所・電話番号などの事業者情報は、特定商取引法に基づく表記をご確認ください。未設定の項目は、決まり次第同ページを更新します。
        </p>
      </LegalSection>

      <LegalSection title="12. ポリシーの変更">
        <p>
          本ポリシーは、法令の改正やサービス内容の変更に応じて改定することがあります。改定後は本ページに掲載した時点から適用します。
        </p>
      </LegalSection>
    </LegalArticle>
  );
}
