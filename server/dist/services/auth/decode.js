"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyFirebaseIdToken = verifyFirebaseIdToken;
exports.updateFirebaseUser = updateFirebaseUser;
const firebase_1 = require("../../config/firebase");
async function verifyFirebaseIdToken(idToken) {
    const auth = (0, firebase_1.getAuth)();
    // This verifies the signature and expiry, and returns the decoded payload
    const decoded = await auth.verifyIdToken(idToken);
    // decoded.uid is the Firebase user ID, plus any custom claims
    return decoded;
}
async function updateFirebaseUser(uid, phoneNumber) {
    const auth = (0, firebase_1.getAuth)();
    const user = await auth.updateUser(uid, {
        phoneNumber
    });
}
//# sourceMappingURL=decode.js.map