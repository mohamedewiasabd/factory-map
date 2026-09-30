import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const SUPER_ADMIN_EMAIL = 'mnymjdy897@gmail.com';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot as mandated by the Firebase skill
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration or network status.');
    }
  }
}

// Immediately verify connection
testConnection().catch(() => {});

function detectNative(): boolean {
  try {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    return /capacitor|android|iphone|ipad|ipod/i.test(ua);
  } catch (e) {
    return false;
  }
}

export async function loginWithGoogle() {
  const native = detectNative();
  if (native) {
    // WebView: popups are blocked, so a full-window redirect to Google is
    // required. The app boots again after return and onAuthStateChanged/
    // getRedirectResult resolves the signed-in user.
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      console.error('Google Sign-In redirect error:', error);
      throw error;
    }
  } else {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
        // Popup blocked in embedded browsers — use the redirect flow.
        await signInWithRedirect(auth, googleProvider);
      } else {
        console.error('Google Sign In error:', error);
        throw error;
      }
    }
  }
}

export async function resumeNativeAuth() {
  // Called on every app boot to finalize a native redirect sign-in.
  try {
    const result = await getRedirectResult(auth);
    return result?.user || auth.currentUser || null;
  } catch (error) {
    console.error('Redirect sign-in result error:', error);
    return auth.currentUser || null;
  }
}

export async function logoutUser() {
  await fbSignOut(auth);
}
