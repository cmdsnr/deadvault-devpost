import { NextRequest, NextResponse } from "next/server";
import { getAdminStorage } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;

    if (!file || !userId) {
      return NextResponse.json({ error: "file and userId are required" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image files allowed" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "jpg";
    const storagePath = `profilePhotos/${userId}.${ext}`;

    const bucketName = process.env.GCP_BUCKET_NAME || undefined;
    const bucket = bucketName
      ? getAdminStorage().bucket(bucketName)
      : getAdminStorage().bucket();
    const storageFile = bucket.file(storagePath);
    await storageFile.save(buffer, {
      metadata: { contentType: file.type, cacheControl: "public, max-age=300" },
    });

    const downloadUrl = `/api/avatar/${userId}?t=${Date.now()}`;

    return NextResponse.json({ downloadUrl });
  } catch (err: any) {
    console.error("Avatar upload error:", err);
    return NextResponse.json({ error: err.message ?? "Upload failed" }, { status: 500 });
  }
}
