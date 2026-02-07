import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:scale-[1.02] active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 active:shadow-md",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80",
        outline:
          "border border-border bg-transparent hover:bg-secondary hover:text-secondary-foreground active:bg-secondary/80",
        secondary:
          "bg-[hsl(0_0%_12%)] border-2 border-[hsl(0_0%_25%)] text-secondary-foreground shadow-md shadow-black/20 hover:bg-[hsl(0_0%_15%)] hover:border-[hsl(0_0%_35%)] hover:shadow-lg active:bg-[hsl(0_0%_10%)] transition-all duration-500 ease-out group overflow-hidden relative",
        ghost: "hover:bg-secondary hover:text-secondary-foreground active:bg-secondary/80",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-[hsl(45_80%_12%)] border-2 border-[hsl(45_90%_50%)] text-white font-semibold shadow-lg shadow-[hsl(45_80%_30%)/0.3] hover:bg-[hsl(45_80%_16%)] hover:border-[hsl(45_95%_55%)] hover:shadow-xl active:bg-[hsl(45_80%_10%)] transition-all duration-500 ease-out group overflow-hidden relative",
        "hero-outline":
          "border-2 border-primary/50 bg-transparent text-foreground shadow-md shadow-primary/10 hover:bg-primary/10 hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all duration-500 ease-out",
        glow: "bg-primary text-primary-foreground glow-primary hover:shadow-2xl hover:shadow-primary/40 hover:scale-105 active:scale-100 transition-all duration-300",
        premium:
          "bg-primary text-primary-foreground font-semibold hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-100 transition-all duration-300",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-lg px-8 text-base",
        xl: "h-14 rounded-xl px-10 text-lg",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    // Only show shine effect for non-asChild buttons with secondary/hero variants
    const showShine = !asChild && (variant === "secondary" || variant === "hero");

    // Radix Slot (asChild) requires exactly ONE ReactElement child.
    // Some JSX formatting may introduce whitespace strings; strip non-elements.
    const elementChildren = React.Children.toArray(children).filter(
      (child): child is React.ReactElement => React.isValidElement(child),
    );

    const slotChild = elementChildren[0] ?? null;
    const useSlot = asChild && slotChild !== null;

    if (asChild && elementChildren.length !== 1) {
      // eslint-disable-next-line no-console
      console.error(
        "[Button] asChild=true expects exactly one React element child. Received:",
        React.Children.toArray(children),
      );
    }

    // IMPORTANT: When using Slot, render ONLY the slotted child (no extra null/false siblings),
    // otherwise Slot/React.Children.only can throw.
    if (useSlot) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {slotChild}
        </Slot>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {showShine ? <span className="btn-shine" /> : null}
        {children}
      </button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
