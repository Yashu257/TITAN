import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { SelfieCube } from "@/components/SelfieCube";
import { useSelfies } from "@/hooks/use-selfies";
import { deleteAllSelfies, addSelfie } from "@/lib/selfie-store";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin View · Blocks of Brilliance" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const selfies = useSelfies('selfie', false, true); // one latest selfie per user
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setUploadStatus(null);

    let success = 0;
    let failed = 0;

    for (const file of files) {
      try {
        // Read file as base64 data URL
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        await addSelfie(dataUrl, 'upload');
        success++;
      } catch {
        failed++;
      }
    }

    setUploading(false);
    setUploadStatus(
      failed === 0
        ? `✓ ${success} image${success > 1 ? 's' : ''} uploaded`
        : `${success} uploaded, ${failed} failed`
    );
    // Clear status after 3 seconds
    setTimeout(() => setUploadStatus(null), 3000);
    // Reset input so the same file can be re-uploaded if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div
      className="relative w-screen overflow-hidden flex items-center justify-center"
      style={{ height: '100dvh', backgroundImage: "url('/PHOTOBOOTH_02_background.png')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="absolute top-0 left-0 z-50 p-2 sm:p-4">
        <img src="/titan-logo-63.png" alt="Titan Company" className="h-16 w-auto sm:h-20 md:h-24 lg:h-28" />
      </div>

      <SelfieCube selfies={selfies} interactive={true} className="w-full h-full" />

      {/* Top-right action buttons */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-50 flex flex-col items-end gap-2">
        {/* Hidden file input — accepts multiple JPG/PNG */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          multiple
          className="hidden"
          onChange={handleUpload}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-md bg-blue-600 px-3 sm:px-4 py-2 text-xs sm:text-sm text-white font-medium shadow-md hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading…' : 'Upload Images'}
        </button>

        {uploadStatus && (
          <div className="rounded-md bg-black/70 px-3 py-1.5 text-xs text-white">
            {uploadStatus}
          </div>
        )}

        <button
          onClick={() => {
            if (window.confirm("Are you sure you want to delete all selfies? This action cannot be undone.")) {
              deleteAllSelfies().catch(console.error);
            }
          }}
          className="rounded-md bg-red-600 px-3 sm:px-4 py-2 text-xs sm:text-sm text-white font-medium shadow-md hover:bg-red-700 transition"
        >
          Delete All Images
        </button>
      </div>
    </div>
  );
}
