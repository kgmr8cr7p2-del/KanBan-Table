"use client";

import Link from "next/link";
import { Archive, BarChart3, History, LayoutDashboard, Moon, Settings, Shield, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

const links = [
  { href: "/board", label: "Доска", icon: LayoutDashboard },
  { href: "/reports", label: "Отчеты", icon: BarChart3 },
  { href: "/history", label: "История", icon: History },
  { href: "/archive", label: "Архив", icon: Archive },
  { href: "/profile", label: "Профиль", icon: UserRound },
  { href: "/settings", label: "Настройки", icon: Settings },
];

export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const visibleLinks = isAdmin ? [...links, { href: "/admin", label: "Админ", icon: Shield }] : links;

  return (
    <nav className="nav" aria-label="Основная навигация">
      {visibleLinks.map(({ href, label, icon: Icon }) => (
        <Link aria-current={pathname === href ? "page" : undefined} href={href} key={href}>
          <Icon size={18} aria-hidden="true" />
          {label}
        </Link>
      ))}
      <ThemeToggle icon={<Moon size={18} aria-hidden="true" />} />
      <LogoutButton />
    </nav>
  );
}
