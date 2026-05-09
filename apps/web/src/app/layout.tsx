"use client";

import "@/app/globals.css";
import { PageWrapper } from "@/components/page-wrapper";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body style={{ backgroundColor: "var(--background)", color: "var(--text-primary)" }}>
        <PageWrapper>{children}</PageWrapper>
      </body>
    </html>
  );
}