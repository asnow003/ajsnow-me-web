import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL('https://www.ajsnow.me'),
  title: {
    default: 'AJ Snow',
    template: '%s — AJ Snow',
  },
  description: 'The personal website of AJ Snow.',
  openGraph: {
    siteName: 'AJ Snow',
    type: 'website',
  },
  twitter: {
    card: 'summary',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
