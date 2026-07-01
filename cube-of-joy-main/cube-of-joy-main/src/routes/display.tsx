import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SelfieDiceWall } from "@/components/SelfieCube";
import { useSelfies } from "@/hooks/use-selfies";
import { cubeExporter } from "@/lib/cube-export";

export const Route = createFileRoute("/display")({
  head: () => ({
    meta: [
      { title: "Live Cube · Blocks of Brilliance" },
      { name: "description", content: "The live 3D cube of selfies." },
    ],
  }),
  component: DisplayPage,
});

function DisplayPage() {
  const selfies = useSelfies('selfie', true); // onlyMine=true — filter by logged-in user_id
  const [tick, setTick] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const handleDownloadGif = async () => {
    if (selfies.length === 0) {
      alert('No images in the cube. Please add some selfies first!');
      return;
    }
    if (!document.querySelector('canvas')) {
      alert('Cube is still loading. Please wait a moment and try again.');
      return;
    }
    try {
      setIsExporting(true);
      await cubeExporter.exportGIF({ width: 600, height: 600, duration: 4, fps: 12, quality: 10 });
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to create GIF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div 
      className="relative w-screen overflow-hidden text-foreground"
      style={{ height: '100dvh', backgroundImage: "url('/PHOTOBOOTH_02_background.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <SelfieDiceWall
        selfies={selfies}
        className="absolute inset-0"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between">
        <div className="p-2 sm:p-4">
          <img src="/titan-logo-63.png" alt="Titan Company" className="h-16 w-auto sm:h-20 md:h-24 lg:h-28" />
        </div>
        <div className="flex flex-col gap-2 sm:gap-3 m-2 sm:m-4">
          <div className="rounded-2xl border border-black/10 bg-white/80 px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 text-right shadow-sm backdrop-blur">
            <div className="text-[0.65rem] sm:text-xs uppercase tracking-wider sm:tracking-widest text-foreground/60">
              Blocks lit
            </div>
            <div className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">{selfies.length}</div>
          </div>
          
          <div className="pointer-events-auto flex flex-col gap-2">
            <button
              onClick={handleDownloadGif}
              disabled={isExporting}
              className="rounded-2xl border border-black/10 bg-white/80 px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 text-center shadow-sm backdrop-blur hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="text-[0.65rem] sm:text-xs uppercase tracking-wider sm:tracking-widest text-foreground/60">
                {isExporting ? 'Creating...' : 'Download'}
              </div>
              <div className="font-display text-sm sm:text-base font-bold text-foreground">
                GIF
              </div>
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}