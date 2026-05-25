"use client";

// Light/dark toggle for the default theme.
//
// Flips the `data-theme` attribute on <html> and persists the choice to
// localStorage. The pre-paint script injected by Layout reads that value
// (or the OS preference) before first paint, so there is no flash.
//
// The button markup is static — which icon shows is decided purely by CSS
// (`html[data-theme="dark"]`), so there is no hydration mismatch.

export default function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("gl-theme", next);
    } catch {
      /* storage unavailable — toggle still works for this page */
    }
  }

  return (
    <button
      type="button"
      className="theme-mode-toggle"
      onClick={toggle}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
    >
      <svg
        className="theme-icon-moon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
      <svg
        className="theme-icon-sun"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2v2.6M12 19.4V22M3.5 3.5l1.8 1.8M18.7 18.7l1.8 1.8M2 12h2.6M19.4 12H22M3.5 20.5l1.8-1.8M18.7 5.3l1.8-1.8" />
      </svg>
    </button>
  );
}
