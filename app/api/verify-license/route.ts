import { NextRequest, NextResponse } from "next/server";
import { verifyLicense } from "@/lib/verify-license";

export async function GET(req: NextRequest) {
  try {
    const license = req.nextUrl.searchParams.get("license");
    if (!license) {
      return NextResponse.json({ error: "License number is required" }, { status: 400 });
    }

    const result = await verifyLicense(license);
    return NextResponse.json(result, { status: result.valid ? 200 : 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Verification failed" }, { status: 500 });
  }
}
