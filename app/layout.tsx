import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FamFi Piggy Bank",
  description: "A family piggy bank and chores app.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
