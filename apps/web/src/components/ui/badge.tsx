import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = [
  "bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs font-medium",
  "bg-success/20 text-success px-2 py-0.5 rounded-full text-xs font-medium",
  "bg-warning/20 text-warning px-2 py-0.5 rounded-full text-xs font-medium",
  "bg-error/20 text-error px-2 py-0.5 rounded-full text-xs font-medium",
  "bg-surface border border-border text-text-secondary px-2 py-0.5 rounded-full text-xs font-medium",
];

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "error" | "outline";
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants[variant === "default" ? 0 : variant === "success" ? 1 : variant === "warning" ? 2 : variant === "error" ? 3 : 4], className)}
      {...props}
    />
  )
);
Badge.displayName = "Badge";

export { Badge };