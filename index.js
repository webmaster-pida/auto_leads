const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configuración de transporte
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
 * Función compatible con Cloud Run / Eventarc
 * Recibe un objeto 'cloudEvent' estándar.
 */
exports.notificarNuevoLead = async (cloudEvent) => {
  
  // 1. En Eventarc, los datos de Firestore vienen dentro de .data
  const firestoreEvent = cloudEvent.data;

  // Validación de seguridad
  if (!firestoreEvent || !firestoreEvent.value || !firestoreEvent.value.fields) {
    console.log("Formato de evento no reconocido o vacío:", JSON.stringify(cloudEvent));
    return;
  }

  // 2. Extraemos los campos crudos (stringValue)
  const fields = firestoreEvent.value.fields;
  
  const data = {
    name: fields.name ? fields.name.stringValue : "No especificado",
    company: fields.company ? fields.company.stringValue : "No especificado",
    email: fields.email ? fields.email.stringValue : "",
    phone: fields.phone ? fields.phone.stringValue : "No especificado",
    message: fields.message ? fields.message.stringValue : ""
  };

  if (!data.email) {
    console.log("El documento no tiene email, se omite el envío.");
    return;
  }

  const destinatarioVentas = process.env.EMAIL_VENTAS || "ventas@tuempresa.com";
  const replyTo = data.email || destinatarioVentas;

  const mailOptions = {
    from: `"PIDA Notificaciones" <${process.env.GMAIL_USER}>`,
    to: destinatarioVentas,
    replyTo: replyTo,
    subject: `🚀 Nuevo Lead Corporativo: ${data.company}`,
    html: `
        <div style="font-family: Arial, sans-serif; border: 1px solid #ccc; padding: 20px; border-radius: 8px;">
            <h2 style="color: #1D3557;">Nuevo Lead Recibido</h2>
            <p><strong>Nombre:</strong> ${data.name}</p>
            <p><strong>Empresa:</strong> ${data.company}</p>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Teléfono:</strong> ${data.phone}</p>
            <hr>
            <p><strong>Mensaje:</strong><br>${data.message}</p>
            <hr>
            <a href="mailto:${data.email}" style="background:#1D3557; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">Responder</a>
        </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Correo enviado exitosamente a ventas por: ${data.email}`);
  } catch (error) {
    console.error("Error enviando correo:", error);
  }
};
