// Prueba la capa de datos (repositorio con Sequelize) contra la base configurada en el .env.
// Ejecutar con la base migrada y con datos semilla: npm run hu6:test
// Las escrituras se hacen dentro de una transacción que se deshace al final (no deja rastros).
import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { sequelize } from '../../config/database.js';
import * as repo from '../hu6/repositories/sustentacionesRepository.js';

class Deshacer extends Error {}
const enTransaccionQueSeDeshace = async (fn) => {
  try {
    await sequelize.transaction(async (transaction) => {
      await fn({ transaction });
      throw new Deshacer();
    });
  } catch (error) {
    if (!(error instanceof Deshacer)) throw error;
  }
};

test.after(() => sequelize.close());

test('obtenerDatos traduce trabajoId (t-012) al código visible y expone la calificación', async () => {
  const d = await repo.obtenerDatos();
  const s = d.sustentaciones.find((x) => x.trabajoId === 't-012');
  assert.ok(s, 'el seeder crea la sustentación s-012');
  assert.equal(s.trabajoCodigo, 'TFC-2026-2-012');
  assert.match(s.hora, /^\d{2}:\d{2}$/);
  assert.ok(Array.isArray(s.jurado));
  assert.equal(d.salas.length > 0, true);
});

test('un estudiante solo ve los trabajos de su equipo', async () => {
  const d = await repo.obtenerDatos({ usuarioId: 'u-002', rol: 'estudiante' });
  assert.ok(d.trabajos.every((t) => t.equipo.some((i) => i.usuarioId === 'u-002')));
  assert.deepEqual(d.reservas, []);
});

test('reemplazarJurado y guardarActa escriben con los modelos (y se deshacen)', async () => {
  await enTransaccionQueSeDeshace(async (opciones) => {
    const antes = await repo.obtenerDatos(opciones);
    const s = antes.sustentaciones.find((x) => x.id === 's-012');
    await repo.reemplazarJurado({ ...s, jurado: [{ docenteId: 'd-05', presidente: true }, { docenteId: 'd-08', presidente: false }] }, opciones);
    await repo.guardarActa({ ...s, acta: { notas: { rigor: 15 }, resultado: '', observaciones: 'borrador', registrada: false } }, opciones);
    const despues = (await repo.obtenerDatos(opciones)).sustentaciones.find((x) => x.id === 's-012');
    assert.deepEqual(despues.jurado.map((j) => j.docenteId), ['d-05', 'd-08']);
    assert.equal(despues.acta.notas.rigor, 15);
    assert.equal(despues.acta.observaciones, 'borrador');
  });
});
