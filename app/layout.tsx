import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Uhasibu Digito — Tanzania's Intelligent Financial Platform",
  description: "Akaunti yako, nguvu yako. 20 modules for accounting, payroll, tax compliance, and financial intelligence.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Uhasibu Digito",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F7B5E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans bg-ud-surface-3 text-ud-text-primary antialiased min-h-screen" suppressHydrationWarning>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            className: "font-sans text-sm",
            duration: 3500,
            style: {
              borderRadius: 12,
              border: "1px solid #E5F0EC",
              boxShadow: "0 8px 32px -8px rgba(10,35,24,0.12)",
            },
          }}
        />
      </body>
    </html>
  );
}
