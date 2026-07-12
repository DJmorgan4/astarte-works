import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.astarteworks.com"),
  title: "ASTRA CORE | Astarte Works",
  description:
    "ASTRA CORE is the intelligence nexus connecting environmental, spatial, operational, astrological, and symbolic knowledge systems.",
  applicationName: "ASTRA CORE",
  creator: "Astarte Works",
  publisher: "The Blue Duck LLC",
  keywords: [
    "ASTRA CORE",
    "Astarte Works",
    "environmental intelligence",
    "geospatial intelligence",
    "astrology",
    "gematria",
    "CETO",
    "ATLAS AI",
    "LITHIC EARTH",
  ],
  openGraph: {
    title: "ASTRA CORE",
    description:
      "Query the living Earth through environmental, spatial, operational, and symbolic intelligence.",
    type: "website",
    siteName: "Astarte Works",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#06132f",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${spaceMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
