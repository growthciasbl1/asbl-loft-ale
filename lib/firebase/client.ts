'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type Auth,
  type ConfirmationResult,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let appCache: FirebaseApp | null = null;
let authCache: Auth | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === 'undefined') return null; // SSR-safe
  if (!firebaseConfig.apiKey) return null; // not configured
  if (appCache) return appCache;
  appCache = getApps()[0] ?? initializeApp(firebaseConfig);
  return appCache;
}

export function getFirebaseAuth(): Auth | null {
  if (authCache) return authCache;
  const app = getFirebaseApp();
  if (!app) return null;
  authCache = getAuth(app);
  return authCache;
}

/**
 * Set up the invisible reCAPTCHA verifier on a given container id.
 * Firebase Phone Auth requires reCAPTCHA for bot protection.
 */
export function getRecaptchaVerifier(containerId: string): RecaptchaVerifier | null {
  const auth = getFirebaseAuth();
  if (!auth || typeof window === 'undefined') return null;
  const w = window as unknown as { __asblRecaptcha?: RecaptchaVerifier };
  if (w.__asblRecaptcha) return w.__asblRecaptcha;
  try {
    const verifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        // reCAPTCHA solved — SDK auto-submits.
      },
    });
    w.__asblRecaptcha = verifier;
    return verifier;
  } catch (err) {
    console.error('[firebase/client] reCAPTCHA init failed:', err);
    return null;
  }
}

export async function sendFirebaseSmsOtp(
  phoneE164: string,
  verifier: RecaptchaVerifier,
): Promise<{ ok: true; confirmation: ConfirmationResult } | { ok: false; error: string }> {
  try {
    const auth = getFirebaseAuth();
    if (!auth) return { ok: false, error: 'firebase auth not initialised' };
    const confirmation = await signInWithPhoneNumber(auth, `+${phoneE164}`, verifier);
    return { ok: true, confirmation };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
