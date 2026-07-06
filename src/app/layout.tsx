import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import { ClientProviders } from "@/components/ClientProviders";
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
  title: "FAMFOOD | Premium Seafood & Food Supplier",
  description:
    "FAMFOOD Enterprise supplies seafood, juice, frozen food and restaurant food supply in Kuching, Sarawak.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body>
        <ClientProviders>
          <SiteHeader />
          <main>{children}</main>
          <Footer />
        </ClientProviders>
      </body>
    </html>
  );
}
