import db from '../db/models/index.cjs';

/**
 * Ejecuta varias operaciones como una sola: si una falla, se deshacen todas (ROLLBACK).
 * El servicio recibe { transaction } y se lo pasa a cada repositorio.
 * Uso: await enTransaccion(async (opciones) => { … repo.actualizar(id, cambios, opciones) … });
 */
export function enTransaccion(trabajo) {
  return db.sequelize.transaction((transaction) => trabajo({ transaction }));
}
