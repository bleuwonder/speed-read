"use client";

import { useState, useEffect } from "react";

type Theme = "system" | "dark" | "light";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null;
    if (stored) {
      setTheme(stored);
      applyTheme(stored);
    }
  }, []);

  function applyTheme(t: Theme) {
    const root = document.documentElement;
    root.classList.remove("dark", "light");
    if (t !== "system") root.classList.add(t);
  }

  function cycle() {
    const next: Theme = theme === "system" ? "dark" : theme === "dark" ? "light" : "system";
    setTheme(next);
    applyTheme(next);
    localStorage.setItem("theme", next);
  }

  const label = theme === "system" ? "Auto" : theme === "dark" ? "Dark" : "Light";

  return (
    <button
      onClick={cycle}
      className="text-xs text-foreground/50 hover:text-foreground border border-foreground/10 rounded px-2 py-1"
      aria-label={`Theme: ${label}`}
    >
      {label}
    </button>
  );
}
