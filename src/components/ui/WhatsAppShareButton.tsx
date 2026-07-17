import type { ReactNode } from "react";
import { whatsappShareUrl } from "@/lib/whatsapp";
import { Button } from "./Button";

export function WhatsAppShareButton({
  text,
  children,
  variant = "secondary",
  shape = "pill",
}: {
  text: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  shape?: "pill" | "inline" | "block";
}) {
  return (
    <Button href={whatsappShareUrl(text)} external variant={variant} shape={shape}>
      {children}
    </Button>
  );
}
