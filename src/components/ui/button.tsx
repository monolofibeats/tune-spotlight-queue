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
        outline: "border border-border bg-transparent hover:bg-secondary hover:text-secondary-foreground active:bg-secondary/80",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 active:bg-secondary/70",
        ghost: "hover:bg-secondary hover:text-secondary-foreground active:bg-secondary/80",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-[hsl(130_50%_38%)] text-white font-semibold shadow-lg shadow-[hsl(130_50%_30%)/0.4] hover:bg-[hsl(130_50%_34%)] hover:shadow-xl hover:shadow-[hsl(130_50%_30%)/0.5] active:shadow-md transition-all duration-300 ease-out",
        "hero-outline": "border-2 border-primary/50 bg-transparent text-foreground shadow-md shadow-primary/10 hover:bg-primary/10 hover:border-primary hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 ease-out",
        glow: "bg-primary text-primary-foreground glow-primary hover:shadow-2xl hover:shadow-primary/40 hover:scale-105 active:scale-100 transition-all duration-300",
        premium: "bg-primary text-primary-foreground font-semibold hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-100 transition-all duration-300",
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
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
