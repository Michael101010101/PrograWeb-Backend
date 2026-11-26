export const ESTADOS = {
    propuesta: 'Propuesta',
    en_desarrollo: 'En desarrollo',
    concluido: 'Concluido',
    desistido: 'Desistido',
  };
  
  export const ESTADOS_VIGENTES = ['propuesta', 'en_desarrollo', 'concluido'];
  
  export const ESTADOS_EDITABLES = ['propuesta', 'en_desarrollo'];
  
  export const TRANSICIONES = {
    propuesta: ['desistido'],
    en_desarrollo: ['concluido', 'desistido'],
    concluido: [],
    desistido: [],
  };
  
  export const LIMITES = {
    tituloMin: 20,
    tituloMax: 160,
    resumenMin: 300,
    resumenMax: 1200,
    objetivosMin: 20,
    objetivosMax: 800,
    palabrasMin: 3,
    palabrasMax: 6,
    palabraMin: 2,
    palabraMax: 40,
    integrantesMax: 3,
    motivoMin: 40,
    motivoMax: 500,
    busquedaMin: 3,
  };