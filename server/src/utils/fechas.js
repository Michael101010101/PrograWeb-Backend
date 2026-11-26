/** Fecha de hoy en Lima como texto AAAA-MM-DD (el formato de las columnas DATEONLY). */
export function hoyEnLima() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
}
