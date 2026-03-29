import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, relationship, userId, ownerName } = body;

    if (!name || !email || !userId) {
      return NextResponse.json(
        { error: "name, email, and userId are required" },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const token = crypto.randomUUID();
    const now = new Date().toISOString();

    const recipientRef = await db
      .collection("users")
      .doc(userId)
      .collection("recipients")
      .add({
        name,
        email,
        relationship: relationship ?? "",
        token,
        createdAt: now,
      });

    await db.collection("claims").add({
      userId,
      token,
      recipientEmail: email,
      recipientName: name,
      status: "active",
      createdAt: now,
    });

    await db.collection("auditLogs").add({
      action: "RECIPIENT_ADDED",
      actorType: "owner",
      actorId: userId,
      targetType: "recipient",
      targetId: recipientRef.id,
      metadata: { recipientEmail: email, recipientName: name },
      createdAt: now,
      ownerId: userId,
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const claimUrl = `${baseUrl}/claim/${token}`;
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `DeadVault <${fromEmail}>`,
          to: email,
          subject: `${ownerName ?? "Someone"} has designated you as a vault executer`,
          html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px">
            <h2 style="color:#3b82f6">DeadVault - Executer Designation</h2>
            <p>Hello ${name},</p>
            <p><strong>${ownerName ?? "A DeadVault user"}</strong> has designated you as an executer for their digital vault.</p>
            <p>As an executer, you are responsible for submitting a verified death claim if the vault owner passes away. This will initiate the release of their vault files to their designated recipients.</p>
            <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:16px 0">
              <p style="margin:0 0 8px;font-weight:bold">Your Claim Link:</p>
              <a href="${claimUrl}" style="color:#3b82f6;word-break:break-all">${claimUrl}</a>
            </div>
            <p style="color:#666;font-size:14px"><strong>Important:</strong> Only use this link when you need to submit a legitimate death claim with a physician's note. All claims are verified and logged.</p>
            <p style="color:#666;font-size:14px">Keep this email safe — you will need this link in the future.</p>
          </div>`,
        }),
      }).catch((err) => {
        console.error("Failed to send executer notification email:", err);
      });
    }

    return NextResponse.json({
      id: recipientRef.id,
      name,
      email,
      relationship: relationship ?? "",
      claimToken: token,
      addedAt: now,
    });
  } catch (err: any) {
    console.error("Add recipient error:", err);
    return NextResponse.json({ error: err.message ?? "Failed to add recipient" }, { status: 500 });
  }
}
