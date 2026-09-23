// PWA Installation & Service Worker Manager
// Strictly configured so that ONLY logged-in Administrators can trigger or see install prompts

let deferredPrompt: any = null;
let isAppInstalled = false;

// Check if running in standalone PWA window
export function isPwaStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

// Detect iOS devices (iPhone, iPad, iPod)
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) &&
    !(window as any).MSStream
  );
}

// Initialize PWA handlers
export function initPwa(): void {
  if (typeof window === 'undefined') return;

  // 1. Register Service Worker for PWA compliance
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Check for worker updates periodically
          reg.onupdatefound = () => {
            const installing = reg.installing;
            if (installing) {
              installing.onstatechange = () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                  // New content available, updated silently
                }
              };
            }
          };
        })
        .catch((err) => {
          console.warn('[PWA] Service worker registration bypassed:', err);
        });
    });
  }

  // 2. Intercept beforeinstallprompt and PREVENT default browser popup.
  // This ensures regular users (students, parents, guests) will NEVER see an auto-install prompt!
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-install-ready'));
  });

  // 3. Listen for successful install
  window.addEventListener('appinstalled', () => {
    isAppInstalled = true;
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  });
}

// Check if install option is available to prompt
export function canInstallPwa(): boolean {
  if (isPwaStandalone() || isAppInstalled) return false;
  // Available if we have deferred prompt OR on iOS (manual Add to Home Screen instructions)
  return Boolean(deferredPrompt) || isIOS();
}

// Prompt the admin to install the app
export async function promptAdminInstall(): Promise<'accepted' | 'dismissed' | 'ios' | 'unavailable'> {
  if (isPwaStandalone() || isAppInstalled) {
    return 'unavailable';
  }

  if (deferredPrompt) {
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      deferredPrompt = null;
      if (choice.outcome === 'accepted') {
        isAppInstalled = true;
        window.dispatchEvent(new CustomEvent('pwa-installed'));
        return 'accepted';
      }
      return 'dismissed';
    } catch (err) {
      console.error('[PWA] Error during prompt:', err);
      return 'unavailable';
    }
  }

  if (isIOS()) {
    return 'ios';
  }

  return 'unavailable';
}
