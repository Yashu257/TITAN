import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { addSelfie } from "@/lib/selfie-store";

export const Route = createFileRoute("/capture")({
  head: () => ({
    meta: [
      { title: "Take your selfie · Blocks of Brilliance" },
      { name: "description", content: "Snap a selfie and join the live 3D cube." },
    ],
  }),
  component: CapturePage,
});

const CAPTURE_SIZE = 1280;

function CapturePage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (preview) return;
    let cancelled = false;
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera not supported on this device.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
          setReady(true);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Could not access camera.";
        setError(msg);
      }
    }
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [preview]);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = CAPTURE_SIZE;
    canvas.height = CAPTURE_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const side = Math.min(vw, vh);
    const sx = (vw - side) / 2;
    const sy = (vh - side) / 2;
    ctx.save();
    ctx.translate(CAPTURE_SIZE, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, side, side, 0, 0, CAPTURE_SIZE, CAPTURE_SIZE);
    ctx.restore();
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    setPreview(dataUrl);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setReady(false);
  }

  function retake() {
    setPreview(null);
  }

  async function saveCopy() {
    if (!preview) return;
    
    // Load frame first to get dimensions
    const frameImg = new Image();
    frameImg.src = "/PHOTOBOOTH_01.png";
    frameImg.crossOrigin = "anonymous";
    await new Promise((resolve, reject) => {
      frameImg.onload = resolve;
      frameImg.onerror = reject;
    }).catch(() => console.error("Failed to load frame for saving"));

    const width = frameImg.naturalWidth || CAPTURE_SIZE;
    const height = frameImg.naturalHeight || CAPTURE_SIZE;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fill background with white just in case
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    
    // Draw selfie
    const img = new Image();
    img.src = preview;
    await new Promise((resolve) => (img.onload = resolve));
    
    // Draw selfie using object-cover logic but ONLY for the top 65% of the canvas
    const drawZoneHeight = height * 0.65;
    const imgAspect = img.width / img.height;
    const zoneAspect = width / drawZoneHeight;
    let drawWidth = width;
    let drawHeight = drawZoneHeight;
    let offsetX = 0;
    let offsetY = 0;

    if (imgAspect > zoneAspect) {
      drawWidth = drawZoneHeight * imgAspect;
      offsetX = (width - drawWidth) / 2;
    } else {
      drawHeight = width / imgAspect;
      offsetY = (drawZoneHeight - drawHeight) / 2;
    }

    ctx.save();
    // Translate context to center the image horizontally but flip horizontally (mirror)
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img, -offsetX, offsetY, drawWidth, drawHeight);
    ctx.restore();

    // Draw frame on top
    ctx.drawImage(frameImg, 0, 0, width, height);

    // Download
    const link = document.createElement("a");
    link.download = "photobooth_selfie.jpeg";
    link.href = canvas.toDataURL("image/jpeg", 0.95);
    link.click();
  }

  async function submit() {
    if (!preview) return;
    setSubmitting(true);
    try {
      const selfie = await addSelfie(preview);
      navigate({ to: "/thanks", search: { id: selfie.id } });
    } catch (e) {
      console.error(e);
      setError("Could not upload your selfie. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div 
      className="h-[100dvh] w-full overflow-hidden flex flex-col bg-no-repeat bg-cover bg-center relative"
      style={{ 
        backgroundImage: "url('/PHOTOBOOTH_02_background.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="absolute top-0 left-2 sm:left-4 md:left-6 z-20">
        <img src="/titan-logo-63.png" alt="Titan Company" className="h-16 w-auto sm:h-20 md:h-24 lg:h-28" />
      </div>
      
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 md:top-8 md:right-8 z-20">
        <Link to="/" className="text-[0.6rem] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.25em] text-muted-foreground hover:text-foreground">
          ← Blocks of Brilliance
        </Link>
      </div>
      
      <div className="mx-auto flex w-full flex-col items-center h-full px-2 sm:px-4 py-2 sm:py-4 md:py-8">
        <div className="glass-card neon-glow w-full max-w-md flex-1 min-h-0 overflow-hidden flex items-center justify-center">
          <div className="relative w-full h-full bg-black flex items-center justify-center">
            {preview ? (
              <>
                <img src={preview} alt="Your selfie" className="absolute h-[65%] w-full object-cover z-0" style={{ top: "17.5%", left: "0", transform: "scaleX(-1)" }} />
                <img src="/PHOTOBOOTH_01.png" alt="Frame" className="relative w-full h-full object-fill z-10 pointer-events-none" />
              </>
            ) : (
              <>
                <video
                  ref={videoRef}
                  className="absolute h-[65%] w-full object-cover z-0"
                  style={{ top: "17.5%", left: "0", transform: "scaleX(-1)" }}
                  playsInline
                  muted
                />
                <img src="/PHOTOBOOTH_01.png" alt="Frame" className="relative w-full h-full object-fill z-10 pointer-events-none" />
                {!ready && !error && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 text-sm text-muted-foreground">
                    Starting camera…
                  </div>
                )}
                {error && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/80 p-6 text-center">
                    <div className="text-sm font-medium text-destructive">{error}</div>
                    <div className="text-xs text-muted-foreground">
                      Allow camera access in your browser settings and reload.
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mt-3 sm:mt-4 md:mt-6 flex w-full max-w-sm gap-2 sm:gap-3 shrink-0 px-2 sm:px-0">
          {preview ? (
            <>
              <button
                onClick={retake}
                className="flex-1 rounded-full border border-border bg-card/40 px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm font-medium backdrop-blur transition hover:bg-card/70"
              >
                Retake
              </button>
              <button
                onClick={saveCopy}
                className="flex-1 rounded-full border border-border bg-card/40 px-2 sm:px-3 py-2 sm:py-3 text-xs sm:text-sm font-medium backdrop-blur transition hover:bg-card/70"
              >
                Save Copy
              </button>
              <button onClick={submit} disabled={submitting} className="btn-neon flex-1 text-xs sm:text-sm">
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </>
          ) : (
            <button onClick={capture} disabled={!ready} className="btn-neon w-full text-sm sm:text-base">
              Take selfie
            </button>
          )}
        </div>
      </div>
    </div>
  );
}