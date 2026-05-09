import * as React from "react";
import { clsx } from "clsx";
import { cva, type VariantProps } from "class-variance-authority";

const buttonCva = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-error text-white shadow-sm hover:bg-error/90",
        outline: "border border-border bg-transparent shadow-sm hover:bg-surface hover:text-text-primary",
        secondary: "bg-surface text-text-primary shadow-sm hover:bg-surface/80",
        ghost: "hover:bg-surface hover:text-text-primary",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonCva> {
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      className={clsx(buttonCva({ variant, size, className }))}
      ref={ref}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="ai-pulse">{children}</span> : children}
    </button>
  )
);
Button.displayName = "Button";

export { Button, buttonCva };