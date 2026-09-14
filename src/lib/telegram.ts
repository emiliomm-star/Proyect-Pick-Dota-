// Thin, safe wrapper around the Telegram Mini App (Web App) SDK.
//
// Everything here no-ops when the app is NOT running inside Telegram (e.g. a
// plain browser or a native build), so the rest of the app never has to care.

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  colorScheme?: 'light' | 'dark';
  initDataUnsafe?: { user?: TelegramUser };
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
}

function getWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp ?? null;
}

/** True when running inside the Telegram Mini App container. */
export function isTelegram(): boolean {
  return getWebApp() != null;
}

/** Initialize the Mini App: tell Telegram we're ready and go full-height. */
export function initTelegram(bg = '#0f1419'): void {
  const tg = getWebApp();
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.(bg);
    tg.setBackgroundColor?.(bg);
  } catch {
    /* SDK differences across versions — safe to ignore. */
  }
}

/** The Telegram user, if available (no login needed inside Telegram). */
export function telegramUser(): TelegramUser | null {
  return getWebApp()?.initDataUnsafe?.user ?? null;
}
