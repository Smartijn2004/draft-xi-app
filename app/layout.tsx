import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import FeedbackButton from "@/components/FeedbackButton";
import ThemeToggle from "@/components/ThemeToggle";

// Runs before first paint to set the theme class, preventing a light/dark flash.
const themeInit = `(function(){try{var t=localStorage.getItem('draftxi-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}if(t==='light')document.documentElement.classList.add('light');}catch(e){}})();`;

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
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <ThemeToggle />
        <FeedbackButton />
      </body>
    </html>
  );
}
