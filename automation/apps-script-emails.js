/**
 * CAMPUS CHECK-IN - SISTEMA DE CORREOS AUTOMÁTICOS
 * Por: Karen A. Guzmán V. | Mentoría Estudiantil
 * Powered by: MentorIA Tools
 * Versión: 2.0 - Julio 2025
 *
 * CAMBIOS EN ESTA VERSIÓN:
 * - Eliminados todos los emojis para evitar problemas de visualización
 * - Estilos simplificados sin gradientes
 * - Integración con tabla "Datos mentor" para información completa
 * - Datos adicionales del mentor incluidos en correos
 */

CONFIG = {
  SPREADSHEET_ID: '152zYSSi8AtvVdKe0M_eQpI6xO56civZqFeMkHmW4jRo',
  RESPONSES_SHEET: 'Respuestas de formulario1',
  ASIGNACIONES_SHEET: 'Asignaciones',
  COLUMNAS: {
    TIMESTAMP: 1,           // A - Marca temporal
    MATRICULA: 2,           // B - Matrícula
    EMAIL: 3,               // C - Correo electrónico
    NOMBRE: 4,              // D - Nombre completo
    MENTOR_NOMBRE: 5,       // E - Mentor asignado
    COMUNIDAD: 6,           // F - Comunidad
    ASISTE: 7,              // G - ¿Asistirá al evento?
    FECHA_CONFIRMACION: 8,  // H - Fecha y hora de confirmación
    COLUMNA_2: 9,           // I - Columna 1 (dato adicional)
    STATUS_EMAIL: 10        // J - Estado de envío
  },
  HOJA_MENTORES: 'Datos mentor',
  COLUMNAS_MENTORES: {
    NOMBRE_MENTOR: 1,      // A - nombreMentor
    NICKNAME_MENTOR: 2,    // B - nicknameMentor
    FOTO_MENTOR: 3,        // C - fotoMentor
    EMAIL: 4,              // D - Email
    CELULAR: 5,            // E - Celular
    COMUNIDAD: 6,          // F - Comunidad
    INSTAGRAM: 7           // G - Instagram
  },
  MENTOR_EXCEPCIONES: {
    'mentor pendiente pasio': { mentor: 'Norman Ernesto Ramírez González', comunidad: 'Pasio' },
    'mentor(a) talenta pendiente': { mentor: 'Zoé Nohemí Montoya Campos', comunidad: 'Talenta' }
  },
  COLUMNAS_ASIGNACIONES: {
    MATRICULA: 1,          // A - Matricula
    MENTOR_NOMBRE: 11,     // K - Mentor(a) Asignado(a) FJ26
    NOMBRES: 14,           // N - Nombres
    APELLIDOS: 15,         // O - Apellidos
    EMAIL: 17              // Q - Email
  },
  EVENTO: {
    nombre: "Bienvenida de Transferencias",
    fecha: "Viernes 6 de febrero de 2026",
    horario: "9:00 a.m. - 12:00 p.m.",
    lugar: "Auditorio Luis Elizondo",
    campus: "Campus Monterrey",
    mapas_url: "https://transferencias-fj26.vercel.app/mapa-evento.html",
    confirmacion_url: "https://transferencias-fj26.vercel.app"
  },
  TEMPLATES: {
    VARIANT: "B"
  },
  FORM: {
    GOOGLE_FORM_URL: "https://docs.google.com/forms/d/e/1FAIpQLSfiW5dCM6-eQoesb2c-l_srfZrl_0upjLZzOqTPs2sQ73FAgg/formResponse",
    FORM_FIELDS: {
      matricula: "entry.1607137015",
      nombre: "entry.1566331032",
      mentor: "entry.710554786",
      comunidad: "entry.1007914499",
      asistira: "entry.52874123",
      timestamp: "entry.829961349",
      correo: "entry.1235512351"
    },
    DLUT: ""
  },
  EMAIL: {
    REMITENTE: "kareng@tec.mx",
    REMITENTE_NOMBRE: "Comité de Transferencias Monterrey",
    MENTOREO: "mentoreo.mty@servicios.tec.mx",
    INLINE_IMAGES: {
      fj26_header: "https://transferencias-fj26.vercel.app/assets/FJ26.png",
      fj26_sticker: "https://transferencias-fj26.vercel.app/assets/Ejemplo%20de%20modelo%20de%20sticker.png",
      ayc_banner: "https://transferencias-fj26.vercel.app/assets/Banner%20AyC.jpg",
      ayc_cartelera: "https://transferencias-fj26.vercel.app/assets/Cartelera%20AyC%20AD25.jpg"
    },
    FIRMA: `─────────────────────────────────────────────────
Comité de Transferencias Monterrey
Mentoría y Bienestar Estudiantil
Tecnológico de Monterrey • Campus Monterrey
─────────────────────────────────────────────────`
  }
};

function getSpreadsheet() {
  return CONFIG.SPREADSHEET_ID
    ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    : SpreadsheetApp.getActive();
}

function getResponsesSheet() {
  const ss = getSpreadsheet();
  return ss.getSheetByName(CONFIG.RESPONSES_SHEET) || ss.getActiveSheet();
}

function renderTemplate(name, data) {
  const template = HtmlService.createTemplateFromFile(name);
  Object.keys(data).forEach(key => {
    template[key] = data[key];
  });
  return template.evaluate().getContent();
}

function templateName(base) {
  return `${base}-${CONFIG.TEMPLATES.VARIANT}`;
}

function normalizarTexto(value) {
  return value
    ? value
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim()
    : "";
}

function obtenerNombreCorto(nombreCompleto) {
  if (!nombreCompleto) return "";
  const value = nombreCompleto.toString().trim();
  const sinApellidos = value.includes(",") ? value.split(",").slice(1).join(",") : value;
  const tokens = sinApellidos.trim().split(/\s+/);
  return tokens[0] || sinApellidos.trim();
}

function construirSaludo(datos) {
  const nombreCorto = obtenerNombreCorto(datos.nombre);
  const matricula = datos.matricula ? datos.matricula.toString().trim() : "";
  const saludo = nombreCorto ? `Hola ${nombreCorto} (${matricula}),` : `Hola (${matricula}),`;
  return { nombreCorto, saludo };
}

function esAsistenciaPositiva(valor) {
  const texto = normalizarTexto(valor);
  return texto.startsWith("si") || texto.includes("si");
}
/**
 * Menú personalizado al abrir la hoja
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Campus Check‑In')
    .addItem('Reconfigurar trigger','configurarTriggerAutomatico')
    .addItem('Procesar pendientes','procesarFilasPendientes')
    .addItem('Ver estadísticas','verEstadisticasCorreos')
    .addItem('Enviar reporte de errores','enviarReporteErroresDiarios')
    .addItem('Validar mentores vs Asignaciones','validarMentoresAsignaciones')
    .addItem('Enviar lote prueba','enviarLotePruebaGuiado')
    .addItem('Enviar invitación a Asignaciones','enviarInvitacionATodos')
    .addItem('Enviar aviso general 1','enviarAvisoGeneral1')
    .addItem('Enviar aviso general 2','enviarAvisoGeneral2')
    .addItem('Enviar aviso general 3','enviarAvisoGeneral3')
    .addItem('Generar README','generarReadme')
    .addToUi();
}

/**
 * Configura trigger onFormSubmit y trigger diario para reporte de errores
 */
function configurarTriggerAutomatico() {
  try {
    const ss = getSpreadsheet();
    // Eliminar triggers previos
    ScriptApp.getProjectTriggers().forEach(t => {
      const fn = t.getHandlerFunction();
      if (fn === 'onFormSubmit' || fn === 'enviarReporteErroresDiarios') {
        ScriptApp.deleteTrigger(t);
      }
    });
    // Trigger en envíos de formulario
    ScriptApp.newTrigger('onFormSubmit')
      .forSpreadsheet(ss)
      .onFormSubmit()
      .create();
    console.log('Trigger onFormSubmit configurado');
    // Trigger diario a las 18:00 para reporte de errores
    ScriptApp.newTrigger('enviarReporteErroresDiarios')
      .timeBased()
      .atHour(18)
      .everyDays(1)
      .create();
    console.log('Trigger diario enviarReporteErroresDiarios configurado');

    SpreadsheetApp.getUi().alert(
      'Triggers configurados',
      '✅ onFormSubmit\n✅ Reporte diario de errores (18:00)\n\n' +
      'Ver menú Campus Check‑In para más opciones.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  } catch (e) {
    SpreadsheetApp.getUi().alert('Error configurando triggers', e.message, SpreadsheetApp.getUi().ButtonSet.OK);
    console.error(e);
    throw e;
  }
}

/**
 * Envía un correo con resumen de todas las filas con estado ERROR
 */
function enviarReporteErroresDiarios() {
  const sheet = getResponsesSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const statuses = sheet.getRange(2, CONFIG.COLUMNAS.STATUS_EMAIL, lastRow - 1).getValues();
  const errores = [];

  statuses.forEach((row, i) => {
    const status = row[0].toString();
    if (status.startsWith('ERROR')) {
      const fila = i + 2;
      const nombre = sheet.getRange(fila, CONFIG.COLUMNAS.NOMBRE).getValue();
      const email = sheet.getRange(fila, CONFIG.COLUMNAS.EMAIL).getValue();
      errores.push(`Fila ${fila}: ${status} (Estudiante: ${nombre}, Email: ${email})`);
    }
  });
  if (!errores.length) return;

  const body = 'Resumen de errores en envíos de correo automático:\n\n' + errores.join('\n');
  MailApp.sendEmail({
    to: CONFIG.EMAIL.MENTOREO,
    subject: 'Reporte diario de errores - Campus Check‑In',
    body: body
  });
  console.log('Reporte de errores enviado:', errores.length);
}

/**
 * Genera o actualiza la hoja 'README' con documentación interna
 */
function generarReadme() {
  const ss = getSpreadsheet();
  let readme = ss.getSheetByName('README');
  if (!readme) readme = ss.insertSheet('README', 0);
  else readme.clear();

  const lines = [
    ['README - Campus Check‑In'],
    [''],
    ['**Columnas del sheet principal**'],
    ['A: TIMESTAMP - Marca temporal del envío'],
    ['B: MATRICULA - Matrícula del estudiante'],
    ['C: EMAIL - Correo del estudiante'],
    ['D: NOMBRE - Nombre completo del estudiante'],
    ['E: MENTOR_NOMBRE - Mentor asignado'],
    ['F: COMUNIDAD - Comunidad'],
    ['G: ASISTE - Asistencia al evento (SI/NO)'],
    ['H: FECHA_CONFIRMACION - Fecha y hora de la confirmación'],
    ['I: COLUMNA_2 - Columna 1 (dato adicional)'],
    ['J: STATUS_EMAIL - Estado (OK o ERROR)'],
    [''],
    ['**Menú Campus Check‑In** (Extensiones → Campus Check‑In)'],
    ['- Reconfigurar trigger'],
    ['- Procesar pendientes'],
    ['- Ver estadísticas'],
    ['- Enviar reporte de errores'],
    ['- Generar README'],
    [''],
    ['**Contactos**'],
    [`Karen A. Guzmán V. (${CONFIG.EMAIL.REMITENTE})`],
    [`Mentoría Estudiantil (${CONFIG.EMAIL.MENTOREO})`]
  ];
  readme.getRange(1, 1, lines.length, 1).setValues(lines);
  SpreadsheetApp.getUi().alert('README generado/actualizado en la pestaña README');
}

/**
 * FUNCIÓN PRINCIPAL - TRIGGER AUTOMÁTICO
 */
function onFormSubmit(e) {
  try {
    // Procesamiento de cada nueva respuesta
    const sheet = e.source.getActiveSheet();
    const fila  = e.range.getRow();
    if (fila < 2) return; // saltar headers

    // Evitar reenvío si ya fue enviado
    const status = sheet.getRange(fila, CONFIG.COLUMNAS.STATUS_EMAIL).getValue();
    if (status && status.toString().includes('OK')) return;

    procesarEnvioCorreo(sheet, fila);
  } catch (error) {
    console.error("Error en onFormSubmit:", error);
    // Registrar el error en la columna de estatus
    const sheet = getResponsesSheet();
    const ultimaFila = sheet.getLastRow();
    const timestamp = Utilities.formatDate(new Date(), "America/Mexico_City", "dd/MM/yy, HH:mm");
    sheet.getRange(ultimaFila, CONFIG.COLUMNAS.STATUS_EMAIL)
         .setValue(`ERROR ${timestamp} | ${error.message}`);
  }
}

/**
 * BUSCAR DATOS DEL MENTOR EN LA TABLA "DATOS MENTOR"
 */
function buscarDatosMentor(nombreMentor) {
  try {
    console.log(`Buscando datos del mentor: ${nombreMentor}`);

    const spreadsheet = getSpreadsheet();
    const hojaMentores = spreadsheet.getSheetByName(CONFIG.HOJA_MENTORES);

    if (!hojaMentores) {
      console.error("No se encontró la hoja 'Datos mentor'");
      return null;
    }

    const ultimaFila = hojaMentores.getLastRow();
    if (ultimaFila < 2) return null;

    // Obtener todos los datos de mentores
    const datosMentores = hojaMentores.getRange(2, 1, ultimaFila - 1, 7).getValues();

    // Buscar el mentor por nombre
    for (let i = 0; i < datosMentores.length; i++) {
      const nombreMentorTabla = datosMentores[i][CONFIG.COLUMNAS_MENTORES.NOMBRE_MENTOR - 1];

      // Limpiar y normalizar ambos nombres para la comparación
      const nombreTablaLimpio = nombreMentorTabla ? nombreMentorTabla.toString().toLowerCase().trim() : '';
      const nombreBusquedaLimpio = nombreMentor.toLowerCase().trim();

      // Comparar nombres
      if (nombreTablaLimpio === nombreBusquedaLimpio) {
        console.log(`Mentor encontrado: ${nombreMentorTabla}`);

        const datosMentor = {
          nombreCompleto: String(datosMentores[i][CONFIG.COLUMNAS_MENTORES.NOMBRE_MENTOR - 1] || ''),
          nickname: String(datosMentores[i][CONFIG.COLUMNAS_MENTORES.NICKNAME_MENTOR - 1] || ''),
          foto: String(datosMentores[i][CONFIG.COLUMNAS_MENTORES.FOTO_MENTOR - 1] || ''),
          email: String(datosMentores[i][CONFIG.COLUMNAS_MENTORES.EMAIL - 1] || ''),
          celular: datosMentores[i][CONFIG.COLUMNAS_MENTORES.CELULAR - 1] ? String(datosMentores[i][CONFIG.COLUMNAS_MENTORES.CELULAR - 1]) : null,
          comunidad: String(datosMentores[i][CONFIG.COLUMNAS_MENTORES.COMUNIDAD - 1] || ''),
          instagram: String(datosMentores[i][CONFIG.COLUMNAS_MENTORES.INSTAGRAM - 1] || '')
        };

        console.log('Datos del mentor:', datosMentor);
        return datosMentor;
      }
    }

    console.log(`No se encontraron datos adicionales para el mentor: ${nombreMentor}`);
    return null;

  } catch (error) {
    console.error("Error buscando datos del mentor:", error);
    return null;
  }
}

/**
 * PROCESAR ENVÍO DE CORREO
 */
function procesarEnvioCorreo(sheet, fila) {
  try {
    console.log(`Procesando correo para fila ${fila}...`);

    const datos = obtenerDatosFila(sheet, fila);

    if (!validarDatos(datos)) {
      throw new Error("Datos incompletos en la respuesta");
    }

    // Buscar datos adicionales del mentor
    const datosMentor = buscarDatosMentor(datos.mentorNombre);

    if (!datosMentor) {
      console.log(`No se encontraron datos adicionales del mentor: ${datos.mentorNombre}`);
    }

    // Combinar datos
    const datosCompletos = {
      ...datos,
      mentor: datosMentor ? {
        nombreCompleto: datosMentor.nombreCompleto,
        nickname: datosMentor.nickname,
        celular: datosMentor.celular,
        email: datosMentor.email,
        instagram: datosMentor.instagram
      } : {
        nombreCompleto: datos.mentorNombre,
        nickname: datos.mentorNombre.split(' ')[0], // Usar primer nombre si no hay datos
        celular: null,
        email: null,
        instagram: null
      }
    };

    const asistiráEvento = esAsistenciaPositiva(datos.asiste);

    let asunto, cuerpoHtml;

    if (asistiráEvento) {
      asunto = "Confirmación recibida - Te esperamos en Bienvenida de Transferencias";
      cuerpoHtml = generarCorreoConfirmacion(datosCompletos);
    } else {
      asunto = "Confirmación recibida - Te acompañamos en tu llegada a Monterrey";
      cuerpoHtml = generarCorreoNoAsiste(datosCompletos);
    }

    const enviado = enviarCorreo(datos.email, asunto, cuerpoHtml, datosCompletos);

    if (enviado) {
      const timestamp = Utilities.formatDate(new Date(), "America/Mexico_City", "dd/MM/yy, HH:mm");
      const tipoConfirmacion = asistiráEvento ? "SI" : "NO";
      const status = `OK ${timestamp} | Confirmación ${tipoConfirmacion}`;

      sheet.getRange(fila, CONFIG.COLUMNAS.STATUS_EMAIL).setValue(status);

      console.log(`Correo enviado exitosamente a ${datos.email}`);
    }

  } catch (error) {
    console.error(`Error procesando fila ${fila}:`, error);

    const timestamp = Utilities.formatDate(new Date(), "America/Mexico_City", "dd/MM/yy, HH:mm");
    sheet.getRange(fila, CONFIG.COLUMNAS.STATUS_EMAIL).setValue(`ERROR ${timestamp} | ${error.message}`);

    throw error;
  }
}

/**
 * OBTENER DATOS DE FILA
 */
function obtenerDatosFila(sheet, fila) {
  const valores = sheet.getRange(fila, 1, 1, 10).getValues()[0];

  return {
    timestamp: valores[CONFIG.COLUMNAS.TIMESTAMP - 1],
    columna2: valores[CONFIG.COLUMNAS.COLUMNA_2 - 1],
    matricula: String(valores[CONFIG.COLUMNAS.MATRICULA - 1] || '').trim(),
    nombre: String(valores[CONFIG.COLUMNAS.NOMBRE - 1] || '').trim(),
    mentorNombre: String(valores[CONFIG.COLUMNAS.MENTOR_NOMBRE - 1] || '').trim(),
    comunidad: String(valores[CONFIG.COLUMNAS.COMUNIDAD - 1] || '').trim(),
    asiste: String(valores[CONFIG.COLUMNAS.ASISTE - 1] || '').trim(),
    fechaConfirmacion: valores[CONFIG.COLUMNAS.FECHA_CONFIRMACION - 1],
    email: String(valores[CONFIG.COLUMNAS.EMAIL - 1] || '').trim(),
    statusEmail: valores[CONFIG.COLUMNAS.STATUS_EMAIL - 1]
  };
}

/**
 * VALIDAR DATOS
 */
function validarDatos(datos) {
  const camposRequeridos = ['email', 'nombre', 'asiste', 'mentorNombre'];

  for (let campo of camposRequeridos) {
    if (!datos[campo] || datos[campo].toString().trim() === '') {
      console.error(`Campo requerido faltante: ${campo}`);
      return false;
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(datos.email)) {
    console.error(`Email inválido: ${datos.email}`);
    return false;
  }

  return true;
}

/**
 * GENERAR CORREO - CONFIRMACIÓN SÍ ASISTE
 */
function generarCorreoConfirmacion(datos) {
  const { nombreCorto, saludo } = construirSaludo(datos);
  const contactoMentor = datos.mentor && datos.mentor.celular
    ? `<p style="margin: 8px 0;"><strong>WhatsApp:</strong> ${datos.mentor.celular}</p>`
    : '';

  const instagramMentor = datos.mentor && datos.mentor.instagram
    ? `<p style="margin: 8px 0;"><strong>Instagram:</strong> @${datos.mentor.instagram}</p>`
    : '';

  const emailMentor = datos.mentor && datos.mentor.email
    ? `<p style="margin: 8px 0;"><strong>Email:</strong> ${datos.mentor.email}</p>`
    : '';

  const whatsappMentor = datos.mentor && datos.mentor.celular
    ? `https://wa.me/${String(datos.mentor.celular).replace(/\D/g, '')}?text=Hola ${datos.mentor.nickname ? datos.mentor.nickname : datos.mentorNombre}, soy ${nombreCorto} (${datos.matricula}) de la comunidad ${datos.comunidad}.`
    : '';

  return renderTemplate(templateName('confirmacion-si'), {
    datos,
    CONFIG,
    contactoMentor,
    instagramMentor,
    emailMentor,
    whatsappMentor,
    nombreCorto,
    saludo
  });
}

/**
 * GENERAR CORREO - NO ASISTE
 */
function generarCorreoNoAsiste(datos) {
  const { nombreCorto, saludo } = construirSaludo(datos);
  const contactoMentor = datos.mentor && datos.mentor.celular
    ? `<p style="margin: 8px 0;"><strong>WhatsApp:</strong> ${datos.mentor.celular}</p>`
    : '';

  const instagramMentor = datos.mentor && datos.mentor.instagram
    ? `<p style="margin: 8px 0;"><strong>Instagram:</strong> @${datos.mentor.instagram}</p>`
    : '';

  const emailMentor = datos.mentor && datos.mentor.email
    ? `<p style="margin: 8px 0;"><strong>Email:</strong> ${datos.mentor.email}</p>`
    : '';

  const whatsappMentor = datos.mentor && datos.mentor.celular
    ? `https://wa.me/${String(datos.mentor.celular).replace(/\D/g, '')}?text=Hola ${datos.mentor.nickname ? datos.mentor.nickname : datos.mentorNombre}, soy ${nombreCorto} (${datos.matricula}) de la comunidad ${datos.comunidad}. No podré asistir al evento pero me gustaría conocerte.`
    : '';

  return renderTemplate(templateName('confirmacion-no'), {
    datos,
    CONFIG,
    contactoMentor,
    instagramMentor,
    emailMentor,
    whatsappMentor,
    nombreCorto,
    saludo
  });
}

/**
 * ENVIAR CORREO
 */
function enviarCorreo(destinatario, asunto, cuerpoHtml, datos) {
  try {
    console.log(`Enviando correo a: ${destinatario}`);

    const opciones = {
      htmlBody: cuerpoHtml,
      name: CONFIG.EMAIL.REMITENTE_NOMBRE,
      replyTo: CONFIG.EMAIL.REMITENTE,
      attachments: [],
      noReply: false
    };

    const inlineImages = {};
    const inlineConfig = CONFIG.EMAIL.INLINE_IMAGES || {};
    Object.keys(inlineConfig).forEach(key => {
      const url = inlineConfig[key];
      if (!url) return;
      try {
        inlineImages[key] = UrlFetchApp.fetch(url).getBlob().setName(key);
      } catch (err) {
        console.error(`Error cargando imagen inline ${key}:`, err);
      }
    });
    if (Object.keys(inlineImages).length) {
      opciones.inlineImages = inlineImages;
    }

    GmailApp.sendEmail(destinatario, asunto, '', opciones);

    console.log(`Correo enviado exitosamente desde ${CONFIG.EMAIL.REMITENTE}`);

    return true;

  } catch (error) {
    console.error(`Error enviando correo a ${destinatario}:`, error);
    throw error;
  }
}

/**
 * ENVIAR CORREO DE PRUEBA CON TEMPLATE ESPECÍFICO
 * Ejemplo: enviarCorreoPrueba(2, 'email-invitacion', 'Prueba Invitación FJ26')
 */
function enviarCorreoPrueba(fila, templateBase, asunto) {
  const sheet = getResponsesSheet();
  const ultimaFila = sheet.getLastRow();

  if (fila < 2 || fila > ultimaFila) {
    throw new Error(`Fila inválida: ${fila}. Última fila: ${ultimaFila}`);
  }

  const datos = obtenerDatosFila(sheet, fila);
  if (!validarDatos(datos)) {
    throw new Error('Los datos de la fila no son válidos para la prueba');
  }

  const datosMentor = buscarDatosMentor(datos.mentorNombre);
  const datosCompletos = {
    ...datos,
    mentor: datosMentor ? {
      nombreCompleto: datosMentor.nombreCompleto,
      nickname: datosMentor.nickname,
      celular: datosMentor.celular,
      email: datosMentor.email,
      instagram: datosMentor.instagram
    } : {
      nombreCompleto: datos.mentorNombre,
      nickname: datos.mentorNombre.split(' ')[0],
      celular: null,
      email: null,
      instagram: null
    }
  };

  const contactoMentor = datosCompletos.mentor && datosCompletos.mentor.celular
    ? `<p style="margin: 8px 0;"><strong>WhatsApp:</strong> ${datosCompletos.mentor.celular}</p>`
    : '';
  const instagramMentor = datosCompletos.mentor && datosCompletos.mentor.instagram
    ? `<p style="margin: 8px 0;"><strong>Instagram:</strong> @${datosCompletos.mentor.instagram}</p>`
    : '';
  const emailMentor = datosCompletos.mentor && datosCompletos.mentor.email
    ? `<p style="margin: 8px 0;"><strong>Email:</strong> ${datosCompletos.mentor.email}</p>`
    : '';
  const { nombreCorto, saludo } = construirSaludo(datosCompletos);
  const whatsappMentor = datosCompletos.mentor && datosCompletos.mentor.celular
    ? `https://wa.me/${String(datosCompletos.mentor.celular).replace(/\D/g, '')}?text=Hola ${datosCompletos.mentor.nickname ? datosCompletos.mentor.nickname : datosCompletos.mentorNombre}, soy ${nombreCorto} (${datosCompletos.matricula}) de la comunidad ${datosCompletos.comunidad}.`
    : '';

  const templateVars = {
    datos: datosCompletos,
    CONFIG,
    contactoMentor,
    instagramMentor,
    emailMentor,
    whatsappMentor,
    nombreCorto,
    saludo
  };

  const html = renderTemplate(templateName(templateBase), templateVars);
  const subject = asunto || `Prueba ${templateBase} FJ26`;
  enviarCorreo(datosCompletos.email, subject, html, datosCompletos);
}

/**
 * ENVÍO GUIADO DE LOTE DE PRUEBA
 * Permite probar distintos templates (invitación / recordatorios / confirmaciones)
 * sin afectar a toda la base.
 */
function enviarLotePruebaGuiado() {
  const ui = SpreadsheetApp.getUi();
  const templateResp = ui.prompt(
    'Enviar lote prueba',
    'Template base (ej: email-invitacion, email-recordatorio-1, email-recordatorio-2, confirmacion-si, confirmacion-no):',
    ui.ButtonSet.OK_CANCEL
  );
  if (templateResp.getSelectedButton() !== ui.Button.OK) return;
  const templateBase = templateResp.getResponseText().trim();
  if (!templateBase) return;

  const cantidadResp = ui.prompt('Cantidad', '¿Cuántas filas quieres enviar? (ej: 3)', ui.ButtonSet.OK_CANCEL);
  if (cantidadResp.getSelectedButton() !== ui.Button.OK) return;
  const cantidad = parseInt(cantidadResp.getResponseText().trim(), 10);
  if (!cantidad || cantidad < 1) {
    ui.alert('Cantidad inválida');
    return;
  }

  const filaResp = ui.prompt('Fila inicio', '¿Desde qué fila? (ej: 2)', ui.ButtonSet.OK_CANCEL);
  if (filaResp.getSelectedButton() !== ui.Button.OK) return;
  const filaInicio = parseInt(filaResp.getResponseText().trim(), 10);
  if (!filaInicio || filaInicio < 2) {
    ui.alert('Fila de inicio inválida');
    return;
  }

  const destinatarioResp = ui.prompt(
    'Destinatario de prueba',
    'Email destino (deja vacío para usar el correo de cada fila):',
    ui.ButtonSet.OK_CANCEL
  );
  if (destinatarioResp.getSelectedButton() !== ui.Button.OK) return;
  const destinatarioOverride = destinatarioResp.getResponseText().trim();

  const asuntoResp = ui.prompt(
    'Asunto',
    'Asunto del correo (deja vacío para asunto default):',
    ui.ButtonSet.OK_CANCEL
  );
  if (asuntoResp.getSelectedButton() !== ui.Button.OK) return;
  const asunto = asuntoResp.getResponseText().trim();

  let enviados = 0;
  let errores = 0;
  for (let i = 0; i < cantidad; i++) {
    const fila = filaInicio + i;
    try {
      if (destinatarioOverride) {
        enviarCorreoPruebaOverride(fila, templateBase, asunto, destinatarioOverride);
      } else {
        enviarCorreoPrueba(fila, templateBase, asunto);
      }
      enviados++;
      Utilities.sleep(1000);
    } catch (err) {
      errores++;
      console.error(`Error en fila ${fila}:`, err);
    }
  }

  ui.alert(
    'Lote de prueba terminado',
    `Template: ${templateBase}\nEnviados: ${enviados}\nErrores: ${errores}`,
    ui.ButtonSet.OK
  );
}

function enviarCorreoPruebaOverride(fila, templateBase, asunto, destinatarioOverride) {
  const sheet = getResponsesSheet();
  const ultimaFila = sheet.getLastRow();
  if (fila < 2 || fila > ultimaFila) {
    throw new Error(`Fila inválida: ${fila}. Última fila: ${ultimaFila}`);
  }

  const datos = obtenerDatosFila(sheet, fila);
  if (!validarDatos(datos)) {
    throw new Error('Los datos de la fila no son válidos para la prueba');
  }

  const datosMentor = buscarDatosMentor(datos.mentorNombre);
  const datosCompletos = {
    ...datos,
    mentor: datosMentor ? {
      nombreCompleto: datosMentor.nombreCompleto,
      nickname: datosMentor.nickname,
      celular: datosMentor.celular,
      email: datosMentor.email,
      instagram: datosMentor.instagram
    } : {
      nombreCompleto: datos.mentorNombre,
      nickname: datos.mentorNombre.split(' ')[0],
      celular: null,
      email: null,
      instagram: null
    }
  };

  const contactoMentor = datosCompletos.mentor && datosCompletos.mentor.celular
    ? `<p style="margin: 8px 0;"><strong>WhatsApp:</strong> ${datosCompletos.mentor.celular}</p>`
    : '';
  const instagramMentor = datosCompletos.mentor && datosCompletos.mentor.instagram
    ? `<p style="margin: 8px 0;"><strong>Instagram:</strong> @${datosCompletos.mentor.instagram}</p>`
    : '';
  const emailMentor = datosCompletos.mentor && datosCompletos.mentor.email
    ? `<p style="margin: 8px 0;"><strong>Email:</strong> ${datosCompletos.mentor.email}</p>`
    : '';
  const { nombreCorto, saludo } = construirSaludo(datosCompletos);
  const whatsappMentor = datosCompletos.mentor && datosCompletos.mentor.celular
    ? `https://wa.me/${String(datosCompletos.mentor.celular).replace(/\D/g, '')}?text=Hola ${datosCompletos.mentor.nickname ? datosCompletos.mentor.nickname : datosCompletos.mentorNombre}, soy ${nombreCorto} (${datosCompletos.matricula}) de la comunidad ${datosCompletos.comunidad}.`
    : '';

  const templateVars = {
    datos: datosCompletos,
    CONFIG,
    contactoMentor,
    instagramMentor,
    emailMentor,
    whatsappMentor,
    nombreCorto,
    saludo
  };

  const html = renderTemplate(templateName(templateBase), templateVars);
  const subject = asunto || `Prueba ${templateBase} FJ26`;
  enviarCorreo(destinatarioOverride, subject, html, datosCompletos);
}

function obtenerDatosDesdeAsignaciones(row) {
  const matricula = String(row[CONFIG.COLUMNAS_ASIGNACIONES.MATRICULA - 1] || '').trim();
  const nombres = String(row[CONFIG.COLUMNAS_ASIGNACIONES.NOMBRES - 1] || '').trim();
  const apellidos = String(row[CONFIG.COLUMNAS_ASIGNACIONES.APELLIDOS - 1] || '').trim();
  const mentorAsignado = String(row[CONFIG.COLUMNAS_ASIGNACIONES.MENTOR_NOMBRE - 1] || '').trim();
  const email = String(row[CONFIG.COLUMNAS_ASIGNACIONES.EMAIL - 1] || '').trim();

  const mentorKey = normalizarTexto(mentorAsignado);
  let mentorNombre = mentorAsignado;
  let comunidadOverride = '';
  if (CONFIG.MENTOR_EXCEPCIONES[mentorKey]) {
    mentorNombre = CONFIG.MENTOR_EXCEPCIONES[mentorKey].mentor;
    comunidadOverride = CONFIG.MENTOR_EXCEPCIONES[mentorKey].comunidad;
  }

  const datosMentor = buscarDatosMentor(mentorNombre);
  const comunidad = comunidadOverride || (datosMentor ? datosMentor.comunidad : '');
  const nombreCompleto = `${nombres} ${apellidos}`.trim();

  return {
    matricula,
    nombre: nombres,
    mentorNombre: mentorNombre,
    comunidad,
    email,
    mentor: datosMentor ? {
      nombreCompleto: datosMentor.nombreCompleto,
      nickname: datosMentor.nickname,
      celular: datosMentor.celular,
      email: datosMentor.email,
      instagram: datosMentor.instagram
    } : {
      nombreCompleto: mentorNombre,
      nickname: mentorNombre.split(' ')[0] || mentorNombre,
      celular: null,
      email: null,
      instagram: null
    },
    nombreCompleto
  };
}

function enviarInvitacionATodos() {
  enviarAvisoAsignaciones('email-invitacion', 'Bienvenida de Transferencias FJ26 · Vive tu primera experiencia en Campus Monterrey');
}

function enviarAvisoGeneral1() {
  enviarAvisoAsignaciones('email-aviso-general-1', 'Aviso general 1 · Bienvenida de Transferencias FJ26');
}

function enviarAvisoGeneral2() {
  enviarAvisoAsignaciones('email-aviso-general-2', 'Aviso general 2 · Prepárate para el clima en Monterrey');
}

function enviarAvisoGeneral3() {
  enviarAvisoAsignaciones('email-aviso-general-3', 'Aviso general 3 · ¡Ya es mañana!');
}

function enviarAvisoAsignaciones(templateBase, asunto) {
  const ui = SpreadsheetApp.getUi();
  const confirmResp = ui.prompt(
    'Confirmación de envío',
    'Escribe ENVIAR para continuar con el envío masivo a Asignaciones.',
    ui.ButtonSet.OK_CANCEL
  );
  if (confirmResp.getSelectedButton() !== ui.Button.OK) return;
  if (confirmResp.getResponseText().trim().toUpperCase() !== 'ENVIAR') {
    ui.alert('Confirmación no válida. Se canceló el envío.');
    return;
  }

  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.ASIGNACIONES_SHEET);
  if (!sheet) {
    ui.alert('No se encontró la hoja Asignaciones.');
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    ui.alert('No hay datos en Asignaciones.');
    return;
  }

  const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  let enviados = 0;
  let errores = 0;

  for (let i = 0; i < data.length; i++) {
    try {
      const datosBase = obtenerDatosDesdeAsignaciones(data[i]);
      if (!datosBase.email) {
        errores++;
        continue;
      }

      const contactoMentor = datosBase.mentor && datosBase.mentor.celular
        ? `<p style="margin: 8px 0;"><strong>WhatsApp:</strong> ${datosBase.mentor.celular}</p>`
        : '';
      const instagramMentor = datosBase.mentor && datosBase.mentor.instagram
        ? `<p style="margin: 8px 0;"><strong>Instagram:</strong> @${datosBase.mentor.instagram}</p>`
        : '';
      const emailMentor = datosBase.mentor && datosBase.mentor.email
        ? `<p style="margin: 8px 0;"><strong>Email:</strong> ${datosBase.mentor.email}</p>`
        : '';
      const { nombreCorto, saludo } = construirSaludo({
        nombre: datosBase.nombre,
        matricula: datosBase.matricula
      });
      const whatsappMentor = datosBase.mentor && datosBase.mentor.celular
        ? `https://wa.me/${String(datosBase.mentor.celular).replace(/\D/g, '')}?text=Hola ${datosBase.mentor.nickname ? datosBase.mentor.nickname : datosBase.mentorNombre}, soy ${nombreCorto} (${datosBase.matricula}) de la comunidad ${datosBase.comunidad}.`
        : '';

      const templateVars = {
        datos: {
          ...datosBase,
          nombre: datosBase.nombre,
          mentorNombre: datosBase.mentorNombre
        },
        CONFIG,
        contactoMentor,
        instagramMentor,
        emailMentor,
        whatsappMentor,
        nombreCorto,
        saludo
      };

      const html = renderTemplate(templateName(templateBase), templateVars);
      enviarCorreo(datosBase.email, asunto, html, datosBase);
      enviados++;
      Utilities.sleep(1000);
    } catch (err) {
      errores++;
      console.error(`Error en fila ${i + 2}:`, err);
    }
  }

  ui.alert(
    'Envío masivo terminado',
    `Template: ${templateBase}\nEnviados: ${enviados}\nErrores: ${errores}`,
    ui.ButtonSet.OK
  );
}

/**
 * VALIDAR ACCESO A VERCEL Y ENVÍO A GOOGLE FORMS
 * NOTA: Esto genera una respuesta real en el Form.
 */
function validarIntegraciones(matricula) {
  const vercelUrl = CONFIG.EVENTO.confirmacion_url;
  let vercelStatus = '';
  if (vercelUrl) {
    const resp = UrlFetchApp.fetch(vercelUrl, { muteHttpExceptions: true });
    vercelStatus = String(resp.getResponseCode());
  }

  const sheet = getResponsesSheet();
  const timestamp = Utilities.formatDate(new Date(), 'America/Mexico_City', 'dd/MM/yy, HH:mm');
  const row = [
    timestamp,
    matricula || 'A00000000',
    'prueba@tec.mx',
    'Prueba FJ26',
    'Mentor Prueba',
    'Comunidad Prueba',
    'Sí',
    timestamp,
    '',
    'OK TEST'
  ];
  sheet.appendRow(row);

  const logSheetName = 'Validacion_Integraciones';
  const ss = getSpreadsheet();
  let logSheet = ss.getSheetByName(logSheetName);
  if (!logSheet) logSheet = ss.insertSheet(logSheetName);
  if (logSheet.getLastRow() == 0) {
    logSheet.getRange(1, 1, 1, 4).setValues([['Timestamp', 'Vercel', 'Form', 'Detalle']]);
  }
  const detalle = `Vercel=${vercelStatus || 'N/A'} Form=RESTRINGIDO (escritura directa en Sheet)`;
  logSheet.appendRow([
    Utilities.formatDate(new Date(), 'America/Mexico_City', 'yyyy-MM-dd HH:mm:ss'),
    vercelStatus || 'N/A',
    'RESTRINGIDO',
    detalle
  ]);
}


/**
 * PROCESAR TODAS LAS FILAS PENDIENTES
 */
function procesarFilasPendientes() {
  try {
    console.log("Iniciando procesamiento manual de filas pendientes...");

    const sheet = getResponsesSheet();
    const ultimaFila = sheet.getLastRow();

    if (ultimaFila < 2) {
      SpreadsheetApp.getUi().alert(
        'Sin Datos',
        'No hay respuestas en el formulario para procesar.',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return;
    }

    let correosProcesados = 0;
    let errores = 0;

    for (let fila = 2; fila <= ultimaFila; fila++) {
      try {
        const statusActual = sheet.getRange(fila, CONFIG.COLUMNAS.STATUS_EMAIL).getValue();
        if (statusActual && statusActual.toString().includes('OK')) {
          console.log(`Fila ${fila}: Correo ya enviado, saltando...`);
          continue;
        }

        const datos = obtenerDatosFila(sheet, fila);
        if (!validarDatos(datos)) {
          console.log(`Fila ${fila}: Datos incompletos, saltando...`);
          continue;
        }

        procesarEnvioCorreo(sheet, fila);
        correosProcesados++;

        console.log(`Fila ${fila}: Correo enviado exitosamente`);

        Utilities.sleep(1000);

      } catch (error) {
        console.error(`Error en fila ${fila}:`, error);
        errores++;
      }
    }

    SpreadsheetApp.getUi().alert(
      'Procesamiento Completado',
      `Procesamiento manual finalizado.\n\n` +
      `Correos enviados: ${correosProcesados}\n` +
      `Errores: ${errores}\n` +
      `Total filas procesadas: ${ultimaFila - 1}\n\n` +
      `Verifica la columna J para confirmar los envíos.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );

  } catch (error) {
    console.error("Error en procesamiento manual:", error);

    SpreadsheetApp.getUi().alert(
      'Error en Procesamiento',
      `Hubo un problema en el procesamiento manual.\n\nError: ${error.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * FUNCIÓN DE TESTING
 */
function testearConFilaEspecifica() {
  const FILA_A_PROBAR = 2;

  try {
    console.log(`Iniciando test con fila ${FILA_A_PROBAR}...`);

    const sheet = getResponsesSheet();
    const ultimaFila = sheet.getLastRow();

    if (FILA_A_PROBAR > ultimaFila || FILA_A_PROBAR < 2) {
      throw new Error(`Fila ${FILA_A_PROBAR} no válida. Última fila con datos: ${ultimaFila}`);
    }

    const datos = obtenerDatosFila(sheet, FILA_A_PROBAR);
    console.log("Datos obtenidos:", datos);

    if (!validarDatos(datos)) {
      throw new Error("Los datos de la fila no son válidos para el test");
    }

    sheet.getRange(FILA_A_PROBAR, CONFIG.COLUMNAS.STATUS_EMAIL).setValue('');

    procesarEnvioCorreo(sheet, FILA_A_PROBAR);

    console.log(`Test completado exitosamente para fila ${FILA_A_PROBAR}`);

    SpreadsheetApp.getUi().alert(
      'Test Exitoso',
      `El correo de prueba fue enviado correctamente.\n\n` +
      `Destinatario: ${datos.email}\n` +
      `Estudiante: ${datos.nombre}\n` +
      `Matrícula: ${datos.matricula}\n` +
      `Verifica la columna J para confirmar el envío.\n\n` +
      `Revisa la bandeja de entrada (y spam) del destinatario.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );

  } catch (error) {
    console.error(`Error en test de fila ${FILA_A_PROBAR}:`, error);

    SpreadsheetApp.getUi().alert(
      'Error en Test',
      `Hubo un problema en el test.\n\n` +
      `Fila probada: ${FILA_A_PROBAR}\n` +
      `Error: ${error.message}\n\n` +
      `Verifica que la fila tenga datos válidos.`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * VER ESTADÍSTICAS DE CORREOS
 */
function verEstadisticasCorreos() {
  try {
    console.log("Generando estadísticas...");

    const sheet = getResponsesSheet();
    const ultimaFila = sheet.getLastRow();

    if (ultimaFila < 2) {
      SpreadsheetApp.getUi().alert(
        'Sin Datos',
        'No hay respuestas en el formulario para analizar.',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return;
    }

    const statusRange = sheet.getRange(2, CONFIG.COLUMNAS.STATUS_EMAIL, ultimaFila - 1, 1);
    const statusValues = statusRange.getValues().flat();

    let totalRespuestas = ultimaFila - 1;
    let correosSentidos = 0;
    let confirmacionesSi = 0;
    let confirmacionesNo = 0;
    let errores = 0;
    let pendientes = 0;

    for (let status of statusValues) {
      const statusStr = status.toString();

      if (statusStr.includes('OK')) {
        correosSentidos++;
        if (statusStr.includes('Confirmación SI')) {
          confirmacionesSi++;
        } else if (statusStr.includes('Confirmación NO')) {
          confirmacionesNo++;
        }
      } else if (statusStr.includes('ERROR')) {
        errores++;
      } else {
        pendientes++;
      }
    }

    const porcentajeEnviados = totalRespuestas > 0 ? ((correosSentidos / totalRespuestas) * 100).toFixed(1) : 0;
    const porcentajeSi = correosSentidos > 0 ? ((confirmacionesSi / correosSentidos) * 100).toFixed(1) : 0;

    const mensaje =
      `ESTADÍSTICAS CAMPUS CHECK-IN\n\n` +
      `Total de respuestas: ${totalRespuestas}\n` +
      `Correos enviados: ${correosSentidos} (${porcentajeEnviados}%)\n` +
      `Errores: ${errores}\n` +
      `Pendientes: ${pendientes}\n\n` +
      `--- CONFIRMACIONES ---\n` +
      `SI asisten: ${confirmacionesSi} (${porcentajeSi}%)\n` +
      `NO asisten: ${confirmacionesNo}\n\n` +
      `Última actualización: ${Utilities.formatDate(new Date(), "America/Mexico_City", "dd/MM/yyyy HH:mm")}`;

    SpreadsheetApp.getUi().alert(
      'Estadísticas del Sistema',
      mensaje,
      SpreadsheetApp.getUi().ButtonSet.OK
    );

  } catch (error) {
    console.error("Error generando estadísticas:", error);

    SpreadsheetApp.getUi().alert(
      'Error en Estadísticas',
      `Hubo un problema generando las estadísticas.\n\nError: ${error.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * FUNCIÓN ALTERNATIVA - TRIGGER EDIT
 */
function onEdit(e) {
  onFormSubmit(e);
}

/**
 * FUNCIÓN ALTERNATIVA - PROCESAR NUEVA FILA
 */
function procesarNuevaFila(e) {
  onFormSubmit(e);
}

/**
 * VERIFICAR CONEXIÓN CON TABLA DE MENTORES
 * Función de diagnóstico para verificar que la tabla de mentores está configurada correctamente
 */
function verificarTablaMentores() {
  try {
    const spreadsheet = getSpreadsheet();
    const hojaMentores = spreadsheet.getSheetByName(CONFIG.HOJA_MENTORES);

    if (!hojaMentores) {
      SpreadsheetApp.getUi().alert(
        'Error de Configuración',
        'No se encontró la hoja "Datos mentor".\n\n' +
        'Asegúrate de tener una hoja con ese nombre exacto.',
        SpreadsheetApp.getUi().ButtonSet.OK
      );
      return;
    }

    const ultimaFila = hojaMentores.getLastRow();
    const headers = hojaMentores.getRange(1, 1, 1, 7).getValues()[0];

    let mensaje = 'VERIFICACIÓN DE TABLA DE MENTORES\n\n';
    mensaje += `Hoja encontrada: SI\n`;
    mensaje += `Total de mentores: ${ultimaFila - 1}\n\n`;
    mensaje += 'Columnas encontradas:\n';

    headers.forEach((header, index) => {
      mensaje += `${index + 1}. ${header}\n`;
    });

    // Verificar algunos datos de ejemplo
    if (ultimaFila > 1) {
      const primerMentor = hojaMentores.getRange(2, 1, 1, 7).getValues()[0];
      mensaje += '\nPrimer mentor en la tabla:\n';
      mensaje += `Nombre: ${primerMentor[0]}\n`;
      mensaje += `Nickname: ${primerMentor[1]}\n`;
      mensaje += `Celular: ${primerMentor[4]}\n`;
    }

    SpreadsheetApp.getUi().alert(
      'Verificación Completada',
      mensaje,
      SpreadsheetApp.getUi().ButtonSet.OK
    );

  } catch (error) {
    SpreadsheetApp.getUi().alert(
      'Error en Verificación',
      `Hubo un problema verificando la tabla de mentores.\n\n` +
      `Error: ${error.message}`,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
  }
}

/**
 * PROBAR BÚSQUEDA DE MENTOR
 * Función para probar la búsqueda de un mentor específico
 */
function probarBusquedaMentor() {
  // Obtener el nombre del mentor de la fila 2 del sheet principal
  const sheet = getResponsesSheet();
  const nombreMentor = sheet.getRange(2, CONFIG.COLUMNAS.MENTOR_NOMBRE).getValue();

  if (!nombreMentor) {
    SpreadsheetApp.getUi().alert(
      'Sin Datos',
      'No hay nombre de mentor en la fila 2.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  console.log(`Probando búsqueda del mentor: "${nombreMentor}"`);

  const datosMentor = buscarDatosMentor(nombreMentor);

  let mensaje = `BÚSQUEDA DE MENTOR\n\n`;
  mensaje += `Mentor buscado: "${nombreMentor}"\n\n`;

  if (datosMentor) {
    mensaje += 'DATOS ENCONTRADOS:\n';
    mensaje += `Nombre completo: ${datosMentor.nombreCompleto}\n`;
    mensaje += `Nickname: ${datosMentor.nickname}\n`;
    mensaje += `Email: ${datosMentor.email}\n`;
    mensaje += `Celular: ${datosMentor.celular || 'No disponible'}\n`;
    mensaje += `Instagram: ${datosMentor.instagram}\n`;
    mensaje += `Comunidad: ${datosMentor.comunidad}\n`;
  } else {
    mensaje += 'NO SE ENCONTRARON DATOS\n\n';
    mensaje += 'Posibles causas:\n';
    mensaje += '- El nombre no coincide exactamente\n';
    mensaje += '- La hoja "Datos mentor" no tiene este mentor\n';
    mensaje += '- Hay espacios adicionales o diferencias en mayúsculas\n';
  }

  SpreadsheetApp.getUi().alert(
    'Resultado de Búsqueda',
    mensaje,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function normalizarNombre(valor) {
  return valor
    ? valor.toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
    : '';
}

/**
 * VALIDAR NOMBRES DE MENTOR ENTRE ASIGNACIONES Y DATOS MENTOR
 */
function validarMentoresAsignaciones() {
  const ss = getSpreadsheet();
  const hojaAsignaciones = ss.getSheetByName(CONFIG.ASIGNACIONES_SHEET);
  const hojaMentores = ss.getSheetByName(CONFIG.HOJA_MENTORES);

  if (!hojaAsignaciones || !hojaMentores) {
    SpreadsheetApp.getUi().alert(
      'Error de Configuración',
      'No se encontró la hoja \"Asignaciones\" o \"Datos mentor\".',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  const lastRowAsignaciones = hojaAsignaciones.getLastRow();
  const lastRowMentores = hojaMentores.getLastRow();

  if (lastRowAsignaciones < 2 || lastRowMentores < 2) {
    SpreadsheetApp.getUi().alert(
      'Sin Datos',
      'No hay datos suficientes para validar mentores.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  const mentores = hojaMentores
    .getRange(2, CONFIG.COLUMNAS_MENTORES.NOMBRE_MENTOR, lastRowMentores - 1, 1)
    .getValues()
    .flat()
    .map(normalizarNombre);
  const mentoresSet = new Set(mentores.filter(Boolean));
  const mentorRows = hojaMentores
    .getRange(2, 1, lastRowMentores - 1, 7)
    .getValues();
  const mentorInfoByKey = new Map();
  mentorRows.forEach(row => {
    const nombre = row[CONFIG.COLUMNAS_MENTORES.NOMBRE_MENTOR - 1];
    const key = normalizarNombre(nombre);
    if (!key) return;
    mentorInfoByKey.set(key, {
      nombre: String(nombre || '').trim(),
      comunidad: String(row[CONFIG.COLUMNAS_MENTORES.COMUNIDAD - 1] || '').trim()
    });
  });

  const mentorAsignado = hojaAsignaciones
    .getRange(2, CONFIG.COLUMNAS_ASIGNACIONES.MENTOR_NOMBRE, lastRowAsignaciones - 1, 1)
    .getValues()
    .flat();
  const matriculas = hojaAsignaciones
    .getRange(2, CONFIG.COLUMNAS_ASIGNACIONES.MATRICULA, lastRowAsignaciones - 1, 1)
    .getValues()
    .flat();
  const nombres = hojaAsignaciones
    .getRange(2, CONFIG.COLUMNAS_ASIGNACIONES.NOMBRES, lastRowAsignaciones - 1, 1)
    .getValues()
    .flat();
  const apellidos = hojaAsignaciones
    .getRange(2, CONFIG.COLUMNAS_ASIGNACIONES.APELLIDOS, lastRowAsignaciones - 1, 1)
    .getValues()
    .flat();

  const inconsistencias = [];
  const conteoMentor = new Map();
  const conteoComunidad = new Map();

  for (let i = 0; i < mentorAsignado.length; i++) {
    let mentorRaw = mentorAsignado[i];
    let mentorKey = normalizarNombre(mentorRaw);
    let comunidadOverride = '';
    if (CONFIG.MENTOR_EXCEPCIONES[mentorKey]) {
      mentorRaw = CONFIG.MENTOR_EXCEPCIONES[mentorKey].mentor;
      comunidadOverride = CONFIG.MENTOR_EXCEPCIONES[mentorKey].comunidad;
      mentorKey = normalizarNombre(mentorRaw);
    }
    if (!mentorKey) continue;

    if (!mentoresSet.has(mentorKey)) {
      inconsistencias.push([
        i + 2,
        matriculas[i] || '',
        `${nombres[i] || ''} ${apellidos[i] || ''}`.trim(),
        mentorRaw
      ]);
    } else {
      const info = mentorInfoByKey.get(mentorKey);
      const mentorDisplay = info && info.nombre ? info.nombre : String(mentorRaw || '').trim();
      const comunidad = comunidadOverride || (info && info.comunidad ? info.comunidad : 'Sin comunidad');
      conteoMentor.set(mentorDisplay, (conteoMentor.get(mentorDisplay) || 0) + 1);
      conteoComunidad.set(comunidad, (conteoComunidad.get(comunidad) || 0) + 1);
    }
  }

  const sheetName = 'Validacion_Mentores';
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  else sheet.clear();

  sheet.getRange(1, 1, 1, 4).setValues([['Fila', 'Matrícula', 'Estudiante', 'Mentor no encontrado']]);
  if (inconsistencias.length) {
    sheet.getRange(2, 1, inconsistencias.length, 4).setValues(inconsistencias);
  }

  const resumenName = 'Resumen_Mentores_Comunidades';
  let resumen = ss.getSheetByName(resumenName);
  if (!resumen) resumen = ss.insertSheet(resumenName);
  else resumen.clear();

  resumen.getRange(1, 1, 1, 3).setValues([['Mentor', 'Comunidad', 'Estudiantes']]);
  const mentorRowsOut = Array.from(conteoMentor.entries())
    .map(([mentor, count]) => {
      const info = mentorInfoByKey.get(normalizarNombre(mentor));
      const comunidad = info && info.comunidad ? info.comunidad : 'Sin comunidad';
      return [mentor, comunidad, count];
    })
    .sort((a, b) => b[2] - a[2]);
  if (mentorRowsOut.length) {
    resumen.getRange(2, 1, mentorRowsOut.length, 3).setValues(mentorRowsOut);
  }

  const startCol = 5;
  resumen.getRange(1, startCol, 1, 2).setValues([['Comunidad', 'Estudiantes']]);
  const comunidadRows = Array.from(conteoComunidad.entries())
    .sort((a, b) => b[1] - a[1]);
  const comunidadOut = comunidadRows.map(([comunidad, count]) => [comunidad, count]);
  if (comunidadOut.length) {
    resumen.getRange(2, startCol, comunidadOut.length, 2).setValues(comunidadOut);
  }

  SpreadsheetApp.getUi().alert(
    'Validación completada',
    inconsistencias.length
      ? `Se encontraron ${inconsistencias.length} inconsistencias. Revisa la hoja \"${sheetName}\".`
      : 'No se encontraron inconsistencias.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

// NOTAS PARA EL ADMINISTRADOR:
//
// 1. Para activar el sistema: Ejecutar "configurarTriggerAutomatico"
// 2. Para probar: Ejecutar "testearConFilaEspecifica" (usa datos de fila 2)
// 3. Para ver estadísticas: Ejecutar "verEstadisticasCorreos"
// 4. Para procesar todas las filas manualmente: "procesarFilasPendientes"
// 5. Para verificar la tabla de mentores: "verificarTablaMentores"
// 6. Para probar búsqueda de mentor: "probarBusquedaMentor"
// 7. Configurado para usar kareng@tec.mx como remitente "Mentoría Estudiantil"
// 8. Los datos del mentor se buscan automáticamente en la hoja "Datos mentor"
// 9. Se incluyen datos de contacto del mentor cuando están disponibles
// 10. Eliminados todos los emojis para evitar problemas de visualización
// 11. Estilos simplificados sin gradientes
// 12. Sistema desarrollado por MentorIA Tools para Campus Check-in
// Julio 2025 - Personalizado para Karen A. Guzmán V.
