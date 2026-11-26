// Prueba la capa de datos con una base simulada (no necesita PostgreSQL).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as repo from '../hu6/repositories/sustentacionesRepository.js';

function baseFalsa() {
  const llamadas = [];
  const trabajo = { id: 't-012', codigo: 'TFC-2026-2-012', titulo: 'X', linea: 'L', departamento: 'D', estado: 'concluido', asesor_id: null, asesor: 'A', aprobados: 5, total: 5, informe_aprobado_el: '2026-11-24' };
  const tablas = [
    ['FROM hu6.docentes', []], ['FROM hu6.trabajos_ref', [trabajo]], ['FROM hu6.integrantes_ref', []], ['FROM hu6.conflictos_ref', []],
    ['FROM hu6.reservas_sala', []],
    ['FROM public.sustentaciones', [{ id: 's-001', trabajoId: 't-012', fecha: '2026-12-11', hora: '10:00:00', modalidad: 'Presencial', calificacion: 16, estado: 'realizada', salaId: 'A-402', programadaEl: '2026-09-02' }]],
    ['FROM hu6.jurados', []], ['FROM hu6.actas', []], ['FROM hu6.calificaciones', []], ['FROM hu6.historial_reprogramaciones', []],
  ];
  return { llamadas, query: async (sql, params) => { llamadas.push({ sql, params }); const t = tablas.find(([k]) => sql.includes(k)); return { rows: t ? t[1] : [], rowCount: 0 }; } };
}

test('obtenerDatos traduce trabajoId (t-012) al código visible y expone calificacion', async () => {
  const d = await repo.obtenerDatos(baseFalsa());
  const s = d.sustentaciones[0];
  assert.equal(s.id, 's-001');
  assert.equal(s.trabajoId, 't-012');
  assert.equal(s.trabajoCodigo, 'TFC-2026-2-012');
  assert.equal(s.calificacion, 16);
  assert.equal(s.hora, '10:00');
  assert.equal(d.trabajos[0].id, 't-012');
});
test('insertarProgramacion escribe en public.sustentaciones con columnas camelCase', async () => {
  const db = baseFalsa();
  await repo.insertarProgramacion(db, { id: 's-002', trabajoCodigo: 'TFC-2026-2-012', estado: 'programada', programadaEl: '2026-11-25', fecha: '2026-12-11', hora: '10:00', salaId: 'A-402', modalidad: 'Presencial' });
  const { sql, params } = db.llamadas[0];
  assert.match(sql, /INSERT INTO public\.sustentaciones \("id","trabajoId"/);
  assert.equal(params[1], 'TFC-2026-2-012');
  assert.equal(params[8], null);
});
test('registrar el acta guarda la calificación final en la tabla del contrato', async () => {
  const db = baseFalsa();
  const notas = { rigor: 16, resultados: 15, informe: 17, exposicion: 16 };
  await repo.guardarActa(db, { id: 's-002', estado: 'realizada', acta: { notas, resultado: 'Aprobado', observaciones: '', registrada: true, registradaEl: '2026-12-11', registradaHora: '10:20' } });
  const ultima = db.llamadas.at(-1);
  assert.match(ultima.sql, /UPDATE public\.sustentaciones SET "estado"=\$2,"calificacion"=\$3/);
  assert.deepEqual(ultima.params, ['s-002', 'realizada', 16]);
});
test('un borrador de acta NO cambia estado ni calificación', async () => {
  const db = baseFalsa();
  await repo.guardarActa(db, { id: 's-002', estado: 'programada', acta: { notas: { rigor: 10, resultados: '', informe: '', exposicion: '' }, resultado: '', observaciones: '', registrada: false } });
  assert.ok(!db.llamadas.some((c) => c.sql.includes('UPDATE public.sustentaciones')));
});
