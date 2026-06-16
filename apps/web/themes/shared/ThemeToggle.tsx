"use client";

// Shared light/dark toggle. Each theme passes its own CSS class names.
// The button uses CSS to show/hide the moon/sun icons based on `data-theme`
// on `<html>` — no JS state, no hydration mismatch.

export interface ThemeToggleClasses {
  button: string;
  moon: string;
  sun: string;
}

export function ThemeToggle({ classes }: { classes: ThemeToggleClasses }) {
  function toggle() {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("gl-theme", next);
    } catch {
      /* storage unavailable */
    }
  }

  return (
    <button
      type="button"
      className={classes.button}
      onClick={toggle}
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
    >
      <svg
        className={classes.moon}
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
        className={classes.sun}
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
