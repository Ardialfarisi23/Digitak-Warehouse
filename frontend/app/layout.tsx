import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ClientLayoutWrapper } from "@/components/ClientLayoutWrapper";
import { SidebarProvider } from "@/components/sidebar-context";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Digitak Warehouse",
  description: "Warehouse Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${plusJakartaSans.variable} h-full antialiased overflow-x-hidden`}
    >
      <body className={`${plusJakartaSans.className} h-full`}>
        <AuthProvider>
          <SidebarProvider>
            <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}