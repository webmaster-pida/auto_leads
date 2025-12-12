const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configuración del transporte
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

/**
 * Función estándar para Google Cloud Functions (1ra Gen).
 * El trigger se configura en la consola, no aquí.
 */
exports.notificarNuevoLead = async (snap, context) => {
  // En 1ra generación, 'snap' ya es el documento y tiene la función .data()
  const data = snap.data(); 
  
  // Si por alguna razón data es undefined (puede pasar en pruebas), salimos
  if (!data) {
      console.log("No se recibieron datos del documento.");
      return;
  }

  const destinatarioVentas = process.env.EMAIL_VENTAS || "ventas@tuempresa.com";

  const mailOptions = {
    from: `"PIDA Notificaciones" <${process.env.GMAIL_USER}>`,
    to: destinatarioVentas,
    subject: `🚀 Nuevo Lead Corporativo: ${data.company || "Empresa por definir"}`,
    html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <div style="background-color: #1D3557; padding: 20px; text-align: center;">
            <h2 style="color: #ffffff; margin: 0;">Nuevo Lead Generado</h2>
          </div>
          <div style="padding: 30px;">
            <p>Hola equipo, nueva solicitud recibida:</p>
            <ul>
                <li><strong>Nombre:</strong> ${data.name}</li>
                <li><strong>Empresa:</strong> ${data.company}</li>
                <li><strong>Email:</strong> <a href="mailto:${data.email}">${data.email}</a></li>
                <li><strong>Teléfono:</strong> ${data.phone}</li>
            </ul>
            <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #b92f32;">
              <p style="margin: 0; font-style: italic;">"${data.message}"</p>
            </div>
            <br>
            <a href="mailto:${data.email}" style="background-color: #1D3557; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">Responder</a>
          </div>
        </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Correo enviado para: ${data.email}`);
  } catch (error) {
    console.error("Error enviando correo:", error);
  }
};
