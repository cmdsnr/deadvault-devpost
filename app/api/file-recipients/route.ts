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
      .collection("fileRecipients")
      .orderBy("createdAt", "desc")
      .get();

    const recipients = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        email: data.email,
        addedAt: data.createdAt ?? data.addedAt,
      };
    });
    return NextResponse.json({ recipients });
  } catch (err: any) {
    console.error("File recipients error:", err);
    return NextResponse.json({ recipients: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, userId } = await req.json();
    if (!name || !email || !userId) {
      return NextResponse.json({ error: "name, email, and userId are required" }, { status: 400 });
    }

    const db = getAdminDb();
    const now = new Date().toISOString();

    const ref = await db
      .collection("users")
      .doc(userId)
      .collection("fileRecipients")
      .add({ name, email, createdAt: now });

    await db.collection("auditLogs").add({
      action: "FILE_RECIPIENT_ADDED",
      actorType: "owner",
      actorId: userId,
      targetType: "fileRecipient",
      targetId: ref.id,
      metadata: { recipientName: name, recipientEmail: email },
      createdAt: now,
      ownerId: userId,
    });

    return NextResponse.json({ id: ref.id, name, email, addedAt: now });
  } catch (err: any) {
    console.error("Add file recipient error:", err);
    return NextResponse.json({ error: err.message ?? "Failed to add recipient" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId, recipientId } = await req.json();
    if (!userId || !recipientId) {
      return NextResponse.json({ error: "userId and recipientId are required" }, { status: 400 });
    }

    const db = getAdminDb();
    const doc = await db.collection("users").doc(userId).collection("fileRecipients").doc(recipientId).get();
    const recipientName = doc.exists ? doc.data()?.name ?? "Unknown" : "Unknown";

    await db.collection("users").doc(userId).collection("fileRecipients").doc(recipientId).delete();

    await db.collection("auditLogs").add({
      action: "FILE_RECIPIENT_REMOVED",
      actorType: "owner",
      actorId: userId,
      targetType: "fileRecipient",
      targetId: recipientId,
      metadata: { recipientName },
      createdAt: new Date().toISOString(),
      ownerId: userId,
    });

    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    console.error("Delete file recipient error:", err);
    return NextResponse.json({ error: err.message ?? "Delete failed" }, { status: 500 });
  }
}
