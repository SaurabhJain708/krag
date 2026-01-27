import "@repo/ui/styles.css";
import "../globals.css";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { AuthProvider } from "@/lib/auth-provider";
import { TRPCProvider } from "@/server/trpc/react";
import { Toaster } from "sonner";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KRAG",
  description: "Krag is a tool for creating and managing your notes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <AuthProvider>
          <TRPCProvider>
            {children}
            <Toaster position="top-right" richColors />
          </TRPCProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
