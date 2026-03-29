import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const db = getAdminDb();
    const snapshot = await db
      .collection("users")
      .doc(userId)
      .collection("recipients")
      .orderBy("createdAt", "desc")
      .get();

    const recipients = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        email: data.email,
        relationship: data.relationship ?? "",
        claimToken: data.token ?? data.claimToken,
        addedAt: data.createdAt ?? data.addedAt,
      };
    });
    return NextResponse.json({ recipients });
  } catch (err: any) {
    console.error("Recipients error:", err);
    return NextResponse.json({ recipients: [] });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId, recipientId } = await req.json();
    if (!userId || !recipientId) {
      return NextResponse.json({ error: "userId and recipientId are required" }, { status: 400 });
    }

    const db = getAdminDb();
    const recipientDoc = await db
      .collection("users")
      .doc(userId)
      .collection("recipients")
      .doc(recipientId)
      .get();

    const recipientName = recipientDoc.exists ? recipientDoc.data()?.name ?? "Unknown" : "Unknown";

    await db.collection("users").doc(userId).collection("recipients").doc(recipientId).delete();

    await db.collection("auditLogs").add({
      action: "RECIPIENT_REVOKED",
      actorType: "owner",
      actorId: userId,
      targetType: "recipient",
      targetId: recipientId,
      metadata: { recipientName },
      createdAt: new Date().toISOString(),
      ownerId: userId,
    });

    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    console.error("Delete recipient error:", err);
    return NextResponse.json({ error: err.message ?? "Delete failed" }, { status: 500 });
  }
}
