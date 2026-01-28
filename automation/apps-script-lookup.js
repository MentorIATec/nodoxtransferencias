/**
 * CAMPUS CHECK-IN - LOOKUP API (Apps Script Web App)
 * Buscar estudiante por matrícula desde Google Sheets privado.
 */

const LOOKUP_CONFIG = {
  API_KEY: 'fj26_api_8wZ3nL1qY6hG0dR4sP2mV9tB5cX7kJ',
  ASIGNACIONES_SHEET: 'Asignaciones',
  MENTORES_SHEET: 'Datos mentor',
  RESPONSES_SHEET: 'Respuestas de formulario1',
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
  },
  COLS_RESPONSES: {
    TIMESTAMP: 1, // A
    MATRICULA: 2, // B
    EMAIL: 3, // C
    NOMBRE: 4, // D
    MENTOR: 5, // E
    COMUNIDAD: 6, // F
    ASISTE: 7, // G
    FECHA_CONFIRMACION: 8, // H
    EXTRA: 9, // I
    STATUS: 10 // J
  }
};

function doPost(e) {
  try {
    const body = parseBody(e);
    if (!body || body.api_key !== LOOKUP_CONFIG.API_KEY) {
      return jsonResponse({ error: 'Acceso no autorizado' }, 401);
    }

    const action = String(body.action || 'lookup').toLowerCase();
    if (action === 'confirmacion') {
      return registrarConfirmacion(body);
    }

    const matricula = String(body.matricula || '').trim().toUpperCase();
    if (!/^[A-Z]\d{8}$/.test(matricula)) {
      return jsonResponse({ error: 'Matrícula inválida' }, 400);
    }

    const ss = SpreadsheetApp.getActive();
    const asignaciones = ss.getSheetByName(LOOKUP_CONFIG.ASIGNACIONES_SHEET);
    const mentores = ss.getSheetByName(LOOKUP_CONFIG.MENTORES_SHEET);
    const respuestas = ss.getSheetByName(LOOKUP_CONFIG.RESPONSES_SHEET);
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
    const email = String(row[LOOKUP_CONFIG.COLS_ASIGNACIONES.EMAIL - 1] || '').trim();

    const response = {
      matricula,
      fullnameEstudiante: fullname || `${name} ${String(row[LOOKUP_CONFIG.COLS_ASIGNACIONES.APELLIDOS - 1] || '').trim()}`.trim(),
      nameEstudiante: name,
      mentorFullname: mentorInfo.nombre || mentorNombre,
      mentorNickname: mentorInfo.nickname || (mentorNombre.split(' ')[0] || mentorNombre),
      comunidad: comunidadOverride || mentorInfo.comunidad || '',
      campusOrigen: campus,
      whatsappMentor: mentorInfo.celular || '',
      mentorAsignadoOriginal: String(row[LOOKUP_CONFIG.COLS_ASIGNACIONES.MENTOR_ASIGNADO - 1] || '').trim(),
      email: email,
      yaRegistrado: respuestas ? yaRegistrado(respuestas, matricula) : false
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

function registrarConfirmacion(body) {
  const matricula = String(body.matricula || '').trim().toUpperCase();
  if (!/^[A-Z]\d{8}$/.test(matricula)) {
    return jsonResponse({ error: 'Matrícula inválida' }, 400);
  }

  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(LOOKUP_CONFIG.RESPONSES_SHEET);
  if (!sheet) {
    return jsonResponse({ error: 'Hoja de respuestas no encontrada' }, 500);
  }

  if (yaRegistrado(sheet, matricula)) {
    return jsonResponse({ error: 'Registro ya existe' }, 409);
  }

  const now = new Date();
  const timestamp = formatTimestamp(now);
  const asistira = body.asistira === true || String(body.asistira || '').toLowerCase() === 'sí' || String(body.asistira || '').toLowerCase() === 'si'
    ? 'Sí'
    : 'No';

  const nombre = String(body.nombre || '').trim();
  const mentor = String(body.mentor || '').trim();
  const comunidad = String(body.comunidad || '').trim();
  const correo = String(body.correo || `${matricula.toLowerCase()}@tec.mx`).trim();
  const fechaConfirmacion = String(body.fecha_confirmacion || body.timestamp || timestamp).trim();
  const status = String(body.status || 'PENDIENTE WEB').trim();

  const nombreCorto = obtenerNombreCorto(nombre);
  const row = [];
  row[LOOKUP_CONFIG.COLS_RESPONSES.TIMESTAMP - 1] = now;
  row[LOOKUP_CONFIG.COLS_RESPONSES.MATRICULA - 1] = matricula;
  row[LOOKUP_CONFIG.COLS_RESPONSES.EMAIL - 1] = correo;
  row[LOOKUP_CONFIG.COLS_RESPONSES.NOMBRE - 1] = nombreCorto || nombre;
  row[LOOKUP_CONFIG.COLS_RESPONSES.MENTOR - 1] = mentor;
  row[LOOKUP_CONFIG.COLS_RESPONSES.COMUNIDAD - 1] = comunidad;
  row[LOOKUP_CONFIG.COLS_RESPONSES.ASISTE - 1] = asistira;
  row[LOOKUP_CONFIG.COLS_RESPONSES.FECHA_CONFIRMACION - 1] = fechaConfirmacion;
  row[LOOKUP_CONFIG.COLS_RESPONSES.EXTRA - 1] = '';
  row[LOOKUP_CONFIG.COLS_RESPONSES.STATUS - 1] = status;

  sheet.appendRow(row);
  const newRow = sheet.getLastRow();

  const enviarCorreo = body.enviarCorreo === true || String(body.enviarCorreo || '').toLowerCase() === 'true';
  if (enviarCorreo && typeof procesarEnvioCorreo === 'function') {
    try {
      procesarEnvioCorreo(sheet, newRow);
    } catch (err) {
      return jsonResponse({ ok: true, warning: 'Registro guardado, pero falló el envío de correo', detalle: err.message }, 200);
    }
  }

  return jsonResponse({ ok: true, row: newRow }, 200);
}

function yaRegistrado(sheet, matricula) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  const values = sheet.getRange(2, LOOKUP_CONFIG.COLS_RESPONSES.MATRICULA, lastRow - 1, 1).getValues();
  const target = matricula.trim().toUpperCase();
  return values.some(row => String(row[0] || '').trim().toUpperCase() === target);
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

function formatTimestamp(dateObj) {
  return Utilities.formatDate(dateObj, 'America/Mexico_City', 'dd/MM/yy, HH:mm');
}

function obtenerNombreCorto(nombreCompleto) {
  if (!nombreCompleto) return '';
  const value = nombreCompleto.toString().trim();
  const sinApellidos = value.includes(',') ? value.split(',').slice(1).join(',') : value;
  const tokens = sinApellidos.trim().split(/\s+/);
  return tokens[0] || sinApellidos.trim();
}
