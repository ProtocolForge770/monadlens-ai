import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MonadLens AI — Monad Testnet Radar",
  description:
    "Live whale moves and new launches on Monad testnet, explained by AI, drafted as X threads.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
