import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Skull } from "lucide-react";

type BadgeVariant = "ELITE" | "ADVANCE" | "FREE";

type GreetingCardProps = {
  name: string | null;
  avatarUrl: string | null;
  onAvatarError: () => void;
  badgeVariant?: BadgeVariant | null;
  /**
   * Optional secondary line below the name.
   * It's always kept to a single line and capped in chars to avoid layout shifts.
   */
  subtitle?: string | null;
};

const badgeStyles: Record<BadgeVariant, { label: string; className: string }> = {
  ELITE: {
    label: "Plano Elite",
    className: "bg-gradient-to-b from-[hsl(var(--plan-pro-from))] to-[hsl(var(--plan-pro-to))]",
  },
  ADVANCE: {
    label: "Plano Advance",
    className: "bg-gradient-to-b from-primary to-secondary",
  },
  FREE: {
    label: "Plano Free",
    className: "bg-gradient-to-b from-[hsl(100_60%_28%)] to-[hsl(100_40%_18%)]",
  },
};

export const GreetingCard = ({
  name,
  avatarUrl,
  onAvatarError,
  badgeVariant,
  subtitle,
}: GreetingCardProps) => {
  const badge = badgeVariant ? badgeStyles[badgeVariant] : null;

  const subtitleMaxChars = 54;
  const safeSubtitle = subtitle?.trim();
  const subtitleShort = safeSubtitle
    ? safeSubtitle.length > subtitleMaxChars
      ? `${safeSubtitle.slice(0, subtitleMaxChars - 1)}…`
      : safeSubtitle
    : null;

  return (
    <div className="relative flex h-32 items-center gap-5 overflow-hidden rounded-[32px] border border-white/5 bg-white/[0.03] p-6 pr-16 backdrop-blur-xl">
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />

      {/* Aba vertical (overlay absoluto) */}
      {badge && (
        <div
          className={
            "absolute bottom-0 right-0 top-0 z-10 w-10 flex items-center justify-center " +
            (badgeVariant === "ELITE" ? "bg-[#FFD700] text-black" : badge.className)
          }
          aria-label={badge.label}
        >
          <span className="rotate-180 text-[10px] font-black tracking-[0.2em] [writing-mode:vertical-lr] uppercase">
            {badgeVariant}
          </span>
        </div>
      )}

      <div className="relative">
        <Avatar className="h-20 w-20 border-2 border-primary/20 p-1 bg-white/5">
          {avatarUrl && (
            <AvatarImage
              src={avatarUrl}
              alt={name ? `Foto de ${name}` : "Foto do usuário"}
              onError={onAvatarError}
              className="rounded-full object-cover"
            />
          )}
          <AvatarFallback className="bg-primary/10 text-primary text-2xl font-black rounded-full">
            {(name?.charAt(0) ?? "?").toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden gap-1 z-0">
        {name ? (
          <span className="truncate text-xl font-black uppercase tracking-tight text-foreground">
            {name}
          </span>
        ) : (
          <Skeleton className="h-8 w-48 bg-white/5 rounded-lg" />
        )}

        {subtitleShort && (
          <span
            className="truncate text-[10px] font-medium text-muted-foreground uppercase tracking-widest"
            title={safeSubtitle ?? undefined}
          >
            {subtitleShort}
          </span>
        )}
      </div>
    </div>
  );
};
