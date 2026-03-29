import { NextRequest, NextResponse } from "next/server";
import { getAdminStorage, getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;
    const recipientToken = (formData.get("recipientToken") as string) || null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: "No userId provided" }, { status: 400 });
    }

    const storagePath = `vaults/${userId}/${file.name}`;
    const now = new Date().toISOString();

    const buffer = Buffer.from(await file.arrayBuffer());

    const bucketName = process.env.GCP_BUCKET_NAME || undefined;
    const bucket = bucketName
      ? getAdminStorage().bucket(bucketName)
      : getAdminStorage().bucket();
    const storageFile = bucket.file(storagePath);
    await storageFile.save(buffer, {
      metadata: { contentType: file.type || "application/octet-stream" },
    });

    await storageFile.makePublic().catch(() => {});
    const downloadUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    const db = getAdminDb();
    const docRef = await db.collection("users").doc(userId).collection("vault").add({
      fileName: file.name,
      storagePath,
      wrappedDEK: "",
      recipientToken: recipientToken ?? null,
      uploadedAt: now,
      size: file.size,
      downloadUrl,
    });

    await db.collection("auditLogs").add({
      action: "FILE_UPLOADED",
      actorType: "owner",
      actorId: userId,
      targetType: "file",
      targetId: docRef.id,
      metadata: { fileName: file.name },
      createdAt: now,
      ownerId: userId,
    });

    return NextResponse.json({
      id: docRef.id,
      fileName: file.name,
      name: file.name,
      size: file.size,
      uploadedAt: now,
      downloadUrl,
      storagePath,
      recipientToken,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message ?? "Upload failed" }, { status: 500 });
  }
}
