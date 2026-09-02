import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProjectMatch",
  description:
    "A manual matching service for legitimate student digital projects.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
