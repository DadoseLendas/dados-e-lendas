'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { WeatherConfig } from '@/features/mesa/hooks/useWeather';

interface WeatherLayerProps {
  config: WeatherConfig;
  width: number;
  height: number;
}

// ── Shaders: partículas (chuva / neve / areia) ─────────────────────────────────
const PARTICLE_VERT = /* glsl */ `
  uniform float uTime;
  uniform vec2 uRes;
  uniform float uWind;
  uniform float uType; // 0 = chuva, 1 = neve, 2 = areia
  attribute float aSeed;
  varying float vAlpha;
  varying float vType;

  void main() {
    vType = uType;

    float baseSpeed = uType < 0.5 ? 900.0 : (uType < 1.5 ? 120.0 : 500.0);
    float fallSpeed = baseSpeed * mix(0.6, 1.4, aSeed);
    float sway = (uType > 0.5 && uType < 1.5) ? sin(uTime * 1.6 + aSeed * 60.0) * 16.0 : 0.0;
    float windDrift = uWind * uTime * (uType > 1.5 ? 260.0 : 50.0);

    vec3 pos = position;
    pos.y = mod(pos.y + uTime * fallSpeed, uRes.y);
    pos.x = mod(pos.x + windDrift + sway, uRes.x);

    vAlpha = mix(0.3, 1.0, aSeed);

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = uType < 0.5 ? mix(2.0, 4.0, aSeed) : (uType < 1.5 ? mix(3.0, 7.0, aSeed) : mix(1.5, 3.0, aSeed));
  }
`;

const PARTICLE_FRAG = /* glsl */ `
  precision mediump float;
  varying float vAlpha;
  varying float vType;

  void main() {
    vec2 uv = gl_PointCoord - vec2(0.5);

    if (vType < 0.5) {
      // Chuva: risco vertical fino, com cauda
      if (abs(uv.x) > 0.12) discard;
      float fade = smoothstep(0.5, -0.5, uv.y);
      gl_FragColor = vec4(0.72, 0.85, 1.0, vAlpha * fade * 0.9);
    } else if (vType < 1.5) {
      // Neve: ponto macio
      float d = length(uv);
      if (d > 0.5) discard;
      float soft = smoothstep(0.5, 0.0, d);
      gl_FragColor = vec4(1.0, 1.0, 1.0, vAlpha * soft);
    } else {
      // Areia: grão pequeno e quente
      float d = length(uv);
      if (d > 0.5) discard;
      gl_FragColor = vec4(0.85, 0.7, 0.4, vAlpha * 0.8);
    }
  }
`;

// ── Shaders: névoa densa (plano com ruído fbm animado) ─────────────────────────
const FOG_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FOG_FRAG = /* glsl */ `
  precision mediump float;
  uniform float uTime;
  uniform float uIntensity;
  uniform float uWind;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 5; i++) {
      v += amp * noise(p);
      p *= 2.02;
      amp *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 p = vUv * 4.0;
    p.x += uTime * (0.05 + uWind * 0.1);
    float n = fbm(p + fbm(p + uTime * 0.02));
    float alpha = smoothstep(0.3, 0.8, n) * uIntensity * 0.6;
    gl_FragColor = vec4(0.85, 0.87, 0.9, alpha);
  }
`;

const TYPE_CODE: Record<WeatherConfig['type'], number> = {
  rain: 0,
  snow: 1,
  sand: 2,
  fog: -1, // tratado à parte (plano, não partículas)
};

export default function WeatherLayer({ config, width, height }: WeatherLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.OrthographicCamera;
    points?: THREE.Points;
    fogMesh?: THREE.Mesh;
    raf?: number;
    clock: THREE.Clock;
  }>({ clock: new THREE.Clock() });

  // ── Setup do renderer (uma vez) ──────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    Object.assign(renderer.domElement.style, {
      position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
    });
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(0, 1, 0, 1, 0.1, 1000);
    camera.position.z = 10;

    stateRef.current.renderer = renderer;
    stateRef.current.scene = scene;
    stateRef.current.camera = camera;

    const animate = () => {
      stateRef.current.raf = requestAnimationFrame(animate);
      const t = stateRef.current.clock.getElapsedTime();
      const mat = (stateRef.current.points?.material ?? stateRef.current.fogMesh?.material) as
        | THREE.ShaderMaterial
        | undefined;
      if (mat?.uniforms?.uTime) mat.uniforms.uTime.value = t;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (stateRef.current.raf) cancelAnimationFrame(stateRef.current.raf);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  // ── Redimensionar quando o mapa mudar de tamanho ─────────────────────────────
  useEffect(() => {
    const { renderer, camera } = stateRef.current;
    if (!renderer || !camera) return;
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    renderer.setSize(w, h, false);
    camera.right = w;
    camera.bottom = h;
    camera.updateProjectionMatrix();
  }, [width, height]);

  // ── Recriar o efeito quando tipo/intensidade/vento mudarem ───────────────────
  useEffect(() => {
    const { scene } = stateRef.current;
    if (!scene) return;

    if (stateRef.current.points) {
      scene.remove(stateRef.current.points);
      stateRef.current.points.geometry.dispose();
      (stateRef.current.points.material as THREE.Material).dispose();
      stateRef.current.points = undefined;
    }
    if (stateRef.current.fogMesh) {
      scene.remove(stateRef.current.fogMesh);
      stateRef.current.fogMesh.geometry.dispose();
      (stateRef.current.fogMesh.material as THREE.Material).dispose();
      stateRef.current.fogMesh = undefined;
    }

    if (!config.enabled) return;

    const w = Math.max(1, width);
    const h = Math.max(1, height);

    if (config.type === 'fog') {
      const geo = new THREE.PlaneGeometry(w, h);
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: config.intensity },
          uWind: { value: config.windSpeed },
        },
        vertexShader: FOG_VERT,
        fragmentShader: FOG_FRAG,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(w / 2, h / 2, 0);
      scene.add(mesh);
      stateRef.current.fogMesh = mesh;
    } else {
      const baseCount = config.type === 'snow' ? 500 : config.type === 'sand' ? 700 : 900;
      const count = Math.round(60 + config.intensity * baseCount);

      const positions = new Float32Array(count * 3);
      const seeds = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = Math.random() * w;
        positions[i * 3 + 1] = Math.random() * h;
        positions[i * 3 + 2] = 0;
        seeds[i] = Math.random();
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uRes: { value: new THREE.Vector2(w, h) },
          uWind: { value: config.windSpeed },
          uType: { value: TYPE_CODE[config.type] },
        },
        vertexShader: PARTICLE_VERT,
        fragmentShader: PARTICLE_FRAG,
      });

      const points = new THREE.Points(geo, mat);
      scene.add(points);
      stateRef.current.points = points;
    }
  }, [config.enabled, config.type, config.intensity, config.windSpeed, width, height]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 35, overflow: 'hidden' }}
    />
  );
}