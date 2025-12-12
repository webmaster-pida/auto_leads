const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

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

exports.notificarNuevoLead = async (cloudEvent) => {
  try {
    console.log("Evento recibido. Iniciando procesamiento...");

    // 1. Extraer los datos del evento de Cloud Run / Eventarc
    const firestoreData = cloudEvent.data;const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

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

exports.notificarNuevoLead = async (cloudEvent) => {
  try {
    console.log("🔔 INICIO: Evento recibido en Cloud Run.");

    // 1. Detección segura de los datos
    const firestoreData = cloudEvent.data;

    // Si entras por el navegador (HTTP), no hay datos de Firestore, evitamos el crash
    if (!firestoreData || !firestoreData.value) {
      console.log("⚠️ Aviso: Se accedió a la función sin datos de un evento Firestore (Probablemente visita manual).");
      return; 
    }

    // 2. Extracción de campos
    const fields = firestoreData.value.fields || {};
    
    // Log seguro (sin JSON.stringify para evitar errores circulares)
    console.log("Datos crudos recibidos (campos):", Object.keys(fields));

    const data = {
      name: fields.name ? fields.name.stringValue : "Sin nombre",
      company: fields.company ? fields.company.stringValue : "Sin empresa",
      email: fields.email ? fields.email.stringValue : "",
      phone: fields.phone ? fields.phone.stringValue : "Sin teléfono",
      message: fields.message ? fields.message.stringValue : "Sin mensaje"
    };

    if (!data.email) {
      console.log("❌ Cancelado: El documento no tiene email.");
      return;
    }

    // 3. Envío del correo
    const destinatarioVentas = process.env.EMAIL_VENTAS || "ventas@tuempresa.com";
    
    const mailOptions = {
      from: `"PIDA Notificaciones" <${process.env.GMAIL_USER}>`,
      to: destinatarioVentas,
      replyTo: data.email,
      subject: `🚀 Nuevo Lead: ${data.company}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #1D3557;">Nuevo Cliente Potencial</h2>
          <ul>
            <li><strong>Nombre:</strong> ${data.name}</li>
            <li><strong>Empresa:</strong> ${data.company}</li>
            <li><strong>Email:</strong> ${data.email}</li>
            <li><strong>Teléfono:</strong> ${data.phone}</li>
          </ul>
          <hr>
          <p><strong>Mensaje:</strong><br>${data.message}</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ ÉXITO: Correo enviado por el lead de ${data.email}`);

  } catch (error) {
    console.error("❌ ERROR:", error);
  }
};
