import "@repo/ui/styles.css";
import "../globals.css";
import type { Metadata } from "next";
import { Geist } from "next/font/google";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "krag - World's First Serverless One-Click Deployed RAG Agent",
  description:
    "Deploy production-grade RAG with Modal serverless GPUs. Customize models, swap LLMs easily. Your data stays private - only processed on serverless GPUs.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={geist.className}>{children}</body>
    </html>
  );
}
