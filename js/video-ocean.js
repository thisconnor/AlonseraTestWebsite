/* Video ocean — the brand film rendered as a living water surface.
   The film plays as a WebGL texture on a screen-aligned plane while the
   fragment shader refracts its UVs with pointer-driven ripple rings and
   a gentle ambient swell, so the video and the page's animation language
   become one. The source <video> stays in the DOM (visibility:hidden) to
   keep audio, autoplay management, and fallbacks intact. */
import * as THREE from '../assets/vendor/three.module.min.js';

const MAX_RIPPLES = 6;

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uVideo;
  uniform float uTime;
  uniform float uAspect;
  uniform vec4 uRipples[${MAX_RIPPLES}]; // xy: uv pos (aspect-corrected), z: start, w: strength
  varying vec2 vUv;

  void main() {
    vec2 p = vec2(vUv.x * uAspect, vUv.y);

    // Ambient swell: barely-there living distortion across the surface
    vec2 offset = vec2(
      sin(p.y * 9.0 + uTime * 0.7) + sin(p.y * 23.0 - uTime * 1.1) * 0.4,
      sin(p.x * 11.0 - uTime * 0.8) * 0.6
    ) * 0.0016;

    // Pointer ripples refract the film like rings on water
    float glow = 0.0;
    for (int i = 0; i < ${MAX_RIPPLES}; i++) {
      vec4 r = uRipples[i];
      if (r.w > 0.001) {
        float age = uTime - r.z;
        if (age > 0.0 && age < 2.5) {
          vec2 toP = p - r.xy;
          float d = length(toP);
          float ring = sin(d * 42.0 - age * 9.0) * exp(-d * 5.5) * exp(-age * 2.2) * r.w;
          offset += normalize(toP + 1e-4) * ring * 0.014;
          glow += abs(ring);
        }
      }
    }

    vec2 uv = clamp(vUv + offset, 0.002, 0.998);
    vec3 col = texture2D(uVideo, uv).rgb;

    // Crests of the rings catch a faint lilac light
    col += vec3(0.86, 0.75, 0.97) * glow * 0.22;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createVideoOcean(frame, video) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(frame.clientWidth, frame.clientHeight);
  Object.assign(renderer.domElement.style, {
    position: 'absolute', inset: '0', width: '100%', height: '100%',
  });
  frame.appendChild(renderer.domElement);
  video.style.visibility = 'hidden'; // keeps layout box for IntersectionObserver + audio

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
  camera.position.z = 1;

  const texture = new THREE.VideoTexture(video);
  texture.colorSpace = THREE.SRGBColorSpace;

  const ripples = Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, -10, 0));
  const uniforms = {
    uVideo: { value: texture },
    uTime: { value: 0 },
    uAspect: { value: frame.clientWidth / frame.clientHeight },
    uRipples: { value: ripples },
  };

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms }),
  );
  scene.add(mesh);

  const clock = new THREE.Clock();
  let rippleIndex = 0;
  let lastRippleTime = 0;
  let lastX = 1e9;
  let lastY = 1e9;

  function onPointerMove(e) {
    const rect = frame.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const u = (e.clientX - rect.left) / rect.width;
    const v = 1 - (e.clientY - rect.top) / rect.height;
    if (u < 0 || u > 1 || v < 0 || v > 1) return;
    const now = clock.getElapsedTime();
    const aspect = uniforms.uAspect.value;
    const moved = Math.hypot((u - lastX) * aspect, v - lastY);
    if (now - lastRippleTime > 0.07 && moved > 0.04) {
      const strength = Math.min(0.5 + moved * 3.5, 1.5);
      ripples[rippleIndex].set(u * aspect, v, now, strength);
      rippleIndex = (rippleIndex + 1) % MAX_RIPPLES;
      lastRippleTime = now;
      lastX = u;
      lastY = v;
    }
  }
  frame.addEventListener('pointermove', onPointerMove, { passive: true });

  let running = true;
  function render() {
    if (!running || document.hidden) return;
    uniforms.uTime.value = clock.getElapsedTime();
    renderer.render(scene, camera);
  }
  gsap.ticker.add(render);

  let resizeTimer;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const w = frame.clientWidth;
      const h = frame.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h);
      uniforms.uAspect.value = w / h;
    }, 150);
  };
  window.addEventListener('resize', onResize);

  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    api.destroy();
  });

  const api = {
    destroy() {
      running = false;
      gsap.ticker.remove(render);
      window.removeEventListener('resize', onResize);
      frame.removeEventListener('pointermove', onPointerMove);
      texture.dispose();
      mesh.geometry.dispose();
      mesh.material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      video.style.visibility = ''; // plain video becomes visible again
    },
  };
  return api;
}
