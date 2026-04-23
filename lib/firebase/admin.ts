import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';

let adminApp: App | null = null;

function parseServiceAccount(): Record<string, string> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch (err) {
    console.error('[firebase/admin] FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON:', err);
    return null;
  }
}

export function getAdminApp(): App | null {
  if (adminApp) return adminApp;
  const existing = getApps()[0];
  if (existing) {
    adminApp = existing;
    return existing;
  }
  const creds = parseServiceAccount();
  if (!creds) return null;
  try {
    adminApp = initializeApp({
      credential: cert({
        projectId: creds.project_id,
        clientEmail: creds.client_email,
        privateKey: creds.private_key,
      }),
    });
    return adminApp;
  } catch (err) {
    console.error('[firebase/admin] initialization failed:', err);
    return null;
  }
}

/**
 * Verify a Firebase ID token and return its decoded payload if valid.
 * Returns null if the token is missing, malformed, expired, or revoked.
 */
export async function verifyFirebaseIdToken(idToken: string | null | undefined): Promise<DecodedIdToken | null> {
  if (!idToken) return null;
  const app = getAdminApp();
  if (!app) return null;
  try {
    return await getAuth(app).verifyIdToken(idToken, true);
  } catch (err) {
    console.warn('[firebase/admin] verifyIdToken failed:', (err as Error).message);
    return null;
  }
}
