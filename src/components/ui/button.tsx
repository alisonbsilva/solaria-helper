import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition-[color,background-color,transform] duration-150 ease-out disabled:opacity-50 min-h-11 px-4 active:not-disabled:scale-[0.96]",
  {
    variants: {
      variant: {
        primary: "bg-teal text-ink hover:bg-teal-dim",
        ghost: "bg-surface text-fog border border-line hover:bg-surface-2",
        quiet: "bg-transparent text-mist hover:text-fog hover:bg-surface",
      },
      size: {
        md: "min-h-11 px-4",
        sm: "min-h-9 px-3 text-xs",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: { variant: "ghost", size: "md" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
