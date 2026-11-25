import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

// Envío de correos con Nodemailer. Si no hay SMTP configurado, el correo se muestra en la consola.
// Nunca lanza error: si el envío falla, la operación principal (registro, recuperación…) continúa.

let transporte = null;
if (env.smtp.host && env.smtp.user) {
  transporte = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
}

function escapar(t = '') {
  return String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function plantilla({ asunto, mensaje, url, textoEnlace }) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#1A211D">
    <div style="background:#1E4534;color:#fff;padding:16px 24px;font-size:18px">Trabajos de Fin de Carrera · ULIMA</div>
    <div style="padding:24px;border:1px solid #E1E3DC">
      <h2 style="color:#1E4534;margin-top:0">${escapar(asunto)}</h2>
      <p style="line-height:1.5">${escapar(mensaje)}</p>
      ${url ? `<p><a href="${escapar(url)}" style="background:#2C5F4A;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none">${escapar(textoEnlace)}</a></p>` : ''}
    </div>
  </div>`;
}

/** enlace: ruta del front, por ejemplo /verificar/abc123 */
export async function enviarCorreo({ para, asunto, mensaje, enlace, textoEnlace = 'Abrir enlace' }) {
  const url = enlace ? `${env.clientUrl}${enlace}` : null;
  if (!transporte) {
    console.log(`\n[correo simulado] Para: ${para}\n  Asunto: ${asunto}\n  ${mensaje}${url ? `\n  Enlace: ${url}` : ''}\n`);
    return { enviado: false };
  }
  try {
    await transporte.sendMail({
      from: env.smtp.from,
      to: para,
      subject: asunto,
      text: url ? `${mensaje}\n\n${url}` : mensaje,
      html: plantilla({ asunto, mensaje, url, textoEnlace }),
    });
    return { enviado: true };
  } catch (error) {
    console.error('No se pudo enviar el correo:', error.message);
    return { enviado: false };
  }
}
