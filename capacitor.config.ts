import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.factorymap.app',
  appName: 'Factory Map',
  webDir: 'dist',
  backgroundColor: '#0f172a',
  android: {
    allowMixedContent: false,
    backgroundColor: '#0f172a',
  },
  ios: {
    scheme: 'capacitor',
    backgroundColor: '#0f172a',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;