import assert from 'node:assert';

import {
  isValidMatricula,
  normalizeLogicalStatus,
  normalizeMatricula
} from '../server/apps-script.js';

assert.strictEqual(normalizeMatricula(' a00000001 '), 'A00000001');
assert.strictEqual(isValidMatricula('A00000001'), true);
assert.strictEqual(isValidMatricula('A000001'), false);
assert.strictEqual(normalizeLogicalStatus(409), 409);
assert.strictEqual(normalizeLogicalStatus('403'), 403);
assert.strictEqual(normalizeLogicalStatus(418), 502);

console.log('AD26 server helper tests OK');
