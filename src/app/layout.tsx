import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { ButtonBorderGlow } from "@/components/ButtonBorderGlow";
import { INTERFACE_MODE_COOKIE, normalizeInterfaceMode } from "@/lib/interface-mode";
import "./globals.css";
import "./redesign.css";

export const metadata: Metadata = {
  title: "Taskora — управление работой команды",
  description: "Задачи, чаты, статусы и отчёты команды в одном рабочем пространстве.",
  icons: {
    icon: "/taskora-icon-v2.png",
    apple: "/taskora-icon-v2.png",
  },
  appleWebApp: {
    capable: true,
    title: "Taskora",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#101827",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const interfaceMode = normalizeInterfaceMode(cookieStore.get(INTERFACE_MODE_COOKIE)?.value);

  return (
    <html lang="ru" data-interface-mode={interfaceMode} suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" />
      </head>
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
