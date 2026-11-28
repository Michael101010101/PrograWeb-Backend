import { models } from '../config/database.js';
import RepositoryBase from './RepositoryBase.js';

// Periodo académico con sus etapas (asociación Periodo hasMany Etapa).

class PeriodoRepository extends RepositoryBase {
  constructor() {
    super(models.Periodo);
  }

  /** Periodo marcado como activo, con sus etapas ordenadas. */
  buscarActivo() {
    return this.buscarUno(
      { activo: true },
      {
        include: [{ model: models.Etapa, as: 'etapas' }],
        order: [[{ model: models.Etapa, as: 'etapas' }, 'numero', 'ASC']],
      }
    );
  }
}

const repo = new PeriodoRepository();

export const buscarActivo = () => repo.buscarActivo();
