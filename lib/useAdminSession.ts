"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "printwell.adminSession";
const CHANGE_EVENT = "printwell:admin-session";

/**
 * The admin session token, kept in localStorage and read through
 * useSyncExternalStore. The server snapshot is `undefined` ("not known yet")
 * rather than `null` ("signed out"), so the page can show a spinner during
 * hydration instead of flashing the sign-in screen at a signed-in admin.
 */
function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function readToken(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private-mode browsers can throw on storage access; treat as signed out.
    return null;
  }
}

export function useAdminSession() {
  const token = useSyncExternalStore<string | null | undefined>(
    subscribe,
    readToken,
    () => undefined,
  );

  const signIn = useCallback((value: string) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* fall through: the session just will not survive a reload */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const signOut = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing to clear */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { token, signIn, signOut };
}
