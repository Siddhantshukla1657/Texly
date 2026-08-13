import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Texly — Browser-Based LaTeX Editor",
  description: "Write and compile LaTeX documents in your browser with Texly's powerful workspace.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Texly — Browser-Based LaTeX Editor",
    description: "Write and compile LaTeX documents in your browser with Texly's powerful workspace.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ClerkProvider dynamic>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#191D24",
                color: "#F6F2E8",
                border: "1px solid rgba(246,242,232,0.15)",
                borderRadius: "8px",
                fontSize: "13px",
                fontFamily: 'var(--font-sans)',
                boxShadow: "0 4px 20px rgba(25,29,36,0.2)",
              },
            }}
          />
        </ClerkProvider>
      </body>
    </html>
  );
}
