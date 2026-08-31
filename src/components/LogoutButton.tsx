"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Always leave the protected page, even if the network request failed.
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout}>
      <LogOut size={18} />
      Выйти
    </button>
  );
}
