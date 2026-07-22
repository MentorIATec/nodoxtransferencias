const ALLOWED_STATUS = new Set([200, 400, 401, 403, 404, 409, 429, 500, 503]);

export function normalizeLogicalStatus(value, fallback = 502) {
  const status = Number(value);
  return ALLOWED_STATUS.has(status) ? status : fallback;
}

export async function postAppsScript(action, payload = {}) {
  const webAppUrl = process.env.APPS_SCRIPT_WEBAPP_URL;
  const apiKey = process.env.APPS_SCRIPT_API_KEY;
  if (!webAppUrl || !apiKey) {
    const error = new Error('Configuracion incompleta del servidor');
    error.status = 500;
    throw error;
  }

  const response = await fetch(webAppUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action,
      api_key: apiKey,
      ...payload
    }),
    redirect: 'follow',
    signal: AbortSignal.timeout(15000)
  });

  if (!response.ok) {
    const error = new Error('Apps Script no esta disponible');
    error.status = 502;
    throw error;
  }

  let data;
  try {
    data = await response.json();
  } catch (cause) {
    const error = new Error('Apps Script devolvio una respuesta invalida');
    error.status = 502;
    error.cause = cause;
    throw error;
  }

  return {
    data,
    status: normalizeLogicalStatus(data.status, data.ok ? 200 : 502)
  };
}

export function normalizeMatricula(value) {
  return String(value || '').trim().toUpperCase();
}

export function isValidMatricula(value) {
  return /^[A-Z]\d{8}$/.test(normalizeMatricula(value));
}
