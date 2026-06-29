import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { getSelfie, type Selfie } from "@/lib/selfie-store";

const searchSchema = z.object({ id: z.string().optional() });

export const Route = createFileRoute("/thanks")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Thank you · Blocks of Brilliance" },
      { name: "description", content: "Your selfie is now part of the cube." },
    ],
  }),
  component: ThanksPage,
});

function ThanksPage() {
  const { id } = Route.useSearch();
  const [selfie, setSelfie] = useState<Selfie | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getSelfie(id).then((s) => {
      if (!cancelled) setSelfie(s ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div 
      className="min-h-screen px-2 sm:px-4 py-8 sm:py-12 bg-no-repeat bg-cover bg-center"
      style={{ 
        backgroundImage: "url('/PHOTOBOOTH_02_background.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-2 sm:px-3 py-1 text-[0.65rem] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] text-neon-cyan backdrop-blur">
          You&apos;re in the cube
        </div>
        <h1 className="mt-4 sm:mt-5 text-2xl sm:text-3xl md:text-4xl font-bold leading-tight px-2">
          Thank you for <span className="neon-text">shining bright</span>
        </h1>
        <p className="mt-2 sm:mt-3 max-w-xs text-xs sm:text-sm text-white px-2">
          Your selfie just lit up a brand new block. Look up at the big screen —
          you&apos;re officially part of Blocks of Brilliance.
        </p>

        <div className="glass-card neon-glow mt-6 sm:mt-8 overflow-hidden p-2 sm:p-3">
          {selfie ? (
            <img
              src={selfie.dataUrl}
              alt="Your contribution"
              className="h-48 w-48 sm:h-56 sm:w-56 md:h-64 md:w-64 rounded-xl object-cover"
            />
          ) : (
            <div className="h-48 w-48 sm:h-56 sm:w-56 md:h-64 md:w-64 animate-pulse rounded-xl bg-muted" />
          )}
        </div>

        <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-2 sm:gap-3 px-2">
          <Link to="/display" className="btn-neon text-sm sm:text-base px-6 sm:px-8 py-2.5 sm:py-3">View the cube</Link>
          <Link
            to="/"
            className="rounded-full border border-border bg-card/40 px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base font-medium backdrop-blur transition hover:bg-card/70"
          >
            Back home
          </Link>
        </div>
      </div>
    </div>
  );
}