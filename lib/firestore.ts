import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { getClientAuth, getClientDb } from "./firebase";

export interface VaultFile {
  id: string;
  name: string;
  fileName?: string;
  size: number;
  uploadedAt: string;
  downloadUrl?: string;
  storagePath?: string;
  recipientToken?: string | null;
  recipientId?: string;
  recipientName?: string;
}

export interface FileRecipient {
  id: string;
  name: string;
  email: string;
  addedAt: string;
}

export interface Executer {
  id: string;
  name: string;
  email: string;
  relationship: string;
  claimToken: string;
  addedAt: string;
}

/** @deprecated Use FileRecipient or Executer */
export type Recipient = Executer;

export interface AuditEntry {
  id: string;
  type: string;
  message: string;
  timestamp: string;
}

export interface Claim {
  id: string;
  vaultOwnerId: string;
  recipientEmail: string;
  recipientName?: string;
  physicianName: string;
  licenseNumber: string;
  status: string;
  submittedAt: string;
  holdExpiresAt?: string;
}

export async function getVaultFiles(userId: string): Promise<VaultFile[]> {
  try {
    const db = getClientDb();
    const q = query(collection(db, "vaults", userId, "files"), orderBy("uploadedAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as VaultFile));
  } catch {
    return [];
  }
}

export async function getRecipients(userId: string): Promise<Recipient[]> {
  try {
    const db = getClientDb();
    const q = query(collection(db, "vaults", userId, "recipients"), orderBy("addedAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Recipient));
  } catch {
    return [];
  }
}

export async function getAuditLog(userId: string): Promise<AuditEntry[]> {
  try {
    const db = getClientDb();
    const q = query(collection(db, "vaults", userId, "auditLog"), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as AuditEntry));
  } catch {
    return [];
  }
}

export async function getVaultOwnerByClaimToken(token: string) {
  try {
    const db = getClientDb();
    const q = query(collection(db, "claimTokens"), where("token", "==", token));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    const data = snapshot.docs[0].data();
    return { vaultOwnerId: data.vaultOwnerId, ownerName: data.ownerName, recipientName: data.recipientName };
  } catch {
    return null;
  }
}

export async function getPendingClaim(userId: string): Promise<Claim | null> {
  try {
    const db = getClientDb();
    const q = query(
      collection(db, "claims"),
      where("vaultOwnerId", "==", userId),
      where("status", "==", "pending")
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Claim;
  } catch {
    return null;
  }
}

export function subscribeToPendingClaims(userId: string, callback: (claim: Claim | null) => void): Unsubscribe {
  try {
    const db = getClientDb();
    const q = query(
      collection(db, "claims"),
      where("vaultOwnerId", "==", userId),
      where("status", "==", "pending")
    );
    return onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          callback(null);
        } else {
          callback({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Claim);
        }
      },
      () => {
        callback(null);
      }
    );
  } catch {
    return () => {};
  }
}

export async function getLastCheckIn(userId: string): Promise<string | null> {
  try {
    const db = getClientDb();
    const docRef = doc(db, "vaults", userId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return docSnap.data().lastCheckIn ?? null;
  } catch {
    return null;
  }
}

export async function performCheckIn(userId: string): Promise<void> {
  const db = getClientDb();
  const docRef = doc(db, "vaults", userId);
  await updateDoc(docRef, { lastCheckIn: new Date().toISOString() });
  await addDoc(collection(db, "vaults", userId, "auditLog"), {
    type: "checkin",
    message: "Owner checked in",
    timestamp: new Date().toISOString(),
  });
}

// ---- 2FA ----

export interface TwoFactorInfo {
  twoFactorMethod: "email" | "sms" | "totp" | null;
  twoFactorEnabled: boolean;
  phoneNumber?: string | null;
}

async function ensureUserProfileDocument(userId: string): Promise<void> {
  const db = getClientDb();
  const auth = getClientAuth();
  const currentUser = auth.currentUser;

  if (!currentUser || currentUser.uid !== userId) {
    return;
  }

  const docRef = doc(db, "users", userId);
  const docSnap = await getDoc(docRef);
  const existingData = docSnap.exists() ? docSnap.data() : null;
  const authProvider =
    currentUser.providerData[0]?.providerId === "google.com"
      ? "google"
      : currentUser.providerData[0]?.providerId === "password"
        ? "email"
        : "unknown";

  if (!docSnap.exists()) {
    await setDoc(docRef, {
      email: currentUser.email ?? "",
      username: currentUser.displayName ?? null,
      displayName: currentUser.displayName ?? null,
      authProvider,
      status: "active",
      emailVerified: currentUser.emailVerified,
      mfaMethod: "none",
      mfaEnrollmentStatus: "not_configured",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastCheckInAt: new Date().toISOString(),
      checkInIntervalDays: 30,
      gracePeriodHours: 72,
      dateOfBirth: null,
      inactivityDeleteAt: null,
      primaryRecipientId: null,
      notes: null,
      twoFactorMethod: null,
      twoFactorEnabled: false,
      phoneNumber: null,
    });
    return;
  }

  await setDoc(
    docRef,
    {
      email: currentUser.email ?? existingData?.email ?? "",
      username: existingData?.username ?? currentUser.displayName ?? null,
      displayName: currentUser.displayName ?? existingData?.displayName ?? null,
      authProvider: existingData?.authProvider ?? authProvider,
      status: existingData?.status ?? "active",
      emailVerified: currentUser.emailVerified,
      mfaMethod: existingData?.mfaMethod ?? "none",
      mfaEnrollmentStatus: existingData?.mfaEnrollmentStatus ?? "not_configured",
      checkInIntervalDays: existingData?.checkInIntervalDays ?? 30,
      gracePeriodHours: existingData?.gracePeriodHours ?? 72,
      primaryRecipientId: existingData?.primaryRecipientId ?? null,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function getUserTwoFactorInfo(userId: string): Promise<TwoFactorInfo> {
  try {
    await ensureUserProfileDocument(userId);
    const db = getClientDb();
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return { twoFactorMethod: null, twoFactorEnabled: false };
    const data = docSnap.data();
    return {
      twoFactorMethod: data.twoFactorMethod ?? null,
      twoFactorEnabled: data.twoFactorEnabled ?? false,
      phoneNumber: data.phoneNumber ?? null,
    };
  } catch {
    return { twoFactorMethod: null, twoFactorEnabled: false };
  }
}

export async function setUserTwoFactor(
  userId: string,
  method: "email" | "sms" | "totp",
  extra?: { totpSecret?: string; phoneNumber?: string }
): Promise<void> {
  await ensureUserProfileDocument(userId);
  const db = getClientDb();
  const docRef = doc(db, "users", userId);
  const docSnap = await getDoc(docRef);
  const payload: Record<string, unknown> = {
    twoFactorMethod: method,
    twoFactorEnabled: true,
    mfaMethod: method === "sms" ? "sms" : method === "totp" ? "totp" : "none",
    mfaEnrollmentStatus: "enabled",
    updatedAt: new Date().toISOString(),
    ...(extra ?? {}),
  };
  if (docSnap.exists()) {
    await updateDoc(docRef, payload);
  } else {
    await setDoc(docRef, payload);
  }
}

export async function store2faCode(userId: string, code: string, type: "email" | "sms"): Promise<void> {
  const db = getClientDb();
  await addDoc(collection(db, "2faCodes"), {
    userId,
    code,
    type,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  });
}

export async function verify2faCode(userId: string, code: string): Promise<boolean> {
  try {
    const db = getClientDb();
    const q = query(
      collection(db, "2faCodes"),
      where("userId", "==", userId),
      where("code", "==", code)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return false;

    const docData = snapshot.docs[0].data();
    const { deleteDoc } = await import("firebase/firestore");
    await deleteDoc(snapshot.docs[0].ref);

    if (new Date(docData.expiresAt) < new Date()) return false;
    return true;
  } catch {
    return false;
  }
}