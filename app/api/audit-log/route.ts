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
      .collection("auditLogs")
      .where("ownerId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const entries = snapshot.docs.map((doc) => {
      const data = doc.data();
      const action = data.action ?? "";
      const metadata = data.metadata ?? {};

      let type = "upload";
      let message = metadata.message ?? action;

      if (action === "FILE_UPLOADED") type = "upload";
      else if (action === "USER_CHECKED_IN") type = "checkin";
      else if (action === "CLAIM_SUBMITTED") type = "claim_submitted";
      else if (action === "CLAIM_REJECTED" || action === "CLAIM_LICENSE_VERIFIED") type = "claim_override";
      else if (action === "FILE_RELEASED" || action === "RELEASE_APPROVED") type = "file_released";
      else if (action === "RECIPIENT_ADDED") type = "recipient_added";
      else if (action === "RECIPIENT_REVOKED") type = "recipient_added";
      else if (action === "FILE_DELETED") type = "upload";

      if (!metadata.message) {
        if (action === "FILE_UPLOADED") message = `Uploaded file "${metadata.fileName ?? "unknown"}"`;
        else if (action === "FILE_DELETED") message = `Deleted file "${metadata.fileName ?? "unknown"}"`;
        else if (action === "RECIPIENT_ADDED") message = `Added executer "${metadata.recipientName ?? ""}" (${metadata.recipientEmail ?? ""})`;
        else if (action === "RECIPIENT_REVOKED") message = `Removed executer "${metadata.recipientName ?? ""}"`;
        else if (action === "USER_CHECKED_IN") message = "Owner checked in";
        else if (action === "CLAIM_SUBMITTED") message = "A death claim was submitted";
        else if (action === "CLAIM_REJECTED") message = "A claim was overridden";
        else if (action === "FILE_RELEASED") message = "Vault files were released";
        else message = action.replace(/_/g, " ").toLowerCase();
      }

      const timestamp = data.createdAt?.toDate?.()
        ? data.createdAt.toDate().toISOString()
        : (typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString());

      return { id: doc.id, type, message, timestamp };
    });

    return NextResponse.json({ entries });
  } catch (err: any) {
    console.error("Audit log error:", err);
    return NextResponse.json({ entries: [] });
  }
}
