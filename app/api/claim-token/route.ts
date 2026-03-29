import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }

    const db = getAdminDb();
    const snapshot = await db
      .collection("claims")
      .where("token", "==", token)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ found: false });
    }

    const data = snapshot.docs[0].data();
    const userId = data.userId;

    let ownerName = "Unknown";
    try {
      const userRecord = await getAuth().getUser(userId);
      ownerName = userRecord.displayName ?? userRecord.email ?? "Unknown";
    } catch {}

    return NextResponse.json({
      found: true,
      vaultOwnerId: userId,
      ownerName,
      recipientName: data.recipientName,
    });
  } catch (err: any) {
    console.error("Claim token lookup error:", err);
    return NextResponse.json({ error: err.message ?? "Lookup failed" }, { status: 500 });
  }
}
