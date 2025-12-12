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

/**
 * Función Robusta: Ignora el formato del evento y busca los datos reales en la BD.
 */
exports.notificarNuevoLead = async (cloudEvent) => {
  try {
    console.log("🔔 Evento recibido. ID:", cloudEvent.id);

    // 1. Obtener la ruta del documento desde el "subject" del evento
    // El subject se ve como: "projects/.../databases/(default)/documents/leads_corporativos/XYZ123"
    const subject = cloudEvent.subject;
    
    if (!subject || !subject.includes('/documents/')) {
      console.error("❌ Error: El evento no contiene una ruta de documento válida.", subject);
      return;
    }

    // Extraemos todo lo que hay después de "/documents/"
    const docPath = subject.split('/documents/')[1];
    console.log("📂 Buscando documento en:", docPath);

    // 2. IR A BUSCAR LOS DATOS LIMPIOS A FIRESTORE
    // Esto evita cualquier problema con formatos Protobuf o JSON
    const docSnap = await admin.firestore().doc(docPath).get();

    if (!docSnap.exists) {
      console.log("⚠️ El documento ya no existe (¿fue borrado?).");
      return;
    }

    const data = docSnap.data();
    console.log("✅ Datos obtenidos correctamente:", data.email);

    // 3. Validación y Envío (Igual que antes)
    if (!data.email) {
      console.log("El lead no tiene email, se omite.");
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
            <li><strong>Nombre:</strong> ${data.name || 'No especificado'}</li>
            <li><strong>Empresa:</strong> ${data.company || 'No especificado'}</li>
            <li><strong>Email:</strong> ${data.email}</li>
            <li><strong>Teléfono:</strong> ${data.phone || 'No especificado'}</li>
          </ul>
          <hr>
          <p><strong>Mensaje:</strong><br>${data.message || 'Sin mensaje'}</p>
          <br>
          <a href="mailto:${data.email}" style="background:#1D3557; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">Responder</a>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✉️ Correo enviado exitosamente para: ${data.email}`);

  } catch (error) {
    console.error("❌ ERROR CRÍTICO:", error);
  }
};
