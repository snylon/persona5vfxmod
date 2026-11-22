'use client'

/**
 * Notification bridge between the React app and the Android shell.
 *
 * The Android WebView exposes window.ReleafBridge with:
 *   ReleafBridge.setRole(role: string)         — called once on app load
 *   ReleafBridge.showNotification(title, body) — show a local Android notification
 *
 * sendNotification(to, title, body, action?) posts to /api/notifications so the
 * other device's polling loop picks it up.
 */

declare global {
  interface Window {
    ReleafBridge?: {
      setRole: (role: string) => void
      showNotification: (title: string, body: string) => void
    }
  }
}

/** Call once when the user's role is known. */
export function registerRole(role: 'patient' | 'caretaker') {
  window.ReleafBridge?.setRole(role)
}

/** Send a notification to the other device via the server queue. */
export async function sendNotification(
  to: 'patient' | 'caretaker',
  title: string,
  body: string,
  action?: string,
) {
  try {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, title, body, action }),
    })
  } catch {
    // Network unavailable — silently ignore
  }
}
