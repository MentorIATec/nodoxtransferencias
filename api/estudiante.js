import fetch from 'node-fetch';
export default async (req, res) => {
  // Configurar CORS primero
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  
  // Manejar solicitudes OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. Validar API Key
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.API_KEY_BASIC) {
      return res.status(401).json({ error: 'Acceso no autorizado' });
    }

    // 2. Parsear el cuerpo de la solicitud
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (e) {
      return res.status(400).json({ error: 'Cuerpo de solicitud inválido' });
    }

    const { matricula } = body;
    
    // 3. Validar matrícula
    if (!matricula || !/^[A-Z]\d{8}$/.test(matricula)) {
      return res.status(400).json({ error: 'Matrícula inválida' });
    }

    // 4. Consultar Apps Script Web App (Sheets privado)
    const webAppUrl = process.env.APPS_SCRIPT_WEBAPP_URL;
    const webAppKey = process.env.APPS_SCRIPT_API_KEY;
    if (!webAppUrl || !webAppKey) {
      return res.status(500).json({ error: 'Configuración incompleta del servidor' });
    }

    let data;
    try {
      const response = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: webAppKey, matricula })
      });

      if (!response.ok) throw new Error('WebApp error');
      data = await response.json();

      if (data.status && data.status !== 200) {
        const status = data.status === 404 ? 404 : 400;
        return res.status(status).json({ error: data.error || 'Error en consulta' });
      }
    } catch (err) {
      const fallbackUrl = process.env.FALLBACK_JSON_URL;
      if (!fallbackUrl) {
        return res.status(502).json({ error: 'Error consultando fuente de datos' });
      }

      const fallbackResp = await fetch(fallbackUrl);
      if (!fallbackResp.ok) {
        return res.status(502).json({ error: 'Fallback no disponible' });
      }

      const estudiantes = await fallbackResp.json();
      const estudiante = estudiantes.find(e =>
        e.matricula && e.matricula.trim().toUpperCase() === matricula.toUpperCase()
      );
      if (!estudiante) {
        return res.status(404).json({ error: 'Estudiante no encontrado' });
      }

      data = {
        matricula: estudiante.matricula,
        fullnameEstudiante: estudiante.fullnameEstudiante,
        nameEstudiante: estudiante.nameEstudiante,
        mentorFullname: estudiante.mentorFullname,
        mentorNickname: estudiante.mentorNickname,
        comunidad: estudiante.comunidad,
        campusOrigen: estudiante.campusOrigen,
        whatsappMentor: estudiante.whatsappMentor
      };
    }

    return res.status(200).json({
      matricula: data.matricula,
      fullnameEstudiante: data.fullnameEstudiante,
      nameEstudiante: data.nameEstudiante,
      mentorFullname: data.mentorFullname,
      mentorNickname: data.mentorNickname,
      comunidad: data.comunidad,
      campusOrigen: data.campusOrigen,
      whatsappMentor: data.whatsappMentor
    });

  } catch (error) {
    console.error('🔥 Error en API:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      detalle: error.message
    });
  }
}
