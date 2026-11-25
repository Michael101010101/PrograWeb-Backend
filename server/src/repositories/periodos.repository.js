import db from '../db/models/index.cjs';

// Patrón Repository sobre Periodo y Etapa (Sequelize).

const { Periodo, Etapa } = db;

/** Periodo marcado como activo, con sus etapas ordenadas. */
export async function buscarActivo() {
  const periodo = await Periodo.findOne({
    where: { activo: true },
    include: [{ model: Etapa, as: 'etapas' }],
    order: [[{ model: Etapa, as: 'etapas' }, 'numero', 'ASC']],
  });
  return periodo ? periodo.get({ plain: true }) : null;
}
