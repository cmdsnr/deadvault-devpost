import { NextRequest, NextResponse } from "next/server";
import { getAdminStorage } from "@/lib/firebase-admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const bucketName = process.env.GCP_BUCKET_NAME || undefined;
    const bucket = bucketName
      ? getAdminStorage().bucket(bucketName)
      : getAdminStorage().bucket();

    const extensions = ["jpg", "jpeg", "png", "gif", "webp"];
    for (const ext of extensions) {
      const file = bucket.file(`profilePhotos/${userId}.${ext}`);
      const [exists] = await file.exists();
      if (exists) {
        const [buffer] = await file.download();
        const [metadata] = await file.getMetadata();
        return new NextResponse(new Uint8Array(buffer), {
          headers: {
            "Content-Type": (metadata.contentType as string) || "image/jpeg",
            "Cache-Control": "public, max-age=300",
          },
        });
      }
    }

    const legacyFile = bucket.file(`profilePhotos/${userId}`);
    const [legacyExists] = await legacyFile.exists();
    if (legacyExists) {
      const [buffer] = await legacyFile.download();
      const [metadata] = await legacyFile.getMetadata();
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": (metadata.contentType as string) || "image/jpeg",
          "Cache-Control": "public, max-age=300",
        },
      });
    }

    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (err: any) {
    console.error("Avatar proxy error:", err);
    return NextResponse.json({ error: "Failed to load avatar" }, { status: 500 });
  }
}
