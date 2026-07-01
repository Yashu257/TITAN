import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import GIF from "gif.js";

export interface ExportOptions {
  transparent?: boolean;
  quality?: number;
  width?: number;
  height?: number;
  duration?: number;
  fps?: number;
}

export class CubeExporter {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.Camera | null = null;

  setRenderer(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
  }

  async exportInteractiveHTML(faceDataUrls: string[]): Promise<void> {
    // Embed up to 6 face images as data URLs so the file is fully self-contained
    const faces = Array(6).fill('').map((_, i) => faceDataUrls[i] || '');
    const facesJson = JSON.stringify(faces);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Blocks of Brilliance – Interactive Dice</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0a0a1a; overflow: hidden; width: 100vw; height: 100vh; }
  canvas { display: block; width: 100% !important; height: 100% !important; }
  #hint { position: fixed; bottom: 16px; left: 50%; transform: translateX(-50%);
    color: rgba(255,255,255,0.45); font: 12px/1 sans-serif; pointer-events: none; }
</style>
</head>
<body>
<div id="hint">drag to rotate · scroll to zoom · pinch to zoom</div>
<script type="importmap">
{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js",
"three/addons/":"https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/"}}
</script>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const FACES = ${facesJson};

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x0a0a1a, 1);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 0, 6);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.5;

scene.add(new THREE.AmbientLight(0xffffff, 1.2));

const loader = new THREE.TextureLoader();
const grey = new THREE.MeshBasicMaterial({ color: 0x444466 });

const materials = FACES.map(url => {
  if (!url) return grey.clone();
  const tex = loader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
});

const mesh = new THREE.Mesh(new THREE.BoxGeometry(2.5, 2.5, 2.5), materials);
scene.add(mesh);

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// Stop auto-rotate when user interacts
controls.addEventListener('start', () => { controls.autoRotate = false; });

(function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
})();
</script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `blocks-of-brilliance-dice-${Date.now()}.html`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }
  
  async exportPNG(options: ExportOptions = {}): Promise<void> {
    if (!this.renderer || !this.scene || !this.camera) {
      throw new Error('Renderer not initialized');
    }
    
    const width = options.width || 1920;
    const height = options.height || 1080;
    
    const offscreenRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: options.transparent || false,
      preserveDrawingBuffer: true,
    });
    
    offscreenRenderer.setSize(width, height);
    offscreenRenderer.setPixelRatio(1);
    
    const offscreenCamera = this.camera.clone();
    offscreenCamera.aspect = width / height;
    offscreenCamera.updateProjectionMatrix();
    
    offscreenRenderer.render(this.scene, offscreenCamera);
    
    const canvas = offscreenRenderer.domElement;
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Failed to create PNG');
      }
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `blocks-of-brilliance-${Date.now()}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      
      offscreenRenderer.dispose();
    }, 'image/png', options.quality || 0.95);
  }
  
  async exportGIF(options: ExportOptions = {}): Promise<void> {
    // Capture frames directly from the live spinning canvas on screen.
    // This works because SelfieDiceWall sets preserveDrawingBuffer: true.
    const liveCanvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (!liveCanvas) throw new Error('Canvas not found');

    const size   = options.width  || 600;
    const duration = options.duration || 4;
    const fps      = options.fps      || 12;
    const totalFrames = Math.round(duration * fps);
    const delay       = Math.round(1000 / fps);

    const gif = new GIF({
      workers: 2,
      quality: options.quality || 10,
      width:  size,
      height: size,
      workerScript: '/gif.worker.js',
    });

    // Off-screen canvas used to crop/resize each frame to a square
    const tmp = document.createElement('canvas');
    tmp.width  = size;
    tmp.height = size;
    const ctx = tmp.getContext('2d')!;

    for (let i = 0; i < totalFrames; i++) {
      // Wait one frame interval so the dice has rotated a little
      await new Promise<void>((r) => setTimeout(r, delay));

      // Centre-crop the live canvas to a square
      const src = liveCanvas;
      const srcSize = Math.min(src.width, src.height);
      const sx = (src.width  - srcSize) / 2;
      const sy = (src.height - srcSize) / 2;
      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(src, sx, sy, srcSize, srcSize, 0, 0, size, size);

      gif.addFrame(tmp, { copy: true, delay });
    }

    return new Promise<void>((resolve, reject) => {
      gif.on('finished', (blob: Blob) => {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `blocks-of-brilliance-${Date.now()}.gif`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        resolve();
      });
      gif.on('error', (err: Error) => reject(err));
      gif.render();
    });
  }
  
  async exportMP4(options: ExportOptions = {}): Promise<void> {
    if (!this.renderer || !this.scene || !this.camera) {
      throw new Error('Renderer not initialized');
    }
    
    const width = options.width || 1920;
    const height = options.height || 1080;
    const duration = options.duration || 10;
    const fps = options.fps || 30;
    const totalFrames = duration * fps;
    
    const offscreenRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    
    offscreenRenderer.setSize(width, height);
    offscreenRenderer.setPixelRatio(1);
    
    const offscreenCamera = this.camera.clone();
    offscreenCamera.aspect = width / height;
    offscreenCamera.updateProjectionMatrix();
    
    const canvas = offscreenRenderer.domElement;
    const stream = canvas.captureStream(fps);
    
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 5000000,
    });
    
    const chunks: Blob[] = [];
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    
    const clonedScene = this.scene.clone(true);
    const rotationSpeed = (Math.PI * 2) / duration;
    let frame = 0;
    
    return new Promise((resolve, reject) => {
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `blocks-of-brilliance-${Date.now()}.webm`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        
        offscreenRenderer.dispose();
        resolve();
      };
      
      mediaRecorder.onerror = (error) => {
        offscreenRenderer.dispose();
        reject(error);
      };
      
      mediaRecorder.start();
      
      const renderFrame = () => {
        if (frame >= totalFrames) {
          mediaRecorder.stop();
          return;
        }
        
        const time = frame / fps;
        
        clonedScene.traverse((obj) => {
          if (obj.type === 'Group' && obj.children.length > 0) {
            obj.rotation.y = time * rotationSpeed * 0.25;
            obj.rotation.x = time * rotationSpeed * 0.15;
          }
        });
        
        offscreenRenderer.render(clonedScene, offscreenCamera);
        frame++;
        
        requestAnimationFrame(renderFrame);
      };
      
      renderFrame();
    });
  }
  
  async exportGLB(faceDataUrls: string[]): Promise<void> {
    const scene = new THREE.Scene();
    const loader = new THREE.TextureLoader();

    const materials = await Promise.all(
      faceDataUrls.map(
        (url) =>
          new Promise<THREE.MeshStandardMaterial>((resolve) => {
            if (!url) {
              resolve(new THREE.MeshStandardMaterial({ color: 0x444466 }));
              return;
            }
            loader.load(
              url,
              (tex) => {
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.flipY = false; // GLTFExporter requires flipY=false
                resolve(new THREE.MeshStandardMaterial({ map: tex }));
              },
              undefined,
              () => resolve(new THREE.MeshStandardMaterial({ color: 0x444466 }))
            );
          })
      )
    );

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 2.5, 2.5),
      materials
    );
    mesh.name = 'BlocksOfBrillianceDice';
    scene.add(mesh);
    scene.add(new THREE.AmbientLight(0xffffff, 1));

    const exporter = new GLTFExporter();
    return new Promise((resolve, reject) => {
      exporter.parse(
        scene,
        (result) => {
          const blob = new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `blocks-of-brilliance-dice-${Date.now()}.glb`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
          materials.forEach((m) => { m.map?.dispose(); m.dispose(); });
          resolve();
        },
        (error) => reject(error),
        { binary: true, maxTextureSize: 2048 }
      );
    });
  }
}

export const cubeExporter = new CubeExporter();
