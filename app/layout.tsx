import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/providers";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { getSiteUrl } from "@/lib/site-url";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const defaultDescription =
  "Automate regulatory compliance monitoring for emerging-market FinTechs. Real-time regulatory intelligence, AI-powered change detection, and instant alerts. Eliminate manual monitoring and ensure continuous compliance with Regula.";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: "Regula - AI-Powered Regulatory Compliance Monitoring Platform",
  description: defaultDescription,
  keywords: [
    "regulatory compliance",
    "compliance automation",
    "regulatory monitoring",
    "regulatory intelligence",
    "AI compliance",
    "FinTech compliance",
    "regulatory change management",
    "compliance alerts",
    "regulatory tracking",
    "automated compliance monitoring",
    "emerging markets compliance",
    "regulatory risk management",
  ],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Regula - AI-Powered Regulatory Compliance Monitoring",
    description:
      "Automate regulatory compliance monitoring for emerging-market FinTechs. Real-time intelligence and AI-powered alerts.",
    type: "website",
    siteName: "Regula",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Regula - AI-Powered Regulatory Compliance Monitoring",
    description:
      "Automate regulatory compliance monitoring for emerging-market FinTechs. Real-time intelligence and AI-powered alerts.",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <Providers>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
