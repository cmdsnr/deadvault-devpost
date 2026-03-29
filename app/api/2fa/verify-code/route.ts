import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { TOTP } from "otpauth";

export async function POST(req: NextRequest) {
  try {
    const { userId, code, method } = await req.json();
    if (!userId || !code) {
      return NextResponse.json({ error: "userId and code are required" }, { status: 400 });
    }

    const db = getAdminDb();

    if (method === "totp") {
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const secret = userDoc.data()?.totpSecret;
      if (!secret) {
        return NextResponse.json({ error: "TOTP not configured" }, { status: 400 });
      }
      const totp = new TOTP({ secret, digits: 6, period: 30 });
      const delta = totp.validate({ token: code, window: 1 });
      if (delta === null) {
        return NextResponse.json({ error: "Invalid code" }, { status: 401 });
      }
      return NextResponse.json({ verified: true });
    }

    const snapshot = await db
      .collection("2faCodes")
      .where("userId", "==", userId)
      .where("code", "==", code)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ error: "Invalid code" }, { status: 401 });
    }

    const docData = snapshot.docs[0].data();
    if (new Date(docData.expiresAt) < new Date()) {
      await snapshot.docs[0].ref.delete();
      return NextResponse.json({ error: "Code expired" }, { status: 401 });
    }

    await snapshot.docs[0].ref.delete();
    return NextResponse.json({ verified: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Verification failed" }, { status: 500 });
  }
}
