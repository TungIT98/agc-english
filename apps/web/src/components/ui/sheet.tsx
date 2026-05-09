import * as React from "react";
import { cn } from "@/lib/utils";

interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  side?: "left" | "right";
}

const Sheet: React.FC<SheetProps> = ({ open, onOpenChange, children, side = "right" }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/60" onClick={() => onOpenChange?.(false)} />
      <div
        className={cn(
          "fixed z-50 bg-surface border border-border shadow-lg h-full w-72 top-0",
          side === "right" ? "right-0" : "left-0"
        )}
      >
        {children}
      </div>
    </div>
  );
};

const SheetContent: React.FC<{ children: React.ReactNode; side?: "left" | "right"; className?: string }> = ({ children, className }) => (
  <div className={className}>{children}</div>
);

export { Sheet, SheetContent };