// Verifica que la tabla de HU-6 cumpla el documento de acuerdos (HU-7 la lee).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { idTrabajo, siguienteIdSustentacion } from '../hu6/domain/ids.js';
import { DATOS_SEMILLA } from '../hu6/domain/datosSemilla.js';

const esquema = readFileSync(new URL('../db/001_hu6_schema.sql', import.meta.url), 'utf8');
const bloque = esquema.slice(esquema.indexOf('CREATE TABLE IF NOT EXISTS public.sustentaciones'));
const definicion = bloque.slice(0, bloque.indexOf(');'));
const columnas = [...definicion.matchAll(/^\s+"(\w+)"\s+[A-Z]/gm)].map((m) => m[1]);

test('public.sustentaciones tiene exactamente las columnas del contrato (más las extra de HU-6)', () => {
  for (const c of ['id', 'trabajoId', 'fecha', 'hora', 'modalidad', 'calificacion', 'estado']) assert.ok(columnas.includes(c), `falta la columna ${c}`);
  assert.deepEqual(columnas.filter((c) => !['id','trabajoId','fecha','hora','modalidad','calificacion','estado'].includes(c)), ['salaId', 'programadaEl']);
});
test('las columnas del contrato van en camelCase (sin guion bajo)', () => {
  assert.ok(columnas.every((c) => !c.includes('_')));
});
test('los estados del contrato están en minúscula', () => {
  const estados = /"estado" IN \(([^)]*)\)/.exec(definicion)[1].match(/'(\w+)'/g).map((x) => x.replaceAll("'", ''));
  assert.deepEqual(estados, ['programada', 'realizada', 'reprogramada', 'desaprobada']);
});
test('ids con prefijo: s-001 para sustentaciones y t-012 para trabajos (igual que HU-2)', () => {
  assert.equal(idTrabajo('TFC-2026-2-012'), 't-012');
  assert.equal(siguienteIdSustentacion([]), 's-001');
  assert.equal(siguienteIdSustentacion(['s-003', 's-007']), 's-008');
  for (const s of DATOS_SEMILLA.sustentaciones) assert.match(s.id, /^s-\d+$/);
});
test('toda sustentación cerrada de la semilla trae calificación y estado válido', () => {
  for (const s of DATOS_SEMILLA.sustentaciones) {
    assert.ok(['programada', 'realizada', 'reprogramada', 'desaprobada'].includes(s.estado));
    if (s.estado === 'realizada' || s.estado === 'desaprobada') assert.ok(s.acta?.registrada, `${s.id} cerrada sin acta`);
  }
});
