import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1">{children}</div>
      </div>
    </AuthGuard>
  );
}
