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
    console.log("🔔 INICIO: Evento recibido.");

    // En Cloud Run Functions, los datos de Firestore vienen en cloudEvent.data
    const firestoreData = cloudEvent.data;

    if (!firestoreData || !firestoreData.value) {
      console.log("⚠️ Aviso: Solicitud sin datos de Firestore (posible visita manual).");
      return; 
    }

    const fields = firestoreData.value.fields || {};
    
    // Extracción segura de datos
    const data = {
      name: fields.name ? fields.name.stringValue : "No especificado",
      company: fields.company ? fields.company.stringValue : "No especificado",
      email: fields.email ? fields.email.stringValue : "",
      phone: fields.phone ? fields.phone.stringValue : "No especificado",
      message: fields.message ? fields.message.stringValue : "No especificado"
    };

    if (!data.email) {
      console.log("❌ Cancelado: El lead no tiene email.");
      return;
    }

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
