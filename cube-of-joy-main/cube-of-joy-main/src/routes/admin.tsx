import { createFileRoute } from "@tanstack/react-router";
import { SelfieCube } from "@/components/SelfieCube";
import { useSelfies } from "@/hooks/use-selfies";
import { deleteAllSelfies } from "@/lib/selfie-store";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin View · Blocks of Brilliance" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const selfies = useSelfies();

  return (
    <div 
      className="relative h-screen w-screen overflow-hidden flex items-center justify-center bg-no-repeat bg-cover bg-center"
      style={{ 
        backgroundImage: "url('/PHOTOBOOTH_02_background.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className="absolute top-0 left-0 z-50 p-2 sm:p-4">
        <img src="/titan-logo-63.png" alt="Titan Company" className="h-16 w-auto sm:h-20 md:h-24 lg:h-28" />
      </div>
      <SelfieCube selfies={selfies} interactive={true} className="w-full h-full" />
      <button 
        onClick={() => {
           if (window.confirm("Are you sure you want to delete all selfies? This action cannot be undone.")) {
             deleteAllSelfies().catch(console.error);
           }
        }}
        className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 rounded-md bg-red-600 px-3 sm:px-4 py-2 text-xs sm:text-sm text-white font-medium shadow-md hover:bg-red-700 transition"
      >
        Delete All Images
      </button>
    </div>
  );
}
