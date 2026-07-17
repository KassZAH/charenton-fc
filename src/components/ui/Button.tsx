import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger";
type Shape = "pill" | "inline" | "block";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-gold text-navy-deep font-bold",
  secondary: "border border-white/15 text-cream/80 font-medium",
  danger: "border border-red-400/30 bg-red-500/10 text-red-300 font-semibold",
};

const SHAPE_CLASSES: Record<Shape, string> = {
  pill: "rounded-full px-3 py-1.5 text-xs",
  inline: "rounded-lg px-4 py-2 text-sm",
  block: "block w-full rounded-lg py-3 text-sm text-center",
};

type ButtonProps = {
  variant?: Variant;
  shape?: Shape;
  href?: string;
  external?: boolean;
  className?: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;

export function Button({
  variant = "secondary",
  shape = "pill",
  href,
  external = false,
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = `${SHAPE_CLASSES[shape]} ${VARIANT_CLASSES[variant]} transition disabled:opacity-60 ${className}`;

  if (href) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}
