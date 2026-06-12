/* GPU particle ocean — the signature hero moment.
   A single THREE.Points grid displaced entirely in the vertex shader:
   four Gerstner-style wave octaves + pointer ripples, with a height-based
   color ramp (deep purple → lavender → teal → white foam) and specular
   sparkle. One draw call; all motion on the GPU. */
import * as THREE from '../assets/vendor/three.module.min.js';

const TIERS = {
  desktop: { cols: 256, rows: 160 },
  tablet: { cols: 144, rows: 96 },
};

const OCEAN_W = 30;   // world units, x
const OCEAN_D = 22;   // world units, z (depth away from camera)
const MAX_RIPPLES = 3;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uAmplitude;
  uniform float uPointSize;
  uniform float uPixelRatio;
  uniform vec4  uRipples[${MAX_RIPPLES}]; // xy: world pos, z: start time, w: strength
  attribute float aRandom;
  varying float vHeight;     // normalized -1..1
  varying float vSpec;
  varying float vDepth;      // 0 near .. 1 far
  varying float vRandom;

  // direction (unit), frequency, speed, amplitude share
  const vec2 D1 = vec2(0.86, 0.50);
  const vec2 D2 = vec2(-0.62, 0.78);
  const vec2 D3 = vec2(0.22, -0.97);
  const vec2 D4 = vec2(-0.97, -0.26);

  float waveH(vec2 p, vec2 dir, float freq, float speed, float amp, out vec2 grad) {
    float phase = dot(dir, p) * freq + uTime * speed;
    float s = sin(phase);
    float c = cos(phase);
    grad = dir * freq * amp * c;
    return amp * s;
  }

  void main() {
    vec3 pos = position;
    vec2 p = pos.xz;
    vRandom = aRandom;

    vec2 g, gSum = vec2(0.0);
    float h = 0.0;
    h += waveH(p, D1, 0.55, 0.85, 0.42, g); gSum += g;
    h += waveH(p, D2, 0.95, 1.15, 0.26, g); gSum += g;
    h += waveH(p, D3, 1.70, 1.60, 0.14, g); gSum += g;
    h += waveH(p, D4, 3.10, 2.10, 0.07, g); gSum += g;
    h *= uAmplitude;
    gSum *= uAmplitude;

    // Pointer ripples: expanding damped rings
    for (int i = 0; i < ${MAX_RIPPLES}; i++) {
      vec4 r = uRipples[i];
      if (r.w > 0.001) {
        float age = uTime - r.z;
        if (age > 0.0 && age < 3.0) {
          float d = distance(p, r.xy);
          float ring = sin(d * 4.5 - age * 6.0)
                     * exp(-d * 0.45)
                     * exp(-age * 1.6)
                     * r.w;
          h += ring * 0.5;
        }
      }
    }

    pos.y = h;
    vHeight = clamp(h / max(uAmplitude * 0.75, 0.001), -1.0, 1.0);

    // Approximate normal from analytic gradient → cheap specular
    vec3 n = normalize(vec3(-gSum.x, 1.0, -gSum.y));
    vec3 lightDir = normalize(vec3(0.35, 0.8, 0.45));
    vec3 viewDir = normalize(cameraPosition - pos);
    vec3 halfVec = normalize(lightDir + viewDir);
    vSpec = pow(max(dot(n, halfVec), 0.0), 24.0);

    vDepth = clamp(-pos.z / ${OCEAN_D.toFixed(1)}, 0.0, 1.0);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    float size = uPointSize * uPixelRatio * (1.0 + aRandom * 0.7);
    gl_PointSize = size * (9.0 / max(-mv.z, 0.5));
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uFade;
  uniform vec3 uColorDeep;
  uniform vec3 uColorMid;
  uniform vec3 uColorCrest;
  uniform vec3 uColorFoam;
  varying float vHeight;
  varying float vSpec;
  varying float vDepth;
  varying float vRandom;

  void main() {
    // Soft round sprite
    float d = length(gl_PointCoord - vec2(0.5));
    float alpha = smoothstep(0.5, 0.12, d);
    if (alpha < 0.01) discard;

    // Height ramp: deep → mid → crest → foam
    float t = vHeight * 0.5 + 0.5;
    vec3 col = mix(uColorDeep, uColorMid, smoothstep(0.05, 0.55, t));
    col = mix(col, uColorCrest, smoothstep(0.55, 0.86, t));
    col = mix(col, uColorFoam, smoothstep(0.90, 1.0, t));

    // Specular sparkle with per-particle twinkle
    float twinkle = 0.6 + 0.4 * sin(uTime * 2.2 + vRandom * 40.0);
    col += vSpec * twinkle * 0.55;

    // Fade with distance (atmospheric) and entrance fade
    alpha *= mix(0.95, 0.25, vDepth);
    alpha *= uFade;

    gl_FragColor = vec4(col, alpha);
  }
`;

export async function createOcean(mount, { tier = 'desktop' } = {}) {
  const { cols, rows } = TIERS[tier] || TIERS.desktop;

  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    52, mount.clientWidth / mount.clientHeight, 0.1, 80,
  );
  const basePitch = -0.32;
  camera.position.set(0, 3.1, 8.5);
  camera.rotation.x = basePitch;

  // Grid geometry: x spans the width, z recedes toward the horizon
  const count = cols * rows;
  const positions = new Float32Array(count * 3);
  const randoms = new Float32Array(count);
  let i = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      positions[i * 3] = (c / (cols - 1) - 0.5) * OCEAN_W;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = -(r / (rows - 1)) * OCEAN_D + 2.5;
      randoms[i] = Math.random();
      i++;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

  const ripples = Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, -10, 0));
  const uniforms = {
    uTime: { value: 0 },
    uFade: { value: 0 },
    uAmplitude: { value: 1.0 },
    uPointSize: { value: tier === 'desktop' ? 2.4 : 3.0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    uRipples: { value: ripples },
    uColorDeep: { value: new THREE.Color('#5946b1') },
    uColorMid: { value: new THREE.Color('#a99ce0') },
    uColorCrest: { value: new THREE.Color('#56d2db') },
    uColorFoam: { value: new THREE.Color('#ffffff') },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  /* ----- Pointer interaction: analytic ray → y=0 plane ----- */
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ndc = new THREE.Vector2();
  const hit = new THREE.Vector3();
  let rippleIndex = 0;
  let lastRippleTime = 0;
  const lastRipplePos = new THREE.Vector2(1e9, 1e9);

  function onPointerMove(e) {
    const rect = mount.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    ndc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(ndc, camera);
    if (!raycaster.ray.intersectPlane(plane, hit)) return;

    const now = clock.getElapsedTime();
    const moved = lastRipplePos.distanceTo(new THREE.Vector2(hit.x, hit.z));
    if (now - lastRippleTime > 0.15 && moved > 0.5) {
      ripples[rippleIndex].set(hit.x, hit.z, now, 0.9);
      rippleIndex = (rippleIndex + 1) % MAX_RIPPLES;
      lastRippleTime = now;
      lastRipplePos.set(hit.x, hit.z);
    }
  }
  // Listen on the hero section so text content doesn't block interaction
  const interactionSurface = mount.closest('[data-hero]') || mount;
  interactionSurface.addEventListener('pointermove', onPointerMove, { passive: true });

  /* ----- Render loop on the shared GSAP ticker ----- */
  const clock = new THREE.Clock();
  let running = true;
  let inView = true;

  function render() {
    if (!running || !inView || document.hidden) return;
    uniforms.uTime.value = clock.getElapsedTime();
    renderer.render(scene, camera);
  }
  gsap.ticker.add(render);

  const io = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; });
  io.observe(mount);

  function onResize() {
    const w = mount.clientWidth;
    const h = mount.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  let resizeTimer;
  const onResizeDebounced = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(onResize, 150);
  };
  window.addEventListener('resize', onResizeDebounced);

  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    api.destroy();
    (mount.closest('[data-hero]') || mount).classList.add('is-fallback');
  });

  const api = {
    /** Returns a tween fading the ocean in (used in the entrance timeline). */
    fadeIn(duration = 1.4) {
      return gsap.to(uniforms.uFade, { value: 1, duration, ease: 'power2.out' });
    },
    /** 0..1 scroll progress → swell amplitude + camera pitch. */
    setScrollProgress(p) {
      uniforms.uAmplitude.value = 1.0 + p * 0.65;
      camera.rotation.x = basePitch - p * 0.07;
    },
    destroy() {
      running = false;
      gsap.ticker.remove(render);
      io.disconnect();
      window.removeEventListener('resize', onResizeDebounced);
      interactionSurface.removeEventListener('pointermove', onPointerMove);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
  return api;
}
