import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DeadVault - Secure Your Digital Legacy",
  description:
    "A dead man's switch for your digital life. Upload encrypted documents, designate executers, and ensure your digital legacy reaches the right hands.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body suppressHydrationWarning className="min-h-full flex flex-col bg-background text-foreground">
        <AuthProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#1a1a1a",
                color: "#ededed",
                border: "1px solid #262626",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
