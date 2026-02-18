import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";
import { siteConfig } from "@/config/site";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.name,
    description: siteConfig.description,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#ffffff",
          colorBackground: "#0a0a0a",
          colorInputBackground: "rgba(255, 255, 255, 0.05)",
          colorInputText: "#ffffff",
          colorText: "#ffffff",
          colorTextSecondary: "#a3a3a3",
          borderRadius: "1rem",
          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        },
        elements: {
          card: "bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl",
          headerTitle: "text-white font-semibold",
          headerSubtitle: "text-gray-400",
          socialButtonsBlockButton:
            "bg-white/5 border border-white/10 hover:bg-white/10 text-white transition-colors",
          socialButtonsBlockButtonText: "text-white font-medium",
          formButtonPrimary:
            "bg-white text-black hover:bg-gray-200 transition-colors",
          formFieldInput:
            "bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-white/30 focus:ring-white/20",
          formFieldLabel: "text-gray-300",
          footerActionLink: "text-white hover:text-gray-300",
          identityPreview: "bg-white/5 border border-white/10",
          identityPreviewText: "text-white",
          identityPreviewEditButton: "text-gray-400 hover:text-white",
          dividerLine: "bg-white/10",
          dividerText: "text-gray-500",
          formFieldAction: "text-gray-400 hover:text-white",
          otpCodeFieldInput:
            "bg-white/5 border border-white/10 text-white",
          alternativeMethodsBlockButton:
            "bg-white/5 border border-white/10 text-white hover:bg-white/10",
          footer: "text-gray-500",
        },
      }}
    >
      <html lang="en" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
