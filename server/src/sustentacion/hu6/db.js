import { sequelize } from '../../config/database.js';

// Transacciones de la HU-6 con la misma conexión Sequelize del resto de la API.
// bloqueo: evita que dos coordinadores reserven la misma sala o numeren igual una sustentación
// al mismo tiempo (bloquea las tablas involucradas hasta el COMMIT).
export function transaccion(fn, { bloqueo = false } = {}) {
  return sequelize.transaction(async (transaction) => {
    if (bloqueo) {
      await sequelize.query('LOCK TABLE public.sustentaciones, hu6.jurados, hu6.reservas_sala IN SHARE ROW EXCLUSIVE MODE', { transaction });
    }
    return fn({ transaction });
  });
}
