import estudiantes from './estudiantes.json';

export default function handler(req, res) {
  // 1. Validar API Key
  const apiKey = req.headers['cc_basic_2025_karen_mentoria_xyz789abc123'];
  if (apiKey !== process.env.API_KEY_BASIC) {
    return res.status(401).json({ error: 'Acceso no autorizado' });
  }

  // 2. Validar método HTTP
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // 3. Validar payload
  const { matricula } = req.body;
  if (!matricula || !/^[A-Z]\d{8}$/.test(matricula)) {
    return res.status(400).json({ error: 'Matrícula inválida' });
  }

  // 4. Buscar estudiante
  const estudiante = estudiantes.find(e => 
    e.matricula.trim().toUpperCase() === matricula.toUpperCase()
  );

  // 5. Manejar respuesta
  if (!estudiante) {
    return res.status(404).json({ error: 'Estudiante no encontrado' });
  }

  // 6. Devolver solo datos necesarios
  const safeData = {
    fullnameEstudiante: estudiante.fullnameEstudiante,
    nameEstudiante: estudiante.nameEstudiante,
    mentorFullname: estudiante.mentorFullname,
    mentorNickname: estudiante.mentorNickname,
    comunidad: estudiante.comunidad,
    campusOrigen: estudiante.campusOrigen,
    whatsappMentor: estudiante.whatsappMentor
  };
  
  res.status(200).json(safeData);
}
