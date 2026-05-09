import * as React from "react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={() => onOpenChange?.(false)} />
      <div className="relative z-50 bg-surface border border-border rounded-lg shadow-lg p-6 w-full max-w-md">
        {children}
      </div>
    </div>
  );
};

const DialogHeader: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <div className={cn("flex flex-col space-y-1.5 mb-4", className)}>{children}</div>
);

const DialogTitle: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <h2 className={cn("text-lg font-semibold text-text-primary", className)}>{children}</h2>
);

const DialogDescription: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <p className={cn("text-sm text-text-secondary", className)}>{children}</p>
);

const DialogContent: React.FC<{ className?: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ className, style, children }) => (
  <div className={cn("relative z-50", className)} style={style}>{children}</div>
);

export { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent };