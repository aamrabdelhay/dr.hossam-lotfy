import assert from 'node:assert/strict';
import { simulate } from '../src/lib/office-analytics-core';
const r = simulate([{ id: 'a', open: 5 }, { id: 'b', open: 1 }, { id: 'c', open: 3 }], 5, 6);
assert.deepEqual(r.map((x) => [x.id, x.added]).sort(), [['a', 0], ['b', 4], ['c', 1]].sort());
assert.equal(r.find((x) => x.id === 'b')!.after, 5);
assert.equal(r.find((x) => x.id === 'a')!.overCapacity, false);
assert.equal(simulate([{ id: 'a', open: 6 }], 1, 6)[0].overCapacity, true);
assert.deepEqual(simulate([], 3, 6), []);
console.log('analytics unit PASS');
