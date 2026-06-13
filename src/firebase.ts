import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Services
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL */
export const auth = getAuth();

// Pre-test firestore connectivity on initial boot as mandated by security and integration skill rules
import { doc, getDocFromServer } from 'firebase/firestore';
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'system_configs', 'connection_test'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("[Firebase-Sync] Server is loaded but the client reports offline:", error);
    }
  }
}
testConnection();

// Operation Type Enum for Secure Diagnostic Tracebacks
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
  }
}

/**
 * MANDATED FIRESTORE ERROR HANDLER
 */
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
  console.error('[Firestore Error Details]: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
