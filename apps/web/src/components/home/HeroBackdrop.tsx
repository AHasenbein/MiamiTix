"use client";

import { ImageBackdrop } from "@/components/ui/ImageBackdrop";
import { useUpcomingEvents } from "@/lib/hooks/useUpcomingEvents";

/** The featured ticket's event image, stretched behind the hero. */
export function HeroBackdrop() {
  const { data } = useUpcomingEvents();
  const imageUrl = data?.events[0]?.imageUrl;
  if (!imageUrl) return null;
  return <ImageBackdrop imageUrl={imageUrl} />;
}
