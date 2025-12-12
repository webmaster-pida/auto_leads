const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configuración del transporte OAuth2
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
 * Usamos el SDK v2 de Firebase.
 * Este "envoltorio" traduce automáticamente el formato Protobuf de Cloud Run
 * a un objeto de datos normal que podemos leer.
 */
exports.notificarNuevoLead = onDocumentCreated("leads_corporativos/{leadId}", async (event) => {
  try {
    // ¡La magia! El SDK ya decodificó los datos por nosotros.
    // event.data es un DocumentSnapshot real.
    const snapshot = event.data;

    if (!snapshot) {
      console.log("No se encontraron datos asociados al evento.");
      return;
    }

    const data = snapshot.data(); // Ahora sí podemos usar .data() de nuevo

    if (!data.email) {
        console.log("Lead sin email, se omite.");
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
    console.log(`✅ ÉXITO: Correo enviado por lead de ${data.email}`);

  } catch (error) {
    console.error("❌ ERROR:", error);
  }
});
