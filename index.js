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
    const leadsRef = db.collection('leads_corporativos');
    const snapshot = await leadsRef
      .orderBy('createdAt', 'desc') // El más reciente primero
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log("⚠️ No hay leads en la base de datos.");
      return; 
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    // 2. Verificación de seguridad (Idempotencia)
    if (data.emailSent === true) {
      console.log(`✋ El último lead (${data.email}) ya fue notificado previamente.`);
      return;
    }

    console.log(`✅ Procesando nuevo lead: ${data.email} - ${data.company}`);

    // 3. Preparar el correo con DISEÑO PREMIUM
    const destinatarioVentas = process.env.EMAIL_VENTAS || "contacto@pida-ai.com";
    
    // Formateo de fecha para el pie de página
    const fecha = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    const mailOptions = {
      from: `"PIDA Notificaciones" <${process.env.GMAIL_USER}>`,
      to: destinatarioVentas,
      replyTo: data.email,
      subject: `🎯 Nuevo Lead: ${data.company || "Cliente Potencial"}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f9; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
            .header { background-color: #1D3557; padding: 30px 40px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: 600; }
            .content { padding: 40px; color: #333333; }
            .label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; font-weight: bold; }
            .value { font-size: 16px; color: #1D3557; font-weight: 500; margin-bottom: 20px; border-bottom: 1px solid #f0f0f0; padding-bottom: 10px; }
            .message-box { background-color: #f8fafc; border-left: 4px solid #b92f32; padding: 20px; border-radius: 4px; margin-top: 10px; margin-bottom: 30px; }
            .message-text { font-style: italic; color: #555; line-height: 1.6; margin: 0; }
            .btn-container { text-align: center; margin-top: 30px; }
            .btn { background-color: #1D3557; color: #ffffff !important; padding: 14px 32px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; display: inline-block; transition: background 0.3s; box-shadow: 0 4px 10px rgba(29, 53, 87, 0.3); }
            .footer { background-color: #f4f6f9; padding: 20px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Nuevo Cliente Potencial</h1>
            </div>
            
            <div class="content">
              <p style="margin-bottom: 30px; color: #666; font-size: 15px;">Hola equipo, se ha recibido una nueva solicitud de contacto a través de la plataforma PIDA.</p>
              
              <div class="label">Nombre del Contacto</div>
              <div class="value">${data.name || 'No especificado'}</div>

              <div class="label">Empresa / Organización</div>
              <div class="value">${data.company || 'No especificado'}</div>

              <div class="label">Correo Electrónico</div>
              <div class="value"><a href="mailto:${data.email}" style="color: #1D3557; text-decoration: none;">${data.email}</a></div>

              <div class="label">Teléfono</div>
              <div class="value">${data.phone || 'No especificado'}</div>

              <div class="label">Mensaje o Requerimiento</div>
              <div class="message-box">
                <p class="message-text">"${data.message || 'Sin mensaje adjunto.'}"</p>
              </div>

              <div class="btn-container">
                <a href="mailto:${data.email}?subject=Respuesta a su solicitud en PIDA&body=Hola ${data.name},%0D%0A%0D%0AHemos recibido su solicitud..." class="btn">Responder al Cliente</a>
              </div>
            </div>

            <div class="footer">
              Recibido el: ${fecha}<br>
              © PIDA Platform - Sistema de Notificaciones Automáticas
            </div>
          </div>
        </body>
        </html>
      `
    };

    // 4. Enviar el correo
    await transporter.sendMail(mailOptions);
    console.log(`📧 Correo enviado a ventas.`);

    // 5. Marcar como procesado
    await doc.ref.update({ emailSent: true });
    console.log("📝 Documento marcado como completado.");

  } catch (error) {
    console.error("❌ ERROR CRÍTICO:", error);
  }
};
