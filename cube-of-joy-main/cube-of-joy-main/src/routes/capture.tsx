import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { addSelfie, getLocalUser, listSelfies } from "@/lib/selfie-store";

const MAX_SELFIES = 6;

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

  useEffect(() => {
    if (!getLocalUser()) navigate({ to: "/login" });
  }, []);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    const user = getLocalUser();
    if (!user) return;
    listSelfies('selfie', user.id).then((list) => {
      if (list.length >= MAX_SELFIES) setLimitReached(true);
    });
  }, []);

  useEffect(() => {
    if (preview) return;
    let cancelled = false;
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera not supported on this device.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            aspectRatio: { ideal: 16 / 9 },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
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
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const canvas = document.createElement("canvas");
    // Capture full video frame (landscape) — matches exactly what the live preview shows
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Mirror horizontally so the saved image is in the correct (non-mirrored) orientation
    ctx.save();
    ctx.translate(vw, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, vw, vh);
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
    
    // Photo zone matches CSS: top 17.5%, height 40% of frame
    const drawZoneTop = height * 0.175;
    const drawZoneHeight = height * 0.40;
    const imgAspect = img.width / img.height;   // landscape (e.g. 1.78 for 16:9)
    const zoneAspect = width / drawZoneHeight;   // zone aspect (e.g. 1.53)
    let drawWidth: number;
    let drawHeight: number;
    let offsetX = 0;
    let offsetY = 0;

    if (imgAspect > zoneAspect) {
      // Image wider than zone → scale to fill zone height, crop sides
      drawHeight = drawZoneHeight;
      drawWidth = drawZoneHeight * imgAspect;
      offsetX = (width - drawWidth) / 2;
    } else {
      // Image taller than zone → scale to fill zone width, crop top/bottom
      drawWidth = width;
      drawHeight = width / imgAspect;
      offsetY = (drawZoneHeight - drawHeight) / 2;
    }

    ctx.save();
    // Clip to photo zone so selfie doesn't bleed outside the frame window
    ctx.rect(0, drawZoneTop, width, drawZoneHeight);
    ctx.clip();
    // Image is already correctly oriented (mirrored during capture) — draw directly
    ctx.drawImage(img, offsetX, drawZoneTop + offsetY, drawWidth, drawHeight);
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
      const user = getLocalUser();
      if (user) {
        const list = await listSelfies('selfie', user.id);
        if (list.length >= MAX_SELFIES) setLimitReached(true);
      }
      navigate({ to: "/thanks", search: { id: selfie.id } });
    } catch (e) {
      console.error(e);
      setError("Could not upload your selfie. Please try again.");
      setSubmitting(false);
    }
  }

  if (limitReached) {
    return (
      <div
        className="h-[100dvh] w-full flex flex-col items-center justify-center px-6 text-center"
        style={{
          backgroundImage: "url('/PHOTOBOOTH_02_background.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="rounded-2xl border border-white/20 bg-black/60 backdrop-blur-md p-8 max-w-sm w-full shadow-xl flex flex-col items-center gap-4">
          <div className="text-5xl">📸</div>
          <h2 className="text-xl font-bold text-white">You're all set!</h2>
          <p className="text-sm text-white/70">
            You've reached the <span className="text-white font-semibold">6-image limit</span> — your cube is fully loaded. No more selfies can be added.
          </p>
          <Link to="/display" className="btn-neon w-full text-sm mt-2 text-center">
            View My Cube →
          </Link>
          <Link to="/" className="text-xs text-white/40 hover:text-white/70 transition">
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-[100dvh] w-full overflow-hidden flex flex-col items-center justify-center bg-no-repeat bg-cover bg-center relative"
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

      {/* Camera panel — same structure as PHP photobooth: video fills panel, frame sits on top */}
      <div className="flex flex-col items-center gap-3 sm:gap-4 w-full px-2 sm:px-4">
        <div
          className="glass-card neon-glow overflow-hidden relative bg-black"
          style={{
            aspectRatio: '643 / 1053',
            maxHeight: 'calc(100dvh - 120px)',
            width: 'min(100%, calc((100dvh - 120px) * 643 / 1053))',
          }}
        >
          {preview ? (
            <>
              {/* Frame base — always visible */}
              <img
                src="/PHOTOBOOTH_01.png"
                alt="Frame"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none z-10"
              />
              {/* Captured selfie — already correctly oriented, no CSS mirror needed */}
              <img
                src={preview}
                alt="Your selfie"
                className="absolute w-full z-0"
                style={{
                  top: "17.5%",
                  height: "40%",
                  objectFit: "cover",
                }}
              />
            </>
          ) : (
            <>
              {/* Frame base */}
              <img
                src="/PHOTOBOOTH_01.png"
                alt="Frame"
                className="absolute inset-0 w-full h-full object-fill pointer-events-none z-10"
              />
              {/* Live camera — object-cover fills zone with no black bars */}
              <video
                ref={videoRef}
                className="absolute w-full z-0"
                style={{
                  top: "17.5%",
                  height: "40%",
                  objectFit: "cover",
                  transform: "scaleX(-1)",
                }}
                playsInline
                muted
              />
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

        <div className="flex w-full max-w-sm gap-2 sm:gap-3 px-2 sm:px-0">
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