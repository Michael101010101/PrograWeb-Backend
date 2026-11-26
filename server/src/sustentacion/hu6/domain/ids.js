// Ids de texto con prefijo, como pide el documento de acuerdos (t-001, e-001, ...).
// HU-2 usa t-012 para el trabajo cuyo código visible es TFC-2026-2-012.
export const idTrabajo = (codigo) => `t-${String(codigo).split('-').at(-1)}`;

// Siguiente id de sustentación: s-001, s-002, ... (se calcula dentro de la transacción con la tabla bloqueada).
export function siguienteIdSustentacion(idsExistentes) {
  const mayor = idsExistentes
    .map((id) => /^s-(\d+)$/.exec(id)?.[1])
    .filter(Boolean)
    .reduce((max, n) => Math.max(max, Number(n)), 0);
  return `s-${String(mayor + 1).padStart(3, '0')}`;
}
