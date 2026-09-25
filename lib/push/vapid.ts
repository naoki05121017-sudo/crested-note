export function vapidPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
    || process.env.VAPID_PUBLIC_KEY?.trim()
    || "";
}

export function vapidPrivateKey(): string {
  return process.env.VAPID_PRIVATE_KEY?.trim() ?? "";
}

export function vapidSubject(): string {
  const mailto = process.env.VAPID_MAILTO?.trim();
  if (mailto) return mailto.startsWith("mailto:") ? mailto : `mailto:${mailto}`;
  return "mailto:crest-note@localhost";
}

export function vapidReady(): boolean {
  return Boolean(vapidPublicKey() && vapidPrivateKey());
}
