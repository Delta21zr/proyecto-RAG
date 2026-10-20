// Cliente HTTP compartido. La URL base se configura con VITE_API_URL (por defecto, API local).
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// FastAPI devuelve `detail` como texto (errores propios) o como lista (422 de validacion).
function formatDetail(detail, fallback) {
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const msgs = detail.map((d) => {
      const field = Array.isArray(d.loc) ? d.loc[d.loc.length - 1] : '';
      return field && field !== 'body' ? `${field}: ${d.msg}` : d.msg;
    });
    return msgs.join('. ');
  }
  return fallback;
}

export async function apiFetch(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';
  if (auth) headers.Authorization = `Bearer ${sessionStorage.getItem('access_token')}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Verifique que el backend esté activo.', 0);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    /* respuesta sin cuerpo JSON (p. ej. 204 No Content) */
  }

  if (!response.ok) {
    throw new ApiError(formatDetail(data?.detail, `Error del servidor (${response.status}).`), response.status);
  }
  return data;
}

// PROJ-101: Descarga autorizada enviando el JWT en Authorization y disparando guardado en navegador.
export async function apiDownloadDocument(documentId, fallbackFilename = 'documento') {
  const token = sessionStorage.getItem('access_token');
  let response;
  try {
    response = await fetch(`${API_URL}/api/documents/${documentId}/download`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor para iniciar la descarga.', 0);
  }

  if (!response.ok) {
    let data = null;
    try {
      data = await response.json();
    } catch {
      /* sin JSON */
    }
    throw new ApiError(formatDetail(data?.detail, `No se pudo descargar el documento (${response.status}).`), response.status);
  }

  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^\s";]+)/i);
  const filename = match ? decodeURIComponent(match[1].replace(/"/g, '')) : fallbackFilename;

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
