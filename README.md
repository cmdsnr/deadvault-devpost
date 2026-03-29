# DeadVault

DeadVault is a digital legacy platform built for LCS Hack to the Future. It gives users a secure way to store important files, assign recipients, and define how those files should be released if they pass away or become incapacitated.

The project focuses on a real-world problem: most people have no reliable plan for what happens to their digital documents, records, and sensitive files when they are no longer able to manage them. DeadVault is designed to make that process more secure, more structured, and easier to trust.

## Features

- Secure file upload flow for personal vault documents
- File recipient management for release planning
- Executer management with unique claim links
- Claim submission flow with physician note upload
- Physician license verification flow
- Audit log for sensitive vault activity
- Firebase authentication with two-factor authentication support
- Profile and security settings
- Email delivery for claim and release notifications
- Signed URL release flow for recipient file access

## How It Works

1. A vault owner creates an account and signs in.
2. The owner uploads important files to their vault.
3. The owner assigns file recipients and designates an executer.
4. The executer receives a unique claim link.
5. When needed, the executer submits a claim with a physician's note and license number.
6. The system verifies the claim and records the event in the audit log.
7. Approved files are released to the intended recipients through secure download links.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Firebase Auth
- Firestore
- Firebase Admin SDK
- Google Cloud Storage
- Resend
- OTPAuth
- QRCode

## Project Structure

```text
app/
  api/                  API routes for uploads, claims, recipients, audit logs, and 2FA
  claim/[token]/        Public claim flow for executers
  dashboard/            Main authenticated vault dashboard
  login/                Sign-in page
  settings/             Profile, password, and 2FA settings
  setup-2fa/            Initial 2FA setup flow
  signup/               Account creation page
  verify-2fa/           2FA verification page
components/             Shared UI components
context/                Auth context and app-wide auth state
lib/                    Firebase, Firestore, and utility helpers
```

## Getting Started

### Prerequisites

- Node.js 18+ recommended
- npm
- Firebase project credentials
- Google Cloud Storage bucket access
- Resend API key for email delivery

### Installation

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Create a `.env.local` file and add the values your setup needs.

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_PROJECT_ID=

GCP_BUCKET_NAME=
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=

RESEND_API_KEY=
RESEND_FROM_EMAIL=
```

## Main User Flows

### Vault Owner

- Sign up or log in
- Set up two-factor authentication
- Upload files to the vault
- Add file recipients
- Add executers
- Review vault activity in the audit log

### Executer

- Open a unique claim link
- Submit a physician's note
- Enter a physician license number
- Trigger the verified release flow

### Recipient

- Receive a secure email with signed download links when files are released

## Notes

- License verification can use a backend API when configured through `NEXT_PUBLIC_API_BASE_URL`
- If no external verification backend is configured, the app falls back to local sample verification data
- Email sending can be mocked when a Resend API key is not present
