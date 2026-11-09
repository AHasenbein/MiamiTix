"use client";

import { useEffect, useRef } from "react";

type Rgb = [number, number, number];

function hex(value: string): Rgb {
  const n = parseInt(value.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}

// Miami Tix brand pink and blue (from public/brand), each with a lighter and darker shade.
// Ordered as a loop so neighbours blend: the dark ends meet in deep violet, the light ends in lavender.
const BRAND_PALETTE: Rgb[] = [
  "#ff7fd4", // light pink
  "#ff5dc6", // brand pink
  "#ff2d6e", // brand hot pink (logo shadow)
  "#a8105a", // dark magenta
  "#1028a8", // navy
  "#1a52ff", // brand deep blue (logo shadow)
  "#2f93ff", // brand blue
  "#5cb3ff" // light blue
].map(hex);
const PALETTE_SIZE = BRAND_PALETTE.length;

const VERTEX_SHADER = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

// Domain-warped noise: feeding noise back into its own coordinates folds it into oil-like swirls.
const FRAGMENT_SHADER = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform vec3 colors[${PALETTE_SIZE}];

// Soft brightness ceiling, so the colours never overpower the page text and cards. It compresses
// rather than clamps, so the light shades still read lighter than the brand and dark shades.
const float MAX_LUMINANCE = 0.55;
const float KNEE = 0.3;
const vec3 BASE = vec3(0.05);

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 turn = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p = turn * p * 2.0 + 7.0;
    amplitude *= 0.5;
  }
  return value;
}

vec3 palette(float t) {
  float x = fract(t) * ${PALETTE_SIZE}.0;
  vec3 color = vec3(0.0);
  for (int i = 0; i < ${PALETTE_SIZE}; i++) {
    float d = abs(x - float(i));
    d = min(d, ${PALETTE_SIZE}.0 - d);
    float k = max(0.0, 1.0 - d);
    color += colors[i] * k * k * (3.0 - 2.0 * k);
  }
  return color;
}

void main() {
  vec2 p = gl_FragCoord.xy / resolution.y * 1.15;
  float t = time * 0.035;
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + 4.0 * q + vec2(1.7, 9.2) + t * 1.5), fbm(p + 4.0 * q + vec2(8.3, 2.8) - t));
  float f = fbm(p + 4.0 * r);

  vec3 color = palette(f * 1.8 + q.x + t * 0.25);
  color *= 0.88 + 0.12 * sin(12.0 * (f + r.x));
  color = mix(BASE, color, smoothstep(0.1, 0.45, f + 0.25 * length(q)));

  vec3 linear = pow(color, vec3(2.2));
  float luminance = dot(linear, vec3(0.2126, 0.7152, 0.0722));
  float compressed = MAX_LUMINANCE * (1.0 + KNEE) * luminance / (luminance + KNEE);
  color = pow(linear * compressed / max(luminance, 1e-5), vec3(1.0 / 2.2));

  // Dark gradients band visibly without a little dither.
  gl_FragColor = vec4(color + (hash(gl_FragCoord.xy) - 0.5) / 255.0, 1.0);
}
`;

const RENDER_SCALE = 0.5;
const MAX_RENDER_WIDTH = 960;
const FRAME_INTERVAL_MS = 1000 / 30;
const REDUCED_MOTION_TIME = 40;

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

/** Page background of slowly swirling colour, like oil, in Miami Tix brand pinks and blues. */
export function OilBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { alpha: false, antialias: false });
    if (!canvas || !gl) {
      return; // The CSS gradient behind the canvas stays visible.
    }

    const vertexShader = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!vertexShader || !fragmentShader || !program) {
      return;
    }
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return;
    }
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const resolutionUniform = gl.getUniformLocation(program, "resolution");
    const timeUniform = gl.getUniformLocation(program, "time");
    const colorsUniform = gl.getUniformLocation(program, "colors");

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const colors = new Float32Array(BRAND_PALETTE.flat());
    let frame = 0;
    let lastDraw = 0;

    function draw(timeSeconds: number) {
      gl!.uniform1f(timeUniform, timeSeconds);
      gl!.uniform3fv(colorsUniform, colors);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }

    function resize() {
      const scale = Math.min(RENDER_SCALE, MAX_RENDER_WIDTH / window.innerWidth);
      canvas!.width = Math.max(1, Math.round(window.innerWidth * scale));
      canvas!.height = Math.max(1, Math.round(window.innerHeight * scale));
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      gl!.uniform2f(resolutionUniform, canvas!.width, canvas!.height);
      if (reducedMotion) {
        draw(REDUCED_MOTION_TIME);
      }
    }

    function tick(now: number) {
      frame = requestAnimationFrame(tick);
      if (now - lastDraw < FRAME_INTERVAL_MS) {
        return;
      }
      lastDraw = now;
      draw(now / 1000);
    }

    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
    }

    function start() {
      if (!reducedMotion && !frame && !document.hidden) {
        frame = requestAnimationFrame(tick);
      }
    }

    function handleVisibility() {
      if (document.hidden) stop();
      else start();
    }

    function handleContextLost() {
      stop();
      canvas!.style.display = "none";
    }

    resize();
    start();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibility);
    canvas.addEventListener("webglcontextlost", handleContextLost);

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      canvas.removeEventListener("webglcontextlost", handleContextLost);
    };
  }, []);

  return (
    <div className="oil-background" aria-hidden="true">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
