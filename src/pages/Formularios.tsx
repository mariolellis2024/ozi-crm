import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';
import { Plus, Pencil, Trash2, Link2, Copy, ExternalLink, FileText, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useUnidade } from '../contexts/UnidadeContext';

interface Curso {
  id: string;
  nome: string;
}

interface Unidade {
  id: string;
  nome: string;
}

interface Formulario {
  id: string;
  slug: string;
  curso_id: string;
  unidade_id: string;
  titulo: string | null;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  curso_nome: string;
  curso_imagem: string | null;
  unidade_nome: string;
}

export function Formularios() {
  const { selectedUnidadeId } = useUnidade();
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    slug: '',
    curso_id: '',
    unidade_id: '',
    titulo: '',
    descricao: '',
    ativo: true
  });
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: '', nome: '' });

  // Check if current user is superadmin from JWT
  const isSuperAdmin = useMemo(() => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return false;
      // JWT uses base64url encoding — convert to standard base64
      let base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) base64 += '=';
      const payload = JSON.parse(atob(base64));
      return !!payload.is_super_admin;
    } catch { return false; }
  }, []);

  useEffect(() => {
    loadFormularios();
    loadCursos();
    loadUnidades();
  }, [selectedUnidadeId]);

  async function loadFormularios() {
    try {
      const url = selectedUnidadeId
        ? `/api/formularios?unidade_id=${selectedUnidadeId}`
        : '/api/formularios';
      const data = await api.get(url);
      setFormularios(data);
    } catch {
      toast.error('Erro ao carregar formulários');
    }
  }

  async function loadCursos() {
    try {
      const data = await api.get('/api/cursos/simple');
      setCursos(data);
    } catch { /* ignore */ }
  }

  async function loadUnidades() {
    try {
      const data = await api.get('/api/unidades');
      setUnidades(data);
    } catch { /* ignore */ }
  }

  function generateSlug(cursoNome: string, unidadeNome: string) {
    const text = `${cursoNome}-${unidadeNome}`;
    return text
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function handleNew() {
    const defaultUnidade = selectedUnidadeId || '';
    setEditingId(null);
    setFormData({ slug: '', curso_id: '', unidade_id: defaultUnidade, titulo: '', descricao: '', ativo: true });
    setIsModalOpen(true);
  }

  function handleEdit(f: Formulario) {
    setEditingId(f.id);
    setFormData({
      slug: f.slug,
      curso_id: f.curso_id,
      unidade_id: f.unidade_id,
      titulo: f.titulo || '',
      descricao: f.descricao || '',
      ativo: f.ativo
    });
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.slug || !formData.curso_id || !formData.unidade_id) {
      toast.error('Slug, curso e unidade são obrigatórios');
      return;
    }

    try {
      if (editingId) {
        await api.put(`/api/formularios/${editingId}`, formData);
        toast.success('Formulário atualizado!');
      } else {
        await api.post('/api/formularios', formData);
        toast.success('Formulário criado!');
      }
      setIsModalOpen(false);
      loadFormularios();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar formulário');
    }
  }

  async function handleConfirmDelete() {
    try {
      await api.delete(`/api/formularios/${confirmModal.id}`);
      toast.success('Formulário excluído!');
      loadFormularios();
    } catch {
      toast.error('Erro ao excluir formulário');
    } finally {
      setConfirmModal({ isOpen: false, id: '', nome: '' });
    }
  }

  async function handleToggleAtivo(f: Formulario) {
    try {
      await api.put(`/api/formularios/${f.id}`, { ...f, ativo: !f.ativo });
      toast.success(f.ativo ? 'Formulário desativado' : 'Formulário ativado');
      loadFormularios();
    } catch {
      toast.error('Erro ao alterar status');
    }
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/f/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  }

  function handleCursoChange(cursoId: string) {
    setFormData(prev => {
      const curso = cursos.find(c => c.id === cursoId);
      const unidade = unidades.find(u => u.id === prev.unidade_id);
      const newSlug = (curso && unidade && !editingId)
        ? generateSlug(curso.nome, unidade.nome)
        : prev.slug;
      return { ...prev, curso_id: cursoId, slug: newSlug };
    });
  }

  function handleUnidadeChange(unidadeId: string) {
    setFormData(prev => {
      const curso = cursos.find(c => c.id === prev.curso_id);
      const unidade = unidades.find(u => u.id === unidadeId);
      const newSlug = (curso && unidade && !editingId)
        ? generateSlug(curso.nome, unidade.nome)
        : prev.slug;
      return { ...prev, unidade_id: unidadeId, slug: newSlug };
    });
  }

  return (
    <div className="p-8 fade-in">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Formulários</h1>
            <p className="text-gray-400 mt-2">Landing pages para captura de leads</p>
          </div>
          {isSuperAdmin && (
            <button
              onClick={handleNew}
              className="bg-teal-accent text-dark px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-teal-400 transition-all duration-200 font-medium shadow-glow hover:shadow-glow-intense"
            >
              <Plus className="h-5 w-5" />
              Novo Formulário
            </button>
          )}
        </div>

        {/* List */}
        <div className="space-y-3">
          {formularios.map(f => (
            <div
              key={f.id}
              className={`bg-dark-card rounded-xl p-5 flex items-center justify-between transition-opacity ${!f.ativo ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {f.curso_imagem ? (
                  <img src={f.curso_imagem} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-dark-lighter flex items-center justify-center flex-shrink-0">
                    <FileText className="h-6 w-6 text-gray-500" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-white font-medium truncate">{f.curso_nome}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-teal-accent/10 text-teal-accent border border-teal-accent/20">
                      📍 {f.unidade_nome}
                    </span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Link2 className="h-3 w-3" />
                      /f/{f.slug}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => copyLink(f.slug)}
                  className="p-2 text-gray-400 hover:text-teal-accent transition-colors"
                  title="Copiar link"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <a
                  href={`/f/${f.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-teal-accent transition-colors"
                  title="Abrir formulário"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                {isSuperAdmin && (
                  <>
                    <button
                      onClick={() => handleToggleAtivo(f)}
                      className={`p-2 transition-colors ${f.ativo ? 'text-emerald-400' : 'text-gray-500'}`}
                      title={f.ativo ? 'Desativar' : 'Ativar'}
                    >
                      {f.ativo ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={() => handleEdit(f)}
                      className="p-2 text-gray-400 hover:text-teal-accent transition-colors"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setConfirmModal({ isOpen: true, id: f.id, nome: f.curso_nome })}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

          {formularios.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum formulário criado</p>
              <p className="text-sm mt-1">Crie um formulário para capturar leads dos seus cursos</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="bg-dark-card rounded-2xl p-6 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-6">
              {editingId ? 'Editar Formulário' : 'Novo Formulário'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Curso *</label>
                <select
                  value={formData.curso_id}
                  onChange={e => handleCursoChange(e.target.value)}
                  required
                  className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                >
                  <option value="">Selecione o curso</option>
                  {cursos.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Unidade *</label>
                <select
                  value={formData.unidade_id}
                  onChange={e => handleUnidadeChange(e.target.value)}
                  required
                  className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                >
                  <option value="">Selecione a unidade</option>
                  {unidades.map(u => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Slug (URL) *
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">/f/</span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    required
                    className="flex-1 bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                    placeholder="excel-basico-sp"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Título (opcional)</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                  placeholder="Usa o nome do curso se vazio"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Descrição (opcional)</label>
                <textarea
                  value={formData.descricao}
                  onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent resize-none"
                  rows={2}
                  placeholder="Texto extra para a landing page"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-dark-lighter text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-teal-accent text-dark font-medium hover:bg-teal-400 transition-colors"
                >
                  {editingId ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onCancel={() => setConfirmModal({ isOpen: false, id: '', nome: '' })}
        onConfirm={handleConfirmDelete}
        title="Excluir Formulário"
        message={`Tem certeza que deseja excluir o formulário "${confirmModal.nome}"?`}
      />
    </div>
  );
}
