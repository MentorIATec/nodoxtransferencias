/**
 * CAMPUS CHECK-IN - LOOKUP API (Apps Script Web App)
 * Buscar estudiante por matrícula desde Google Sheets privado.
 */

const LOOKUP_CONFIG = {
  API_KEY: 'fj26_api_8wZ3nL1qY6hG0dR4sP2mV9tB5cX7kJ',
  ASIGNACIONES_SHEET: 'Asignaciones',
  MENTORES_SHEET: 'Datos mentor',
  MENTOR_EXCEPCIONES: {
    'mentor pendiente pasio': { mentor: 'Norman Ernesto Ramírez González', comunidad: 'Pasio' },
    'mentor(a) talenta pendiente': { mentor: 'Zoé Nohemí Montoya Campos', comunidad: 'Talenta' }
  },
  COLS_ASIGNACIONES: {
    MATRICULA: 1,  // A
    CAMPUS_ORIGEN: 2, // B
    MENTOR_ASIGNADO: 11, // K
    NOMBRE_COMPLETO: 13, // M
    NOMBRES: 14, // N
    APELLIDOS: 15, // O
    EMAIL: 17 // Q
  },
  COLS_MENTORES: {
    NOMBRE_MENTOR: 1, // A
    NICKNAME: 2, // B
    EMAIL: 4, // D
    CELULAR: 5, // E
    COMUNIDAD: 6 // F
  }
};

function doPost(e) {
  try {
    const body = parseBody(e);
    if (!body || body.api_key !== LOOKUP_CONFIG.API_KEY) {
      return jsonResponse({ error: 'Acceso no autorizado' }, 401);
    }

    const matricula = String(body.matricula || '').trim().toUpperCase();
    if (!/^[A-Z]\d{8}$/.test(matricula)) {
      return jsonResponse({ error: 'Matrícula inválida' }, 400);
    }

    const ss = SpreadsheetApp.getActive();
    const asignaciones = ss.getSheetByName(LOOKUP_CONFIG.ASIGNACIONES_SHEET);
    const mentores = ss.getSheetByName(LOOKUP_CONFIG.MENTORES_SHEET);
    if (!asignaciones || !mentores) {
      return jsonResponse({ error: 'Hojas no encontradas' }, 500);
    }

    const lastRow = asignaciones.getLastRow();
    if (lastRow < 2) {
      return jsonResponse({ error: 'Sin datos' }, 404);
    }

    const data = asignaciones.getRange(2, 1, lastRow - 1, asignaciones.getLastColumn()).getValues();
    let row = null;
    for (let i = 0; i < data.length; i++) {
      const value = String(data[i][LOOKUP_CONFIG.COLS_ASIGNACIONES.MATRICULA - 1] || '').trim().toUpperCase();
      if (value === matricula) {
        row = data[i];
        break;
      }
    }

    if (!row) {
      return jsonResponse({ error: 'Estudiante no encontrado' }, 404);
    }

    let mentorNombre = String(row[LOOKUP_CONFIG.COLS_ASIGNACIONES.MENTOR_ASIGNADO - 1] || '').trim();
    const mentorKey = normalizar(mentorNombre);
    let comunidadOverride = '';
    if (LOOKUP_CONFIG.MENTOR_EXCEPCIONES[mentorKey]) {
      mentorNombre = LOOKUP_CONFIG.MENTOR_EXCEPCIONES[mentorKey].mentor;
      comunidadOverride = LOOKUP_CONFIG.MENTOR_EXCEPCIONES[mentorKey].comunidad;
    }
    const mentorInfo = buscarMentor(mentores, mentorNombre);

    const fullname = String(row[LOOKUP_CONFIG.COLS_ASIGNACIONES.NOMBRE_COMPLETO - 1] || '').trim();
    const name = String(row[LOOKUP_CONFIG.COLS_ASIGNACIONES.NOMBRES - 1] || '').trim();
    const campus = String(row[LOOKUP_CONFIG.COLS_ASIGNACIONES.CAMPUS_ORIGEN - 1] || '').trim();

    const response = {
      matricula,
      fullnameEstudiante: fullname || `${name} ${String(row[LOOKUP_CONFIG.COLS_ASIGNACIONES.APELLIDOS - 1] || '').trim()}`.trim(),
      nameEstudiante: name,
      mentorFullname: mentorInfo.nombre || mentorNombre,
      mentorNickname: mentorInfo.nickname || (mentorNombre.split(' ')[0] || mentorNombre),
      comunidad: comunidadOverride || mentorInfo.comunidad || '',
      campusOrigen: campus,
      whatsappMentor: mentorInfo.celular || ''
    };

    return jsonResponse(response, 200);
  } catch (err) {
    return jsonResponse({ error: 'Error interno', detalle: err.message }, 500);
  }
}

function doGet(e) {
  const key = e && e.parameter ? e.parameter.key : '';
  if (key !== LOOKUP_CONFIG.API_KEY) {
    return jsonResponse({ error: 'Acceso no autorizado' }, 401);
  }
  return jsonResponse({ ok: true }, 200);
}

function parseBody(e) {
  if (!e || !e.postData || !e.postData.contents) return null;
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    return null;
  }
}

function buscarMentor(sheet, mentorNombre) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return {};
  const rows = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  const target = normalizar(mentorNombre);
  for (let i = 0; i < rows.length; i++) {
    const nombre = String(rows[i][LOOKUP_CONFIG.COLS_MENTORES.NOMBRE_MENTOR - 1] || '').trim();
    if (normalizar(nombre) === target) {
      return {
        nombre,
        nickname: String(rows[i][LOOKUP_CONFIG.COLS_MENTORES.NICKNAME - 1] || '').trim(),
        email: String(rows[i][LOOKUP_CONFIG.COLS_MENTORES.EMAIL - 1] || '').trim(),
        celular: String(rows[i][LOOKUP_CONFIG.COLS_MENTORES.CELULAR - 1] || '').trim(),
        comunidad: String(rows[i][LOOKUP_CONFIG.COLS_MENTORES.COMUNIDAD - 1] || '').trim()
      };
    }
  }
  return {};
}

function normalizar(value) {
  return value
    ? value
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
    : '';
}

function jsonResponse(obj, code) {
  const payload = Object.assign({ status: code }, obj);
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
