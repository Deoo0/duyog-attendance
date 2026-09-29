import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Duyog | Choir Management", description: "Bring every voice together. Manage choir members, rehearsals, and attendance in one thoughtful workspace." };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
