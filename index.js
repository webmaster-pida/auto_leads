const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// Inicializamos la app
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Configuración de transporte (Tus credenciales de OAuth2)
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

exports.notificarNuevoLead = async (req, res) => {
  try {
    console.log("🔔 Función activada. Iniciando búsqueda directa en BD...");

    // 1. Buscamos el último lead registrado que NO tenga la marca de 'emailSent'
    // Esto garantiza que tomamos el más reciente y que no se ha procesado.
    const leadsRef = db.collection('leads_corporativos');
    const snapshot = await leadsRef
      .orderBy('createdAt', 'desc') // El más reciente primero
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log("⚠️ No hay leads en la base de datos.");
      return; // Terminamos sin error
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // 2. Verificación de seguridad (Idempotencia)
    // Si ya le enviamos correo a este lead específico, no hacemos nada.
    if (data.emailSent === true) {
      console.log(`✋ El último lead (${data.email}) ya fue notificado previamente.`);
      return;
    }

    console.log(`✅ Procesando nuevo lead encontrado: ${data.email}`);

    // 3. Preparar el correo
    const destinatarioVentas = process.env.EMAIL_VENTAS || "ventas@tuempresa.com";
    
    const mailOptions = {
      from: `"PIDA Notificaciones" <${process.env.GMAIL_USER}>`,
      to: destinatarioVentas,
      replyTo: data.email,
      subject: `🚀 Nuevo Lead: ${data.company || "Empresa"}`,
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

    // 4. Enviar el correo
    await transporter.sendMail(mailOptions);
    console.log(`📧 Correo enviado a ventas.`);

    // 5. CRUCIAL: Marcar el documento como procesado
    // Esto evita que si la función se dispara 2 veces, envíe 2 correos.
    await doc.ref.update({ emailSent: true });
    console.log("📝 Documento marcado como completado (emailSent: true).");

  } catch (error) {
    console.error("❌ ERROR CRÍTICO:", error);
  }
};
