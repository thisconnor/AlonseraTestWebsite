/* Realistic GLSL ocean — the signature hero moment, v2.
   A continuous surface mesh displaced by Gerstner waves in the vertex
   shader; the fragment shader mixes brand-tinted water with a fresnel
   reflection of the lilac sky, sun glint, procedural foam, and distance
   fog so the horizon dissolves into the page. Pointer ripples ride on
   top via a small ring buffer. One mesh, one draw call. */
import * as THREE from '../assets/vendor/three.module.min.js';

const TIERS = {
  desktop: { segX: 384, segZ: 256 },
  tablet: { segX: 208, segZ: 144 },
};

const OCEAN_W = 46;
const OCEAN_D = 30;
const MAX_RIPPLES = 3;

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uAmplitude;
  uniform vec4 uRipples[${MAX_RIPPLES}]; // xy: world pos, z: start time, w: strength
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying float vCrest;   // 0..1 normalized crest factor for foam/color
  varying float vRipple;  // ripple ring intensity for foam

  // One Gerstner octave. d: direction, steep: steepness, wl: wavelength.
  vec3 gerstner(vec2 d, float steep, float wl, vec3 p, inout vec3 T, inout vec3 B, inout float crest) {
    float k = 6.28318 / wl;
    float c = sqrt(9.8 / k);
    vec2 dir = normalize(d);
    float f = k * (dot(dir, p.xz) - c * uTime);
    float a = (steep / k) * uAmplitude;
    float sf = sin(f);
    float cf = cos(f);
    float s = steep * uAmplitude;

    T += vec3(-dir.x * dir.x * s * sf, dir.x * s * cf, -dir.x * dir.y * s * sf);
    B += vec3(-dir.x * dir.y * s * sf, dir.y * s * cf, -dir.y * dir.y * s * sf);
    crest += sf * steep;
    return vec3(dir.x * a * cf, a * sf, dir.y * a * cf);
  }

  void main() {
    vec3 p = position;
    vec3 T = vec3(1.0, 0.0, 0.0);
    vec3 B = vec3(0.0, 0.0, 1.0);
    float crest = 0.0;

    vec3 disp = vec3(0.0);
    disp += gerstner(vec2( 1.00,  0.35), 0.16, 11.0, p, T, B, crest);
    disp += gerstner(vec2( 0.70, -0.60), 0.14, 6.5, p, T, B, crest);
    disp += gerstner(vec2(-0.45,  0.85), 0.12, 4.2, p, T, B, crest);
    disp += gerstner(vec2( 0.95, -0.15), 0.10, 2.6, p, T, B, crest);
    disp += gerstner(vec2(-0.20, -0.95), 0.08, 1.6, p, T, B, crest);
    disp += gerstner(vec2( 0.55,  0.80), 0.06, 0.9, p, T, B, crest);

    // Pointer ripples: expanding damped rings (vertical only)
    float rippleSum = 0.0;
    for (int i = 0; i < ${MAX_RIPPLES}; i++) {
      vec4 r = uRipples[i];
      if (r.w > 0.001) {
        float age = uTime - r.z;
        if (age > 0.0 && age < 3.0) {
          float d = distance(p.xz, r.xy);
          float ring = sin(d * 3.4 - age * 5.5) * exp(-d * 0.5) * exp(-age * 1.5) * r.w;
          disp.y += ring * 0.35;
          rippleSum += abs(ring);
        }
      }
    }

    vec3 pos = p + disp;
    vNormal = normalize(cross(B, T));
    vWorldPos = pos;
    vCrest = clamp(crest * 0.75 + 0.5, 0.0, 1.0);
    vRipple = clamp(rippleSum * 2.2, 0.0, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uFade;
  uniform vec3 uColorDeep;
  uniform vec3 uColorMid;
  uniform vec3 uColorShallow;
  uniform vec3 uSkyLow;
  uniform vec3 uSkyHigh;
  uniform vec3 uSunDir;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying float vCrest;
  varying float vRipple;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    return vnoise(p) * 0.55 + vnoise(p * 2.3) * 0.3 + vnoise(p * 5.1) * 0.15;
  }

  void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(cameraPosition - vWorldPos);

    // Water body: deep navy troughs → purple mids → teal crests
    vec3 water = mix(uColorDeep, uColorMid, smoothstep(0.1, 0.62, vCrest));
    water = mix(water, uColorShallow, smoothstep(0.62, 0.95, vCrest));

    // Fresnel reflection of the lilac sky
    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
    vec3 reflDir = reflect(-viewDir, n);
    vec3 sky = mix(uSkyLow, uSkyHigh, smoothstep(0.0, 0.55, reflDir.y));
    vec3 col = mix(water, sky, clamp(fresnel * 0.75 + 0.08, 0.0, 1.0));

    // Sun glint: tight specular + sparkling glitter band
    float spec = pow(max(dot(reflDir, uSunDir), 0.0), 160.0);
    float glitter = pow(max(dot(reflDir, uSunDir), 0.0), 24.0)
                  * fbm(vWorldPos.xz * 6.0 + uTime * 0.6);
    col += vec3(1.0, 0.98, 0.94) * (spec * 1.6 + glitter * 0.5);

    // Foam: crests + slope + drifting noise, plus pointer ripple rings
    float slope = 1.0 - n.y;
    float foamNoise = fbm(vWorldPos.xz * 1.7 + vec2(uTime * 0.22, -uTime * 0.13));
    float foam = smoothstep(0.68, 0.92, vCrest * (0.65 + slope * 3.2) * (0.55 + foamNoise * 0.7));
    foam = clamp(foam + vRipple * foamNoise * 1.4, 0.0, 1.0);
    col = mix(col, vec3(0.97, 0.96, 1.0), foam * 0.85);

    // Distance fog dissolves the horizon into the page sky
    float dist = length(cameraPosition - vWorldPos);
    float fog = smoothstep(12.0, ${(OCEAN_D + 6).toFixed(1)}, dist);
    col = mix(col, uSkyLow, fog * 0.9);

    float alpha = uFade * (1.0 - smoothstep(0.82, 1.0, fog));
    gl_FragColor = vec4(col, alpha);
  }
`;

export async function createOcean(mount, { tier = 'desktop' } = {}) {
  const { segX, segZ } = TIERS[tier] || TIERS.desktop;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    50, mount.clientWidth / mount.clientHeight, 0.1, 90,
  );
  // Slight upward pitch keeps the horizon at ~60% of the frame, leaving
  // the upper sky band clear for the headline.
  const basePitch = 0.055;
  camera.position.set(0, 2.4, 10.5);
  camera.rotation.x = basePitch;

  const geometry = new THREE.PlaneGeometry(OCEAN_W, OCEAN_D, segX, segZ);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0, -OCEAN_D / 2 + 4.5);

  const ripples = Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, -10, 0));
  const uniforms = {
    uTime: { value: 0 },
    uFade: { value: 0 },
    uAmplitude: { value: 1.0 },
    uRipples: { value: ripples },
    uColorDeep: { value: new THREE.Color('#131c66') },
    uColorMid: { value: new THREE.Color('#5946b1') },
    uColorShallow: { value: new THREE.Color('#5dd3d9') },
    uSkyLow: { value: new THREE.Color('#e6d9f8') },   // lilac haze at horizon
    uSkyHigh: { value: new THREE.Color('#ffffff') },
    uSunDir: { value: new THREE.Vector3(-0.35, 0.32, -0.88).normalize() },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  /* ----- Pointer interaction: analytic ray → y=0 plane ----- */
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ndc = new THREE.Vector2();
  const hit = new THREE.Vector3();
  let rippleIndex = 0;
  let lastRippleTime = 0;
  const lastRipplePos = new THREE.Vector2(1e9, 1e9);

  const clock = new THREE.Clock();

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
    if (now - lastRippleTime > 0.14 && moved > 0.5) {
      ripples[rippleIndex].set(hit.x, hit.z, now, 1.0);
      rippleIndex = (rippleIndex + 1) % MAX_RIPPLES;
      lastRippleTime = now;
      lastRipplePos.set(hit.x, hit.z);
    }
  }
  const interactionSurface = mount.closest('[data-hero]') || mount;
  interactionSurface.addEventListener('pointermove', onPointerMove, { passive: true });

  /* ----- Render loop on the shared GSAP ticker ----- */
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
      uniforms.uAmplitude.value = 1.0 + p * 0.7;
      camera.rotation.x = basePitch - p * 0.045;
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
