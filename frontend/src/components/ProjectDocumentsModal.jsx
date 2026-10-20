import React, { useState, useEffect, useRef } from 'react';
import { apiFetch, apiDownloadDocument } from '../api';

const EDITABLE_STATES = ['DRAFT', 'REJECTED'];

export default function ProjectDocumentsModal({ project, user, onClose, onLogout }) {
  // project === null representa "Normativa Institucional" (project_id = null en BD)
  const isNormative = project === null;

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');

  // Estados de subida y acciones por documento
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const fileInputRef = useRef(null);

  const isOwner = !isNormative && project?.responsible_id === user?.user_id;
  const canUpload = isNormative
    ? user?.role === 'COORDINATOR' || user?.role === 'ADMIN'
    : isOwner && EDITABLE_STATES.includes(project?.status);

  const canDeleteDoc = () => {
    if (isNormative) {
      return user?.role === 'COORDINATOR' || user?.role === 'ADMIN';
    }
    return user?.role === 'COORDINATOR' || (isOwner && EDITABLE_STATES.includes(project?.status));
  };

  const fetchDocuments = async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const path = isNormative
        ? '/api/documents?skip=0&limit=100'
        : `/api/documents?project_id=${project.project_id}&skip=0&limit=100`;
      const data = await apiFetch(path);
      const all = data.documents || [];
      setDocuments(isNormative ? all.filter((d) => d.project_id === null) : all);
    } catch (err) {
      if (err.status === 401) {
        onLogout();
        return;
      }
      setError(err.message || 'No se pudieron cargar los documentos.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [project?.project_id]);

  // Refresco automático mientras existan documentos indexándose en segundo plano
  useEffect(() => {
    const hasPending = documents.some((d) => d.status === 'PENDING' || d.status === 'PROCESSING');
    if (!hasPending) return undefined;
    const timer = setInterval(() => {
      fetchDocuments(true);
    }, 3000);
    return () => clearInterval(timer);
  }, [documents]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setActionError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (!isNormative && project?.project_id) {
        formData.append('project_id', project.project_id);
      }

      await apiFetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      await fetchDocuments(true);
    } catch (err) {
      if (err.status === 401) {
        onLogout();
        return;
      }
      setActionError(err.message || 'Error al subir el archivo.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = async (doc) => {
    setDownloadingId(doc.document_id);
    setActionError('');
    try {
      await apiDownloadDocument(doc.document_id, doc.file_name);
    } catch (err) {
      if (err.status === 401) {
        onLogout();
        return;
      }
      setActionError(err.message || 'No se pudo descargar el archivo.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (doc) => {
    setDeletingId(doc.document_id);
    setActionError('');
    try {
      await apiFetch(`/api/documents/${doc.document_id}`, { method: 'DELETE' });
      await fetchDocuments(true);
    } catch (err) {
      if (err.status === 401) {
        onLogout();
        return;
      }
      setActionError(err.message || 'No se pudo eliminar el documento.');
    } finally {
      setDeletingId(null);
    }
  };

  const getDocStatusBadge = (status) => {
    const map = {
      PENDING: { label: 'En cola', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
      PROCESSING: { label: 'Indexando...', cls: 'bg-blue-100 text-blue-800 border-blue-200 animate-pulse' },
      PUBLISHED: { label: 'Indexado (RAG)', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
      ERROR: { label: 'Error de ingesta', cls: 'bg-rose-100 text-rose-800 border-rose-200' },
    };
    return map[status] || { label: status, cls: 'bg-slate-100 text-slate-700 border-slate-200' };
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Cabecera */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4 bg-slate-50">
          <div>
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
              {isNormative ? 'Repositorio General' : project.area}
            </span>
            <h3 className="text-lg font-bold text-slate-900">
              {isNormative ? 'Normativa Institucional' : project.title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isNormative
                ? 'Documentos transversales visibles para todos los investigadores y el asistente RAG.'
                : `Estado del expediente: ${project.status} · Visibilidad: ${project.visibility}`}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition"
            title="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Barra de acciones (Subida + Refresco) */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Formatos admitidos: <strong>PDF</strong> y <strong>DOCX</strong> (máx. 50 MB). Se versionan automáticamente por nombre.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchDocuments()}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Actualizar
            </button>

            {canUpload && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 bg-indigo-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-medium shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4" />
                  </svg>
                  {uploading ? 'Subiendo...' : 'Subir PDF / DOCX'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Mensajes de error de acción */}
        {actionError && (
          <div className="mx-6 mt-4 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-xs text-rose-700 flex items-center justify-between">
            <span>{actionError}</span>
            <button onClick={() => setActionError('')} className="text-rose-500 hover:text-rose-700 font-bold ml-3">
              ✕
            </button>
          </div>
        )}

        {/* Lista de documentos */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600 mx-auto mb-2"></div>
              Consultando documentos...
            </div>
          ) : error ? (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg text-sm text-center">
              {error}
            </div>
          ) : documents.length === 0 ? (
            <div className="border border-dashed border-slate-300 rounded-xl p-10 text-center">
              <p className="text-slate-600 text-sm font-medium">No hay documentos registrados en este expediente.</p>
              {canUpload && (
                <p className="text-slate-400 text-xs mt-1">
                  Usa el botón «Subir PDF / DOCX» para agregar e indexar el primer documento.
                </p>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
              {documents.map((doc) => {
                const badge = getDocStatusBadge(doc.status);
                const isDownloading = downloadingId === doc.document_id;
                const isDeleting = deletingId === doc.document_id;

                return (
                  <li
                    key={doc.document_id}
                    className="p-4 bg-white hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                          {doc.file_type}
                        </span>
                        <span className="font-semibold text-sm text-slate-900 truncate" title={doc.file_name}>
                          {doc.file_name}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">v{doc.version}</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Cargado el {new Date(doc.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {/* PROJ-101: Botón de descarga autorizada */}
                      <button
                        type="button"
                        disabled={isDownloading}
                        onClick={() => handleDownload(doc)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50 transition"
                        title="Descargar archivo original autorizado"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M7 10l5 5m0 0l5-5m-5 5V3" />
                        </svg>
                        {isDownloading ? 'Descargando...' : 'Descargar'}
                      </button>

                      {canDeleteDoc() && (
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => handleDelete(doc)}
                          className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 disabled:opacity-50 transition"
                          title="Eliminar documento y sus vectores"
                        >
                          {isDeleting ? '...' : 'Eliminar'}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Pie del modal */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 hover:bg-white transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
