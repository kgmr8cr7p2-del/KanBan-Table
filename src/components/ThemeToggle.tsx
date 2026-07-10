"use client";

export function ThemeToggle({ icon }: { icon?: React.ReactNode }) {
  function toggle() {
    const current = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = current;
    localStorage.setItem("theme", current);
  }

  return (
    <button type="button" onClick={toggle}>
      {icon}
      Тема
    </button>
  );
}
