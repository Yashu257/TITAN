import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SelfieCube } from "@/components/SelfieCube";
import { useSelfies } from "@/hooks/use-selfies";
import GIF from "gif.js";

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
  const selfies = useSelfies();
  const [tick, setTick] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  const handleDownload = async () => {
    if (selfies.length === 0) {
      alert('No images in the cube. Please add some selfies first!');
      return;
    }

    const canvas = document.querySelector('canvas');
    if (!canvas) {
      alert('Could not capture the cube. Please try again.');
      return;
    }

    try {
      setIsRecording(true);
      
      // Create GIF encoder with more workers for faster processing
      const gif = new GIF({
        workers: 6,
        quality: 15, // Slightly lower quality for faster processing
        width: canvas.width,
        height: canvas.height,
        workerScript: '/gif.worker.js',
        repeat: 0 // Loop forever
      });

      // Capture 40 frames over ~5 seconds for smooth rotation at natural speed
      const totalFrames = 40;
      const captureInterval = 125; // Capture every 125ms
      const playbackDelay = 125; // Play at same speed = natural rotation
      let currentFrame = 0;

      const captureFrame = () => {
        if (currentFrame >= totalFrames) {
          // Encoding will happen in background, download starts faster
          gif.on('finished', (blob: Blob) => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `blocks-of-brilliance-cube-${new Date().getTime()}.gif`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
            setIsRecording(false);
          });
          
          // Start rendering (this happens fast with 6 workers)
          gif.render();
          return;
        }

        // Add frame
        gif.addFrame(canvas, { copy: true, delay: playbackDelay });
        currentFrame++;

        // Quick capture
        setTimeout(captureFrame, captureInterval);
      };

      captureFrame();

    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to create GIF. Please try again.');
      setIsRecording(false);
    }
  };

  return (
    <div 
      className="relative h-screen w-screen overflow-hidden text-foreground bg-no-repeat bg-cover bg-center"
      style={{ 
        backgroundImage: "url('/PHOTOBOOTH_02_background.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <SelfieCube selfies={selfies} interactive={true} className="absolute inset-0" />

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
          <button
            onClick={handleDownload}
            disabled={isRecording}
            className="pointer-events-auto rounded-2xl border border-black/10 bg-white/80 px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 text-center shadow-sm backdrop-blur hover:bg-white/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-[0.65rem] sm:text-xs uppercase tracking-wider sm:tracking-widest text-foreground/60">
              {isRecording ? 'Creating...' : 'Download'}
            </div>
            <div className="font-display text-sm sm:text-base font-bold text-foreground">
              {isRecording ? 'GIF' : 'Cube GIF'}
            </div>
          </button>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-2 sm:p-4 md:p-8 text-xs sm:text-sm text-foreground/60 flex-col sm:flex-row gap-2 sm:gap-0">
        <div className="text-center sm:text-left">Scan the QR code to add your selfie · drag to rotate · scroll to zoom</div>
        <div className="opacity-60 text-center sm:text-right">tick {tick}</div>
      </div>
    </div>
  );
}