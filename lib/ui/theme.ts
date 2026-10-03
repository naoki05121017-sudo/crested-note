export const THEME_COOKIE = "nc-theme";
export const THEME_STORAGE_KEY = "nc-theme";

export type AppTheme = "dark" | "light";
export const DEFAULT_APP_THEME: AppTheme = "light";

export function isAppTheme(value: string | null | undefined): value is AppTheme {
  return value === "dark" || value === "light";
}

export const THEME_BOOT_SCRIPT = `(function(){try{var c=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);var v=c?decodeURIComponent(c[1]):null;if(v!=="light"&&v!=="dark"){try{v=localStorage.getItem("${THEME_STORAGE_KEY}");}catch(e){v=null;}}if(v!=="light"&&v!=="dark")v="light";var r=document.documentElement;r.setAttribute("data-theme",v);r.classList.toggle("theme-light",v==="light");r.classList.toggle("theme-dark",v==="dark");}catch(e){document.documentElement.setAttribute("data-theme","light");document.documentElement.classList.add("theme-light");}})();`;

export function themeCookie(theme: AppTheme): string {
  return `${THEME_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export function applyAppTheme(theme: AppTheme): void {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("theme-light", theme === "light");
  root.classList.toggle("theme-dark", theme === "dark");
  document.cookie = themeCookie(theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* private mode */
  }
}

export function readDocumentTheme(): AppTheme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (isAppTheme(attr)) return attr;
  if (document.documentElement.classList.contains("theme-dark")) return "dark";
  return "light";
}
