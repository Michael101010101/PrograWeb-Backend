import db from '../db/models/index.cjs';

const { IntentoLogin } = db;

export async function obtener(correo) {
  const registro = await IntentoLogin.findByPk(correo);
  return { fallidos: registro?.fallidos ?? 0, bloqueadoHasta: registro?.bloqueadoHasta ?? null };
}

export async function guardar(correo, { fallidos, bloqueadoHasta }) {
  await IntentoLogin.upsert({ correo, fallidos, bloqueadoHasta });
}

export async function limpiar(correo) {
  await IntentoLogin.destroy({ where: { correo } });
}
