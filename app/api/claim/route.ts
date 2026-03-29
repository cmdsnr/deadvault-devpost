import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminStorage } from "@/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";
import { verifyLicense } from "@/lib/verify-license";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const token = formData.get("token") as string | null;
    const physicianName = formData.get("physicianName") as string | null;
    const licenseNumber = formData.get("licenseNumber") as string | null;
    const relationship = formData.get("relationship") as string | null;
    const physicianNote = formData.get("physicianNote") as File | null;

    if (!token || !physicianName || !licenseNumber || !relationship) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const verifyData = await verifyLicense(licenseNumber);

    if (!verifyData.valid) {
      return NextResponse.json({
        error: `License #${licenseNumber} could not be verified. Please provide a valid physician license number.`,
      }, { status: 400 });
    }

    const db = getAdminDb();

    const tokenSnap = await db
      .collection("claims")
      .where("token", "==", token)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (tokenSnap.empty) {
      return NextResponse.json({ error: "Invalid claim token" }, { status: 404 });
    }

    const tokenData = tokenSnap.docs[0].data();
    const userId = tokenData.userId;
    const recipientName = tokenData.recipientName;
    const recipientEmail = tokenData.recipientEmail;

    let ownerName = "Unknown";
    try {
      const userRecord = await getAuth().getUser(userId);
      ownerName = userRecord.displayName ?? userRecord.email ?? "Unknown";
    } catch {}

    let noteStoragePath: string | null = null;
    if (physicianNote) {
      const buffer = Buffer.from(await physicianNote.arrayBuffer());
      const bucketName = process.env.GCP_BUCKET_NAME || undefined;
      const bucket = bucketName
        ? getAdminStorage().bucket(bucketName)
        : getAdminStorage().bucket();
      const storagePath = `claims/${userId}/${Date.now()}_${physicianNote.name}`;
      const file = bucket.file(storagePath);
      await file.save(buffer, {
        metadata: { contentType: physicianNote.type || "application/pdf" },
      });
      noteStoragePath = storagePath;
    }

    const now = new Date().toISOString();

    const claimRef = await db.collection("claims").add({
      userId,
      token,
      recipientName,
      recipientEmail,
      physicianName,
      physicianLicenseNumber: licenseNumber,
      verifiedPhysicianName: verifyData.physicianName,
      verifiedProvince: verifyData.registeredProvince,
      relationship,
      physicianNotePath: noteStoragePath,
      status: "released",
      submittedAt: now,
      releasedAt: now,
    });

    await db.collection("auditLogs").add({
      action: "CLAIM_SUBMITTED",
      actorType: "recipient",
      actorId: null,
      targetType: "claim",
      targetId: claimRef.id,
      metadata: { recipientName, recipientEmail, physicianName, licenseNumber },
      createdAt: now,
      ownerId: userId,
    });

    await db.collection("auditLogs").add({
      action: "VAULT_RELEASED",
      actorType: "system",
      actorId: null,
      targetType: "claim",
      targetId: claimRef.id,
      metadata: { recipientName, recipientEmail, reason: "Physician license verified" },
      createdAt: now,
      ownerId: userId,
    });

    const filesSnap = await db
      .collection("users")
      .doc(userId)
      .collection("vault")
      .get();

    const bucketName = process.env.GCP_BUCKET_NAME || undefined;
    const bucket = bucketName
      ? getAdminStorage().bucket(bucketName)
      : getAdminStorage().bucket();

    const filesByRecipient: Record<string, { name: string; email: string; files: { fileName: string; url: string }[] }> = {};

    const recipientsSnap = await db
      .collection("users")
      .doc(userId)
      .collection("fileRecipients")
      .get();

    const recipientMap: Record<string, { name: string; email: string }> = {};
    recipientsSnap.docs.forEach((doc) => {
      const data = doc.data();
      recipientMap[doc.id] = { name: data.name, email: data.email };
    });

    for (const fileDoc of filesSnap.docs) {
      const fileData = fileDoc.data();
      const recipientId = fileData.recipientId;
      if (!recipientId || !recipientMap[recipientId]) continue;

      const storagePath = fileData.storagePath;
      if (!storagePath) continue;

      try {
        const [url] = await bucket.file(storagePath).getSignedUrl({
          action: "read",
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });

        if (!filesByRecipient[recipientId]) {
          filesByRecipient[recipientId] = {
            name: recipientMap[recipientId].name,
            email: recipientMap[recipientId].email,
            files: [],
          };
        }
        filesByRecipient[recipientId].files.push({
          fileName: fileData.fileName ?? fileData.name ?? "file",
          url,
        });
      } catch (err) {
        console.error(`Failed to generate signed URL for ${storagePath}:`, err);
      }
    }

    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

    if (resendKey) {
      for (const [, recipient] of Object.entries(filesByRecipient)) {
        const fileListHtml = recipient.files
          .map((f) => `<li style="margin:8px 0"><a href="${f.url}" style="color:#3b82f6">${f.fileName}</a></li>`)
          .join("");

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `DeadVault <${fromEmail}>`,
            to: recipient.email,
            subject: `${ownerName}'s vault files have been released to you`,
            html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
              <h2 style="color:#3b82f6">Vault Files Released</h2>
              <p>Hello ${recipient.name},</p>
              <p><strong>${ownerName}</strong> designated you to receive the following files from their DeadVault. A verified death claim has been processed and the files are now available.</p>
              <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:16px 0">
                <p style="margin:0 0 8px;font-weight:bold">Your files:</p>
                <ul style="margin:0;padding-left:20px">${fileListHtml}</ul>
              </div>
              <p style="color:#666;font-size:14px">These download links expire in 7 days. Please download your files promptly.</p>
            </div>`,
          }),
        }).catch((err) => {
          console.error(`Failed to send release email to ${recipient.email}:`, err);
        });
      }

      let ownerEmail: string | null = null;
      try {
        const userRecord = await getAuth().getUser(userId);
        ownerEmail = userRecord.email ?? null;
      } catch {}

      if (ownerEmail) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `DeadVault <${fromEmail}>`,
            to: ownerEmail,
            subject: "Your vault has been released",
            html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
              <h2 style="color:#3b82f6">Vault Released</h2>
              <p>A death claim was submitted and verified for your DeadVault account. Your vault files have been released to your designated recipients.</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0">
                <tr><td style="padding:8px;color:#666">Claimant:</td><td style="padding:8px;font-weight:bold">${recipientName} (${recipientEmail})</td></tr>
                <tr><td style="padding:8px;color:#666">Relationship:</td><td style="padding:8px">${relationship}</td></tr>
                <tr><td style="padding:8px;color:#666">Physician:</td><td style="padding:8px">${verifyData.physicianName} (License #${licenseNumber})</td></tr>
              </table>
            </div>`,
          }),
        }).catch((err) => {
          console.error("Failed to send owner notification email:", err);
        });
      }
    }

    return NextResponse.json({
      claimId: claimRef.id,
      status: "released",
      message: "Claim verified and vault files released to designated recipients.",
    });
  } catch (err: any) {
    console.error("Claim submission error:", err);
    return NextResponse.json({ error: err.message ?? "Claim submission failed" }, { status: 500 });
  }
}
