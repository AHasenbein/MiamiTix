import type { Metadata } from "next";
import { EventDetail } from "@/components/events/EventDetail";
import { apiRequest } from "@/lib/api/client";
import type { Event } from "@/lib/api/events";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EventDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const { event } = await apiRequest<{ event: Event }>(
      `/api/v1/events/${encodeURIComponent(id)}`,
      { signal: AbortSignal.timeout(3000) }
    );
    const when = new Date(event.startAt).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      // Server renders in UTC; the marketplace is Miami-based, so show Eastern dates.
      timeZone: "America/New_York"
    });
    const description = `${event.city} · ${when} — tickets on Tix.`;
    // Only remote images work in link previews; otherwise fall back to the site logo card
    // (overriding openGraph here would otherwise drop the inherited opengraph-image).
    const images =
      event.imageUrl && /^https?:\/\//i.test(event.imageUrl)
        ? [event.imageUrl]
        : ["/opengraph-image"];
    return {
      title: event.title,
      description,
      openGraph: {
        title: event.title,
        description,
        url: `/events/${id}`,
        images
      },
      twitter: {
        card: "summary_large_image",
        title: event.title,
        description,
        images
      }
    };
  } catch {
    return {
      title: "Event Details",
      description: "View event details and browse available ticket listings."
    };
  }
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;

  return (
    <section className="page-shell flex flex-1 flex-col py-6 sm:py-12">
      <EventDetail eventId={id} />
    </section>
  );
}
