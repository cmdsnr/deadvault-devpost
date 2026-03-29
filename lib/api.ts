const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

export async function uploadFile(file: File, recipientId?: string) {
  const formData = new FormData();
  formData.append("file", file);
  if (recipientId) formData.append("recipientId", recipientId);

  const res = await fetch(`${BASE}/api/upload`, { method: "POST", body: formData });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function addRecipient(data: { name: string; email: string; relationship: string }) {
  const res = await fetch(`${BASE}/api/add-recipient`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function submitClaim(token: string, formData: FormData) {
  formData.append("token", token);
  const res = await fetch(`${BASE}/api/claim`, { method: "POST", body: formData });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function verifyLicense(licenseNumber: string) {
  const res = await fetch(`${BASE}/api/verify-license?license=${encodeURIComponent(licenseNumber)}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function overrideClaim(claimId: string) {
  const res = await fetch(`${BASE}/api/override`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ claimId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
