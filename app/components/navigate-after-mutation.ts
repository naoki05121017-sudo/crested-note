export function currentAppPath() {
  return `${window.location.pathname}${window.location.search}`;
}

export function navigateAfterMutation(
  router: { replace: (href: string) => void; refresh: () => void },
  href: string,
) {
  router.replace(href);
  router.refresh();
  return window.setTimeout(() => {
    if (currentAppPath() === href) return;
    window.location.assign(href);
  }, 800);
}
