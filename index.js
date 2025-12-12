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

exports.notificarNuevoLead = async (event) => {
  try {
    console.log("🔔 Función activada. Buscando el lead más reciente en la BD...");

    // ESTRATEGIA INFALIBLE:
    // Ignoramos los datos del evento (que pueden venir vacíos o en formato raro)
    // y buscamos directamente en Firestore el último registro creado.
    
    const snapshot = await admin.firestore()
      .collection('leads_corporativos')
      .orderBy('createdAt', 'desc') // Ordenamos por fecha, el más nuevo primero
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log("⚠️ No se encontraron leads en la base de datos.");
      return;
    }

    // Tomamos el documento
    const doc = snapshot.docs[0];
    const data = doc.data();

    // Verificamos si ya le enviamos correo para no repetir
    if (data.emailSent) {
      console.log(`✋ El último lead (${data.email}) ya fue procesado anteriormente. Nada que hacer.`);
      return;
    }

    console.log(`✅ Lead encontrado: ${data.email} - ${data.company}. Procesando envío...`);

    // Validación de seguridad
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
          <br>
          <a href="mailto:${data.email}" style="background:#1D3557; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">Responder</a>
        </div>
      `
    };

    // 1. Enviamos el correo
    await transporter.sendMail(mailOptions);
    console.log(`📧 Correo enviado a ventas.`);

    // 2. IMPORTANTE: Marcamos el documento como "enviado" en la base de datos
    // Esto evita bucles infinitos o envíos duplicados.
    await doc.ref.update({ emailSent: true });
    console.log("📝 Documento marcado como notificado (emailSent: true).");

  } catch (error) {
    console.error("❌ ERROR CRÍTICO:", error);
  }
};
