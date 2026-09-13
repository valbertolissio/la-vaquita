import nodemailer from "nodemailer";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

const transporter =
  GMAIL_USER && GMAIL_APP_PASSWORD
    ? nodemailer.createTransport({
        service: "gmail",
        auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
      })
    : null;

/** true si hay credenciales SMTP configuradas — si no, el resto de la app sigue funcionando (link para compartir a mano) sin romperse. */
export const correoHabilitado = !!transporter;

export async function enviarCorreoDeInvitacion(params: { to: string; tripName: string; inviterName: string; link: string }) {
  if (!transporter) {
    console.warn("[mailer] GMAIL_USER/GMAIL_APP_PASSWORD no configurados — no se mandó el email de invitación.");
    return false;
  }

  await transporter.sendMail({
    from: `"La Vaquita" <${GMAIL_USER}>`,
    to: params.to,
    subject: `${params.inviterName} te invitó a "${params.tripName}" en La Vaquita`,
    text: `${params.inviterName} te invitó a sumarte a "${params.tripName}" en La Vaquita.\n\nUnite acá: ${params.link}\n\nEste link vence en 7 días.`,
    html: `
      <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1b1240; margin-bottom: 4px;">La Vaquita</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.5;">
          <strong>${params.inviterName}</strong> te invitó a sumarte a <strong>"${params.tripName}"</strong>.
        </p>
        <a href="${params.link}" style="display: inline-block; margin: 16px 0; padding: 12px 24px; background: #2e9e5b; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Unirme al proyecto
        </a>
        <p style="color: #94a3b8; font-size: 12px;">Este link vence en 7 días. Si el botón no funciona, copiá este link: ${params.link}</p>
      </div>
    `,
  });
  return true;
}

export async function enviarCorreoDeRecuperacion(params: { to: string; name: string; link: string }) {
  if (!transporter) {
    console.warn("[mailer] GMAIL_USER/GMAIL_APP_PASSWORD no configurados — no se mandó el email de recuperación.");
    return false;
  }

  await transporter.sendMail({
    from: `"La Vaquita" <${GMAIL_USER}>`,
    to: params.to,
    subject: "Recuperá tu contraseña de La Vaquita",
    text: `Hola ${params.name}.\n\nPedimos restablecer tu contraseña de La Vaquita. Si fuiste vos, entrá acá para elegir una nueva: ${params.link}\n\nEste link vence en 1 hora. Si no pediste esto, ignorá este mensaje.`,
    html: `
      <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #1b1240; margin-bottom: 4px;">La Vaquita</h2>
        <p style="color: #334155; font-size: 15px; line-height: 1.5;">
          Hola ${params.name}. Pedimos restablecer tu contraseña. Si fuiste vos, elegí una nueva acá.
        </p>
        <a href="${params.link}" style="display: inline-block; margin: 16px 0; padding: 12px 24px; background: #2e9e5b; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Restablecer contraseña
        </a>
        <p style="color: #94a3b8; font-size: 12px;">Este link vence en 1 hora. Si no pediste esto, ignorá este mensaje. Si el botón no funciona, copiá este link: ${params.link}</p>
      </div>
    `,
  });
  return true;
}
