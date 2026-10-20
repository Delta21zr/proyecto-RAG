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
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) headers.Authorization = `Bearer ${sessionStorage.getItem('access_token')}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Verifique que el backend esté activo.', 0);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    /* respuesta sin cuerpo JSON */
  }

  if (!response.ok) {
    throw new ApiError(formatDetail(data?.detail, `Error del servidor (${response.status}).`), response.status);
  }
  return data;
}
