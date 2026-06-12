import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import FeedbackButton from "@/components/FeedbackButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://draft-xi-app.vercel.app"),
  title: "Draft XI — Multi-League Football Draft",
  description: "Build your ultimate XI from Premier League, La Liga, Serie A, Champions League or World Cup legends and simulate the season.",
  openGraph: {
    title: "Draft XI — Multi-League Football Draft",
    description: "Spin the wheel, draft legends, simulate the season. Can you go unbeaten?",
    url: "/",
    siteName: "Draft XI",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Draft XI — football draft game" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Draft XI — Multi-League Football Draft",
    description: "Spin the wheel, draft legends, simulate the season. Can you go unbeaten?",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <FeedbackButton />
      </body>
    </html>
  );
}
