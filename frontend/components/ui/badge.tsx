import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
  {
    variants: {
      variant: {
        default: "bg-slate-100 text-slate-800",
        outline: "border border-slate-200 bg-white text-slate-800",
        subtle: "bg-slate-50 text-slate-700",
        success: "bg-emerald-100 text-emerald-800",
        destructive: "bg-red-100 text-red-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants> & {
  children?: React.ReactNode;
};

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  return (
    <span {...props} className={cn(badgeVariants({ variant, className }))}>
      {children}
    </span>
  );
}

export { badgeVariants };
