"use client";

import { useEffect, useState } from "react";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function PushSettingsCard() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unknown">(
    "unknown",
  );
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const ok =
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(ok);
    if (ok) setPermission(Notification.permission);
    setIosHint(isIos() && !isStandalone());
    if (window.location.hash === "#crest-push") {
      document.getElementById("crest-push")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, []);

  async function enable() {
    setBusy(true);
    setMessage("");
    try {
      if (isIos() && !isStandalone()) {
        setMessage("iPhoneでは、先にホーム画面に追加してから、そのアイコンで開いてください。");
        return;
      }
      const vapid = await fetch("/api/push/vapid");
      if (!vapid.ok) {
        setMessage("通知の準備がまだ完了していません。運営が鍵を設定すると使えます。");
        return;
      }
      const { publicKey } = (await vapid.json()) as { publicKey: string };
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      if (permissionResult !== "granted") {
        setMessage("通知が許可されませんでした。");
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const saved = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      if (!saved.ok) {
        setMessage("通知の登録を保存できませんでした。");
        return;
      }
      setMessage("通知をオンにしました。期限が来た個体だけ、1日1回お知らせします。");
    } catch {
      setMessage("このブラウザでは通知を開始できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMessage("");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setMessage("通知をオフにしました。");
      setPermission(Notification.permission);
    } catch {
      setMessage("オフにできませんでした。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div id="crest-push" className="scroll-mt-24">
      <h2 className="mb-2 text-lg font-semibold">クレスチェックの通知</h2>
      <p className="text-sm leading-6 text-muted">
        個体ごとに設定した間隔が来たら、「○のクレスチェックの時間です🦎」をスマホに送ります。
        アプリを開いていなくても届きます。
      </p>
      {iosHint ? (
        <p className="mt-3 text-sm leading-6 text-ink/80">
          iPhoneのSafariのタブでは通知できません。共有ボタン →「ホーム画面に追加」→
          ホームのクレスノートアイコンから開き直して、「通知をオンにする」を押してください。
        </p>
      ) : null}
      {!supported && !iosHint ? (
        <p className="mt-3 text-sm text-muted">このブラウザはプッシュ通知に対応していません。</p>
      ) : null}
      {supported ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" className="nc-btn w-full sm:w-auto" disabled={busy} onClick={enable}>
            通知をオンにする
          </button>
          <button
            type="button"
            className="nc-btn-ghost w-full sm:w-auto"
            disabled={busy}
            onClick={disable}
          >
            通知をオフにする
          </button>
        </div>
      ) : null}
      {permission === "denied" ? (
        <p className="mt-3 text-sm text-muted">
          端末の設定で、このサイトの通知がオフになっています。
        </p>
      ) : null}
      {message ? <p className="mt-3 text-sm leading-6">{message}</p> : null}
    </div>
  );
}
