import assert from 'node:assert/strict';
import { enhanceDocument } from '../src/lib/doc-enhance.ts';
// dim page: paper 120, ink 60
const px = new Uint8ClampedArray(100 * 4); for (let i = 0; i < 100; i++) { const v = i < 10 ? 60 : 120; px.set([v, v, v, 255], i * 4); }
const o = enhanceDocument(px);
assert.equal(o[0], 0); assert.equal(o[99 * 4], 255); assert.equal(o[3], 255); assert.equal(o.length, px.length);
const flat = enhanceDocument(new Uint8ClampedArray([5, 5, 5, 255, 5, 5, 5, 255])); assert.equal(flat[0], 0);
console.log('doc-enhance unit OK');
