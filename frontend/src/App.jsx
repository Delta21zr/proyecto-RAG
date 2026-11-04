import React, { useState, useEffect, useRef } from 'react';
import { apiFetch, apiDownloadDocument } from './api';

// Icons implemented as inline SVGs for pure standalone React compatibility
const Icons = {
  LogoDot: () => (
    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="5" />
    </svg>
  ),
  Eye: () => (
    <svg className="w-5 h-5 text-gray-500 hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  EyeOff: () => (
    <svg className="w-5 h-5 text-gray-500 hover:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a8.959 8.959 0 013.122-.563c4.478 0 8.268 2.943 9.542 7a9.97 9.97 0 01-2.008 3.513M15 12a3 3 0 11-6 0 3 3 0 016 0zM3 3l18 18" />
    </svg>
  ),
  Bell: () => (
    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  ArrowLeft: () => (
    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  Search: () => (
    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Dashboard: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  Folder: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  Sparkles: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  Users: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  ShieldCheck: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Plus: () => (
    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  LogOut: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
};

const ROLE_LABELS = {
  ADMIN: 'Administrador',
  COORDINATOR: 'Coordinador',
  RESEARCHER: 'Investigador',
};

const ROLE_SHORT = {
  ADMIN: 'Admin',
  COORDINATOR: 'Coord',
  RESEARCHER: 'Investig',
};

const STATUS_LABELS = {
  DRAFT: 'Borrador',
  IN_REVIEW: 'En Revisión',
  APPROVED: 'Aprobado',
  REJECTED: 'Rechazado',
  ARCHIVED: 'Archivado',
};

const STATUS_BADGE_CLASSES = {
  DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
  IN_REVIEW: 'bg-amber-100 text-amber-800 border-amber-200',
  APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  REJECTED: 'bg-rose-100 text-rose-800 border-rose-200',
  ARCHIVED: 'bg-slate-200 text-slate-600 border-slate-300',
};

const EDITABLE_STATES = ['DRAFT', 'REJECTED'];

function computeIntegrityHash(str) {
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex = (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0');
  return `${hex.slice(0, 8)}...`;
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'UR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function App() {
  // Auth & Navigation State
  const [currentUser, setCurrentUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('login'); // 'login' | 'dashboard' | 'proyectos' | 'rag' | 'usuarios' | 'auditoria'

  // Login Form State (Screen 1)
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Projects & Documents State (Screen 2 & Dashboard)
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState('');
  const [searchArea, setSearchArea] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedProject, setSelectedProject] = useState(null); // null = Normativa Institucional, object = Project
  const [isNormativeMode, setIsNormativeMode] = useState(false);

  // Create Project Modal
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectArea, setNewProjectArea] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectVisibility, setNewProjectVisibility] = useState('RESTRICTED_TEAM');
  const [createProjectError, setCreateProjectError] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);

  // Documents State (Screen 2)
  const [docType, setDocType] = useState('Borrador de Patente');
  const [documents, setDocuments] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docActionMessage, setDocActionMessage] = useState('');
  const [docActionError, setDocActionError] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  // RAG Query State (Screen 3)
  const [ragQuery, setRagQuery] = useState('');
  const [ragResult, setRagResult] = useState(null);
  const [ragHistory, setRagHistory] = useState([]);
  const [activeCitationIdx, setActiveCitationIdx] = useState(0);
  const [isQuerying, setIsQuerying] = useState(false);
  const [ragError, setRagError] = useState('');

  // Users State (Screen 4)
  const [activeUserTab, setActiveUserTab] = useState('usuarios');
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userFormName, setUserFormName] = useState('');
  const [userFormEmail, setUserFormEmail] = useState('');
  const [userFormPassword, setUserFormPassword] = useState('');
  const [userFormRole, setUserFormRole] = useState('RESEARCHER');
  const [userFormActive, setUserFormActive] = useState(true);
  const [userFormError, setUserFormError] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  // Audit Logs State (Screen 5)
  const [auditLogs, setAuditLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState('');
  const [logsSearch, setLogsSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('Últimos 30 días');
  const [actionFilter, setActionFilter] = useState('Todas las acciones');

  // Restore session on mount
  useEffect(() => {
    const token = sessionStorage.getItem('access_token');
    const storedUser = sessionStorage.getItem('user');
    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setCurrentUser(parsed);
        setCurrentScreen('proyectos');
      } catch {
        sessionStorage.clear();
      }
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('user');
    setCurrentUser(null);
    setSelectedProject(null);
    setRagResult(null);
    setCurrentScreen('login');
  };

  // ---------------- 1. LOGIN ----------------
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: { email: email.trim(), password },
        auth: false,
      });
      sessionStorage.setItem('access_token', data.token);
      sessionStorage.setItem('user', JSON.stringify(data.user));
      setCurrentUser(data.user);
      setCurrentScreen('proyectos');
    } catch (err) {
      setLoginError(err.message || 'Error al iniciar sesión.');
    } finally {
      setLoginLoading(false);
    }
  };

  // ---------------- 2. PROYECTOS & DOCUMENTOS ----------------
  const fetchProjects = async (keepSelection = true) => {
    if (!currentUser) return;
    setProjectsLoading(true);
    setProjectsError('');
    try {
      let path = '/api/projects?skip=0&limit=100';
      if (statusFilter) path += `&status=${encodeURIComponent(statusFilter)}`;
      if (searchArea.trim()) path += `&area=${encodeURIComponent(searchArea.trim())}`;
      const data = await apiFetch(path);
      const list = data.projects || [];
      setProjects(list);
      if (list.length > 0) {
        if (keepSelection && selectedProject) {
          const updated = list.find((p) => p.project_id === selectedProject.project_id);
          setSelectedProject(updated || list[0]);
        } else if (!isNormativeMode && !selectedProject) {
          setSelectedProject(list[0]);
        }
      } else if (!isNormativeMode) {
        setSelectedProject(null);
      }
    } catch (err) {
      if (err.status === 401) return handleLogout();
      setProjectsError(err.message || 'No se pudieron cargar los proyectos.');
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchDocuments = async (silent = false) => {
    if (!currentUser) return;
    if (!isNormativeMode && !selectedProject) {
      setDocuments([]);
      return;
    }
    if (!silent) setDocsLoading(true);
    try {
      const path = isNormativeMode
        ? '/api/documents?skip=0&limit=100'
        : `/api/documents?project_id=${selectedProject.project_id}&skip=0&limit=100`;
      const data = await apiFetch(path);
      const all = data.documents || [];
      setDocuments(isNormativeMode ? all.filter((d) => d.project_id === null) : all);
    } catch (err) {
      if (err.status === 401) return handleLogout();
      if (!silent) setDocActionError(err.message || 'No se pudieron cargar los documentos.');
    } finally {
      if (!silent) setDocsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && (currentScreen === 'proyectos' || currentScreen === 'dashboard')) {
      fetchProjects();
    }
  }, [currentUser, currentScreen, statusFilter]);

  useEffect(() => {
    if (currentUser && currentScreen === 'proyectos') {
      fetchDocuments();
    }
  }, [currentUser, currentScreen, selectedProject?.project_id, isNormativeMode]);

  // Poll while documents are indexing in background
  useEffect(() => {
    if (currentScreen !== 'proyectos') return undefined;
    const hasPending = documents.some((d) => d.status === 'PENDING' || d.status === 'PROCESSING');
    if (!hasPending) return undefined;
    const timer = setInterval(() => {
      fetchDocuments(true);
    }, 2500);
    return () => clearInterval(timer);
  }, [documents, currentScreen, selectedProject?.project_id, isNormativeMode]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    setCreatingProject(true);
    setCreateProjectError('');
    try {
      const created = await apiFetch('/api/projects', {
        method: 'POST',
        body: {
          title: newProjectTitle.trim(),
          area: newProjectArea.trim(),
          description: newProjectDesc.trim() || null,
          visibility: newProjectVisibility,
        },
      });
      setShowCreateProjectModal(false);
      setNewProjectTitle('');
      setNewProjectArea('');
      setNewProjectDesc('');
      setNewProjectVisibility('RESTRICTED_TEAM');
      setIsNormativeMode(false);
      setSelectedProject(created);
      await fetchProjects(false);
      setSelectedProject(created);
      setCurrentScreen('proyectos');
    } catch (err) {
      if (err.status === 401) return handleLogout();
      setCreateProjectError(err.message || 'No se pudo crear el proyecto.');
    } finally {
      setCreatingProject(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedProject) return;
    let comment = null;
    if (newStatus === 'REJECTED') {
      comment = window.prompt('Ingrese el motivo o comentario de rechazo (obligatorio):');
      if (!comment || !comment.trim()) return;
    }
    setDocActionError('');
    setDocActionMessage('');
    try {
      const updated = await apiFetch(`/api/projects/${selectedProject.project_id}/status`, {
        method: 'PUT',
        body: { status: newStatus, comment },
      });
      setSelectedProject(updated);
      setProjects((prev) => prev.map((p) => (p.project_id === updated.project_id ? updated : p)));
      setDocActionMessage(`Estado del proyecto actualizado a ${STATUS_LABELS[newStatus] || newStatus}.`);
    } catch (err) {
      if (err.status === 401) return handleLogout();
      setDocActionError(err.message || 'No se pudo cambiar el estado del proyecto.');
    }
  };

  const uploadFileToBackend = async (fileToUpload) => {
    if (!fileToUpload) return;
    setUploadingDoc(true);
    setDocActionError('');
    setDocActionMessage('');
    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);
      if (!isNormativeMode && selectedProject?.project_id) {
        formData.append('project_id', selectedProject.project_id);
      }
      await apiFetch('/api/documents', {
        method: 'POST',
        body: formData,
      });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setDocActionMessage(`Archivo "${fileToUpload.name}" (${docType}) subido y en cola de indexación RAG.`);
      await fetchDocuments(true);
    } catch (err) {
      if (err.status === 401) return handleLogout();
      setDocActionError(err.message || 'Error al subir el documento.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleUploadButton = () => {
    if (selectedFile) {
      uploadFileToBackend(selectedFile);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      uploadFileToBackend(file);
    }
  };

  const handleDropFile = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      setSelectedFile(file);
      uploadFileToBackend(file);
    }
  };

  const handleDownloadDoc = async (doc) => {
    setDocActionError('');
    try {
      await apiDownloadDocument(doc.document_id, doc.file_name);
    } catch (err) {
      if (err.status === 401) return handleLogout();
      setDocActionError(err.message || 'No se pudo descargar el documento.');
    }
  };

  const handleDeleteDoc = async (docId) => {
    setDocActionError('');
    setDocActionMessage('');
    try {
      await apiFetch(`/api/documents/${docId}`, { method: 'DELETE' });
      setDocActionMessage('Documento y vectores eliminados correctamente.');
      await fetchDocuments(true);
    } catch (err) {
      if (err.status === 401) return handleLogout();
      setDocActionError(err.message || 'No se pudo eliminar el documento.');
    }
  };

  // ---------------- 3. ASISTENTE RAG ----------------
  const fetchRagHistory = async () => {
    if (!currentUser) return;
    try {
      const data = await apiFetch('/api/rag/history?skip=0&limit=10');
      setRagHistory(Array.isArray(data) ? data : []);
    } catch {
      /* ignore history load error */
    }
  };

  useEffect(() => {
    if (currentUser && currentScreen === 'rag') {
      fetchRagHistory();
    }
  }, [currentUser, currentScreen]);

  const handleRunRAGQuery = async (e) => {
    e.preventDefault();
    if (!ragQuery || ragQuery.trim().length < 3) return;
    setIsQuerying(true);
    setRagError('');
    try {
      const data = await apiFetch('/api/rag/query', {
        method: 'POST',
        body: { prompt: ragQuery.trim() },
      });
      setRagResult(data);
      setActiveCitationIdx(0);
      fetchRagHistory();
    } catch (err) {
      if (err.status === 401) return handleLogout();
      setRagError(err.message || 'Error al consultar el motor RAG.');
    } finally {
      setIsQuerying(false);
    }
  };

  // ---------------- 4. USUARIOS ----------------
  const fetchUsers = async () => {
    if (!currentUser || currentUser.role !== 'ADMIN') return;
    setUsersLoading(true);
    setUsersError('');
    try {
      const data = await apiFetch('/api/users?skip=0&limit=100');
      setUsersList(data.users || []);
    } catch (err) {
      if (err.status === 401) return handleLogout();
      setUsersError(err.message || 'No se pudo cargar el padrón de usuarios.');
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && currentScreen === 'usuarios' && currentUser.role === 'ADMIN') {
      fetchUsers();
    }
  }, [currentUser, currentScreen]);

  const openCreateUserModal = () => {
    setEditingUser(null);
    setUserFormName('');
    setUserFormEmail('');
    setUserFormPassword('');
    setUserFormRole('RESEARCHER');
    setUserFormActive(true);
    setUserFormError('');
    setShowAddUserModal(true);
  };

  const openEditUserModal = (u) => {
    setEditingUser(u);
    setUserFormName(u.full_name);
    setUserFormEmail(u.email);
    setUserFormPassword('');
    setUserFormRole(u.role);
    setUserFormActive(u.is_active !== false);
    setUserFormError('');
    setShowAddUserModal(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setSavingUser(true);
    setUserFormError('');
    try {
      if (editingUser) {
        const body = {
          full_name: userFormName.trim(),
          role: userFormRole,
          is_active: userFormActive,
        };
        if (userFormPassword.trim()) {
          body.password = userFormPassword;
        }
        await apiFetch(`/api/users/${editingUser.user_id}`, {
          method: 'PUT',
          body,
        });
      } else {
        await apiFetch('/api/users', {
          method: 'POST',
          body: {
            full_name: userFormName.trim(),
            email: userFormEmail.trim(),
            password: userFormPassword,
            role: userFormRole,
          },
        });
      }
      setShowAddUserModal(false);
      await fetchUsers();
    } catch (err) {
      if (err.status === 401) return handleLogout();
      setUserFormError(err.message || 'Error al guardar el usuario.');
    } finally {
      setSavingUser(false);
    }
  };

  // ---------------- 5. AUDITORÍA & LOGS ----------------
  const fetchAuditLogs = async () => {
    if (!currentUser || currentUser.role !== 'ADMIN') return;
    setLogsLoading(true);
    setLogsError('');
    try {
      let path = '/api/audit/logs?skip=0&limit=150';
      if (actionFilter !== 'Todas las acciones') {
        path += `&action=${encodeURIComponent(actionFilter)}`;
      }
      const data = await apiFetch(path);
      setAuditLogs(data.events || []);
    } catch (err) {
      if (err.status === 401) return handleLogout();
      setLogsError(err.message || 'No se pudieron obtener los registros de auditoría.');
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && currentScreen === 'auditoria' && currentUser.role === 'ADMIN') {
      fetchAuditLogs();
    }
  }, [currentUser, currentScreen, actionFilter]);

  const filteredAuditLogs = auditLogs.filter((log) => {
    // Date filter
    if (dateFilter !== 'Últimos 30 días') {
      const created = new Date(log.created_at).getTime();
      const now = Date.now();
      if (dateFilter === 'Hoy' && now - created > 24 * 3600 * 1000) return false;
      if (dateFilter === 'Últimos 7 días' && now - created > 7 * 24 * 3600 * 1000) return false;
    }
    // Text search on actor, IP, or resource
    if (logsSearch.trim()) {
      const q = logsSearch.toLowerCase();
      const actorStr = (log.actor_name || log.details?.email || String(log.actor_id || 'Sistema')).toLowerCase();
      const ipStr = String(log.details?.ip || '127.0.0.1').toLowerCase();
      const resStr = String(log.resource || '').toLowerCase();
      return actorStr.includes(q) || ipStr.includes(q) || resStr.includes(q);
    }
    return true;
  });

  const handleExportAuditCSV = () => {
    const headers = ['TIMESTAMP_UTC', 'ACTOR', 'ACCION', 'RECURSO', 'IP_LOCAL', 'HASH_INTEGRIDAD'];
    const rows = filteredAuditLogs.map((log) => {
      const ts = new Date(log.created_at).toISOString().replace('T', ' ').slice(0, 19);
      const actor = log.actor_name || log.details?.email || (log.actor_id ? String(log.actor_id).slice(0, 8) : 'Sistema');
      const ip = log.details?.ip || '127.0.0.1';
      const hash = computeIntegrityHash(`${log.event_id}|${log.action}|${log.resource}|${log.created_at}`);
      return [ts, `"${actor}"`, log.action, `"${log.resource}"`, ip, hash].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper permissions for current project
  const isProjectOwner = !isNormativeMode && selectedProject && currentUser && selectedProject.responsible_id === currentUser.user_id;
  const canUploadToCurrent = isNormativeMode
    ? currentUser?.role === 'COORDINATOR' || currentUser?.role === 'ADMIN'
    : isProjectOwner && EDITABLE_STATES.includes(selectedProject?.status);
  const canDeleteFromCurrent = isNormativeMode
    ? currentUser?.role === 'COORDINATOR' || currentUser?.role === 'ADMIN'
    : currentUser?.role === 'COORDINATOR' || (isProjectOwner && EDITABLE_STATES.includes(selectedProject?.status));
  const canCreateProject = currentUser?.role === 'RESEARCHER' || currentUser?.role === 'COORDINATOR';

  const activeCitation = ragResult?.citations?.[activeCitationIdx] || null;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex flex-col">
      {/* Top Navigation / Quick Switcher Bar */}
      <div className="bg-slate-900 text-white px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between text-xs sm:text-sm z-50 sticky top-0 shadow-md">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-teal-400">UniSearch AI</span>
          <span className="hidden md:inline text-slate-500">
            | {currentUser ? `Sesión activa: ${currentUser.email} (${ROLE_LABELS[currentUser.role] || currentUser.role})` : 'Plataforma Universitaria RAG Local'}
          </span>
        </div>
        <div className="flex flex-wrap gap-1 sm:gap-2 my-1">
          {!currentUser ? (
            <button
              onClick={() => setCurrentScreen('login')}
              className="px-3 py-1 rounded transition bg-teal-600 text-white font-medium"
            >
              1. Login
            </button>
          ) : (
            <>
              <button
                onClick={() => setCurrentScreen('dashboard')}
                className={`px-3 py-1 rounded transition ${
                  currentScreen === 'dashboard'
                    ? 'bg-teal-600 text-white font-medium'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                1. Dashboard
              </button>
              <button
                onClick={() => setCurrentScreen('proyectos')}
                className={`px-3 py-1 rounded transition ${
                  currentScreen === 'proyectos'
                    ? 'bg-teal-600 text-white font-medium'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                2. Mis Proyectos
              </button>
              <button
                onClick={() => setCurrentScreen('rag')}
                className={`px-3 py-1 rounded transition ${
                  currentScreen === 'rag'
                    ? 'bg-teal-600 text-white font-medium'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                3. Asistente RAG
              </button>
              <button
                onClick={() => setCurrentScreen('usuarios')}
                className={`px-3 py-1 rounded transition ${
                  currentScreen === 'usuarios'
                    ? 'bg-teal-600 text-white font-medium'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                4. Usuarios
              </button>
              <button
                onClick={() => setCurrentScreen('auditoria')}
                className={`px-3 py-1 rounded transition ${
                  currentScreen === 'auditoria'
                    ? 'bg-teal-600 text-white font-medium'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                5. Auditoría & Logs
              </button>
            </>
          )}
        </div>
      </div>

      {/* RENDER VIEW BASED ON AUTH & STATE */}
      {!currentUser || currentScreen === 'login' ? (
        /* SCREEN 1: LOGIN (INICIAR SESIÓN) */
        <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-42px)]">
          {/* Left Decorative Section */}
          <div className="md:w-1/2 bg-[#0B132B] text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden min-h-[350px] md:min-h-auto">
            {/* Logo Header */}
            <div className="flex items-center space-x-3 z-10">
              <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
                <Icons.LogoDot />
              </div>
              <div>
                <h1 className="font-bold text-xl leading-tight tracking-tight">UniSearch AI</h1>
                <p className="text-xs text-slate-400 font-light">University Research Platform</p>
              </div>
            </div>

            {/* Glowing Decorative Composition */}
            <div className="my-auto py-12 z-10 flex flex-col items-start max-w-lg">
              <div className="relative w-full max-w-[280px] aspect-square mx-auto mb-8 flex items-center justify-center">
                <div className="absolute inset-0 bg-teal-500/10 rounded-full blur-2xl transform scale-125"></div>
                <div className="w-full h-full bg-[#132A42]/50 border border-slate-700/50 rounded-full flex items-center justify-center p-8">
                  <div className="w-full h-full bg-[#0D3843] rounded-full flex items-center justify-center border border-teal-500/30 shadow-inner">
                    <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center animate-pulse">
                      <div className="w-8 h-8 bg-teal-400 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>

              <h2 className="text-2xl md:text-3xl font-bold leading-tight mb-3">
                Plataforma Local de{' '}
                <span className="text-teal-400 font-extrabold">Gestión e Investigación</span>
              </h2>
              <p className="text-slate-400 text-sm md:text-base leading-relaxed">
                Procesamiento documental seguro y búsquedas semánticas mediante Inteligencia Artificial local para entornos universitarios.
              </p>
            </div>

            <div className="text-xs text-slate-500 z-10">
              © 2026 UniSearch AI Platform • Módulo Institucional
            </div>
          </div>

          {/* Right Form Section */}
          <div className="md:w-1/2 bg-[#F8FAFC] p-6 sm:p-12 flex items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200/80 p-8 sm:p-10">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-slate-900 mb-1">Iniciar Sesión</h2>
                <p className="text-sm text-slate-500">
                  Ingrese sus credenciales institucionales para acceder
                </p>
              </div>

              {loginError && (
                <div className="mb-5 rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-medium text-rose-700">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Correo Institucional
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition"
                    placeholder="inv@universidad.edu"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm pr-11 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1"
                    >
                      {showPassword ? <Icons.EyeOff /> : <Icons.Eye />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full mt-2 py-3.5 px-4 bg-[#0F172A] hover:bg-slate-800 disabled:opacity-60 text-white font-medium rounded-xl text-sm transition shadow-md hover:shadow-lg active:scale-[0.99]"
                >
                  {loginLoading ? 'Autenticando...' : 'Ingresar al Sistema'}
                </button>

                {/* Quick Seed Credentials Helper for Local Testing */}
                <div className="pt-2">
                  <p className="text-[11px] text-slate-400 text-center mb-2">
                    Cuentas de prueba locales (Contraseña: <code className="text-slate-600 font-semibold">Admin123!</code>):
                  </p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {[
                      { label: 'Investigador', mail: 'inv@universidad.edu' },
                      { label: 'Coordinador', mail: 'coord@universidad.edu' },
                      { label: 'Admin', mail: 'admin@universidad.edu' },
                    ].map((preset) => (
                      <button
                        key={preset.mail}
                        type="button"
                        onClick={() => {
                          setEmail(preset.mail);
                          setPassword('Admin123!');
                        }}
                        className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 rounded-lg border border-slate-200 transition"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 text-center">
                  <span className="text-[11px] text-slate-400">
                    UniSearch AI v2.4 • Red Académica Privada
                  </span>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* SCREENS 2-5 DASHBOARD SHELL LAYOUT */
        <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-42px)]">
          {/* Sidebar */}
          <aside className="w-full md:w-64 bg-[#0B132B] text-slate-300 flex flex-col justify-between shrink-0 border-r border-slate-800">
            <div>
              {/* Brand Header */}
              <div className="p-6 flex items-center space-x-3 border-b border-slate-800/80">
                <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center shadow-md">
                  <Icons.LogoDot />
                </div>
                <div>
                  <h1 className="font-bold text-white text-base leading-none">UniSearch AI</h1>
                  <p className="text-[10px] text-slate-400 mt-1">Research Platform</p>
                </div>
              </div>

              {/* Sidebar Navigation Menu */}
              <nav className="p-4 space-y-1.5 text-sm">
                <button
                  onClick={() => setCurrentScreen('dashboard')}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium transition ${
                    currentScreen === 'dashboard'
                      ? 'bg-slate-800/90 text-white border-l-4 border-teal-500 pl-2.5 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icons.Dashboard />
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => setCurrentScreen('proyectos')}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium transition ${
                    currentScreen === 'proyectos'
                      ? 'bg-slate-800/90 text-white border-l-4 border-teal-500 pl-2.5 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icons.Folder />
                  <span>Mis Proyectos</span>
                </button>

                <button
                  onClick={() => setCurrentScreen('rag')}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium transition ${
                    currentScreen === 'rag'
                      ? 'bg-slate-800/90 text-white border-l-4 border-teal-500 pl-2.5 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icons.Sparkles />
                  <span>Asistente RAG</span>
                </button>

                <button
                  onClick={() => setCurrentScreen('usuarios')}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium transition ${
                    currentScreen === 'usuarios'
                      ? 'bg-slate-800/90 text-white border-l-4 border-teal-500 pl-2.5 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icons.Users />
                  <span>Usuarios</span>
                </button>

                <button
                  onClick={() => setCurrentScreen('auditoria')}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium transition ${
                    currentScreen === 'auditoria'
                      ? 'bg-slate-800/90 text-white border-l-4 border-teal-500 pl-2.5 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Icons.ShieldCheck />
                  <span>Auditoría & Logs</span>
                </button>
              </nav>
            </div>

            {/* Sidebar Bottom Profile Card */}
            <div className="p-4 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <div className="flex items-center space-x-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-full bg-sky-600 text-white font-semibold text-xs flex items-center justify-center shrink-0">
                    {getInitials(currentUser?.full_name)}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-white truncate">
                      {currentUser?.full_name || 'Usuario'}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {ROLE_LABELS[currentUser?.role] || currentUser?.role}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Cerrar sesión"
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition shrink-0"
                >
                  <Icons.LogOut />
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 bg-[#F8FAFC] flex flex-col min-w-0">
            {/* Top Common Header Bar */}
            <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3 overflow-hidden">
                {currentScreen === 'dashboard' && (
                  <h1 className="text-lg font-bold text-slate-900 truncate">
                    Directorio General de Proyectos de Investigación
                  </h1>
                )}
                {currentScreen === 'proyectos' && (
                  <button
                    onClick={() => setCurrentScreen('dashboard')}
                    className="flex items-center text-xs text-sky-600 font-medium hover:underline"
                  >
                    <Icons.ArrowLeft />
                    Volver a Lista de Proyectos
                  </button>
                )}
                {currentScreen === 'rag' && (
                  <h1 className="text-lg font-bold text-slate-900 truncate">
                    Módulo de Búsqueda Semántica e Inferencia IA
                  </h1>
                )}
                {currentScreen === 'usuarios' && (
                  <h1 className="text-lg font-bold text-slate-900 truncate">
                    Administración del Sistema y Usuarios
                  </h1>
                )}
                {currentScreen === 'auditoria' && (
                  <h1 className="text-lg font-bold text-slate-900 truncate">
                    Consola de Auditoría e Historial Inmutable
                  </h1>
                )}
              </div>

              {/* Header Right Status Badges */}
              <div className="flex items-center space-x-3 shrink-0">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                  Logs Inmutables
                </span>

                <button
                  onClick={() => setCurrentScreen('auditoria')}
                  className="relative p-1.5 text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition"
                  title="Ver notificaciones y auditoría"
                >
                  <Icons.Bell />
                  <span className="absolute top-0 right-0 w-2 h-2 bg-amber-500 rounded-full"></span>
                </button>

                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center border border-slate-300">
                  {getInitials(currentUser?.full_name)}
                </div>
              </div>
            </header>

            {/* MAIN VIEW CONTENT SWITCHER */}
            <div className="flex-1 p-4 sm:p-6 space-y-6 overflow-y-auto">
              {/* ------------------------------------------------------------- */}
              {/* DASHBOARD: LISTA DE PROYECTOS */}
              {/* ------------------------------------------------------------- */}
              {currentScreen === 'dashboard' && (
                <div className="space-y-6 max-w-7xl mx-auto">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Proyectos de Investigación</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Seleccione un proyecto para gestionar sus documentos e indexación RAG
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsNormativeMode(true);
                          setSelectedProject(null);
                          setCurrentScreen('proyectos');
                        }}
                        className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-lg transition shadow-sm"
                      >
                        Normativa Institucional
                      </button>
                      {canCreateProject && (
                        <button
                          type="button"
                          onClick={() => setShowCreateProjectModal(true)}
                          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs rounded-lg transition shadow-sm flex items-center"
                        >
                          <Icons.Plus />
                          Nuevo Proyecto
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filters Bar */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="relative w-full sm:w-80">
                      <input
                        type="text"
                        placeholder="Filtrar por área temática..."
                        value={searchArea}
                        onChange={(e) => setSearchArea(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchProjects()}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <div className="absolute left-2.5 top-2.5">
                        <Icons.Search />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                      >
                        <option value="">Todos los estados</option>
                        <option value="DRAFT">Borrador (DRAFT)</option>
                        <option value="IN_REVIEW">En Revisión (IN_REVIEW)</option>
                        <option value="APPROVED">Aprobado (APPROVED)</option>
                        <option value="REJECTED">Rechazado (REJECTED)</option>
                        <option value="ARCHIVED">Archivado (ARCHIVED)</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => fetchProjects()}
                        className="px-4 py-2 bg-[#0F172A] text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition"
                      >
                        Buscar
                      </button>
                    </div>
                  </div>

                  {projectsLoading ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500">
                      Cargando proyectos...
                    </div>
                  ) : projectsError ? (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-xs">
                      {projectsError}
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center space-y-2">
                      <p className="text-sm font-semibold text-slate-700">No se encontraron proyectos registrados</p>
                      <p className="text-xs text-slate-500">
                        Puede crear un proyecto nuevo o consultar los documentos de Normativa Institucional.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {projects.map((proj) => (
                        <div
                          key={proj.project_id}
                          className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider truncate">
                                {proj.area}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                  STATUS_BADGE_CLASSES[proj.status] || 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {STATUS_LABELS[proj.status] || proj.status}
                              </span>
                            </div>
                            <h3 className="text-base font-bold text-slate-900 mb-1.5 line-clamp-2">
                              {proj.title}
                            </h3>
                            <p className="text-xs text-slate-500 line-clamp-3 mb-4">
                              {proj.description || 'Sin descripción registrada.'}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-400 truncate">
                              Resp: {proj.responsible_name || 'Investigador'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setIsNormativeMode(false);
                                setSelectedProject(proj);
                                setCurrentScreen('proyectos');
                              }}
                              className="text-teal-600 hover:text-teal-800 font-semibold shrink-0"
                            >
                              Abrir Expediente &rarr;
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* SCREEN 2: MIS PROYECTOS (PROJECT DETAIL & DOCUMENTS) */}
              {/* ------------------------------------------------------------- */}
              {currentScreen === 'proyectos' && (
                <div className="space-y-6 max-w-7xl mx-auto">
                  {/* Top Selector Bar to switch project or normative docs */}
                  <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="text-xs font-semibold text-slate-600">Expediente Activo:</label>
                      <select
                        value={isNormativeMode ? '__NORMATIVA__' : selectedProject?.project_id || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__NORMATIVA__') {
                            setIsNormativeMode(true);
                            setSelectedProject(null);
                          } else {
                            setIsNormativeMode(false);
                            const found = projects.find((p) => p.project_id === val);
                            if (found) setSelectedProject(found);
                          }
                        }}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        {projects.map((p) => (
                          <option key={p.project_id} value={p.project_id}>
                            {p.title} ({STATUS_LABELS[p.status] || p.status})
                          </option>
                        ))}
                        <option value="__NORMATIVA__">📚 Repositorio de Normativa Institucional</option>
                      </select>
                    </div>

                    {canCreateProject && (
                      <button
                        type="button"
                        onClick={() => setShowCreateProjectModal(true)}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition flex items-center"
                      >
                        <Icons.Plus />
                        Nuevo Proyecto
                      </button>
                    )}
                  </div>

                  {/* Card 1: Project Overview Header */}
                  <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    {isNormativeMode ? (
                      <>
                        <div>
                          <h2 className="text-xl font-bold text-slate-900">
                            Repositorio: Normativa y Reglamentos Institucionales
                          </h2>
                          <p className="text-xs text-slate-500 mt-1">
                            ID: NORM-INST-2026 • Acceso: Público Transversal • Consultable por todos los investigadores en RAG
                          </p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-200">
                          Normativa Global
                        </span>
                      </>
                    ) : selectedProject ? (
                      <>
                        <div>
                          <h2 className="text-xl font-bold text-slate-900">
                            Proyecto: {selectedProject.title}
                          </h2>
                          <p className="text-xs text-slate-500 mt-1">
                            ID: {String(selectedProject.project_id).slice(0, 8).toUpperCase()} • Responsable:{' '}
                            {selectedProject.responsible_name || currentUser?.full_name || 'Investigador'} • Área:{' '}
                            {selectedProject.area}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                              STATUS_BADGE_CLASSES[selectedProject.status] || 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}
                          >
                            {STATUS_LABELS[selectedProject.status] || selectedProject.status}
                          </span>

                          {/* Workflow Transition Buttons */}
                          {isProjectOwner && selectedProject.status === 'DRAFT' && (
                            <button
                              onClick={() => handleStatusChange('IN_REVIEW')}
                              className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium rounded-lg transition"
                            >
                              Enviar a Revisión
                            </button>
                          )}
                          {isProjectOwner && selectedProject.status === 'REJECTED' && (
                            <button
                              onClick={() => handleStatusChange('DRAFT')}
                              className="px-3 py-1 bg-slate-700 hover:bg-slate-800 text-white text-xs font-medium rounded-lg transition"
                            >
                              Reabrir Borrador
                            </button>
                          )}
                          {currentUser?.role === 'COORDINATOR' &&
                            !isProjectOwner &&
                            selectedProject.status === 'IN_REVIEW' && (
                              <>
                                <button
                                  onClick={() => handleStatusChange('APPROVED')}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition"
                                >
                                  Aprobar
                                </button>
                                <button
                                  onClick={() => handleStatusChange('REJECTED')}
                                  className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-lg transition"
                                >
                                  Rechazar
                                </button>
                              </>
                            )}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-500">
                        No hay ningún proyecto seleccionado. Cree un proyecto nuevo o seleccione Normativa Institucional.
                      </div>
                    )}
                  </div>

                  {/* Status / Error Feedback */}
                  {docActionMessage && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs flex justify-between items-center">
                      <span>{docActionMessage}</span>
                      <button onClick={() => setDocActionMessage('')} className="font-bold ml-3">✕</button>
                    </div>
                  )}
                  {docActionError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs flex justify-between items-center">
                      <span>{docActionError}</span>
                      <button onClick={() => setDocActionError('')} className="font-bold ml-3">✕</button>
                    </div>
                  )}

                  {/* Card 2: Upload New Document */}
                  <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-800 text-base">
                        Cargar Nuevo Documento (Data Entry)
                      </h3>
                      {!canUploadToCurrent && (
                        <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                          Solo lectura (requiere ser responsable en estado Borrador/Rechazado, o Coordinador en Normativa)
                        </span>
                      )}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />

                    {/* Drag and Drop Zone */}
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={canUploadToCurrent ? handleDropFile : undefined}
                      onClick={() => canUploadToCurrent && fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
                        canUploadToCurrent
                          ? 'border-teal-500/80 bg-teal-50/20 hover:bg-teal-50/40 cursor-pointer group'
                          : 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <p className="text-teal-700 font-semibold text-sm group-hover:scale-105 transition transform">
                        {uploadingDoc
                          ? 'Subiendo y vectorizando documento...'
                          : 'Arrastre archivos PDF o DOCX aquí o haga clic para examinar'}
                      </p>
                      <p className="text-slate-400 text-xs mt-1">
                        Tamaño máximo: 50MB. Los documentos se vectorizan localmente de forma automática.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
                      <div className="flex items-center space-x-2">
                        <label className="text-xs font-medium text-slate-600">Tipo de Documento:</label>
                        <select
                          value={docType}
                          onChange={(e) => setDocType(e.target.value)}
                          className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          <option value="Borrador de Patente">Borrador de Patente</option>
                          <option value="Artículo Científico">Artículo Científico</option>
                          <option value="Informe Técnico">Informe Técnico</option>
                          <option value="Normativa Institucional">Normativa Institucional</option>
                        </select>
                      </div>

                      <button
                        type="button"
                        disabled={!canUploadToCurrent || uploadingDoc}
                        onClick={handleUploadButton}
                        className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition shadow-sm hover:shadow"
                      >
                        {uploadingDoc ? 'Subiendo...' : 'Subir e Indexar'}
                      </button>
                    </div>
                  </div>

                  {/* Card 3: Documents Table */}
                  <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="font-bold text-slate-800 text-base">
                        Documentos Asociados y Estado de Indexación RAG
                      </h3>
                      <button
                        type="button"
                        onClick={() => fetchDocuments()}
                        className="text-xs text-teal-600 hover:underline font-medium"
                      >
                        Actualizar estado
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                            <th className="py-3 px-5">NOMBRE DEL ARCHIVO</th>
                            <th className="py-3 px-5">VERSIÓN</th>
                            <th className="py-3 px-5">TIPO</th>
                            <th className="py-3 px-5">ESTADO RAG</th>
                            <th className="py-3 px-5 text-right">ACCIONES</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {docsLoading ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-400">
                                Cargando documentos del expediente...
                              </td>
                            </tr>
                          ) : documents.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-8 text-center text-slate-400">
                                No hay documentos cargados en este expediente.
                              </td>
                            </tr>
                          ) : (
                            documents.map((doc) => (
                              <tr key={doc.document_id} className="hover:bg-slate-50/80 transition">
                                <td className="py-3.5 px-5 font-semibold text-slate-800">
                                  {doc.file_name}
                                </td>
                                <td className="py-3.5 px-5 text-slate-500">v{doc.version}.0</td>
                                <td className="py-3.5 px-5 text-slate-500">{doc.file_type}</td>
                                <td className="py-3.5 px-5">
                                  {doc.status === 'PUBLISHED' && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700">
                                      Publicado
                                    </span>
                                  )}
                                  {(doc.status === 'PENDING' || doc.status === 'PROCESSING') && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-700 animate-pulse">
                                      Procesando
                                    </span>
                                  )}
                                  {doc.status === 'ERROR' && (
                                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-100 text-rose-700">
                                      Error
                                    </span>
                                  )}
                                </td>
                                <td className="py-3.5 px-5 text-right space-x-2">
                                  <button
                                    onClick={() => handleDownloadDoc(doc)}
                                    className="text-sky-600 hover:text-sky-800 font-medium"
                                  >
                                    Descargar
                                  </button>
                                  {canDeleteFromCurrent && (
                                    <>
                                      <span className="text-slate-300">|</span>
                                      <button
                                        onClick={() => handleDeleteDoc(doc.document_id)}
                                        className="text-sky-600 hover:text-red-600 font-medium"
                                      >
                                        Eliminar
                                      </button>
                                    </>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* SCREEN 3: ASISTENTE RAG */}
              {/* ------------------------------------------------------------- */}
              {currentScreen === 'rag' && (
                <div className="space-y-6 max-w-7xl mx-auto">
                  {/* Search / Query Input Card */}
                  <form
                    onSubmit={handleRunRAGQuery}
                    className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 flex flex-col sm:flex-row gap-3"
                  >
                    <input
                      type="text"
                      value={ragQuery}
                      onChange={(e) => setRagQuery(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Escriba su consulta semántica sobre proyectos autorizados o normativa institucional..."
                    />
                    <button
                      type="submit"
                      disabled={isQuerying || ragQuery.trim().length < 3}
                      className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-medium text-xs rounded-lg transition shadow-sm shrink-0 flex items-center justify-center min-w-[140px]"
                    >
                      {isQuerying ? 'Procesando...' : 'Consultar con IA'}
                    </button>
                  </form>

                  {ragError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-xs">
                      {ragError}
                    </div>
                  )}

                  {/* Two Column Layout: Generated Answer & Citations Inspector */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left 2 Columns: AI Response */}
                    <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 flex flex-col justify-between space-y-6">
                      <div>
                        <div className="bg-teal-50/50 border-b border-teal-100 -mx-6 -mt-6 p-4 mb-5 rounded-t-xl flex items-center justify-between">
                          <h3 className="font-bold text-teal-800 text-sm">
                            Respuesta Generada por IA (Llama 3 Local)
                          </h3>
                          {ragResult?.max_score != null && (
                            <span className="text-[11px] font-semibold text-teal-700 bg-teal-100/80 px-2.5 py-0.5 rounded-full">
                              Similitud máx: {(ragResult.max_score * 100).toFixed(1)}%
                            </span>
                          )}
                        </div>

                        {isQuerying ? (
                          <div className="py-12 text-center text-slate-500 text-xs space-y-2">
                            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-teal-600 mx-auto"></div>
                            <p>Recuperando fragmentos autorizados en Qdrant e invocando Llama 3 local...</p>
                          </div>
                        ) : ragResult ? (
                          <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
                            <div className="whitespace-pre-line">{ragResult.answer}</div>

                            {ragResult.citations && ragResult.citations.length > 0 && (
                              <div className="pt-3 border-t border-slate-100">
                                <p className="text-xs font-semibold text-slate-500 mb-2">
                                  Fuentes citadas verificadas (clic para inspeccionar):
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {ragResult.citations.map((cit, idx) => (
                                    <button
                                      key={cit.fragment_id || idx}
                                      type="button"
                                      onClick={() => setActiveCitationIdx(idx)}
                                      className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition ${
                                        activeCitationIdx === idx
                                          ? 'bg-sky-600 text-white shadow-sm'
                                          : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
                                      }`}
                                    >
                                      [Cita {cit.ref || idx + 1}] {cit.file_name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="py-8 text-xs text-slate-500 space-y-2">
                            <p className="font-medium text-slate-700">
                              Realice una pregunta en el buscador superior para consultar el repositorio documental.
                            </p>
                            <p>
                              El asistente aplica control de acceso (RBAC) antes de consultar Qdrant y responde únicamente con evidencia trazable.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Red Warning Box */}
                      <div
                        className={`border rounded-lg p-4 text-xs space-y-1 ${
                          ragResult?.abstained
                            ? 'border-red-400 bg-red-100/80 text-red-900'
                            : 'border-red-200 bg-red-50/60 text-red-800'
                        }`}
                      >
                        <p className="font-bold">
                          Nota de Abstención de IA {ragResult?.abstained ? '(ACTIVA EN ESTA CONSULTA)' : ''}:
                        </p>
                        <p>
                          Si la similitud semántica es inferior al umbral calibrado o no existen fragmentos suficientes, el modelo se abstiene sin inventar información.
                        </p>
                      </div>
                    </div>

                    {/* Right 1 Column: Citations Inspector */}
                    <div className="bg-white rounded-xl border border-sky-400 shadow-sm p-5 flex flex-col justify-between space-y-5 relative">
                      <div className="space-y-4">
                        <h3 className="font-bold text-sky-900 text-sm border-b border-slate-100 pb-2">
                          Inspector de Citas {activeCitation ? `[Cita ${activeCitation.ref}]` : ''}
                        </h3>

                        {activeCitation ? (
                          <>
                            {/* Source Document Details */}
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-1 text-xs">
                              <p className="font-bold text-slate-800">Documento Fuente:</p>
                              <p className="text-sky-600 font-medium break-all">
                                {activeCitation.file_name}
                              </p>
                              <p className="text-slate-500 pt-1 text-[11px]">
                                Versión: v{activeCitation.version || 1}.0 | Página:{' '}
                                {activeCitation.page_number ?? 1} | Párrafo:{' '}
                                {activeCitation.paragraph_num ?? 1}
                              </p>
                            </div>

                            {/* Extracted Match Box */}
                            <div className="space-y-1.5">
                              <p className="text-xs font-semibold text-slate-700">
                                Fragmento Original Extraído (Match{' '}
                                {Math.round((activeCitation.score || 0) * 100)}%):
                              </p>
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-900 italic leading-relaxed max-h-56 overflow-y-auto">
                                "{activeCitation.content || 'Fragmento verificado en la base documental.'}"
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="py-10 text-center text-xs text-slate-400">
                            {ragResult?.abstained
                              ? 'Sin citas para mostrar debido a abstención por umbral de evidencia.'
                              : 'Ejecute una consulta con evidencia para inspeccionar el fragmento original, página y párrafo.'}
                          </div>
                        )}
                      </div>

                      {/* Document Download Button */}
                      <button
                        type="button"
                        disabled={!activeCitation}
                        onClick={() =>
                          activeCitation &&
                          apiDownloadDocument(activeCitation.document_id, activeCitation.file_name)
                        }
                        className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white font-medium text-xs rounded-lg transition shadow-sm text-center"
                      >
                        {activeCitation
                          ? `Descargar Documento (Página ${activeCitation.page_number ?? 1})`
                          : 'Descargar Documento Fuente'}
                      </button>
                    </div>
                  </div>

                  {/* Personal Query History Card */}
                  {ragHistory.length > 0 && (
                    <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-3">
                      <h3 className="font-bold text-slate-800 text-sm">
                        Historial Reciente de Consultas ({currentUser.email})
                      </h3>
                      <div className="divide-y divide-slate-100 text-xs">
                        {ragHistory.slice(0, 5).map((item) => (
                          <div
                            key={item.query_id}
                            className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 px-2 rounded"
                          >
                            <div className="truncate">
                              <span className="font-semibold text-slate-800">{item.prompt_text}</span>
                              <p className="text-slate-500 truncate">{item.response_text}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setRagQuery(item.prompt_text)}
                              className="text-teal-600 hover:underline font-medium shrink-0"
                            >
                              Reutilizar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* SCREEN 4: USUARIOS */}
              {/* ------------------------------------------------------------- */}
              {currentScreen === 'usuarios' && (
                <div className="space-y-6 max-w-7xl mx-auto">
                  {/* Navigation Tabs */}
                  <div className="flex space-x-2 border-b border-slate-200 pb-1">
                    <button
                      onClick={() => setActiveUserTab('usuarios')}
                      className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition ${
                        activeUserTab === 'usuarios'
                          ? 'bg-[#0F172A] text-white'
                          : 'bg-slate-200/70 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Gestión de Usuarios
                    </button>
                    <button
                      onClick={() => setActiveUserTab('configuracion')}
                      className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition ${
                        activeUserTab === 'configuracion'
                          ? 'bg-[#0F172A] text-white'
                          : 'bg-slate-200/70 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Configuración RAG / Sistema
                    </button>
                  </div>

                  {activeUserTab === 'usuarios' ? (
                    currentUser?.role !== 'ADMIN' ? (
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-6 text-xs space-y-1">
                        <p className="font-bold text-sm">Acceso Restringido a Administradores</p>
                        <p>
                          Su rol actual ({ROLE_LABELS[currentUser?.role] || currentUser?.role}) no tiene permisos para administrar el padrón de usuarios. Inicie sesión con una cuenta <strong>ADMIN</strong> (ej. <code>admin@universidad.edu</code>).
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <h3 className="font-bold text-slate-800 text-base">
                            Padrón de Usuarios Institucionales
                          </h3>
                          <button
                            onClick={openCreateUserModal}
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs rounded-lg transition shadow-sm flex items-center"
                          >
                            <Icons.Plus />
                            Crear Usuario
                          </button>
                        </div>

                        {usersError && (
                          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs">
                            {usersError}
                          </div>
                        )}

                        {/* Users Table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                <th className="py-3 px-5">USUARIO</th>
                                <th className="py-3 px-5">CORREO INSTITUCIONAL</th>
                                <th className="py-3 px-5">ROL</th>
                                <th className="py-3 px-5">ESTADO</th>
                                <th className="py-3 px-5 text-right">ACCIONES</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                              {usersLoading ? (
                                <tr>
                                  <td colSpan={5} className="py-8 text-center text-slate-400">
                                    Cargando padrón de usuarios...
                                  </td>
                                </tr>
                              ) : (
                                usersList.map((u) => (
                                  <tr key={u.user_id} className="hover:bg-slate-50/80 transition">
                                    <td className="py-3.5 px-5 font-bold text-slate-800">
                                      {u.full_name}
                                    </td>
                                    <td className="py-3.5 px-5 text-slate-500">{u.email}</td>
                                    <td className="py-3.5 px-5">
                                      <span className="px-3 py-1 rounded border border-slate-200 bg-slate-100 text-slate-700 text-[11px] font-medium">
                                        {ROLE_SHORT[u.role] || u.role}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-5">
                                      {u.is_active !== false ? (
                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-700">
                                          Activo
                                        </span>
                                      ) : (
                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700">
                                          Inactivo
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3.5 px-5 text-right">
                                      <button
                                        onClick={() => openEditUserModal(u)}
                                        className="text-sky-600 hover:text-sky-800 font-medium"
                                      >
                                        Editar
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 text-sm text-slate-600 space-y-4">
                      <h3 className="font-bold text-slate-800 text-base">Configuración RAG / Sistema</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-slate-400 uppercase font-semibold text-[10px]">Modelo LLM Local</p>
                          <p className="text-slate-800 font-bold text-sm mt-1">llama3:8b-instruct-q4_0</p>
                          <p className="text-slate-500 mt-1">Servidor local Ollama (Temperatura: 0.1)</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-slate-400 uppercase font-semibold text-[10px]">Embeddings Offline</p>
                          <p className="text-slate-800 font-bold text-sm mt-1">intfloat/multilingual-e5-small</p>
                          <p className="text-slate-500 mt-1">Dimensión: 384 • Distancia Coseno</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-slate-400 uppercase font-semibold text-[10px]">Motor Vectorial & Umbral</p>
                          <p className="text-slate-800 font-bold text-sm mt-1">Qdrant Local (Puerto 6333)</p>
                          <p className="text-slate-500 mt-1">Chunk máx: 512 tokens • Top-K: 4</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Add / Edit User Modal */}
                  {showAddUserModal && (
                    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                      <form
                        onSubmit={handleSaveUser}
                        className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200"
                      >
                        <h3 className="text-lg font-bold text-slate-900">
                          {editingUser ? 'Editar Usuario Institucional' : 'Crear Nuevo Usuario'}
                        </h3>
                        {userFormError && (
                          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                            {userFormError}
                          </div>
                        )}
                        <div className="space-y-3 text-xs">
                          <div>
                            <label className="block font-semibold mb-1">Nombre Completo</label>
                            <input
                              type="text"
                              required
                              value={userFormName}
                              onChange={(e) => setUserFormName(e.target.value)}
                              placeholder="Dr. Nombre Apellido"
                              className="w-full p-2.5 border border-slate-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold mb-1">Correo Institucional</label>
                            <input
                              type="email"
                              required
                              disabled={!!editingUser}
                              value={userFormEmail}
                              onChange={(e) => setUserFormEmail(e.target.value)}
                              placeholder="usuario@universidad.edu"
                              className="w-full p-2.5 border border-slate-300 rounded-lg disabled:bg-slate-100"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold mb-1">
                              {editingUser ? 'Nueva Contraseña (opcional)' : 'Contraseña'}
                            </label>
                            <input
                              type="password"
                              required={!editingUser}
                              value={userFormPassword}
                              onChange={(e) => setUserFormPassword(e.target.value)}
                              placeholder="Mínimo 6 caracteres"
                              className="w-full p-2.5 border border-slate-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold mb-1">Rol</label>
                            <select
                              value={userFormRole}
                              onChange={(e) => setUserFormRole(e.target.value)}
                              className="w-full p-2.5 border border-slate-300 rounded-lg bg-white"
                            >
                              <option value="RESEARCHER">Investigador (RESEARCHER)</option>
                              <option value="COORDINATOR">Coordinador (COORDINATOR)</option>
                              <option value="ADMIN">Administrador (ADMIN)</option>
                            </select>
                          </div>
                          {editingUser && (
                            <div className="flex items-center space-x-2 pt-1">
                              <input
                                id="user-active-toggle"
                                type="checkbox"
                                checked={userFormActive}
                                onChange={(e) => setUserFormActive(e.target.checked)}
                                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                              />
                              <label htmlFor="user-active-toggle" className="font-semibold text-slate-700">
                                Cuenta Activa
                              </label>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-end space-x-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowAddUserModal(false)}
                            className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                          >
                            Cancelar
                          </button>
                          <button
                            type="submit"
                            disabled={savingUser}
                            className="px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-lg"
                          >
                            {savingUser ? 'Guardando...' : 'Guardar'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* SCREEN 5: AUDITORÍA & LOGS */}
              {/* ------------------------------------------------------------- */}
              {currentScreen === 'auditoria' && (
                <div className="space-y-6 max-w-7xl mx-auto">
                  {currentUser?.role !== 'ADMIN' ? (
                    <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-6 text-xs space-y-1">
                      <p className="font-bold text-sm">Consola de Auditoría Exclusiva para Administradores</p>
                      <p>
                        Conforme a la política RBAC (RF-016), únicamente el rol <strong>ADMIN</strong> puede inspeccionar la bitácora de auditoría inmutable.
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Filter Controls Card */}
                      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-4 flex flex-col md:flex-row items-stretch md:items-end justify-between gap-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                              RANGO DE FECHA
                            </label>
                            <select
                              value={dateFilter}
                              onChange={(e) => setDateFilter(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                            >
                              <option>Últimos 30 días</option>
                              <option>Últimos 7 días</option>
                              <option>Hoy</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                              TIPO DE EVENTO
                            </label>
                            <select
                              value={actionFilter}
                              onChange={(e) => setActionFilter(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700"
                            >
                              <option>Todas las acciones</option>
                              <option value="LOGIN">LOGIN</option>
                              <option value="LOGIN_FAILED">LOGIN_FAILED</option>
                              <option value="CREATE_PROJECT">CREATE_PROJECT</option>
                              <option value="STATUS_CHANGE">STATUS_CHANGE</option>
                              <option value="UPLOAD">UPLOAD</option>
                              <option value="DOWNLOAD_DOCUMENT">DOWNLOAD_DOCUMENT</option>
                              <option value="RAG_QUERY">RAG_QUERY</option>
                              <option value="USER_CREATE">USER_CREATE</option>
                              <option value="USER_UPDATE">USER_UPDATE</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                              FILTRAR POR IP / ACTOR
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={logsSearch}
                                onChange={(e) => setLogsSearch(e.target.value)}
                                placeholder="Buscar usuario, recurso o IP..."
                                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
                              />
                              <div className="absolute left-2.5 top-2.5">
                                <Icons.Search />
                              </div>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={handleExportAuditCSV}
                          className="px-5 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition shadow-sm shrink-0"
                        >
                          Exportar Reporte
                        </button>
                      </div>

                      {logsError && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs">
                          {logsError}
                        </div>
                      )}

                      {/* Main Audit Trail Table */}
                      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                          <h3 className="font-bold text-slate-800 text-base">
                            Registros del Sistema (Audit Trail)
                          </h3>
                          <span className="text-xs text-slate-400">
                            Mostrando {filteredAuditLogs.length} eventos
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                <th className="py-3 px-5">TIMESTAMP (UTC)</th>
                                <th className="py-3 px-5">ACTOR / USUARIO</th>
                                <th className="py-3 px-5">ACCIÓN</th>
                                <th className="py-3 px-5">RECURSO AFECTADO</th>
                                <th className="py-3 px-5">IP LOCAL</th>
                                <th className="py-3 px-5">HASH DE INTEGRIDAD</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                              {logsLoading ? (
                                <tr>
                                  <td colSpan={6} className="py-8 text-center text-slate-400">
                                    Cargando bitácora de auditoría...
                                  </td>
                                </tr>
                              ) : filteredAuditLogs.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="py-8 text-center text-slate-400">
                                    No se encontraron eventos con los filtros seleccionados.
                                  </td>
                                </tr>
                              ) : (
                                filteredAuditLogs.map((log) => {
                                  const ts = new Date(log.created_at)
                                    .toISOString()
                                    .replace('T', ' ')
                                    .slice(0, 19);
                                  const actorDisplay =
                                    log.actor_name ||
                                    log.details?.email ||
                                    (log.actor_id ? `Usuario ${String(log.actor_id).slice(0, 8)}` : 'Sistema');
                                  const ipDisplay = log.details?.ip || '127.0.0.1';
                                  const hashDisplay = computeIntegrityHash(
                                    `${log.event_id}|${log.action}|${log.resource}|${log.created_at}`
                                  );

                                  return (
                                    <tr key={log.event_id} className="hover:bg-slate-50/80 transition">
                                      <td className="py-3.5 px-5 text-slate-500 font-mono">{ts}</td>
                                      <td className="py-3.5 px-5 font-bold text-slate-800">{actorDisplay}</td>
                                      <td className="py-3.5 px-5">
                                        <span
                                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                            log.action.includes('APPROVE') || log.action === 'STATUS_CHANGE'
                                              ? 'bg-emerald-100 text-emerald-700'
                                              : log.action.includes('UPLOAD') || log.action.includes('DOC')
                                              ? 'bg-sky-100 text-sky-700'
                                              : log.action.includes('USER')
                                              ? 'bg-amber-100 text-amber-700'
                                              : log.action === 'RAG_QUERY'
                                              ? 'bg-teal-100 text-teal-700'
                                              : log.action.includes('FAILED') || log.action.includes('DENIED')
                                              ? 'bg-rose-100 text-rose-700'
                                              : 'bg-slate-100 text-slate-700'
                                          }`}
                                        >
                                          {log.action}
                                        </span>
                                      </td>
                                      <td className="py-3.5 px-5 text-slate-600 font-mono text-[11px]">
                                        {log.resource}
                                      </td>
                                      <td className="py-3.5 px-5 text-slate-500 font-mono">{ipDisplay}</td>
                                      <td className="py-3.5 px-5 text-sky-600 font-mono text-[11px]">
                                        {hashDisplay}
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Bottom Panels Section: Notifications & Storage Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Active Notifications Card */}
                    <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-3">
                      <h3 className="font-bold text-slate-800 text-sm">
                        Centro de Notificaciones Activas
                      </h3>

                      <div className="border border-teal-200 bg-teal-50/40 rounded-lg p-3.5 text-xs text-teal-900 space-y-0.5">
                        <p className="font-bold text-teal-700">Motor RAG & Qdrant Activos</p>
                        <p className="text-slate-600">
                          Pipeline de vectorización local e inferencia con Llama 3 listo para consultas.
                        </p>
                      </div>

                      <div className="border border-amber-200 bg-amber-50/40 rounded-lg p-3.5 text-xs text-amber-900 space-y-0.5">
                        <p className="font-bold text-amber-700">Control de Acceso y Auditoría</p>
                        <p className="text-slate-600">
                          Todas las descargas, cambios de estado y consultas RAG quedan registradas en PostgreSQL.
                        </p>
                      </div>
                    </div>

                    {/* Local Storage Status Card */}
                    <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-5 space-y-4">
                      <h3 className="font-bold text-slate-800 text-sm">
                        Estado del Almacenamiento Local
                      </h3>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-slate-600 font-medium">
                          <span>Base de Datos Vectorial (Qdrant Local):</span>
                          <span className="font-bold text-slate-800">1.2 GB / 50 GB</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                          <div className="bg-teal-500 h-2.5 rounded-full w-[2.4%]"></div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-600">Respaldos de Seguridad:</span>
                        <span className="font-bold text-emerald-600 flex items-center">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>
                          Al Día (02:00 AM)
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400">
                        Firma Criptográfica SHA-256 activa en todos los registros.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      )}

      {/* Modal para Crear Proyecto */}
      {showCreateProjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Registrar Nuevo Proyecto</h3>
            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Título del Proyecto</label>
                <input
                  type="text"
                  required
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  placeholder="Ej: Optimización de Algoritmos Genéticos"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Área de Investigación</label>
                <input
                  type="text"
                  required
                  value={newProjectArea}
                  onChange={(e) => setNewProjectArea(e.target.value)}
                  placeholder="Ej: Ciencias de la Computación"
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Resumen / Descripción</label>
                <textarea
                  rows="3"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Descripción ejecutiva del proyecto de investigación..."
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                ></textarea>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Visibilidad</label>
                <select
                  value={newProjectVisibility}
                  onChange={(e) => setNewProjectVisibility(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="RESTRICTED_TEAM">Restringido (solo equipo y coordinación)</option>
                  <option value="PUBLIC_INSTITUTIONAL">Público institucional (al aprobarse)</option>
                </select>
              </div>

              {createProjectError && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-rose-700">
                  {createProjectError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateProjectModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingProject}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50"
                >
                  {creatingProject ? 'Guardando...' : 'Crear Proyecto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
