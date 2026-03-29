const VALID_PHYSICIANS: Record<string, { name: string; province: string }> = {
  "12345": { name: "Dr. Jane Smith", province: "Ontario" },
  "67890": { name: "Dr. Michael Chen", province: "British Columbia" },
  "11111": { name: "Dr. Sarah Johnson", province: "Alberta" },
  "99999": { name: "Dr. Robert Williams", province: "Quebec" },
};

export interface LicenseResult {
  license: string;
  valid: boolean;
  physicianName: string | null;
  registeredProvince: string | null;
}

export async function verifyLicense(license: string): Promise<LicenseResult> {
  const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (backendUrl) {
    const res = await fetch(
      `${backendUrl}/verify-license?license=${encodeURIComponent(license)}`
    );
    return res.json();
  }

  const physician = VALID_PHYSICIANS[license.trim()];
  if (physician) {
    return {
      license: license.trim(),
      valid: true,
      physicianName: physician.name,
      registeredProvince: physician.province,
    };
  }

  return {
    license: license.trim(),
    valid: false,
    physicianName: null,
    registeredProvince: null,
  };
}
