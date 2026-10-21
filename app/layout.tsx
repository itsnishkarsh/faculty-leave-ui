import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { GlobalCommunications } from "@/components/global-communications";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#f5f5f7] text-[#1d1d1f] antialiased selection:bg-[#0071e3] selection:text-white">
        <AuthProvider>{children}<GlobalCommunications /></AuthProvider>
      </body>
    </html>
  );
}
