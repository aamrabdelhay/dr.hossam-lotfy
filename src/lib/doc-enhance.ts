/** Item 226: simple document-photo enhancement on RGBA pixels, in the browser. Converts to grayscale and stretches contrast between the 2nd and 98th brightness percentiles so a dim photo of paper becomes readable. No cropping or perspective fix and no OCR. The original photo is not kept unless the user also saves it. */
export function enhanceDocument(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const n = rgba.length / 4; const hist = new Uint32Array(256); const gray = new Uint8Array(n);
  for (let i = 0; i < n; i++) { const g = Math.round(rgba[i * 4] * 0.299 + rgba[i * 4 + 1] * 0.587 + rgba[i * 4 + 2] * 0.114); gray[i] = g; hist[g]++; }
  const pct = (p: number) => { let acc = 0; const t = n * p; for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= t) return v; } return 255; };
  const lo = pct(0.02), hi = Math.max(pct(0.98), lo + 1); const out = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < n; i++) { const v = Math.max(0, Math.min(255, Math.round(((gray[i] - lo) * 255) / (hi - lo)))); out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = v; out[i * 4 + 3] = 255; }
  return out;
}
