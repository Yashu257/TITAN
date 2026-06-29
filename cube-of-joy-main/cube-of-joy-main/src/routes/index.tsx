import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Powerhouse · Blocks of Brilliance" },
      { name: "description", content: "Digital Division - Blocks of Brilliance" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div 
      className="flex h-screen flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-black text-white bg-no-repeat bg-cover bg-center overflow-hidden"
      style={{ 
        backgroundImage: "url('/PHOTOBOOTH_02.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <div className="text-center space-y-1 max-w-6xl w-full px-2 flex flex-col items-center justify-center h-full">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center mb-2 sm:mb-3">
          <img src="/titan-logo.png" alt="Titan Company Logo" className="h-20 w-auto sm:h-24 md:h-32 lg:h-36 mb-2" />
        </div>

        {/* POWERHOUSE Title - BLACK, BOLD, CONDENSED, TIGHT SPACING, RESPONSIVE */}
        <h1 
          className="font-black uppercase leading-none w-full text-center"
          style={{ 
            fontFamily: "'Stinger Wide Bold', 'Arial Black', sans-serif",
            fontWeight: 700,
            color: '#000000',
            letterSpacing: '-0.02em',
            fontSize: 'clamp(1.75rem, 7vw, 7rem)',
            textShadow: '0 0 1px rgba(0,0,0,0.1)',
            fontStretch: 'condensed',
            whiteSpace: 'nowrap',
            overflowWrap: 'normal',
            marginBottom: '0.15rem'
          }}
        >
          POWERHOUSE
        </h1>

        {/* ESTD and Year - VISIBLE DARK GRAY */}
        <div 
          className="flex justify-between items-center max-w-5xl mx-auto text-xs sm:text-sm tracking-[0.3em] sm:tracking-[0.4em] uppercase font-medium px-2"
          style={{ 
            color: '#333333',
            opacity: 1,
            fontFamily: 'Arial, sans-serif',
            marginTop: '0.15rem',
            marginBottom: '0.5rem'
          }}
        >
          <span>ESTD</span>
          <span>2026</span>
        </div>

        {/* DIGITAL DIVISION - DARK NAVY BOLD */}
        <h2 
          className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-[0.2em] uppercase"
          style={{ 
            fontFamily: "'Uni Neue Black', 'Arial Black', sans-serif",
            fontWeight: 900,
            color: '#1a1a2e',
            letterSpacing: '0.01em',
            marginTop: '0.3rem',
            marginBottom: '0.3rem'
          }}
        >
          DIGITAL DIVISION
        </h2>

        {/* BLOCKS OF BRILLIANCE - BOLD UPRIGHT SERIF FONT */}
        <div className="space-y-0" style={{ marginTop: '0.3rem' }}>
          <h3 
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-wide uppercase"
            style={{ 
              fontFamily: "'Bugaki', Georgia, serif",
              fontWeight: 700,
              color: '#1e3a8a',
              fontStyle: 'normal',
              letterSpacing: '0.01em',
              lineHeight: '0.9',
              marginBottom: '0rem'
            }}
          >
            BLOCKS OF
          </h3>
          <h3 
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-wide uppercase"
            style={{ 
              fontFamily: "'Bugaki', Georgia, serif",
              fontWeight: 700,
              fontStyle: 'normal',
              letterSpacing: '0.02em',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 25%, #a855f7 50%, #d946ef 75%, #ec4899 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: '0.9',
              marginTop: '0rem'
            }}
          >
            BRILLIANCE
          </h3>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-6 sm:mt-8 px-4">
          <Link to="/capture" className="btn-neon inline-block text-sm sm:text-base px-6 sm:px-8 py-2.5 sm:py-3">
            Take your selfie
          </Link>
          <Link to="/display" className="rounded-full border border-border bg-card/40 px-6 sm:px-8 py-2.5 sm:py-3 text-sm sm:text-base font-medium backdrop-blur transition hover:bg-card/70 inline-block">
            Show Cube
          </Link>
        </div>
      </div>
    </div>
  );
}
