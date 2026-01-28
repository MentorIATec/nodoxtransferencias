import fetch from 'node-fetch';

export default async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_KEY_BASIC) {
      return res.status(401).json({ error: 'Acceso no autorizado' });
    }

    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
      return res.status(400).json({ error: 'Cuerpo de solicitud inválido' });
    }

    const { matricula, nombre, mentor, comunidad, correo, asistira, timestamp, enviarCorreo } = body || {};

    if (!matricula || !/^[A-Z]\d{8}$/.test(String(matricula).trim().toUpperCase())) {
      return res.status(400).json({ error: 'Matrícula inválida' });
    }

    const webAppUrl = process.env.APPS_SCRIPT_WEBAPP_URL;
    const webAppKey = process.env.APPS_SCRIPT_API_KEY;
    if (!webAppUrl || !webAppKey) {
      return res.status(500).json({ error: 'Configuración incompleta del servidor' });
    }

    const payload = {
      api_key: webAppKey,
      action: 'confirmacion',
      matricula: String(matricula).trim().toUpperCase(),
      nombre: String(nombre || '').trim(),
      mentor: String(mentor || '').trim(),
      comunidad: String(comunidad || '').trim(),
      correo: String(correo || '').trim(),
      asistira: asistira === true || String(asistira || '').toLowerCase() === 'sí' || String(asistira || '').toLowerCase() === 'si',
      timestamp: String(timestamp || '').trim(),
      enviarCorreo: enviarCorreo === true
    };

    const response = await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.status === 409) {
      return res.status(409).json({ error: 'Registro ya existe' });
    }

    if (!response.ok) {
      return res.status(502).json({ error: 'Error al registrar confirmación' });
    }

    const data = await response.json();
    if (data.status && data.status !== 200) {
      return res.status(400).json({ error: data.error || 'Error al registrar confirmación' });
    }

    return res.status(200).json({ ok: true, data });
  } catch (error) {
    console.error('🔥 Error en confirmación:', error);
    return res.status(500).json({ error: 'Error interno del servidor', detalle: error.message });
  }
};
