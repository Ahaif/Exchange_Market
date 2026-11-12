import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "HAI Exchange · Testnet",
  description: "A transparent, on-chain HAI / ETH order book on Sepolia.",
};
export default function Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
