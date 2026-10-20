import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';

export default function Dashboard({ user, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtros de búsqueda (RF-010)
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal para nuevo proyecto (RF-003)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newVisibility, setNewVisibility] = useState('RESTRICTED_TEAM');
  const [modalError, setModalError] = useState('');
  const [creating, setCreating] = useState(false);

  // ADMIN no crea proyectos (el backend responde 403)
  const canCreate = user?.role === 'RESEARCHER' || user?.role === 'COORDINATOR';

  const closeModal = () => {
    setIsModalOpen(false);
    setNewTitle('');
    setNewArea('');
    setNewDescription('');
    setNewVisibility('RESTRICTED_TEAM');
    setModalError('');
  };

  // Carga inicial y reactiva de proyectos
  const fetchProjects = async () => {
    setLoading(true);
    setError('');
    try {
      let path = '/api/projects?skip=0&limit=50';
      if (statusFilter) path += `&status=${statusFilter}`;
      if (searchTerm.trim()) path += `&area=${encodeURIComponent(searchTerm.trim())}`;

      const data = await apiFetch(path);
      setProjects(data.projects || []);
    } catch (err) {
      if (err.status === 401) {
        onLogout(); // sesión expirada
        return;
      }
      setError(err.message || 'Error de comunicación.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [statusFilter]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setCreating(true);
    setModalError('');
    try {
      await apiFetch('/api/projects', {
        method: 'POST',
        body: {
          title: newTitle.trim(),
          area: newArea.trim(),
          description: newDescription.trim() || null,
          visibility: newVisibility,
        },
      });

      // Limpiar formulario y recargar
      closeModal();
      fetchProjects();
    } catch (err) {
      if (err.status === 401) {
        onLogout();
        return;
      }
      setModalError(err.message || 'Fallo al registrar proyecto.');
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      DRAFT: 'bg-amber-100 text-amber-800 border-amber-200',
      IN_REVIEW: 'bg-blue-100 text-blue-800 border-blue-200',
      APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      REJECTED: 'bg-rose-100 text-rose-800 border-rose-200',
      ARCHIVED: 'bg-slate-100 text-slate-800 border-slate-200',
    };
    return map[status] || 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Barra de Navegación Superior */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
              UR
            </div>
            <div>
              <h1 className="font-semibold text-slate-900 text-base leading-tight">
                Gestor de Investigaciones
              </h1>
              <p className="text-xs text-slate-500">Servicio RAG Local Universitario</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="block text-sm font-medium text-slate-800">{user?.full_name || 'Investigador'}</span>
              <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {user?.role || 'RESEARCHER'}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="text-sm font-medium text-slate-600 hover:text-rose-600 px-3 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Área de Trabajo Central */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {/* Cabecera de Sección y Acciones */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Proyectos de Investigación</h2>
            <p className="text-sm text-slate-500">Consulta de expedientes y antecedentes documentales</p>
          </div>

          {canCreate && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow hover:bg-indigo-700 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Proyecto
            </button>
          )}
        </div>

        {/* Filtros de búsqueda (RF-010) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Buscar por área temática..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchProjects()}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Todos los Estados</option>
              <option value="DRAFT">Borrador</option>
              <option value="IN_REVIEW">En Revisión</option>
              <option value="APPROVED">Aprobado</option>
              <option value="REJECTED">Rechazado</option>
              <option value="ARCHIVED">Archivado</option>
            </select>

            <button
              onClick={fetchProjects}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Filtrar
            </button>
          </div>
        </div>

        {/* Listado de Proyectos */}
        {loading ? (
          <div className="py-16 text-center text-slate-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-2"></div>
            Cargando proyectos de investigación...
          </div>
        ) : error ? (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-center">
            {error}
          </div>
        ) : projects.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
            <p className="text-slate-500 text-sm">No se encontraron proyectos con los criterios seleccionados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((proj) => (
              <div
                key={proj.project_id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                      {proj.area}
                    </span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${getStatusBadge(proj.status)}`}>
                      {proj.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 line-clamp-2 mb-2">
                    {proj.title}
                  </h3>

                  <p className="text-sm text-slate-600 line-clamp-3 mb-4">
                    {proj.description || 'Sin descripción detallada registrada.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Alta: {new Date(proj.created_at).toLocaleDateString()}</span>
                  <span className="font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer">
                    Ver Documentos &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal para Crear Proyecto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Registrar Nuevo Proyecto</h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Título del Proyecto</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Análisis de Fármacos mediante IA"
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Área de Investigación</label>
                <input
                  type="text"
                  required
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  placeholder="Ej: Biotecnología / Ciencias de la Salud"
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Resumen / Descripción</label>
                <textarea
                  rows="3"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Breve justificación o resumen ejecutivo..."
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Visibilidad</label>
                <select
                  value={newVisibility}
                  onChange={(e) => setNewVisibility(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="RESTRICTED_TEAM">Restringido (solo equipo)</option>
                  <option value="PUBLIC_INSTITUTIONAL">Público institucional</option>
                </select>
              </div>

              {modalError && (
                <div className="rounded-md bg-rose-50 border border-rose-200 p-3 text-sm text-rose-700">
                  {modalError}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {creating ? 'Guardando...' : 'Crear Proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
