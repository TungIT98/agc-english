import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-base)",
        surface: "var(--bg-card)",
        elevated: "var(--bg-elevated)",
        border: "var(--border)",
        "border-subtle": "var(--border-subtle)",
        "border-accent": "var(--border-accent)",
        primary: "var(--primary)",
        "accent-violet": "var(--accent-violet)",
        "accent-cyan": "var(--accent-cyan)",
        "accent-emerald": "var(--accent-emerald)",
        "accent-amber": "var(--accent-amber)",
        "accent-rose": "var(--accent-rose)",
        success: "var(--success)",
        warning: "var(--warning)",
        error: "var(--error)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "glow-breathe": "breathing-glow 3s ease-in-out infinite",
        shimmer: "skeleton-shimmer 1.5s ease-in-out infinite",
      },
      boxShadow: {
        "glow-violet": "0 0 20px rgba(139, 92, 246, 0.4)",
        "glow-cyan": "0 0 20px rgba(34, 211, 238, 0.4)",
        "glow-emerald": "0 0 20px rgba(52, 211, 153, 0.4)",
        "glow-rose": "0 0 20px rgba(251, 113, 133, 0.4)",
        "glass": "0 4px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.04) inset",
      },
      backdropBlur: {
        glass: "12px",
      },
      borderRadius: {
        lg: "12px",
      },
    },
  },
  plugins: [],
};
export default config;