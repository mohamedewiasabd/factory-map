type OverlayEntry = {
  id: string;
  onClose: () => void;
};

let stack: OverlayEntry[] = [];
let registered = false;

function syncBodyLock() {
  document.body.classList.toggle('overlay-open', stack.length > 0);
}

function closeTop() {
  const entry = stack.pop();
  if (entry) entry.onClose();
  if (stack.length === 0) {
    try {
      window.history.back();
    } catch (e) {
      /* ignore */
    }
  }
  syncBodyLock();
}

async function ensureNativeBackListener() {
  if (registered) return;
  registered = true;
  try {
    const core = await import('@capacitor/core');
    if (!core.Capacitor.isNativePlatform()) return;
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', async () => {
      if (stack.length > 0) {
        closeTop();
        return;
      }
      try {
        const browserExit = window.onNativeBackExit;
        if (typeof browserExit === 'function') {
          await browserExit();
          return;
        }
      } catch (e) {
        /* fall through to default */
      }
      const { App: AppPlugin } = await import('@capacitor/app');
      AppPlugin.exitApp();
    });
  } catch (e) {
    // Capacitor not available — web-only popstate handling applies
  }
}

function handlePopstate() {
  const entry = stack.pop();
  if (entry) {
    entry.onClose();
    history.pushState({ overlay: entry.id }, '');
  }
  syncBodyLock();
}

export function overlayOpen(id: string, onClose: () => void) {
  stack.push({ id, onClose });
  history.pushState({ overlay: id }, '');
  syncBodyLock();
  ensureNativeBackListener();
}

export function overlayClose(id: string) {
  if (stack.length === 0) return;
  const top = stack[stack.length - 1];
  if (top.id !== id) return;
  closeTop();
}

export function overlayHasOpenOverlays(): boolean {
  return stack.length > 0;
}

export function closeAllOverlays() {
  while (stack.length > 0) {
    const entry = stack.pop();
    if (entry) entry.onClose();
  }
  syncBodyLock();
}

declare global {
  interface Window {
    onNativeBackExit?: () => Promise<void> | void;
    overlayHasOpenOverlays?: () => boolean;
  }
}

window.overlayHasOpenOverlays = overlayHasOpenOverlays;
window.addEventListener('popstate', handlePopstate);