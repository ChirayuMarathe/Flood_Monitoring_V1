import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mumbai Flood Command Center",
  description: "3D Geospatial Flood Monitoring & Emergency Response System for Mumbai's 24 Administrative Wards",
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <link href="https://api.fontshare.com/v2/css?f[]=clash-grotesk@400,500,600,700&f[]=satoshi@400,500,700,900&display=swap" rel="stylesheet" />
      </head>
      <body className={`${inter.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
