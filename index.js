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
    const firestoreData = cloudEvent.data;

    // Validación suave: Si no hay datos, probablemente fue una prueba manual o navegador
    if (!firestoreData || !firestoreData.value || !firestoreData.value.fields) {
      console.log("Aviso: Se recibió una solicitud sin datos válidos de Firestore. (¿Fue una visita manual al link?)");
      return; 
    }

    const fields = firestoreData.value.fields;
    console.log("Datos crudos encontrados:", JSON.stringify(fields));

    // 2. Limpiar los datos (quitar el 'stringValue')
    const data = {
      name: fields.name ? fields.name.stringValue : "No especificado",
      company: fields.company ? fields.company.stringValue : "No especificado",
      email: fields.email ? fields.email.stringValue : "",
      phone: fields.phone ? fields.phone.stringValue : "No especificado",
      message: fields.message ? fields.message.stringValue : ""
    };

    // 3. Validación de correo
    if (!data.email) {
      console.log("El documento no tiene email, se cancela el envío.");
      return;
    }

    // 4. Enviar el correo
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
            <br>
            <a href="mailto:${data.email}" style="background:#1D3557; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">Responder</a>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ ÉXITO: Correo enviado a ventas por el lead: ${data.email}`);

  } catch (error) {
    console.error("❌ ERROR CRÍTICO:", error);
  }
};
