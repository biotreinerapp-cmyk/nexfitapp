import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BackIconButtonProps = {
  /** Route to navigate to. If omitted, navigates back (-1). */
  to?: string | number;
  /** Optional click handler. If provided, it overrides `to`. */
  onClick?: () => void;
  className?: string;
  ariaLabel?: string;
};

export function BackIconButton({
  to = -1,
  onClick,
  className,
  ariaLabel = "Voltar",
}: BackIconButtonProps) {
  const navigate = useNavigate();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick ?? (() => navigate(to as any))}
      className={cn("mr-1 text-foreground", className)}
      aria-label={ariaLabel}
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
}
