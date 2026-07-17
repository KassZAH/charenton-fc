import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "default" | "highlight";
type Padding = "sm" | "md";

const VARIANT_CLASSES: Record<Variant, string> = {
  default: "border-white/10 bg-navy-card",
  highlight: "border-gold/15 bg-navy-mid",
};

const PADDING_CLASSES: Record<Padding, string> = {
  sm: "p-3",
  md: "p-4",
};

const ROUNDED_CLASSES = {
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
} as const;

export function Card({
  children,
  href,
  variant = "default",
  padding = "md",
  rounded = "xl",
  className = "",
}: {
  children: ReactNode;
  href?: string;
  variant?: Variant;
  padding?: Padding;
  rounded?: "xl" | "2xl";
  className?: string;
}) {
  const classes = `${ROUNDED_CLASSES[rounded]} border ${VARIANT_CLASSES[variant]} ${PADDING_CLASSES[padding]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={`block ${classes}`}>
        {children}
      </Link>
    );
  }

  return <div className={classes}>{children}</div>;
}
