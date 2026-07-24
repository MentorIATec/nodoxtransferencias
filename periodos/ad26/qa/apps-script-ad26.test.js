import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const scriptPath = path.join(__dirname, '..', 'automation', 'apps-script-ad26.js');
const context = { console };
vm.createContext(context);
vm.runInContext(fs.readFileSync(scriptPath, 'utf8'), context);

function mockSheet(values) {
  return {
    getDataRange() {
      return { getValues: () => values };
    }
  };
}

function mockSpreadsheet(responseValues) {
  const responses = mockSheet(responseValues);
  return {
    getSheetByName(name) {
      return name === 'Respuestas' ? responses : null;
    }
  };
}

const sourceMap = context.buildSourceMap_([
  'Matrícula',
  'Nombres',
  'Apellidos',
  'Correo electrónico',
  'Campus de origen',
  'Escuela',
  'Comunidad',
  'Mentor(a) asignado(a)'
]);
assert.strictEqual(sourceMap.matricula, 0);
assert.strictEqual(sourceMap.mentor_nombre, 7);
assert.strictEqual(context.normalizeMatricula_(' a00123456 '), 'A00123456');
assert.strictEqual(context.normalizeAnswer_('Sí'), 'SI');
assert.strictEqual(context.normalizeAnswer_('No'), 'NO');
assert.strictEqual(context.isTestMatricula_('a00000001'), true);
assert.strictEqual(context.isTestMatricula_('A00000002'), true);
assert.strictEqual(context.isTestMatricula_('A00000003'), true);
assert.strictEqual(context.isTestMatricula_('A00000004'), false);

const responseHeaders = [
  'response_id', 'event_id', 'timestamp', 'matricula', 'asistira',
  'tipo_poblacion', 'comunidad', 'mentor_id', 'email', 'email_status', 'source'
];

const rows399 = [responseHeaders];
for (let index = 0; index < 399; index++) {
  rows399.push([
    `id-${index}`,
    'bienvenida-transferencias-ad26',
    new Date(),
    `A${String(index).padStart(8, '0')}`,
    'SI',
    'MENTORIA',
    'Comunidad',
    'mentor-1',
    `student-${index}@tec.mx`,
    'PENDIENTE',
    'WEBAPP'
  ]);
}

// Una respuesta NO y un SI duplicado no deben consumir lugares adicionales.
rows399.push(['id-no', 'bienvenida-transferencias-ad26', new Date(), 'A99999999', 'NO']);
rows399.push(['id-duplicate', 'bienvenida-transferencias-ad26', new Date(), 'A00000000', 'SI']);

let snapshot = context.capacitySnapshot_(mockSpreadsheet(rows399), { CUPO_MAXIMO: 400 });
assert.deepStrictEqual(JSON.parse(JSON.stringify(snapshot)), {
  maximum: 400,
  occupied: 399,
  available: 1,
  full: false
});

rows399.push(['id-400', 'bienvenida-transferencias-ad26', new Date(), 'A88888888', 'SI']);
snapshot = context.capacitySnapshot_(mockSpreadsheet(rows399), { CUPO_MAXIMO: 400 });
assert.strictEqual(snapshot.occupied, 400);
assert.strictEqual(snapshot.available, 0);
assert.strictEqual(snapshot.full, true);

const existing = context.findExistingResponse_(mockSpreadsheet(rows399), 'A88888888');
assert.strictEqual(existing.answer, 'SI');

const assignmentHeaders = [
  'matricula', 'nombres', 'apellidos', 'email', 'campus_origen', 'escuela',
  'comunidad', 'tipo_poblacion', 'mentor_id', 'mentor_nombre', 'activo'
];
const assignmentRows = [
  assignmentHeaders,
  ['A00000001', 'Ana', 'Prueba', 'ana@tec.mx', 'Campus Puebla', 'Ingenieria', 'Krei', 'MENTORIA', 'M-1', 'Mentora Krei', true],
  ['A00000002', 'Luis', 'Prueba', 'luis@tec.mx', 'Campus Puebla', 'Salud', 'Salud', 'SALUD', '', '', true],
  ['A00000003', 'Inactivo', 'Prueba', 'inactivo@tec.mx', 'Campus Puebla', 'Ingenieria', 'Pasio', 'MENTORIA', 'M-2', 'Mentor Pasio', false]
];
const summaryResponses = [
  responseHeaders,
  ['r-1', 'bienvenida-transferencias-ad26', new Date(), 'A00000001', 'SI', 'MENTORIA', 'Krei', 'M-1'],
  ['r-2', 'bienvenida-transferencias-ad26', new Date(), 'A00000002', 'NO', 'SALUD', 'Salud', ''],
  ['r-old', 'otro-evento', new Date(), 'A00000003', 'SI', 'MENTORIA', 'Pasio', 'M-2']
];
const summary = context.buildRegistrationSummary_(assignmentRows, summaryResponses, 400);
assert.strictEqual(summary.kpis.active, 2);
assert.strictEqual(summary.kpis.responses, 2);
assert.strictEqual(summary.kpis.yes, 1);
assert.strictEqual(summary.kpis.no, 1);
assert.strictEqual(summary.kpis.pending, 0);
assert.strictEqual(summary.kpis.capacityProgress, 1 / 400);
assert.strictEqual(summary.kpis.health.total, 1);
assert.deepStrictEqual(JSON.parse(JSON.stringify(summary.byCommunity)), [
  ['Krei', 1, 1, 0, 1],
  ['Salud', 1, 0, 1, 0]
]);

console.log('AD26 Apps Script tests OK');
