import { randomBytes } from 'node:crypto';

/** Token de un solo uso para enlaces de verificación y recuperación. */
export function generarToken() {
  return randomBytes(24).toString('hex');
}

/** Código legible de invitación: INV-XXXX-XXXX (sin 0/O ni 1/I). */
export function generarCodigoInvitacion() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const c = Array.from(randomBytes(8), (b) => letras[b % letras.length]).join('');
  return `INV-${c.slice(0, 4)}-${c.slice(4)}`;
}
