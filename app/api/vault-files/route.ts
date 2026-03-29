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
      .collection("vault")
      .orderBy("uploadedAt", "desc")
      .get();

    const files = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.fileName ?? data.name,
        fileName: data.fileName ?? data.name,
        size: data.size ?? 0,
        uploadedAt: data.uploadedAt,
        downloadUrl: data.downloadUrl,
        storagePath: data.storagePath,
        recipientId: data.recipientId ?? null,
        recipientName: data.recipientName ?? null,
      };
    });
    return NextResponse.json({ files });
  } catch (err: any) {
    console.error("Vault files error:", err);
    return NextResponse.json({ files: [] });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId, fileId, recipientId, recipientName } = await req.json();
    if (!userId || !fileId) {
      return NextResponse.json({ error: "userId and fileId are required" }, { status: 400 });
    }

    const db = getAdminDb();
    const fileRef = db.collection("users").doc(userId).collection("vault").doc(fileId);
    const fileDoc = await fileRef.get();
    const fileName = fileDoc.exists ? (fileDoc.data()?.fileName ?? fileDoc.data()?.name ?? "Unknown file") : "Unknown file";

    await fileRef.update({
      recipientId: recipientId ?? null,
      recipientName: recipientName ?? null,
    });

    const action = recipientName
      ? `Assigned file "${fileName}" to ${recipientName}`
      : `Unassigned file "${fileName}"`;

    await db.collection("auditLogs").add({
      action: "FILE_ASSIGNED",
      actorType: "owner",
      actorId: userId,
      targetType: "file",
      targetId: fileId,
      metadata: { fileName, recipientName: recipientName ?? null, message: action },
      createdAt: new Date().toISOString(),
      ownerId: userId,
    });

    return NextResponse.json({ updated: true });
  } catch (err: any) {
    console.error("Assign file error:", err);
    return NextResponse.json({ error: err.message ?? "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId, fileId, storagePath } = await req.json();
    if (!userId || !fileId) {
      return NextResponse.json({ error: "userId and fileId are required" }, { status: 400 });
    }

    const db = getAdminDb();

    const fileDoc = await db.collection("users").doc(userId).collection("vault").doc(fileId).get();
    const fileName = fileDoc.exists ? (fileDoc.data()?.fileName ?? fileDoc.data()?.name ?? "Unknown file") : "Unknown file";

    await db.collection("users").doc(userId).collection("vault").doc(fileId).delete();

    await db.collection("auditLogs").add({
      action: "FILE_DELETED",
      actorType: "owner",
      actorId: userId,
      targetType: "file",
      targetId: fileId,
      metadata: { fileName },
      createdAt: new Date().toISOString(),
      ownerId: userId,
    });

    if (storagePath) {
      try {
        const { getAdminStorage } = await import("@/lib/firebase-admin");
        const bucketName = process.env.GCP_BUCKET_NAME || undefined;
        const bucket = bucketName
          ? getAdminStorage().bucket(bucketName)
          : getAdminStorage().bucket();
        await bucket.file(storagePath).delete();
      } catch {}
    }

    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    console.error("Delete file error:", err);
    return NextResponse.json({ error: err.message ?? "Delete failed" }, { status: 500 });
  }
}
