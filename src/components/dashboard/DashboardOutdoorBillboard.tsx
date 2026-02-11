import { useEffect, useMemo, useState } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useDashboardOutdoor } from "@/hooks/useDashboardOutdoor";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";

const ROTATE_MS = 6000;

export const DashboardOutdoorBillboard = () => {
  const { outdoors, outdoor, loading } = useDashboardOutdoor();
  const [api, setApi] = useState<CarouselApi>();
  const [activeIndex, setActiveIndex] = useState(0);

  const slides = useMemo(() => (outdoors.length ? outdoors : outdoor ? [outdoor] : []), [outdoors, outdoor]);
  const hasMultiple = slides.length > 1;

  useEffect(() => {
    if (!api) return;

    const updateIndex = () => setActiveIndex(api.selectedScrollSnap());
    updateIndex();
    api.on("select", updateIndex);

    return () => {
      api.off("select", updateIndex);
    };
  }, [api]);

  useEffect(() => {
    if (!api || !hasMultiple) return;

    const id = window.setInterval(() => {
      // Se está no final, volta pro início.
      if (api.canScrollNext()) api.scrollNext();
      else api.scrollTo(0);
    }, ROTATE_MS);

    return () => window.clearInterval(id);
  }, [api, hasMultiple]);

  const renderSlide = (imageUrl: string, linkUrl?: string | null) => {
    const content = (
      <AspectRatio ratio={3 / 1}>
        <img
          src={imageUrl}
          alt="Aviso do Nexfit"
          loading="lazy"
          className="h-full w-full rounded-xl object-cover"
        />
      </AspectRatio>
    );

    const isClickable = Boolean(linkUrl);

    return isClickable ? (
      <a
        href={linkUrl ?? "#"}
        target="_blank"
        rel="noreferrer"
        className="block focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
        aria-label="Abrir comunicado"
      >
        {content}
      </a>
    ) : (
      content
    );
  };

  return (
    <section aria-label="Comunicados do Nexfit" className="space-y-2">
      <div className="banner-wrapper space-y-2">
        {loading ? (
          <AspectRatio ratio={3 / 1}>
            <div className="h-full w-full animate-pulse rounded-xl bg-muted/40" />
          </AspectRatio>
        ) : slides.length ? (
          <div className="space-y-2">
            <Carousel setApi={setApi} opts={{ loop: false }}>
              <CarouselContent>
                {slides.map((s) => (
                  <CarouselItem key={s.id}>
                    {renderSlide(s.image_url, s.link_url)}
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>

            {hasMultiple ? (
              <div className="flex items-center justify-center gap-1">
                {slides.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => api?.scrollTo(idx)}
                    className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 data-[active=true]:bg-primary"
                    data-active={idx === activeIndex}
                    aria-label={`Ir para comunicado ${idx + 1}`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <AspectRatio ratio={3 / 1}>
            <div className="flex h-full w-full items-center justify-center rounded-xl border border-border/60 bg-muted/20">
              <p className="px-4 text-center text-[11px] text-muted-foreground">Sem comunicados no momento.</p>
            </div>
          </AspectRatio>
        )}
      </div>
    </section>
  );
};
