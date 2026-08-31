"use client";

export function ThemeToggle({ icon }: { icon?: React.ReactNode }) {
  function toggle() {
    const current = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = current;
    try {
      localStorage.setItem("theme", current);
    } catch {
      // Private browsing can disable storage; the in-memory theme still applies.
    }
  }

  return (
    <button type="button" onClick={toggle}>
      {icon}
      Тема
    </button>
  );
}
