import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Selfie } from "@/lib/selfie-store";

// Build a fallback placeholder texture so empty tiles still look good.
function makePlaceholderTexture(): THREE.Texture {
  if (typeof document === "undefined") return new THREE.Texture();
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, 124, 124);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function useImageTexture(url?: string): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    if (!url) {
      setTex(null);
      return;
    }
    const loader = new THREE.TextureLoader();
    let cancelled = false;
    loader.load(url, (t) => {
      if (cancelled) return;
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.generateMipmaps = true;
      t.needsUpdate = true;
      setTex(t);
    });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return tex;
}

function SelfieTile({
  position,
  size,
  selfies,
  placeholder,
}: {
  position: [number, number, number];
  size: number;
  selfies: (string | undefined)[];
  placeholder: THREE.Texture;
}) {
  // Load textures for each face (if provided)
  const texture0 = useImageTexture(selfies[0]);
  const texture1 = useImageTexture(selfies[1]);
  const texture2 = useImageTexture(selfies[2]);
  const texture3 = useImageTexture(selfies[3]);
  const texture4 = useImageTexture(selfies[4]);
  const texture5 = useImageTexture(selfies[5]);
  
  // Create materials array: [right, left, top, bottom, front, back]
  const materials = useMemo(() => {
    const solidMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    
    return [
      texture0 ? new THREE.MeshBasicMaterial({ map: texture0, toneMapped: false }) : solidMaterial, // right
      texture1 ? new THREE.MeshBasicMaterial({ map: texture1, toneMapped: false }) : solidMaterial, // left
      texture2 ? new THREE.MeshBasicMaterial({ map: texture2, toneMapped: false }) : solidMaterial, // top
      texture3 ? new THREE.MeshBasicMaterial({ map: texture3, toneMapped: false }) : solidMaterial, // bottom
      texture4 ? new THREE.MeshBasicMaterial({ map: texture4, toneMapped: false }) : solidMaterial, // front
      texture5 ? new THREE.MeshBasicMaterial({ map: texture5, toneMapped: false }) : solidMaterial, // back
    ];
  }, [texture0, texture1, texture2, texture3, texture4, texture5]);
  
  return (
    <mesh position={position}>
      <boxGeometry args={[size, size, size]} />
      {materials.map((mat, index) => (
        <primitive key={index} object={mat} attach={`material-${index}`} />
      ))}
    </mesh>
  );
}

function CubeGroup({ selfies }: { selfies: Selfie[] }) {
  const groupRef = useRef<THREE.Group>(null);
  const placeholder = useMemo(() => makePlaceholderTexture(), []);

  // Calculate cube dimension based on number of photos
  // Cube can grow but will appear same size due to camera adjustment
  const n = useMemo(() => {
    const cubesNeeded = Math.ceil(selfies.length / 3);
    const target = Math.max(8, cubesNeeded);
    return Math.max(3, Math.ceil(Math.cbrt(target)));
  }, [selfies.length]);

  const tileSize = 0.9;
  const gap = 0.08;
  const step = tileSize + gap;
  const offset = ((n - 1) * step) / 2;

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    // Full 360-degree rotation on both Y (horizontal) and X (vertical) axes
    // This ensures all 6 sides are visible over time
    groupRef.current.rotation.y += dt * 0.25; // Horizontal rotation
    groupRef.current.rotation.x += dt * 0.15; // Vertical rotation (slower for smoother viewing)
  });

  const tiles: React.ReactNode[] = [];
  let cubeIndex = 0;
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) {
      for (let z = 0; z < n; z++) {
        const onShell = x === 0 || x === n - 1 || y === 0 || y === n - 1 || z === 0 || z === n - 1;
        if (!onShell) continue;
        
        // Get 3 selfies for this cube (one for each of 3 faces)
        const cubeStartIndex = cubeIndex * 3;
        
        // Determine which faces are on the OUTSIDE of the cube structure
        // and assign images to those outward-facing faces
        const faceImages = [undefined, undefined, undefined, undefined, undefined, undefined];
        let imageIndex = 0;
        
        // Right face (x = n-1) - outward facing
        if (x === n - 1 && imageIndex < 3 && selfies[cubeStartIndex + imageIndex]) {
          faceImages[0] = selfies[cubeStartIndex + imageIndex].dataUrl;
          imageIndex++;
        }
        // Left face (x = 0) - outward facing  
        if (x === 0 && imageIndex < 3 && selfies[cubeStartIndex + imageIndex]) {
          faceImages[1] = selfies[cubeStartIndex + imageIndex].dataUrl;
          imageIndex++;
        }
        // Top face (y = n-1) - outward facing
        if (y === n - 1 && imageIndex < 3 && selfies[cubeStartIndex + imageIndex]) {
          faceImages[2] = selfies[cubeStartIndex + imageIndex].dataUrl;
          imageIndex++;
        }
        // Bottom face (y = 0) - outward facing
        if (y === 0 && imageIndex < 3 && selfies[cubeStartIndex + imageIndex]) {
          faceImages[3] = selfies[cubeStartIndex + imageIndex].dataUrl;
          imageIndex++;
        }
        // Front face (z = n-1) - outward facing
        if (z === n - 1 && imageIndex < 3 && selfies[cubeStartIndex + imageIndex]) {
          faceImages[4] = selfies[cubeStartIndex + imageIndex].dataUrl;
          imageIndex++;
        }
        // Back face (z = 0) - outward facing
        if (z === 0 && imageIndex < 3 && selfies[cubeStartIndex + imageIndex]) {
          faceImages[5] = selfies[cubeStartIndex + imageIndex].dataUrl;
          imageIndex++;
        }
        
        tiles.push(
          <SelfieTile
            key={`${x}-${y}-${z}`}
            position={[x * step - offset, y * step - offset, z * step - offset]}
            size={tileSize}
            selfies={faceImages}
            placeholder={placeholder}
          />,
        );
        cubeIndex++;
      }
    }
  }

  return <group ref={groupRef}>{tiles}</group>;
}

export function SelfieCube({
  selfies,
  interactive = true,
  className,
}: {
  selfies: Selfie[];
  interactive?: boolean;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  
  // Calculate cube dimension to determine camera distance
  const cubesNeeded = Math.ceil(selfies.length / 3);
  const target = Math.max(8, cubesNeeded);
  const n = Math.max(3, Math.ceil(Math.cbrt(target)));
  
  // Adjust camera distance based on cube size to keep apparent size constant
  // Base distance for 3x3x3 cube
  const baseDistance = 6;
  const baseSize = 3;
  
  // Scale distance proportionally with cube size
  const distance = baseDistance * (n / baseSize);
  
  if (!mounted) {
    return <div className={className} />;
  }
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [distance, distance * 0.6, distance], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={1} />
        <CubeGroup selfies={selfies} />
        {interactive && (
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            enableRotate={true}
            minDistance={distance * 0.5}
            maxDistance={distance}
            zoomSpeed={0.8}
            rotateSpeed={0.9}
          />
        )}
      </Canvas>
    </div>
  );
}