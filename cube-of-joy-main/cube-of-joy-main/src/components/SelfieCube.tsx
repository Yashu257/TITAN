import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Selfie } from "@/lib/selfie-store";

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
    
    loader.load(
      url,
      (t) => {
        if (cancelled) return;
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 8;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.generateMipmaps = true;
        t.needsUpdate = true;
        setTex(t);
      },
      undefined,
      (error) => {
        console.error('Texture loading error:', error);
      }
    );
    
    return () => {
      cancelled = true;
      if (tex) {
        tex.dispose();
      }
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
  const texture0 = useImageTexture(selfies[0]);
  const texture1 = useImageTexture(selfies[1]);
  const texture2 = useImageTexture(selfies[2]);
  const texture3 = useImageTexture(selfies[3]);
  const texture4 = useImageTexture(selfies[4]);
  const texture5 = useImageTexture(selfies[5]);
  
  const materials = useMemo(() => {
    const solidMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    
    return [
      texture0 ? new THREE.MeshBasicMaterial({ map: texture0, toneMapped: false }) : solidMaterial.clone(),
      texture1 ? new THREE.MeshBasicMaterial({ map: texture1, toneMapped: false }) : solidMaterial.clone(),
      texture2 ? new THREE.MeshBasicMaterial({ map: texture2, toneMapped: false }) : solidMaterial.clone(),
      texture3 ? new THREE.MeshBasicMaterial({ map: texture3, toneMapped: false }) : solidMaterial.clone(),
      texture4 ? new THREE.MeshBasicMaterial({ map: texture4, toneMapped: false }) : solidMaterial.clone(),
      texture5 ? new THREE.MeshBasicMaterial({ map: texture5, toneMapped: false }) : solidMaterial.clone(),
    ];
  }, [texture0, texture1, texture2, texture3, texture4, texture5, placeholder]);
  
  useEffect(() => {
    return () => {
      materials.forEach(mat => mat.dispose());
    };
  }, [materials]);
  
  const edgesGeo = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(size, size, size)), [size]);
  const edgesMat = useMemo(() => new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.35, transparent: true }), []);

  useEffect(() => {
    return () => {
      edgesGeo.dispose();
      edgesMat.dispose();
    };
  }, [edgesGeo, edgesMat]);

  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[size, size, size]} />
        {materials.map((mat, index) => (
          <primitive key={index} object={mat} attach={`material-${index}`} />
        ))}
      </mesh>
      <lineSegments geometry={edgesGeo} material={edgesMat} />
    </group>
  );
}

function CubeGroup({ selfies, interactive }: { selfies: Selfie[]; interactive: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const placeholder = useMemo(() => makePlaceholderTexture(), []);

  const n = useMemo(() => {
    const cubesNeeded = Math.ceil(selfies.length / 3);
    const target = Math.max(8, cubesNeeded);
    return Math.max(3, Math.ceil(Math.cbrt(target)));
  }, [selfies.length]);

  const tileSize = 0.9;
  const gap = 0.08;
  const step = tileSize + gap;
  const offset = ((n - 1) * step) / 2;

  useFrame((state, dt) => {
    if (!groupRef.current) return;
    // Smooth continuous rotation - clamp delta time to prevent jumps
    const clampedDt = Math.min(dt, 0.1);
    groupRef.current.rotation.y += clampedDt * 0.3;
    groupRef.current.rotation.x += clampedDt * 0.18;
  });

  const tiles = useMemo(() => {
    const result: React.ReactNode[] = [];
    let cubeIndex = 0;
    
    for (let x = 0; x < n; x++) {
      for (let y = 0; y < n; y++) {
        for (let z = 0; z < n; z++) {
          const onShell = x === 0 || x === n - 1 || y === 0 || y === n - 1 || z === 0 || z === n - 1;
          if (!onShell) continue;
          
          const cubeStartIndex = cubeIndex * 3;
          const faceImages: (string | undefined)[] = [undefined, undefined, undefined, undefined, undefined, undefined];
          let imageIndex = 0;
          
          if (x === n - 1 && imageIndex < 3 && selfies[cubeStartIndex + imageIndex]) {
            faceImages[0] = selfies[cubeStartIndex + imageIndex].dataUrl;
            imageIndex++;
          }
          if (x === 0 && imageIndex < 3 && selfies[cubeStartIndex + imageIndex]) {
            faceImages[1] = selfies[cubeStartIndex + imageIndex].dataUrl;
            imageIndex++;
          }
          if (y === n - 1 && imageIndex < 3 && selfies[cubeStartIndex + imageIndex]) {
            faceImages[2] = selfies[cubeStartIndex + imageIndex].dataUrl;
            imageIndex++;
          }
          if (y === 0 && imageIndex < 3 && selfies[cubeStartIndex + imageIndex]) {
            faceImages[3] = selfies[cubeStartIndex + imageIndex].dataUrl;
            imageIndex++;
          }
          if (z === n - 1 && imageIndex < 3 && selfies[cubeStartIndex + imageIndex]) {
            faceImages[4] = selfies[cubeStartIndex + imageIndex].dataUrl;
            imageIndex++;
          }
          if (z === 0 && imageIndex < 3 && selfies[cubeStartIndex + imageIndex]) {
            faceImages[5] = selfies[cubeStartIndex + imageIndex].dataUrl;
            imageIndex++;
          }
          
          result.push(
            <SelfieTile
              key={`${x}-${y}-${z}`}
              position={[x * step - offset, y * step - offset, z * step - offset]}
              size={tileSize}
              selfies={faceImages}
              placeholder={placeholder}
            />
          );
          cubeIndex++;
        }
      }
    }
    return result;
  }, [n, selfies, placeholder, step, offset]);
  
  useEffect(() => {
    return () => {
      placeholder.dispose();
    };
  }, [placeholder]);

  return <group ref={groupRef}>{tiles}</group>;
}

function ResponsiveCamera({ selfies }: { selfies: Selfie[] }) {
  const { camera, size } = useThree();

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const cubesNeeded = Math.ceil(selfies.length / 3);
    const target = Math.max(8, cubesNeeded);
    const n = Math.max(3, Math.ceil(Math.cbrt(target)));
    const tileSize = 0.9;
    const gap = 0.08;
    const step = tileSize + gap;
    const cubeSize = n * step;

    // On portrait/mobile the viewport is narrower — use a wider FOV so
    // the cube is never clipped. Desktop keeps a tighter 45°.
    const isPortrait = size.height > size.width;
    cam.fov = isPortrait ? 60 : 45;
    cam.updateProjectionMatrix();

    const scale = isPortrait ? 2.2 : 1.3;
    const dist = cubeSize * scale;
    cam.position.set(dist, dist * 0.6, dist);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height, selfies.length]);

  return null;
}

export function SelfieCube({
  selfies,
  interactive = true,
  className,
  onRender,
}: {
  selfies: Selfie[];
  interactive?: boolean;
  className?: string;
  onRender?: (gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => setMounted(true), []);
  
  const cubeParams = useMemo(() => {
    const cubesNeeded = Math.ceil(selfies.length / 3);
    const target = Math.max(8, cubesNeeded);
    const n = Math.max(3, Math.ceil(Math.cbrt(target)));
    const tileSize = 0.9;
    const gap = 0.08;
    const step = tileSize + gap;
    const cubeSize = n * step;
    return { n, cubeSize };
  }, [selfies.length]);
  
  const maxDistance = useMemo(() => {
    return cubeParams.cubeSize * 3;
  }, [cubeParams]);
  
  const minDistance = useMemo(() => {
    return cubeParams.cubeSize * 1;
  }, [cubeParams]);
  
  if (!mounted) {
    return <div className={className} ref={containerRef} />;
  }
  
  return (
    <div className={className} ref={containerRef}>
      <Canvas
        camera={{ 
          fov: 45, 
          position: [5, 3, 5],
          near: 0.1,
          far: 1000
        }}
        dpr={typeof window !== 'undefined' ? [1, Math.min(window.devicePixelRatio, 2)] : 1}
        gl={{ 
          antialias: true, 
          alpha: true, 
          preserveDrawingBuffer: true,
          powerPreference: "high-performance"
        }}
        style={{ 
          background: 'transparent', 
          width: '100%', 
          height: '100%',
          touchAction: 'none'
        }}
        onCreated={({ gl, scene, camera }) => {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
          gl.setClearColor(0x000000, 0);
          if (onRender) {
            onRender(gl, scene, camera);
          }
        }}
      >
        <ResponsiveCamera selfies={selfies} />
        <ambientLight intensity={1} />
        <CubeGroup selfies={selfies} interactive={interactive} />
        {interactive && (
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            enableRotate={true}
            autoRotate={false}
            minDistance={minDistance}
            maxDistance={maxDistance}
            zoomSpeed={0.8}
            rotateSpeed={0.9}
            enableDamping={false}
            minPolarAngle={0}
            maxPolarAngle={Math.PI}
            minAzimuthAngle={-Infinity}
            maxAzimuthAngle={Infinity}
            touches={{ ONE: THREE.TOUCH.ROTATE }}
          />
        )}
      </Canvas>
    </div>
  );
}

// ─── Single Dice Display (all selfies on one dice) ────────────────────────

/**
 * Distribute 6 faces among selfies:
 *   1 selfie  → 6 faces
 *   2 selfies → 3 faces each
 *   3 selfies → 2 faces each
 *   4 selfies → 2,2,1,1
 *   5 selfies → 2,1,1,1,1
 *   6+ selfies → 1 face each (most recent 6 shown)
 */
function buildFaceList(selfies: Selfie[]): string[] {
  const pool = selfies.slice(-6); // use at most the 6 most recent
  const n = pool.length;
  if (n === 0) return Array(6).fill("");

  const base = Math.floor(6 / n);
  const extra = 6 % n;
  const faces: string[] = [];

  for (let i = 0; i < n; i++) {
    const count = base + (i < extra ? 1 : 0);
    for (let j = 0; j < count; j++) {
      faces.push(pool[i].dataUrl);
    }
  }
  return faces; // always length 6
}

function useSixTextures(faces: string[]) {
  const t0 = useImageTexture(faces[0]);
  const t1 = useImageTexture(faces[1]);
  const t2 = useImageTexture(faces[2]);
  const t3 = useImageTexture(faces[3]);
  const t4 = useImageTexture(faces[4]);
  const t5 = useImageTexture(faces[5]);
  return [t0, t1, t2, t3, t4, t5];
}

function SingleDiceMesh({ selfies }: { selfies: Selfie[] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const faces = useMemo(() => buildFaceList(selfies), [selfies]);

  const textures = useSixTextures(faces);

  const materials = useMemo(() => {
    const placeholder = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    return textures.map((t) =>
      t
        ? new THREE.MeshBasicMaterial({ map: t, toneMapped: false })
        : placeholder.clone()
    );
  }, [textures]);

  useEffect(() => {
    return () => { materials.forEach((m) => m.dispose()); };
  }, [materials]);

  useFrame((_state, dt) => {
    if (!meshRef.current) return;
    const d = Math.min(dt, 0.1);
    meshRef.current.rotation.y += d * 0.35;
    meshRef.current.rotation.x += d * 0.2;
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[2.5, 2.5, 2.5]} />
      {materials.map((mat, i) => (
        <primitive key={i} object={mat} attach={`material-${i}`} />
      ))}
    </mesh>
  );
}

// Adjusts camera distance so the dice fits on both portrait mobile and landscape desktop
function ResponsiveDiceCamera() {
  const { camera, size } = useThree();

  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const isPortrait = size.height > size.width;
    // Wider FOV + more distance on portrait so the dice isn't clipped
    cam.fov = isPortrait ? 70 : 45;
    const dist = isPortrait ? 7.5 : 5.5;
    cam.position.set(0, 0, dist);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
  }, [camera, size.width, size.height]);

  return null;
}

export function SelfieDiceWall({
  selfies,
  className,
}: {
  selfies: Selfie[];
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className={className} />;

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ fov: 45, position: [0, 0, 6], near: 0.1, far: 1000 }}
        dpr={typeof window !== 'undefined' ? [1, Math.min(window.devicePixelRatio, 2)] : 1}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        style={{ background: "transparent", width: "100%", height: "100%", touchAction: 'none' }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      >
        <ResponsiveDiceCamera />
        <ambientLight intensity={1} />
        <SingleDiceMesh selfies={selfies} />
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          zoomSpeed={0.8}
          rotateSpeed={0.9}
          touches={{ ONE: THREE.TOUCH.ROTATE }}
        />
      </Canvas>
    </div>
  );
}
