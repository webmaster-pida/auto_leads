const { onDocumentCreated } = require("firebase-functions/v2/firestore");
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

// Usamos el SDK v2 que traduce automáticamente el formato Protobuf
exports.notificarNuevoLead = onDocumentCreated("leads_corporativos/{leadId}", async (event) => {
  try {
    // Si el filtro del activador es correcto (Patrón de ruta),
    // event.data tendrá el documento.
    const snapshot = event.data;

    if (!snapshot) {
      console.log("⚠️ Alerta: El evento llegó vacío. Verifica que el filtro del activador sea 'Patrón de ruta' y no 'Igual'.");
      return;
    }

    const data = snapshot.data(); 

    if (!data || !data.email) {
      console.log("El documento no tiene datos o email.");
      return;
    }

    const destinatarioVentas = process.env.EMAIL_VENTAS || "contacto@pida-ai.com";
    
    const mailOptions = {
      from: `"PIDA Notificaciones" <${process.env.GMAIL_USER}>`,
      to: destinatarioVentas,
      replyTo: data.email,
      subject: `🚀 Nuevo Lead: ${data.company || "PIDA"}`,
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
    console.log(`✅ ÉXITO TOTAL: Correo enviado por lead de ${data.email}`);

  } catch (error) {
    console.error("❌ ERROR:", error);
  }
});
