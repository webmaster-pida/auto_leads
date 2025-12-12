const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configuración del transporte de correo (OAuth2)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    type: "OAuth2",
    user: process.env.GMAIL_USER,
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_SECRET,
    refreshToken: process.env.GMAIL_REFRESH_TOKEN
  },
});

// Función auxiliar para limpiar el formato "crudo" de Firestore
// Convierte: { name: { stringValue: "David" } } -> { name: "David" }
function parseFirestoreEvent(event) {
  const fields = event.value && event.value.fields ? event.value.fields : null;
  
  if (!fields) return {};

  return {
    name: fields.name ? fields.name.stringValue : "",
    company: fields.company ? fields.company.stringValue : "",
    email: fields.email ? fields.email.stringValue : "",
    phone: fields.phone ? fields.phone.stringValue : "",
    message: fields.message ? fields.message.stringValue : ""
  };
}

exports.notificarNuevoLead = async (event, context) => {
  // 1. Extraemos los datos usando la nueva función auxiliar
  const data = parseFirestoreEvent(event);

  // Validación: Si no hay email, algo salió mal o el documento está vacío
  if (!data.email) {
      console.log("Aviso: El documento no tiene email o formato válido. Datos recibidos:", JSON.stringify(event));
      return;
  }

  const destinatarioVentas = process.env.EMAIL_VENTAS || "ventas@tuempresa.com";
  // Si el cliente puso email, lo usamos para poder darle "Responder" directamente
  const replyTo = data.email || destinatarioVentas;

  const mailOptions = {
    from: `"PIDA Notificaciones" <${process.env.GMAIL_USER}>`,
    to: destinatarioVentas,
    replyTo: replyTo, 
    subject: `🚀 Nuevo Lead Corporativo: ${data.company || "Empresa por definir"}`,
    html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #1D3557; padding: 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0; font-weight: 500;">Nuevo Lead Generado</h2>
          </div>
          
          <div style="padding: 30px;">
            <p style="font-size: 16px;">Hola equipo,</p>
            <p style="font-size: 16px; margin-bottom: 25px;">
              Se ha recibido una nueva solicitud de contacto a través de la plataforma PIDA.
            </p>
            
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
              <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 10px 0; font-weight: bold; width: 140px; color: #555;">Nombre:</td>
                <td style="padding: 10px 0;">${data.name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 10px 0; font-weight: bold; color: #555;">Empresa:</td>
                <td style="padding: 10px 0;">${data.company}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 10px 0; font-weight: bold; color: #555;">Email:</td>
                <td style="padding: 10px 0;"><a href="mailto:${data.email}" style="color: #0056B3;">${data.email}</a></td>
              </tr>
              <tr style="border-bottom: 1px solid #f0f0f0;">
                <td style="padding: 10px 0; font-weight: bold; color: #555;">Teléfono:</td>
                <td style="padding: 10px 0;">${data.phone}</td>
              </tr>
            </table>

            <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #b92f32; border-radius: 4px;">
              <p style="margin: 0; font-style: italic; color: #555;">"${data.message}"</p>
            </div>

            <div style="margin-top: 35px; text-align: center;">
              <a href="mailto:${data.email}" style="background-color: #1D3557; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px; display: inline-block;">Responder al Cliente</a>
            </div>
          </div>
          
          <div style="background-color: #f4f6f9; padding: 15px; text-align: center; font-size: 12px; color: #888;">
            ID del evento: ${context ? context.eventId : 'N/A'}
          </div>
        </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OK: Correo enviado para el lead de: ${data.email}`);
  } catch (error) {
    console.error("Error crítico al enviar correo:", error);
  }
};
