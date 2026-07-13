import type { Metadata, Viewport } from "next";
import { Inter, Unbounded } from "next/font/google";
import { ButtonBorderGlow } from "@/components/ButtonBorderGlow";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], display: "swap" });
const unbounded = Unbounded({ subsets: ["latin", "cyrillic"], display: "swap", variable: "--font-unbounded" });

export const metadata: Metadata = {
  title: "Такт — рабочая система команды",
  description: "Задачи, чаты, статусы и отчёты команды в одном рабочем ритме.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.className} ${unbounded.variable}`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.dataset.theme=localStorage.getItem("theme")||"light";`,
          }}
        />
        <ButtonBorderGlow />
        {children}
      </body>
    </html>
  );
}
