/// <reference types="@types/google.maps" />
import { Loader } from '@googlemaps/js-api-loader';

export const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyD2-uNpKQO2nTVCK92mhRnevTdDtB-aD60';

let loaderInstance: Loader | null = null;
let googleMapsPromise: Promise<typeof google> | null = null;
let hasAuthFailure = false;
const authErrorListeners: Array<(errorMsg: string) => void> = [];

if (typeof window !== 'undefined') {
  // Catch Google Maps auth failure hook
  (window as any).gm_authFailure = () => {
    console.warn('Google Maps auth failure (ApiTargetBlockedMapError or invalid key/restrictions).');
    hasAuthFailure = true;
    authErrorListeners.forEach((listener) =>
      listener(
        'خطأ ApiTargetBlockedMapError: خدمة Maps JavaScript API غير مفعلة داخل Google Cloud Console لهذا المفتاح، أو توجد قيود API Restrictions تمنع تشغيل الخرائط.'
      )
    );
  };
}

export function onGoogleMapsAuthError(callback: (errorMsg: string) => void) {
  authErrorListeners.push(callback);
  if (hasAuthFailure) {
    callback(
      'خطأ ApiTargetBlockedMapError: خدمة Maps JavaScript API غير مفعلة داخل Google Cloud Console لهذا المفتاح.'
    );
  }
}

export function resetGoogleMapsLoader() {
  loaderInstance = null;
  googleMapsPromise = null;
  hasAuthFailure = false;
}

export function getGoogleMapsLoader(): Loader {
  if (!loaderInstance) {
    loaderInstance = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: 'weekly',
      libraries: ['places', 'geometry'],
      language: 'ar',
      region: 'EG',
    });
  }
  return loaderInstance;
}

export async function loadGoogleMaps(): Promise<typeof google> {
  if (hasAuthFailure) {
    throw new Error('Google Maps API authentication failed.');
  }

  if (typeof window !== 'undefined' && window.google?.maps) {
    return window.google;
  }

  if (!googleMapsPromise) {
    const loader = getGoogleMapsLoader();
    googleMapsPromise = loader.load().catch((err) => {
      hasAuthFailure = true;
      throw err;
    });
  }

  return googleMapsPromise;
}
