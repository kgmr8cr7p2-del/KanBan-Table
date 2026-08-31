import type { Metadata, Viewport } from "next";
import { ButtonBorderGlow } from "@/components/ButtonBorderGlow";
import "./globals.css";
import "./redesign.css";

export const metadata: Metadata = {
  title: "Taskora — управление работой команды",
  description: "Задачи, чаты, статусы и отчёты команды в одном рабочем пространстве.",
  icons: { icon: "/taskora-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const theme=localStorage.getItem("theme");if(theme==="dark")document.documentElement.dataset.theme="dark";}catch{}`,
          }}
        />
        <ButtonBorderGlow />
        {children}
      </body>
    </html>
  );
}
