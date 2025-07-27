export default async function handler(req, res) {
  try {
    // 1. Validar API Key
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.API_KEY_BASIC) {
      return res.status(401).json({ error: 'Acceso no autorizado' });
    }

    // 2. Cargar datos desde el Gist
    const gistUrl = "https://gist.githubusercontent.com/MentorIATec/294ad6050de3384eb8806360294e49b3/raw/ece924d75bc974c5e146f0d14291f8854dd55f24/estudiantes.json";
    const response = await fetch(gistUrl);
    
    if (!response.ok) throw new Error('Error cargando datos');
    const estudiantes = await response.json();

    // 3. Validar método HTTP
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método no permitido' });
    }

    // 4. Validar payload
    const { matricula } = req.body;
    if (!matricula || !/^[A-Z]\d{8}$/.test(matricula)) {
      return res.status(400).json({ error: 'Matrícula inválida' });
    }

    // 5. Buscar estudiante
    const estudiante = estudiantes.find(e => 
      e.matricula.trim().toUpperCase() === matricula.toUpperCase()
    );

    if (!estudiante) {
      return res.status(404).json({ error: 'Estudiante no encontrado' });
    }

    // 6. Devolver datos seguros
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

  } catch (error) {
    console.error('Error en API:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor',
      detalle: error.message
    });
  }
}
