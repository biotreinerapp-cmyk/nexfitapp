import type React from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HubServiceButtonProps {
  title: string;
  /** Optional second line (keep short). */
  subtitle?: string;
  icon: LucideIcon;
  onClick: () => void;
  rightSlot?: React.ReactNode;
  className?: string;
  /** Button variant (defaults to "default" to match Dashboard). */
  variant?: React.ComponentProps<typeof Button>["variant"];
  /** Render icon inside a circular container (used in Telemedicina). */
  iconStyle?: "plain" | "circle";
}

export function HubServiceButton({
  title,
  subtitle,
  icon: Icon,
  onClick,
  rightSlot,
  className,
  variant = "default",
  iconStyle = "plain",
}: HubServiceButtonProps) {
  return (
    <Button
      type="button"
      size="lg"
      variant={variant}
      onClick={onClick}
      className={cn(
        "w-full justify-between py-3",
        // Mantém ícone e texto pretos, como no botão 'Explorar Atividades'
        variant === "default" ? "text-primary-foreground" : "text-foreground",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {iconStyle === "circle" ? (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/50">
            <Icon className="h-5 w-5" />
          </div>
        ) : (
          <Icon className="h-5 w-5 shrink-0" />
        )}

        <div className="min-w-0">
          <div className="min-w-0 truncate font-bold">{title}</div>
          {subtitle ? (
            <div className="min-w-0 truncate text-xs font-medium opacity-80">{subtitle}</div>
          ) : null}
        </div>
      </div>

      {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
    </Button>
  );
}
