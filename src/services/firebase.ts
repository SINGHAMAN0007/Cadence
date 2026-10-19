import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  signOut,
  onAuthStateChanged,
  type User
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  onSnapshot, 
  getDocFromServer,
  type Unsubscribe
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { app, auth } from '../firebase';

export const firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export { auth };

// Enable persistent session storage across offline/airplane mode
try {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Firebase persistence warning:', err);
  });
} catch (e) {
  console.warn('Set persistence error:', e);
}

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

// Test connection on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase client is currently offline.");
    }
  }
}

// Random Device ID to prevent feedback loops in real-time sync
export const DEVICE_ID = 'dev_' + Math.random().toString(36).substring(2, 9);

export interface UserCloudProfile {
  userId: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  favoriteTrackKeys?: string[]; // "title:::artist"
  playlistMetadata?: {
    id: number;
    name: string;
    description?: string;
    createdAt: number;
    trackTitles?: string[];
    coverColor?: string;
  }[];
  updatedAt?: string;
}

export interface PlaybackSessionData {
  id: string;
  roomCode: string;
  hostUserId: string;
  hostDisplayName: string;
  trackTitle?: string;
  trackArtist?: string;
  trackAlbum?: string;
  trackDuration?: number;
  isPlaying: boolean;
  timestamp: number;
  lastUpdated: number;
  updatedByDeviceId: string;
  status: 'active' | 'ended';
}

/**
 * Recursively strips undefined fields from an object or array to ensure compatibility with Firestore.
 * Firestore throws an error if any field in a document is undefined.
 */
export function removeUndefinedFields<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedFields(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        cleaned[key] = removeUndefinedFields(val);
      }
    }
    return cleaned as T;
  }
  return obj;
}

// Save or sync user cloud profile
export async function syncUserMetadataToCloud(profile: Partial<UserCloudProfile>): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const path = `users/${user.uid}`;
  try {
    const userDocRef = doc(firestoreDb, 'users', user.uid);
    const rawData = {
      userId: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Music Lover',
      photoURL: user.photoURL || '',
      ...profile,
      updatedAt: new Date().toISOString()
    };
    const cleanData = removeUndefinedFields(rawData);
    await setDoc(userDocRef, cleanData, { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fetchUserCloudMetadata(): Promise<UserCloudProfile | null> {
  const user = auth.currentUser;
  if (!user) return null;
  const path = `users/${user.uid}`;
  try {
    const userDocRef = doc(firestoreDb, 'users', user.uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as UserCloudProfile;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
    return null;
  }
}

// Create a Listen Together session
export async function createPlaybackSession(
  initialTrack?: { title: string; artist: string; album: string; duration: number },
  isPlaying = false,
  timestamp = 0
): Promise<PlaybackSessionData | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const sessionId = 'ses_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  // 6 character uppercase code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let roomCode = '';
  for (let i = 0; i < 6; i++) {
    roomCode += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const sessionData: PlaybackSessionData = {
    id: sessionId,
    roomCode,
    hostUserId: user.uid,
    hostDisplayName: user.displayName || user.email?.split('@')[0] || 'Host',
    trackTitle: initialTrack?.title || '',
    trackArtist: initialTrack?.artist || '',
    trackAlbum: initialTrack?.album || '',
    trackDuration: initialTrack?.duration || 0,
    isPlaying,
    timestamp,
    lastUpdated: Date.now(),
    updatedByDeviceId: DEVICE_ID,
    status: 'active'
  };

  const path = `sessions/${sessionId}`;
  try {
    await setDoc(doc(firestoreDb, 'sessions', sessionId), removeUndefinedFields(sessionData));
    return sessionData;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
    return null;
  }
}

// Broadcast playback update from host
export async function updateSessionPlayback(
  sessionId: string,
  updates: Partial<PlaybackSessionData>
): Promise<void> {
  const path = `sessions/${sessionId}`;
  try {
    const sessionRef = doc(firestoreDb, 'sessions', sessionId);
    const cleanUpdates = removeUndefinedFields({
      ...updates,
      lastUpdated: Date.now(),
      updatedByDeviceId: DEVICE_ID,
    });
    await updateDoc(sessionRef, cleanUpdates);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// Find session by room code
export async function findSessionByRoomCode(code: string): Promise<PlaybackSessionData | null> {
  const cleanCode = code.trim().toUpperCase();
  const path = 'sessions';
  try {
    const q = query(
      collection(firestoreDb, 'sessions'),
      where('roomCode', '==', cleanCode),
      where('status', '==', 'active')
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as PlaybackSessionData;
    }
    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
    return null;
  }
}

// Subscribe to session changes
export function subscribeToSession(
  sessionId: string,
  onUpdate: (session: PlaybackSessionData | null) => void
): Unsubscribe {
  const path = `sessions/${sessionId}`;
  return onSnapshot(
    doc(firestoreDb, 'sessions', sessionId),
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as PlaybackSessionData);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

// End a session
export async function endPlaybackSession(sessionId: string): Promise<void> {
  const path = `sessions/${sessionId}`;
  try {
    await updateDoc(doc(firestoreDb, 'sessions', sessionId), {
      status: 'ended',
      isPlaying: false,
      lastUpdated: Date.now(),
      updatedByDeviceId: DEVICE_ID
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}
