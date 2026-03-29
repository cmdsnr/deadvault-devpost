import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();
    if (!email || !code) {
      return NextResponse.json({ error: "email and code are required" }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";

    if (!resendKey) {
      return NextResponse.json({ sent: true, mock: true });
    }

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `DeadVault <${fromEmail}>`,
        to: email,
        subject: "Your DeadVault verification code",
        html: `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px">
          <h2 style="color:#3b82f6">DeadVault Verification</h2>
          <p>Your verification code is:</p>
          <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#f4f4f5;border-radius:8px;margin:16px 0">${code}</div>
          <p style="color:#666;font-size:14px">This code expires in 5 minutes.</p>
        </div>`,
      }),
    });

    return NextResponse.json({ sent: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to send code" }, { status: 500 });
  }
}
