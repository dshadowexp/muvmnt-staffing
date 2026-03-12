import { getAuth } from "../../config/firebase";

export async function verifyFirebaseIdToken(idToken: string) {
  const auth = getAuth();
  // This verifies the signature and expiry, and returns the decoded payload
  const decoded = await auth.verifyIdToken(idToken);
  // decoded.uid is the Firebase user ID, plus any custom claims
  return decoded;
}

export async function updateFirebaseUser(uid: string, phoneNumber: string) {
  const auth = getAuth();
  const user = await auth.updateUser(uid, {
    phoneNumber
  });
}

