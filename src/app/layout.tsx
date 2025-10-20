import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { getServerAuthSession } from "@/lib/auth";
import { AppHeader } from "@/components/layout/app-header";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { ServiceWorkerRegister } from "@/components/providers/service-worker-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SplitNinja",
  description: "Plan, split, and settle group expenses without friction.",
  manifest: "/manifest.webmanifest",
  themeColor: "#0f172a",
  icons: {
    icon: "/window.svg",
    apple: "/window.svg",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerAuthSession();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthSessionProvider session={session}>
          <ServiceWorkerRegister />
          <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900">
            <AppHeader />
            <main className="flex-1 px-4 pb-28 pt-6 sm:px-6 md:py-6 lg:px-8">
              {children}
            </main>
            <MobileBottomNav />
          </div>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
