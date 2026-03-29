import { NextRequest, NextResponse } from "next/server";
import { TOTP, Secret } from "otpauth";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const secret = new Secret();
    const totp = new TOTP({
      issuer: "DeadVault",
      label: email ?? "user",
      secret,
      digits: 6,
      period: 30,
    });

    const uri = totp.toString();
    const db = getAdminDb();
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      await userRef.update({ totpSecret: secret.base32 });
    } else {
      await userRef.set({ totpSecret: secret.base32, twoFactorEnabled: false, twoFactorMethod: null });
    }

    return NextResponse.json({ uri, secret: secret.base32 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "TOTP setup failed" }, { status: 500 });
  }
}
