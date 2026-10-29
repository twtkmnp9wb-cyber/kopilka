import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import * as THREE from 'three';
import {
  createCanvas,
  drawBanknoteBack,
  drawBanknoteFront,
  drawMaterialMask,
  NOTE_ASPECT,
} from './banknote-art';
import { advance, loadArtFonts, type ParallaxInput } from './parallax';

// 3D-сцена hero: бумажная купюра с живым изгибом, голографической полосой и фоном
// из монет. Весь three.js живёт в этом модуле — он грузится отдельным чанком.

const NOTE_W = 4;
const NOTE_H = NOTE_W / NOTE_ASPECT;

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface Art {
  readonly front: HTMLCanvasElement;
  readonly back: HTMLCanvasElement;
  readonly mask: HTMLCanvasElement;
}

function useArt(): Art | null {
  const [art, setArt] = useState<Art | null>(null);
  useEffect(() => {
    let cancelled = false;
    void loadArtFonts().then(() => {
      if (cancelled) return;
      setArt({
        front: createCanvas(2048, drawBanknoteFront),
        back: createCanvas(2048, drawBanknoteBack),
        mask: createCanvas(512, drawMaterialMask),
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return art;
}

function useNoteMaterials(art: Art) {
  const gl = useThree((state) => state.gl);
  const materials = useMemo(() => {
    const anisotropy = gl.capabilities.getMaxAnisotropy();
    const colorTexture = (canvas: HTMLCanvasElement, mirrored: boolean) => {
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = anisotropy;
      if (mirrored) {
        // Изнанку видно «сзади» — разворачиваем текстуру, чтобы надписи читались.
        texture.wrapS = THREE.RepeatWrapping;
        texture.repeat.x = -1;
        texture.offset.x = 1;
      }
      return texture;
    };
    const mask = new THREE.CanvasTexture(art.mask);
    const maskMirrored = mask.clone();
    maskMirrored.wrapS = THREE.RepeatWrapping;
    maskMirrored.repeat.x = -1;
    maskMirrored.offset.x = 1;

    const paper = (map: THREE.Texture, props: THREE.Texture, side: THREE.Side) =>
      new THREE.MeshPhysicalMaterial({
        map,
        side,
        roughness: 1,
        roughnessMap: props,
        metalness: 1,
        metalnessMap: props,
        iridescence: 1,
        iridescenceMap: props,
        iridescenceIOR: 1.6,
        iridescenceThicknessRange: [180, 820],
        sheen: 0.6,
        sheenRoughness: 0.55,
        sheenColor: new THREE.Color('#ffffff'),
        transparent: true,
      });

    return {
      front: paper(colorTexture(art.front, false), mask, THREE.FrontSide),
      back: paper(colorTexture(art.back, true), maskMirrored, THREE.BackSide),
      miniature: new THREE.MeshStandardMaterial({
        map: colorTexture(art.front, false),
        side: THREE.DoubleSide,
        roughness: 0.8,
        transparent: true,
        opacity: 0.85,
      }),
    };
  }, [art, gl]);

  useEffect(
    () => () => {
      for (const material of Object.values(materials)) {
        material.map?.dispose();
        if (material instanceof THREE.MeshPhysicalMaterial) material.roughnessMap?.dispose();
        material.dispose();
      }
    },
    [materials],
  );
  return materials;
}

function Banknote({
  input,
  materials,
  reducedMotion,
}: {
  input: ParallaxInput;
  materials: ReturnType<typeof useNoteMaterials>;
  reducedMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Group>(null);
  const geometry = useMemo(() => new THREE.PlaneGeometry(NOTE_W, NOTE_H, 80, 35), []);
  const base = useMemo(
    () => Float32Array.from(geometry.attributes.position?.array ?? []),
    [geometry],
  );
  const scratch = useMemo(
    () => ({ point: new THREE.Vector3(), dir: new THREE.Vector3(), target: new THREE.Vector3() }),
    [],
  );
  const viewport = useThree((state) => state.viewport);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Положение «в покое»: на широком экране — справа от текста, на узком — над ним
  // (та же граница, что и у раскладки hero в CSS).
  const size = useThree((state) => state.size);
  const wide = size.width >= 900 && size.width >= size.height;
  const fit = wide
    ? Math.min(1, (viewport.width * 0.42) / NOTE_W, (viewport.height * 0.5) / NOTE_H)
    : Math.min(1, (viewport.width * 0.88) / NOTE_W, (viewport.height * 0.3) / NOTE_H);
  const rest = wide
    ? { x: viewport.width * 0.25, y: 0.05 }
    : { x: 0, y: viewport.height * 0.36 - (NOTE_H * fit) / 2 };

  useFrame((state) => {
    const note = group.current;
    if (!note) return;
    advance(input, performance.now());
    const t = reducedMotion ? 0 : state.clock.elapsedTime;

    // Бумага «дышит»: лёгкий изгиб краями к зрителю и бегущая волна.
    const position = geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < position.count; i += 1) {
      const x = base[i * 3] ?? 0;
      const y = base[i * 3 + 1] ?? 0;
      const nx = x / (NOTE_W / 2);
      const z =
        0.17 * nx * nx +
        0.05 * Math.sin(x * 1.6 + t * 1.4) +
        0.035 * Math.sin(y * 2.4 + t * 1.1 + x * 0.8);
      position.setZ(i, z);
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();

    // Прокрутка: купюра переворачивается, уменьшается и летит в копилку следующей секции.
    const progress = easeInOutCubic(Math.min(Math.max(input.scroll, 0), 1));
    let tx = rest.x;
    let ty = rest.y;
    const drop = input.dropTarget;
    if (drop && progress > 0) {
      const rect = drop.getBoundingClientRect();
      const ndcX = ((rect.left + rect.width / 2) / state.size.width) * 2 - 1;
      const ndcY = -(((rect.top + rect.height / 2) / state.size.height) * 2 - 1);
      scratch.point.set(ndcX, ndcY, 0.5).unproject(state.camera);
      scratch.dir.copy(scratch.point).sub(state.camera.position).normalize();
      const distance = -state.camera.position.z / scratch.dir.z;
      scratch.target.copy(state.camera.position).addScaledVector(scratch.dir, distance);
      tx = scratch.target.x;
      ty = scratch.target.y;
    }

    note.position.set(lerp(rest.x, tx, progress), lerp(rest.y, ty, progress), 0);
    note.scale.setScalar(fit * lerp(1, 0.1, progress));
    note.rotation.set(
      -input.smooth.y * 0.32 + Math.sin(t * 0.6) * 0.04 + progress * 0.4,
      input.smooth.x * 0.5 + progress * Math.PI,
      Math.sin(t * 0.45) * 0.03 - progress * 0.35,
    );
    const opacity = progress > 0.85 ? Math.max(0, 1 - (progress - 0.85) / 0.15) : 1;
    materials.front.opacity = opacity;
    materials.back.opacity = opacity;
    note.visible = opacity > 0.01;
    if (shadow.current) shadow.current.visible = progress < 0.05;
  });

  return (
    <>
      <group ref={group}>
        <mesh geometry={geometry} material={materials.front} />
        <mesh geometry={geometry} material={materials.back} />
      </group>
      <ContactShadows
        ref={shadow}
        position={[rest.x, rest.y - NOTE_H * fit * 0.85, -0.4]}
        scale={NOTE_W * fit * 1.6}
        opacity={0.32}
        blur={2.6}
        far={2.2}
        resolution={256}
        color="#1a1640"
      />
    </>
  );
}

const COIN_GEOMETRY = new THREE.CylinderGeometry(0.26, 0.26, 0.045, 40);
const MINI_GEOMETRY = new THREE.PlaneGeometry(0.92, 0.92 / NOTE_ASPECT);

interface Floater {
  readonly kind: 'coin' | 'note';
  readonly position: readonly [number, number, number];
  readonly spin: number;
  readonly phase: number;
}

/** Дальний слой: монеты и маленькие купюры плывут в тумане и сдвигаются против курсора. */
function Floaters({
  input,
  material,
  reducedMotion,
}: {
  input: ParallaxInput;
  material: THREE.Material;
  reducedMotion: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const size = useThree((state) => state.size);
  // На узком экране текст занимает всю ширину — фон делаем мельче и прозрачнее.
  const narrow = size.width < 900;
  const coin = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f0c14b',
        metalness: 0.65,
        roughness: 0.32,
        emissive: '#7a5410',
        emissiveIntensity: 0.35,
        transparent: true,
        opacity: narrow ? 0.55 : 0.9,
      }),
    [narrow],
  );
  useEffect(() => () => coin.dispose(), [coin]);

  const items = useMemo<Floater[]>(() => {
    let seed = 11;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    return Array.from({ length: 18 }, (_, i) => ({
      kind: i % 3 === 0 ? 'note' : 'coin',
      position: [(rand() - 0.5) * 14, (rand() - 0.5) * 7.5, -3.5 - rand() * 6] as const,
      spin: 0.2 + rand() * 0.5,
      phase: rand() * Math.PI * 2,
    }));
  }, []);

  useFrame((state) => {
    const root = group.current;
    if (!root) return;
    const t = reducedMotion ? 0 : state.clock.elapsedTime;
    root.scale.setScalar(narrow ? 0.6 : 1);
    root.position.x = -input.smooth.x * 0.7;
    root.position.y = -input.smooth.y * 0.45 + input.scroll * 1.5;
    root.children.forEach((child, i) => {
      const item = items[i];
      if (!item) return;
      child.position.y = item.position[1] + Math.sin(t * 0.5 + item.phase) * 0.25;
      child.rotation.x = item.phase + t * item.spin * (item.kind === 'coin' ? 1 : 0.4);
      child.rotation.y = item.phase * 0.5 + t * item.spin * 0.7;
    });
  });

  return (
    <group ref={group}>
      {items.map((item, i) => (
        <mesh
          key={i}
          position={item.position as [number, number, number]}
          geometry={item.kind === 'coin' ? COIN_GEOMETRY : MINI_GEOMETRY}
          material={item.kind === 'coin' ? coin : material}
        />
      ))}
    </group>
  );
}

function Scene({
  art,
  input,
  reducedMotion,
}: {
  art: Art;
  input: ParallaxInput;
  reducedMotion: boolean;
}) {
  const materials = useNoteMaterials(art);
  const fogColor = useMemo(
    () => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0d0d0f',
    [],
  );
  return (
    <>
      <fog attach="fog" args={[fogColor, 9, 22]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 5]} intensity={1.3} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.4} position={[0, 4, 4]} scale={[8, 2, 1]} />
        <Lightformer
          form="rect"
          intensity={1.6}
          color="#b4abf5"
          position={[-5, 0, 2]}
          rotation-y={Math.PI / 2}
          scale={[6, 3, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.6}
          color="#7fe0c0"
          position={[5, -1, 2]}
          rotation-y={-Math.PI / 2}
          scale={[6, 3, 1]}
        />
        <Lightformer form="ring" intensity={2} position={[0, 0, 8]} scale={3} />
      </Environment>
      <Floaters input={input} material={materials.miniature} reducedMotion={reducedMotion} />
      <Banknote input={input} materials={materials} reducedMotion={reducedMotion} />
    </>
  );
}

interface BanknoteSceneProps {
  readonly input: ParallaxInput;
  readonly active: boolean;
  readonly reducedMotion: boolean;
  readonly className?: string;
  readonly onReady?: () => void;
}

export default function BanknoteScene({
  input,
  active,
  reducedMotion,
  className,
  onReady,
}: BanknoteSceneProps) {
  const art = useArt();
  if (!art) return null;
  return (
    <Canvas
      className={className}
      dpr={[1, 2]}
      frameloop={active ? 'always' : 'never'}
      camera={{ position: [0, 0, 7], fov: 35 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping;
        gl.toneMappingExposure = 1.05;
        onReady?.();
      }}
      aria-hidden
    >
      <Scene art={art} input={input} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
