import {createRoot} from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import App from './App.tsx';
import './index.css';

import { Capacitor } from '@capacitor/core';

if (Capacitor.isNativePlatform()) {
  (async () => {
    const { Dialog } = await import('@capacitor/dialog');
    const { StatusBar } = await import('@capacitor/status-bar');
    window.onNativeBackExit = async () => {
      const { value } = await Dialog.confirm({
        title: 'Factory Map',
        message: 'هل تريد الخروج من التطبيق؟',
        okButtonTitle: 'خروج',
        cancelButtonTitle: 'إلغاء',
      });
      if (value) {
        const { App } = await import('@capacitor/app');
        App.exitApp();
      }
    };
    try {
      await StatusBar.setOverlaysWebView({ overlay: false });
      await StatusBar.setBackgroundColor({ color: '#0f172a' });
    } catch (e) {
      /* ignore */
    }
  })();
}

createRoot(document.getElementById('root')!).render(<App />);