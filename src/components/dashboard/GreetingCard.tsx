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
    className: "bg-muted",
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
    <div className="relative flex h-24 items-center gap-4 overflow-hidden rounded-2xl border border-border/60 bg-[hsl(var(--carbon))] px-3 py-2 pr-16">
      {/* Aba vertical (overlay absoluto; geometria constante) */}
      {badge && (
        <div
          className={
            "absolute bottom-0 right-0 top-0 z-10 w-9 rounded-r-2xl shadow-sm " +
            badge.className
          }
          aria-label={badge.label}
        >
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-xs font-semibold tracking-wide text-primary-foreground [writing-mode:vertical-lr]">
              {badgeVariant}
            </span>
          </div>
        </div>
      )}

      <Avatar className="h-12 w-12 rounded-xl">
        {avatarUrl && (
          <AvatarImage
            src={avatarUrl}
            alt={name ? `Foto de ${name}` : "Foto do usuário"}
            onError={onAvatarError}
            className="rounded-xl"
          />
        )}
        <AvatarFallback className="rounded-xl text-sm font-semibold">
          {(name?.charAt(0) ?? "?").toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
        {name ? (
          <span className="truncate bg-gradient-to-r from-primary to-accent bg-clip-text text-[clamp(1.05rem,4vw,1.35rem)] font-semibold leading-tight text-transparent">
            {name}
          </span>
        ) : (
          <Skeleton className="h-5 w-40" />
        )}

        {subtitleShort && (
          <span
            className="mt-0.5 truncate text-xs leading-snug text-muted-foreground"
            title={safeSubtitle ?? undefined}
          >
            {subtitleShort}
          </span>
        )}
      </div>
    </div>
  );
};
