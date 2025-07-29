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

    // 4. Cargar datos desde el Gist (con caché)
    const gistUrl = "https://gist.githubusercontent.com/MentorIATec/294ad6050de3384eb8806360294e49b3/raw/20a04db38b6820c2a0ec47396d80fe43789d63a5/estudiantes.json";
    const response = await fetch(gistUrl);
    if (!response.ok) throw new Error('Error cargando datos');
    
    const estudiantes = await response.json();
    
    // 5. Buscar estudiante
    const estudiante = estudiantes.find(e => 
      e.matricula.trim().toUpperCase() === matricula.toUpperCase()
    );

    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }

    // 6. Devolver datos seguros
    const safeData = {
      matricula: estudiante.matricula,
      fullnameEstudiante: estudiante.fullnameEstudiante,
      nameEstudiante: estudiante.nameEstudiante,
      mentorFullname: estudiante.mentorFullname,
      mentorNickname: estudiante.mentorNickname,
      comunidad: estudiante.comunidad,
      campusOrigen: estudiante.campusOrigen,
      whatsappMentor: estudiante.whatsappMentor
    };
    
    return res.status(200).json(safeData);

  } catch (error) {
    console.error('🔥 Error en API:', error);
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      detalle: error.message
    });
  }
}
