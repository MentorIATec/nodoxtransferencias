/**
 * BIENVENIDA DE TRANSFERENCIAS AD26 - PRUEBA DE CORREO
 *
 * Copiar este archivo al mismo proyecto de Apps Script que apps-script-ad26.js.
 * Tambien agregar las plantillas HTML con sus nombres exactos:
 * - email-invitacion-ad26
 * - email-recordatorio-asignacion-ad26
 */

const AD26_EMAIL_PREVIEW = Object.freeze({
  REGISTRATION_URL: 'https://transferencias-ad26.vercel.app',
  HERO_URL: 'https://raw.githubusercontent.com/MentorIATec/nodoxtransferencias/ad26/periodos/ad26/assets/hero-comunidad-mentoria-ad26.jpg',
  SENDER_NAME: 'Comité de Transferencias Monterrey',
  FALLBACK_REPLY_TO: 'mentoreo.mty@servicios.tec.mx',
  TEMPLATES: Object.freeze({
    'email-invitacion-ad26': 'Ya hay una comunidad esperándote en Campus Monterrey',
    'email-recordatorio-asignacion-ad26': 'Tu comunidad ya está lista: necesitamos tu respuesta'
  })
});

function configurarCorreoPruebaAd26() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Correo de prueba AD26',
    'Escribe la cuenta autorizada que recibirá los borradores y envíos de prueba.',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;

  const email = cleanText_(response.getResponseText()).toLowerCase();
  if (!isValidEmail_(email)) throw new Error('Correo de prueba inválido.');
  PropertiesService.getScriptProperties().setProperty('AD26_TEST_EMAIL', email);
  notify_(`Correo de prueba configurado: ${email}`);
}

function configurarMatriculaCorreoPruebaAd26() {
  assertSafeEmailTestModeAd26_();
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    'Matricula para correo de prueba',
    'Escribe una matricula activa de Asignaciones. El correo se redirigira exclusivamente a la cuenta de prueba.',
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;

  const matricula = normalizeMatricula_(response.getResponseText());
  const assignment = findAssignment_(getAd26Spreadsheet_(), matricula);
  if (!assignment || !assignment.active) {
    throw new Error('La matricula no existe o no esta activa en Asignaciones.');
  }
  PropertiesService.getScriptProperties().setProperty('AD26_TEST_MATRICULA', matricula);
  notify_(`Matricula configurada para previsualizacion segura: ${matricula}`);
}

function crearBorradorCorreoPruebaAd26() {
  const payload = buildEmailPreviewPayloadAd26_();
  const draft = GmailApp.createDraft(
    payload.recipient,
    `[PRUEBA AD26] ${payload.subject}`,
    '',
    payload.options
  );
  notify_(
    `Borrador creado para ${payload.recipient}.\n\n` +
    `Template: ${payload.templateName}\n` +
    `Matricula: ${payload.assignment.matricula}\n` +
    'Revísalo en Gmail antes de enviar una prueba real.'
  );
  return draft.getId();
}

function enviarCorreoPruebaAd26() {
  const ui = SpreadsheetApp.getUi();
  const payload = buildEmailPreviewPayloadAd26_();
  const response = ui.prompt(
    'Enviar correo de prueba AD26',
    `Se enviará únicamente a ${payload.recipient}.\n\nEscribe ENVIAR PRUEBA para confirmar.`,
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK || response.getResponseText().trim() !== 'ENVIAR PRUEBA') {
    notify_('No se envió ningún correo.');
    return;
  }

  GmailApp.sendEmail(
    payload.recipient,
    `[PRUEBA AD26] ${payload.subject}`,
    '',
    payload.options
  );
  notify_(`Correo de prueba enviado a ${payload.recipient}.`);
}

function ejecutarPruebaConfirmadaAd26() {
  const recipient = AD26_TEST_FIXTURES.defaultTestEmail;
  prepareTestDataAd26_(recipient);
  const result = sendRemoteTestEmailAd26_({
    recipient,
    template: 'email-invitacion-ad26',
    matricula: 'A00000001'
  });
  const response = JSON.parse(result.getContent());
  if (!response.ok) throw new Error(response.error || 'No fue posible enviar la prueba AD26.');
  notify_('Prueba AD26 ejecutada. Revisa kareng@tec.mx y la matricula A00000001.');
  return response;
}

function buildEmailPreviewPayloadAd26_(options) {
  assertSafeEmailTestModeAd26_();
  const settings = options || {};
  let templateName = cleanText_(settings.templateName);
  if (!templateName) {
    const ui = SpreadsheetApp.getUi();
    const templateResponse = ui.prompt(
      'Template para previsualizar',
      'Escribe email-invitacion-ad26 o email-recordatorio-asignacion-ad26.',
      ui.ButtonSet.OK_CANCEL
    );
    if (templateResponse.getSelectedButton() !== ui.Button.OK) throw new Error('Prueba cancelada.');
    templateName = cleanText_(templateResponse.getResponseText());
  }
  const subject = AD26_EMAIL_PREVIEW.TEMPLATES[templateName];
  if (!subject) throw new Error('Template no permitido para prueba AD26.');

  const ss = getAd26Spreadsheet_();
  const matricula = normalizeMatricula_(
    settings.matricula ||
    PropertiesService.getScriptProperties().getProperty('AD26_TEST_MATRICULA') ||
    AD26_TEST_FIXTURES.matriculas[0]
  );
  const assignment = findAssignment_(ss, matricula);
  if (!assignment || !assignment.active) {
    throw new Error('Configura una matricula activa de Asignaciones para crear el correo de prueba.');
  }

  const mentor = assignment.population === 'SALUD'
    ? null
    : findMentorForAssignment_(ss, assignment);
  const saludo = `Hola ${firstName_(assignment.names)},`;
  const html = renderTemplateAd26_(templateName, {
    saludo,
    CONFIG: {
      EVENTO: {
        confirmacion_url: AD26_EMAIL_PREVIEW.REGISTRATION_URL
      }
    }
  });
  const replyTo = mentor && isValidEmail_(mentor.email)
    ? mentor.email
    : AD26_EMAIL_PREVIEW.FALLBACK_REPLY_TO;

  return {
    assignment,
    recipient: getTestEmail_(),
    templateName,
    subject,
    options: {
      htmlBody: html,
      name: AD26_EMAIL_PREVIEW.SENDER_NAME,
      replyTo,
      inlineImages: {
        ad26_community_hero: UrlFetchApp.fetch(AD26_EMAIL_PREVIEW.HERO_URL)
          .getBlob()
          .setName('ad26_community_hero.jpg')
      }
    }
  };
}

function sendRemoteTestEmailAd26_(body) {
  const recipient = cleanText_(body.recipient).toLowerCase();
  const authorizedRecipient = getTestEmail_().toLowerCase();
  const templateName = cleanText_(body.template);
  const matricula = normalizeMatricula_(body.matricula);

  if (!isValidEmail_(recipient) || recipient !== authorizedRecipient) {
    return jsonResponse_({ error: 'Destinatario de prueba no autorizado' }, 403);
  }
  if (!AD26_EMAIL_PREVIEW.TEMPLATES[templateName]) {
    return jsonResponse_({ error: 'Parametros de prueba no permitidos' }, 400);
  }

  const ss = getAd26Spreadsheet_();
  const registration = readSettings_(requireSheet_(ss, AD26_CONFIG.SHEETS.SETTINGS));
  if (parseBoolean_(registration.REGISTRO_ABIERTO) || !parseBoolean_(registration.MODO_PRUEBA)) {
    return jsonResponse_({ error: 'La prueba remota requiere registro cerrado y modo de prueba activo' }, 409);
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return jsonResponse_({ error: 'Prueba ocupada; intenta nuevamente' }, 503);
  try {
    const cache = CacheService.getScriptCache();
    const cacheKey = `ad26-email-test:${templateName}:${matricula}:${recipient}`;
    if (cache.get(cacheKey)) {
      return jsonResponse_({ error: 'La misma prueba ya fue enviada recientemente' }, 409);
    }

    const payload = buildEmailPreviewPayloadAd26_({ templateName, matricula });
    GmailApp.sendEmail(
      payload.recipient,
      `[PRUEBA AD26] ${payload.subject}`,
      '',
      payload.options
    );
    cache.put(cacheKey, 'sent', 300);
    return jsonResponse_({
      ok: true,
      recipient: payload.recipient,
      template: payload.templateName,
      matricula: payload.assignment.matricula,
      subject: `[PRUEBA AD26] ${payload.subject}`
    }, 200);
  } finally {
    lock.releaseLock();
  }
}

function assertSafeEmailTestModeAd26_() {
  const ss = getAd26Spreadsheet_();
  const registration = readSettings_(requireSheet_(ss, AD26_CONFIG.SHEETS.SETTINGS));
  if (parseBoolean_(registration.REGISTRO_ABIERTO) || !parseBoolean_(registration.MODO_PRUEBA)) {
    throw new Error('Las pruebas requieren REGISTRO_ABIERTO=FALSE y MODO_PRUEBA=TRUE.');
  }
}

function renderTemplateAd26_(templateName, data) {
  const template = HtmlService.createTemplateFromFile(templateName);
  Object.keys(data).forEach(key => {
    template[key] = data[key];
  });
  return template.evaluate().getContent();
}

function precheckCampanaInvitacionAd26() {
  const summary = buildCampaignSummaryAd26_();
  notify_(
    'Pre-check campaña AD26\n\n' +
    `Población activa: ${summary.total}\n` +
    `Ya enviados: ${summary.sent}\n` +
    `En proceso protegido: ${summary.inFlight}\n` +
    `Pendientes: ${summary.pending}\n` +
    `Errores reintentables: ${summary.errors}\n` +
    `Cuota disponible hoy: ${summary.quota}\n\n` +
    'Este pre-check no envía correos.'
  );
  return summary;
}

function enviarSiguienteLoteInvitacionAd26() {
  const ss = getAd26Spreadsheet_();
  const settings = readSettings_(requireSheet_(ss, AD26_CONFIG.SHEETS.SETTINGS));
  if (!parseBoolean_(settings.REGISTRO_ABIERTO)) {
    throw new Error('El registro debe estar abierto antes de enviar la campaña oficial.');
  }
  if (parseBoolean_(settings.MODO_PRUEBA)) {
    throw new Error('Desactiva MODO_PRUEBA antes de enviar la campaña oficial.');
  }

  const preview = buildCampaignSummaryAd26_();
  if (!preview.pending) {
    notify_('No hay invitaciones pendientes para esta campaña.');
    return preview;
  }

  const ui = SpreadsheetApp.getUi();
  const confirmation = ui.prompt(
    'Enviar siguiente lote AD26',
    `Pendientes: ${preview.pending}. Cuota disponible hoy: ${preview.quota}.\n\n` +
    'Escribe ENVIAR LOTE AD26 para continuar.',
    ui.ButtonSet.OK_CANCEL
  );
  if (confirmation.getSelectedButton() !== ui.Button.OK || confirmation.getResponseText().trim() !== 'ENVIAR LOTE AD26') {
    notify_('No se envió ningún correo.');
    return preview;
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) throw new Error('Ya hay otro lote en ejecución.');
  try {
    return sendCampaignBatchAd26_(ss, settings);
  } finally {
    lock.releaseLock();
  }
}

function sendCampaignBatchAd26_(ss, settings) {
  const assignments = readCampaignAssignmentsAd26_(ss);
  const logSheet = requireSheet_(ss, AD26_CONFIG.SHEETS.SEND_LOG);
  const state = readCampaignLogStateAd26_(logSheet);
  const pending = assignments.filter(assignment => !state.protectedHashes.has(hashMatriculaAd26_(assignment.matricula)));
  const configuredBatch = positiveInteger_(settings.LOTE_ENVIO, AD26_EMAIL_CAMPAIGN.DEFAULT_BATCH_SIZE);
  const quota = MailApp.getRemainingDailyQuota();
  const batch = pending.slice(0, Math.min(configuredBatch, quota));
  if (!batch.length) {
    notify_('No hay cuota disponible o no quedan correos pendientes.');
    return buildCampaignSummaryAd26_();
  }

  const heroBlob = UrlFetchApp.fetch(AD26_EMAIL_PREVIEW.HERO_URL)
    .getBlob()
    .setName('ad26_community_hero.jpg');
  let sent = 0;
  let failed = 0;

  batch.forEach(assignment => {
    const hash = hashMatriculaAd26_(assignment.matricula);
    const attempt = (state.attempts.get(hash) || 0) + 1;
    logSheet.appendRow([
      new Date(), AD26_EMAIL_CAMPAIGN.ID, hash, AD26_EMAIL_CAMPAIGN.TEMPLATE,
      'ENVIANDO', '', attempt
    ]);
    const logRow = logSheet.getLastRow();

    try {
      const payload = buildProductionEmailPayloadAd26_(ss, assignment, heroBlob);
      GmailApp.sendEmail(payload.recipient, payload.subject, '', payload.options);
      logSheet.getRange(logRow, 5, 1, 2).setValues([['ENVIADO', '']]);
      sent++;
    } catch (error) {
      const code = cleanText_(error && error.message ? error.message : error).slice(0, 180);
      logSheet.getRange(logRow, 5, 1, 2).setValues([['ERROR', code]]);
      failed++;
    }
    SpreadsheetApp.flush();
  });

  const summary = buildCampaignSummaryAd26_();
  notify_(
    `Lote terminado.\n\nEnviados: ${sent}\nErrores: ${failed}\nPendientes: ${summary.pending}`
  );
  return summary;
}

function buildProductionEmailPayloadAd26_(ss, assignment, heroBlob) {
  const mentor = assignment.population === 'SALUD'
    ? null
    : findMentorForAssignment_(ss, assignment);
  const subject = AD26_EMAIL_PREVIEW.TEMPLATES[AD26_EMAIL_CAMPAIGN.TEMPLATE];
  const html = renderTemplateAd26_(AD26_EMAIL_CAMPAIGN.TEMPLATE, {
    saludo: `Hola ${firstName_(assignment.names)},`,
    CONFIG: {
      EVENTO: { confirmacion_url: AD26_EMAIL_PREVIEW.REGISTRATION_URL }
    }
  });
  return {
    recipient: assignment.email,
    subject,
    options: {
      htmlBody: html,
      name: AD26_EMAIL_PREVIEW.SENDER_NAME,
      replyTo: mentor && isValidEmail_(mentor.email)
        ? mentor.email
        : AD26_EMAIL_PREVIEW.FALLBACK_REPLY_TO,
      inlineImages: { ad26_community_hero: heroBlob }
    }
  };
}

function buildCampaignSummaryAd26_() {
  const ss = getAd26Spreadsheet_();
  const assignments = readCampaignAssignmentsAd26_(ss);
  const state = readCampaignLogStateAd26_(requireSheet_(ss, AD26_CONFIG.SHEETS.SEND_LOG));
  const hashes = assignments.map(assignment => hashMatriculaAd26_(assignment.matricula));
  const sent = hashes.filter(hash => state.sentHashes.has(hash)).length;
  const inFlight = hashes.filter(hash => state.inFlightHashes.has(hash)).length;
  const errors = hashes.filter(hash => state.errorHashes.has(hash) && !state.protectedHashes.has(hash)).length;
  return {
    total: assignments.length,
    sent,
    inFlight,
    errors,
    pending: Math.max(0, assignments.length - sent - inFlight),
    quota: MailApp.getRemainingDailyQuota()
  };
}

function readCampaignAssignmentsAd26_(ss) {
  const sheet = requireSheet_(ss, AD26_CONFIG.SHEETS.ASSIGNMENTS);
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = headerMap_(data[0]);
  return data.slice(1).map(row => ({
    matricula: normalizeMatricula_(row[headers.matricula]),
    names: cleanText_(row[headers.nombres]),
    surnames: cleanText_(row[headers.apellidos]),
    email: cleanText_(row[headers.email]).toLowerCase(),
    population: cleanText_(row[headers.tipo_poblacion]).toUpperCase(),
    mentorId: cleanText_(row[headers.mentor_id]),
    mentorName: cleanText_(row[headers.mentor_nombre]),
    active: parseActive_(row[headers.activo])
  })).filter(assignment => assignment.active && /^[A-Z]\d{8}$/.test(assignment.matricula) && isValidEmail_(assignment.email));
}

function readCampaignLogStateAd26_(sheet) {
  const result = {
    sentHashes: new Set(),
    inFlightHashes: new Set(),
    errorHashes: new Set(),
    protectedHashes: new Set(),
    attempts: new Map()
  };
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return result;
  const headers = headerMap_(data[0]);
  data.slice(1).forEach(row => {
    if (cleanText_(row[headers.campaign_id]) !== AD26_EMAIL_CAMPAIGN.ID) return;
    if (cleanText_(row[headers.template]) !== AD26_EMAIL_CAMPAIGN.TEMPLATE) return;
    const hash = cleanText_(row[headers.matricula_hash]);
    const status = cleanText_(row[headers.status]).toUpperCase();
    if (!hash) return;
    result.attempts.set(hash, Math.max(result.attempts.get(hash) || 0, Number(row[headers.attempt]) || 0));
    if (status === 'ENVIADO') result.sentHashes.add(hash);
    if (status === 'ENVIANDO') result.inFlightHashes.add(hash);
    if (status === 'ERROR') result.errorHashes.add(hash);
  });
  result.sentHashes.forEach(hash => result.protectedHashes.add(hash));
  result.inFlightHashes.forEach(hash => result.protectedHashes.add(hash));
  return result;
}

function hashMatriculaAd26_(matricula) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    normalizeMatricula_(matricula),
    Utilities.Charset.UTF_8
  );
  return bytes
    .map(byte => (`0${((byte + 256) % 256).toString(16)}`).slice(-2))
    .join('');
}
