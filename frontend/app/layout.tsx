import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FleetTrack — Real-Time Fleet Tracking System",
  description:
    "Real-time fleet tracking dashboard with MQTT, WebSocket, and live map visualization.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen flex`}>
        <Sidebar />
        <main className="flex-1 ml-64 min-h-screen overflow-auto">{children}</main>
      </body>
    </html>
  );
}
