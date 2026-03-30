import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';
import { Plus, Pencil, Trash2, Link2, Copy, ExternalLink, FileText, ToggleLeft, ToggleRight, Code2, X, Eye, UserPlus, TrendingUp, Layout, ChevronDown, ChevronRight, Minus, ImagePlus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { useUnidade } from '../contexts/UnidadeContext';

interface Curso {
  id: string;
  nome: string;
  preco: number;
  carga_horaria: number;
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
  social_proof_group_id: string | null;
  created_at: string;
  curso_nome: string;
  curso_imagem: string | null;
  unidade_nome: string;
  social_proof_group_nome: string | null;
  visitas: number;
  cadastros: number;
}

interface LandingPage {
  id: string;
  slug: string;
  curso_id: string;
  unidade_id: string;
  ativo: boolean;
  hero_headline: string | null;
  hero_subheadline: string | null;
  hero_image_url: string | null;
  para_quem_headline: string | null;
  para_quem_texto: string | null;
  sem_curso_items: string[];
  com_curso_items: string[];
  bonus_titulo: string | null;
  bonus_descricao: string | null;
  bonus_entrega: string | null;
  investimento_headline: string | null;
  investimento_descricao: string | null;
  preco_parcelas: number;
  preco_valor_parcela: number | null;
  preco_desconto: string | null;
  investimento_items: string[];
  social_proof_headline1: string | null;
  social_proof_headline2: string | null;
  social_proof_group_id: string | null;
  created_at: string;
  curso_nome: string;
  curso_imagem: string | null;
  unidade_nome: string;
  social_proof_group_nome: string | null;
  visitas: number;
  cadastros: number;
}

interface SocialProofGroup {
  id: string;
  nome: string;
  item_count: number;
}

// --- LP Form Data ---
const emptyLPForm = {
  slug: '',
  curso_id: '',
  unidade_id: '',
  hero_headline: '',
  hero_subheadline: '',
  hero_image_url: '',
  para_quem_headline: '',
  para_quem_texto: '',
  sem_curso_items: [''],
  com_curso_items: [''],
  bonus_titulo: '',
  bonus_descricao: '',
  bonus_entrega: '',
  investimento_headline: '',
  investimento_descricao: '',
  preco_parcelas: 12,
  preco_valor_parcela: '',
  preco_desconto: '',
  investimento_items: [''],
  social_proof_headline1: '',
  social_proof_headline2: '',
  social_proof_group_id: ''
};

export function Formularios() {
  const { selectedUnidadeId } = useUnidade();
  const [formularios, setFormularios] = useState<Formulario[]>([]);
  const [landingPages, setLandingPages] = useState<LandingPage[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [socialProofGroups, setSocialProofGroups] = useState<SocialProofGroup[]>([]);

  // Form modal state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    slug: '', curso_id: '', unidade_id: '', titulo: '', descricao: '', ativo: true, social_proof_group_id: ''
  });

  // LP modal state
  const [isLPModalOpen, setIsLPModalOpen] = useState(false);
  const [editingLPId, setEditingLPId] = useState<string | null>(null);
  const [lpData, setLPData] = useState({ ...emptyLPForm });
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ basico: true });

  // Upload state
  const [uploading, setUploading] = useState(false);
  const heroFileInputRef = useRef<HTMLInputElement>(null);

  // Embed + confirm modals
  const [embedSlug, setEmbedSlug] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: '', nome: '', type: '' as '' | 'form' | 'lp' });

  const isSuperAdmin = useMemo(() => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return false;
      let base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) base64 += '=';
      const payload = JSON.parse(atob(base64));
      return !!payload.is_super_admin;
    } catch { return false; }
  }, []);

  useEffect(() => {
    loadFormularios();
    loadLandingPages();
    loadCursos();
    loadUnidades();
    loadSocialProofGroups();
  }, [selectedUnidadeId]);

  async function loadFormularios() {
    try {
      const url = selectedUnidadeId ? `/api/formularios?unidade_id=${selectedUnidadeId}` : '/api/formularios';
      const data = await api.get(url);
      setFormularios(data);
    } catch {
      toast.error('Erro ao carregar formulários');
    }
  }

  async function loadLandingPages() {
    try {
      const url = selectedUnidadeId ? `/api/landing-pages?unidade_id=${selectedUnidadeId}` : '/api/landing-pages';
      const data = await api.get(url);
      setLandingPages(data);
    } catch {
      toast.error('Erro ao carregar landing pages');
    }
  }

  async function loadCursos() {
    try { setCursos(await api.get('/api/cursos/simple')); } catch { /* ignore */ }
  }
  async function loadUnidades() {
    try { setUnidades(await api.get('/api/unidades')); } catch { /* ignore */ }
  }
  async function loadSocialProofGroups() {
    try { setSocialProofGroups(await api.get('/api/social-proof/groups')); } catch { /* ignore */ }
  }

  function generateSlug(cursoNome: string, unidadeNome: string) {
    return `${cursoNome}-${unidadeNome}`
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // === FORMULÁRIO CRUD ===

  function handleNewForm() {
    setEditingFormId(null);
    setFormData({ slug: '', curso_id: '', unidade_id: selectedUnidadeId || '', titulo: '', descricao: '', ativo: true, social_proof_group_id: '' });
    setIsFormModalOpen(true);
  }

  function handleEditForm(f: Formulario) {
    setEditingFormId(f.id);
    setFormData({
      slug: f.slug, curso_id: f.curso_id, unidade_id: f.unidade_id,
      titulo: f.titulo || '', descricao: f.descricao || '',
      ativo: f.ativo, social_proof_group_id: f.social_proof_group_id || ''
    });
    setIsFormModalOpen(true);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.slug || !formData.curso_id || !formData.unidade_id) {
      toast.error('Slug, curso e unidade são obrigatórios');
      return;
    }
    try {
      if (editingFormId) {
        await api.put(`/api/formularios/${editingFormId}`, formData);
        toast.success('Formulário atualizado!');
      } else {
        await api.post('/api/formularios', formData);
        toast.success('Formulário criado!');
      }
      setIsFormModalOpen(false);
      loadFormularios();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar formulário');
    }
  }

  function handleFormCursoChange(cursoId: string) {
    setFormData(prev => {
      const curso = cursos.find(c => c.id === cursoId);
      const unidade = unidades.find(u => u.id === prev.unidade_id);
      const newSlug = (curso && unidade && !editingFormId) ? generateSlug(curso.nome, unidade.nome) : prev.slug;
      return { ...prev, curso_id: cursoId, slug: newSlug };
    });
  }

  function handleFormUnidadeChange(unidadeId: string) {
    setFormData(prev => {
      const curso = cursos.find(c => c.id === prev.curso_id);
      const unidade = unidades.find(u => u.id === unidadeId);
      const newSlug = (curso && unidade && !editingFormId) ? generateSlug(curso.nome, unidade.nome) : prev.slug;
      return { ...prev, unidade_id: unidadeId, slug: newSlug };
    });
  }

  async function handleToggleFormAtivo(f: Formulario) {
    try {
      await api.put(`/api/formularios/${f.id}`, { ...f, ativo: !f.ativo });
      toast.success(f.ativo ? 'Formulário desativado' : 'Formulário ativado');
      loadFormularios();
    } catch { toast.error('Erro ao alterar status'); }
  }

  // === LANDING PAGE CRUD ===

  function handleNewLP() {
    setEditingLPId(null);
    setLPData({ ...emptyLPForm, unidade_id: selectedUnidadeId || '' });
    setOpenSections({ basico: true });
    setIsLPModalOpen(true);
  }

  function handleEditLP(lp: LandingPage) {
    setEditingLPId(lp.id);
    const items = (arr: any) => {
      const parsed = typeof arr === 'string' ? JSON.parse(arr) : (arr || []);
      return parsed.length > 0 ? parsed : [''];
    };
    setLPData({
      slug: lp.slug,
      curso_id: lp.curso_id,
      unidade_id: lp.unidade_id,
      hero_headline: lp.hero_headline || '',
      hero_subheadline: lp.hero_subheadline || '',
      hero_image_url: lp.hero_image_url || '',
      para_quem_headline: lp.para_quem_headline || '',
      para_quem_texto: lp.para_quem_texto || '',
      sem_curso_items: items(lp.sem_curso_items),
      com_curso_items: items(lp.com_curso_items),
      bonus_titulo: lp.bonus_titulo || '',
      bonus_descricao: lp.bonus_descricao || '',
      bonus_entrega: lp.bonus_entrega || '',
      investimento_headline: lp.investimento_headline || '',
      investimento_descricao: lp.investimento_descricao || '',
      preco_parcelas: lp.preco_parcelas || 12,
      preco_valor_parcela: lp.preco_valor_parcela?.toString() || '',
      preco_desconto: lp.preco_desconto || '',
      investimento_items: items(lp.investimento_items),
      social_proof_headline1: lp.social_proof_headline1 || '',
      social_proof_headline2: lp.social_proof_headline2 || '',
      social_proof_group_id: lp.social_proof_group_id || ''
    });
    setOpenSections({ basico: true });
    setIsLPModalOpen(true);
  }

  async function handleLPSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lpData.slug || !lpData.curso_id || !lpData.unidade_id) {
      toast.error('Slug, curso e unidade são obrigatórios');
      return;
    }
    const payload = {
      ...lpData,
      sem_curso_items: lpData.sem_curso_items.filter(Boolean),
      com_curso_items: lpData.com_curso_items.filter(Boolean),
      investimento_items: lpData.investimento_items.filter(Boolean),
      preco_valor_parcela: lpData.preco_valor_parcela ? parseFloat(lpData.preco_valor_parcela as any) : null,
      social_proof_group_id: lpData.social_proof_group_id || null
    };
    try {
      if (editingLPId) {
        await api.put(`/api/landing-pages/${editingLPId}`, payload);
        toast.success('Landing page atualizada!');
      } else {
        await api.post('/api/landing-pages', payload);
        toast.success('Landing page criada!');
      }
      setIsLPModalOpen(false);
      loadLandingPages();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar landing page');
    }
  }

  function handleLPCursoChange(cursoId: string) {
    setLPData(prev => {
      const curso = cursos.find(c => c.id === cursoId);
      const unidade = unidades.find(u => u.id === prev.unidade_id);
      const newSlug = (curso && unidade && !editingLPId) ? generateSlug(curso.nome, unidade.nome) : prev.slug;
      return { ...prev, curso_id: cursoId, slug: newSlug };
    });
  }

  function handleLPUnidadeChange(unidadeId: string) {
    setLPData(prev => {
      const curso = cursos.find(c => c.id === prev.curso_id);
      const unidade = unidades.find(u => u.id === unidadeId);
      const newSlug = (curso && unidade && !editingLPId) ? generateSlug(curso.nome, unidade.nome) : prev.slug;
      return { ...prev, unidade_id: unidadeId, slug: newSlug };
    });
  }

  async function handleToggleLPAtivo(lp: LandingPage) {
    try {
      await api.put(`/api/landing-pages/${lp.id}`, { ...lp, ativo: !lp.ativo });
      toast.success(lp.ativo ? 'Landing page desativada' : 'Landing page ativada');
      loadLandingPages();
    } catch { toast.error('Erro ao alterar status'); }
  }

  // === SHARED DELETE ===

  async function handleConfirmDelete() {
    try {
      if (confirmModal.type === 'form') {
        await api.delete(`/api/formularios/${confirmModal.id}`);
        toast.success('Formulário excluído!');
        loadFormularios();
      } else {
        await api.delete(`/api/landing-pages/${confirmModal.id}`);
        toast.success('Landing page excluída!');
        loadLandingPages();
      }
    } catch {
      toast.error('Erro ao excluir');
    } finally {
      setConfirmModal({ isOpen: false, id: '', nome: '', type: '' });
    }
  }

  // === HELPERS ===

  function copyLink(slug: string, prefix: string) {
    const url = `${window.location.origin}/${prefix}/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copiado!');
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success('Código copiado!');
  }

  function toggleSection(key: string) {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  }

  // Image upload handler
  async function handleHeroImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erro ao fazer upload');
      }
      const data = await response.json();
      setLPData(prev => ({ ...prev, hero_image_url: data.url }));
      toast.success('Imagem enviada!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar imagem');
    } finally {
      setUploading(false);
      if (heroFileInputRef.current) heroFileInputRef.current.value = '';
    }
  }

  // Dynamic list helpers
  function addListItem(field: 'sem_curso_items' | 'com_curso_items' | 'investimento_items') {
    setLPData(prev => ({ ...prev, [field]: [...prev[field], ''] }));
  }
  function removeListItem(field: 'sem_curso_items' | 'com_curso_items' | 'investimento_items', idx: number) {
    setLPData(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== idx) }));
  }
  function updateListItem(field: 'sem_curso_items' | 'com_curso_items' | 'investimento_items', idx: number, value: string) {
    setLPData(prev => ({ ...prev, [field]: prev[field].map((v, i) => i === idx ? value : v) }));
  }

  // Merge for unified list
  const allItems = [
    ...formularios.map(f => ({ ...f, _type: 'form' as const })),
    ...landingPages.map(lp => ({ ...lp, _type: 'lp' as const,
      titulo: lp.hero_headline,
      descricao: lp.hero_subheadline
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // ======= SECTION HEADER COMPONENT =======
  function SectionHeader({ label, sectionKey }: { label: string; sectionKey: string }) {
    return (
      <button
        type="button"
        onClick={() => toggleSection(sectionKey)}
        className="w-full flex items-center justify-between py-2 text-sm font-medium text-teal-accent hover:text-teal-300 transition-colors"
      >
        {label}
        {openSections[sectionKey] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
    );
  }

  // ======= DYNAMIC LIST COMPONENT =======
  function DynamicList({ field, label }: { field: 'sem_curso_items' | 'com_curso_items' | 'investimento_items'; label: string }) {
    return (
      <div>
        <label className="block text-sm text-gray-400 mb-1">{label}</label>
        <div className="space-y-2">
          {lpData[field].map((item, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={item}
                onChange={e => updateListItem(field, i, e.target.value)}
                className="flex-1 bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-accent"
                placeholder={`Item ${i + 1}`}
              />
              {lpData[field].length > 1 && (
                <button type="button" onClick={() => removeListItem(field, i)} className="p-2 text-gray-500 hover:text-red-400">
                  <Minus className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <button type="button" onClick={() => addListItem(field)} className="mt-2 text-xs text-teal-accent hover:underline flex items-center gap-1">
          <Plus className="h-3 w-3" /> Adicionar item
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 fade-in">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Captura</h1>
            <p className="text-gray-400 mt-2">Formulários e landing pages para captura de leads</p>
          </div>
          {isSuperAdmin && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleNewForm}
                className="bg-dark-card text-white px-5 py-3 rounded-xl flex items-center gap-2 hover:bg-dark-lighter transition-all duration-200 font-medium border border-gray-700"
              >
                <Plus className="h-5 w-5" />
                Novo Formulário
              </button>
              <button
                onClick={handleNewLP}
                className="bg-teal-accent text-dark px-5 py-3 rounded-xl flex items-center gap-2 hover:bg-teal-400 transition-all duration-200 font-medium shadow-glow hover:shadow-glow-intense"
              >
                <Plus className="h-5 w-5" />
                Nova Landing Page
              </button>
            </div>
          )}
        </div>

        {/* Unified List */}
        <div className="space-y-3">
          {allItems.map(item => {
            const isLP = item._type === 'lp';
            const prefix = isLP ? 'lp' : 'f';
            return (
              <div
                key={item.id}
                className={`bg-dark-card rounded-xl p-5 flex items-center justify-between transition-opacity ${!item.ativo ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {item.curso_imagem ? (
                    <img src={item.curso_imagem} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-dark-lighter flex items-center justify-center flex-shrink-0">
                      {isLP ? <Layout className="h-6 w-6 text-gray-500" /> : <FileText className="h-6 w-6 text-gray-500" />}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="text-white font-medium truncate">{item.curso_nome}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${isLP ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-teal-accent/10 text-teal-accent border-teal-accent/20'}`}>
                        {isLP ? '🌐 Landing Page' : '📋 Formulário'}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-teal-accent/10 text-teal-accent border border-teal-accent/20">
                        📍 {item.unidade_nome}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Link2 className="h-3 w-3" />
                        /{prefix}/{item.slug}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Analytics badges */}
                <div className="hidden sm:flex items-center gap-3 ml-auto mr-2">
                  <div className="flex items-center gap-1.5 text-gray-400" title="Visitas">
                    <Eye className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{item.visitas}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-teal-accent" title="Cadastros">
                    <UserPlus className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">{item.cadastros}</span>
                  </div>
                  <div className="flex items-center gap-1.5" title="Taxa de conversão">
                    <TrendingUp className="h-3.5 w-3.5 text-purple-400" />
                    <span className="text-xs font-medium text-purple-400">
                      {item.visitas > 0 ? ((item.cadastros / item.visitas) * 100).toFixed(1) : '0.0'}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button onClick={() => copyLink(item.slug, prefix)} className="p-2 text-gray-400 hover:text-teal-accent transition-colors" title="Copiar link">
                    <Copy className="h-4 w-4" />
                  </button>
                  <a href={`/${prefix}/${item.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-teal-accent transition-colors" title="Abrir">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  {!isLP && (
                    <button onClick={() => setEmbedSlug(item.slug)} className="p-2 text-gray-400 hover:text-teal-accent transition-colors" title="Incorporar em site externo">
                      <Code2 className="h-4 w-4" />
                    </button>
                  )}
                  {isSuperAdmin && (
                    <>
                      <button
                        onClick={() => isLP ? handleToggleLPAtivo(item as any) : handleToggleFormAtivo(item as any)}
                        className={`p-2 transition-colors ${item.ativo ? 'text-emerald-400' : 'text-gray-500'}`}
                        title={item.ativo ? 'Desativar' : 'Ativar'}
                      >
                        {item.ativo ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                      </button>
                      <button
                        onClick={() => isLP ? handleEditLP(item as any) : handleEditForm(item as any)}
                        className="p-2 text-gray-400 hover:text-teal-accent transition-colors" title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirmModal({ isOpen: true, id: item.id, nome: item.curso_nome, type: item._type })}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors" title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {allItems.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum formulário ou landing page criado</p>
              <p className="text-sm mt-1">Crie um formulário ou landing page para capturar leads dos seus cursos</p>
            </div>
          )}
        </div>
      </div>

      {/* ===== FORMULÁRIO MODAL ===== */}
      {isFormModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" onClick={() => setIsFormModalOpen(false)}>
          <div className="bg-dark-card rounded-2xl p-6 w-full max-w-lg shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-6">
              {editingFormId ? 'Editar Formulário' : 'Novo Formulário'}
            </h2>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Curso *</label>
                <select value={formData.curso_id} onChange={e => handleFormCursoChange(e.target.value)} required className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent">
                  <option value="">Selecione o curso</option>
                  {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Unidade *</label>
                <select value={formData.unidade_id} onChange={e => handleFormUnidadeChange(e.target.value)} required className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent">
                  <option value="">Selecione a unidade</option>
                  {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Slug (URL) *</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">/f/</span>
                  <input type="text" value={formData.slug} onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} required className="flex-1 bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent" placeholder="excel-basico-sp" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Título (opcional)</label>
                <input type="text" value={formData.titulo} onChange={e => setFormData({ ...formData, titulo: e.target.value })} className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent" placeholder="Usa o nome do curso se vazio" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Descrição (opcional)</label>
                <textarea value={formData.descricao} onChange={e => setFormData({ ...formData, descricao: e.target.value })} className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent resize-none" rows={2} placeholder="Texto extra para a landing page" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Quem Passou Por Aqui (Social Proof)</label>
                <select value={formData.social_proof_group_id} onChange={e => setFormData({ ...formData, social_proof_group_id: e.target.value })} className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent">
                  <option value="">Não exibir</option>
                  {socialProofGroups.map(g => <option key={g.id} value={g.id}>{g.nome} ({g.item_count} {g.item_count === 1 ? 'pessoa' : 'pessoas'})</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsFormModalOpen(false)} className="flex-1 py-3 rounded-xl bg-dark-lighter text-gray-400 hover:text-white transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-teal-accent text-dark font-medium hover:bg-teal-400 transition-colors">{editingFormId ? 'Salvar' : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ===== LANDING PAGE MODAL ===== */}
      {isLPModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" onClick={() => setIsLPModalOpen(false)}>
          <div className="bg-dark-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingLPId ? 'Editar Landing Page' : 'Nova Landing Page'}
              </h2>
              <button onClick={() => setIsLPModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleLPSubmit} className="space-y-3">

              {/* BÁSICO */}
              <SectionHeader label="📋 Básico" sectionKey="basico" />
              {openSections.basico && (
                <div className="space-y-3 pl-2 border-l-2 border-gray-700 ml-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Curso *</label>
                      <select value={lpData.curso_id} onChange={e => handleLPCursoChange(e.target.value)} required className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-accent">
                        <option value="">Selecione</option>
                        {cursos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Unidade *</label>
                      <select value={lpData.unidade_id} onChange={e => handleLPUnidadeChange(e.target.value)} required className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-accent">
                        <option value="">Selecione</option>
                        {unidades.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Slug (URL) *</label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 text-sm">/lp/</span>
                      <input type="text" value={lpData.slug} onChange={e => setLPData({ ...lpData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })} required className="flex-1 bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-accent" />
                    </div>
                  </div>
                </div>
              )}

              {/* HERO */}
              <SectionHeader label="🦸 Hero" sectionKey="hero" />
              {openSections.hero && (
                <div className="space-y-3 pl-2 border-l-2 border-gray-700 ml-2">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Headline</label>
                    <textarea value={lpData.hero_headline} onChange={e => setLPData({ ...lpData, hero_headline: e.target.value })} className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-accent resize-none" rows={2} placeholder='Em 10 dias, saia com sua autoridade digital <span class="hl">montada.</span>' />
                    <p className="text-xs text-gray-600 mt-1">Use {'<span class="hl">texto</span>'} para destacar em verde</p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Sub-headline</label>
                    <textarea value={lpData.hero_subheadline} onChange={e => setLPData({ ...lpData, hero_subheadline: e.target.value })} className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-accent resize-none" rows={2} placeholder="Texto descritivo abaixo da headline" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Imagem Hero</label>
                    <div
                      className="relative border-2 border-dashed border-gray-600 rounded-xl overflow-hidden cursor-pointer hover:border-teal-accent/50 transition-colors"
                      onClick={() => !uploading && heroFileInputRef.current?.click()}
                    >
                      {lpData.hero_image_url ? (
                        <div className="relative group">
                          <img src={lpData.hero_image_url} alt="Hero" className="w-full h-36 object-contain bg-dark-lighter" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <button type="button" onClick={e => { e.stopPropagation(); heroFileInputRef.current?.click(); }} className="px-3 py-1.5 bg-teal-accent text-dark rounded-lg text-xs font-medium">Trocar</button>
                            <button type="button" onClick={e => { e.stopPropagation(); setLPData(prev => ({ ...prev, hero_image_url: '' })); }} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium">Remover</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-28 text-gray-400">
                          {uploading ? (
                            <><Loader2 className="h-6 w-6 animate-spin mb-2 text-teal-accent" /><span className="text-xs">Enviando...</span></>
                          ) : (
                            <><ImagePlus className="h-6 w-6 mb-2" /><span className="text-xs">Clique para enviar uma imagem</span><span className="text-xs text-gray-600 mt-0.5">WebP, PNG, JPG · Máx. 5MB</span></>
                          )}
                        </div>
                      )}
                    </div>
                    <input ref={heroFileInputRef} type="file" accept="image/webp,image/png,image/jpeg,image/gif" onChange={handleHeroImageUpload} className="hidden" />
                    <p className="text-xs text-gray-600 mt-1">Se vazio, usa a imagem do curso. Ideal: WebP com fundo transparente.</p>
                  </div>
                </div>
              )}

              {/* PARA QUEM */}
              <SectionHeader label="👥 Para quem é" sectionKey="para_quem" />
              {openSections.para_quem && (
                <div className="space-y-3 pl-2 border-l-2 border-gray-700 ml-2">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Headline</label>
                    <textarea value={lpData.para_quem_headline} onChange={e => setLPData({ ...lpData, para_quem_headline: e.target.value })} className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-accent resize-none" rows={2} placeholder='Você é especialista. Mas o mercado <span class="hl">ainda não sabe disso.</span>' />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Texto descritivo</label>
                    <textarea value={lpData.para_quem_texto} onChange={e => setLPData({ ...lpData, para_quem_texto: e.target.value })} className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-accent resize-none" rows={3} placeholder="Parágrafos separados por enter" />
                  </div>
                  <DynamicList field="sem_curso_items" label="Itens — Sem o curso (✕)" />
                  <DynamicList field="com_curso_items" label="Itens — Com o curso (✓)" />
                </div>
              )}

              {/* BÔNUS */}
              <SectionHeader label="🎁 Bônus Exclusivo" sectionKey="bonus" />
              {openSections.bonus && (
                <div className="space-y-3 pl-2 border-l-2 border-gray-700 ml-2">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Título do bônus</label>
                    <input type="text" value={lpData.bonus_titulo} onChange={e => setLPData({ ...lpData, bonus_titulo: e.target.value })} className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-accent" placeholder="Seu Avatar de IA Profissional" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Descrição</label>
                    <textarea value={lpData.bonus_descricao} onChange={e => setLPData({ ...lpData, bonus_descricao: e.target.value })} className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-accent resize-none" rows={3} placeholder="Descrição do bônus" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Entrega</label>
                    <input type="text" value={lpData.bonus_entrega} onChange={e => setLPData({ ...lpData, bonus_entrega: e.target.value })} className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-accent" placeholder="📦 Entrega: Avatar de IA configurado" />
                  </div>
                </div>
              )}

              {/* INVESTIMENTO */}
              <SectionHeader label="💰 Investimento" sectionKey="investimento" />
              {openSections.investimento && (
                <div className="space-y-3 pl-2 border-l-2 border-gray-700 ml-2">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Headline</label>
                    <input type="text" value={lpData.investimento_headline} onChange={e => setLPData({ ...lpData, investimento_headline: e.target.value })} className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-accent" placeholder="Quanto custa construir sua autoridade digital?" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Descrição</label>
                    <input type="text" value={lpData.investimento_descricao} onChange={e => setLPData({ ...lpData, investimento_descricao: e.target.value })} className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-accent" placeholder="Menos do que um mês de produtora..." />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Parcelas</label>
                      <input type="number" value={lpData.preco_parcelas} onChange={e => setLPData({ ...lpData, preco_parcelas: parseInt(e.target.value) || 12 })} className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-accent" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Valor parcela</label>
                      <input type="text" value={lpData.preco_valor_parcela} onChange={e => setLPData({ ...lpData, preco_valor_parcela: e.target.value })} className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-accent" placeholder="435.94" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Desconto à vista</label>
                      <input type="text" value={lpData.preco_desconto} onChange={e => setLPData({ ...lpData, preco_desconto: e.target.value })} className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-accent" placeholder="31% OFF" />
                    </div>
                  </div>
                  <DynamicList field="investimento_items" label="Itens inclusos (checklist)" />
                </div>
              )}

              {/* SOCIAL PROOF */}
              <SectionHeader label="⭐ Social Proof" sectionKey="social_proof" />
              {openSections.social_proof && (
                <div className="space-y-3 pl-2 border-l-2 border-gray-700 ml-2">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Headline 1</label>
                    <input type="text" value={lpData.social_proof_headline1} onChange={e => setLPData({ ...lpData, social_proof_headline1: e.target.value })} className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-accent" placeholder="Grandes nomes já passaram pela OZI." />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Headline 2</label>
                    <input type="text" value={lpData.social_proof_headline2} onChange={e => setLPData({ ...lpData, social_proof_headline2: e.target.value })} className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-accent" placeholder="Quem sabe você não é o próximo." />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Grupo de Social Proof</label>
                    <select value={lpData.social_proof_group_id} onChange={e => setLPData({ ...lpData, social_proof_group_id: e.target.value })} className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-accent">
                      <option value="">Não exibir</option>
                      {socialProofGroups.map(g => <option key={g.id} value={g.id}>{g.nome} ({g.item_count} {g.item_count === 1 ? 'pessoa' : 'pessoas'})</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* ACTIONS */}
              <div className="flex gap-3 pt-4 border-t border-gray-700">
                <button type="button" onClick={() => setIsLPModalOpen(false)} className="flex-1 py-3 rounded-xl bg-dark-lighter text-gray-400 hover:text-white transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-3 rounded-xl bg-teal-accent text-dark font-medium hover:bg-teal-400 transition-colors">{editingLPId ? 'Salvar' : 'Criar'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onCancel={() => setConfirmModal({ isOpen: false, id: '', nome: '', type: '' })}
        onConfirm={handleConfirmDelete}
        title={confirmModal.type === 'lp' ? 'Excluir Landing Page' : 'Excluir Formulário'}
        message={`Tem certeza que deseja excluir "${confirmModal.nome}"?`}
      />

      {/* Embed Tutorial Modal */}
      {embedSlug && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" onClick={() => setEmbedSlug(null)}>
          <div className="bg-dark-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-teal-accent" />
                <h2 className="text-lg font-semibold text-white">Incorporar Formulário</h2>
              </div>
              <button onClick={() => setEmbedSlug(null)} className="text-gray-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-6">Adicione este formulário em qualquer site externo (WordPress, Elementor, Wix, HTML).</p>
            <div className="mb-5">
              <h3 className="text-sm font-medium text-teal-accent mb-2">Passo 1 — Cole o script uma vez na página</h3>
              <div className="relative">
                <pre className="bg-dark-lighter text-gray-300 text-xs p-3 rounded-lg overflow-x-auto border border-gray-700">
                  <code>{`<script src="${window.location.origin}/widget.js"></script>`}</code>
                </pre>
                <button onClick={() => copyToClipboard(`<script src="${window.location.origin}/widget.js"></script>`)} className="absolute top-2 right-2 p-1.5 bg-dark-card rounded border border-gray-600 text-gray-400 hover:text-teal-accent transition-colors" title="Copiar">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Cole antes do {'</body>'} ou no rodapé do site.</p>
            </div>
            <div className="mb-5">
              <h3 className="text-sm font-medium text-teal-accent mb-2">Passo 2 — Adicione o atributo em qualquer botão</h3>
              <div className="relative">
                <pre className="bg-dark-lighter text-gray-300 text-xs p-3 rounded-lg overflow-x-auto border border-gray-700">
                  <code>{`<button data-ozi-form="${embedSlug}">Inscreva-se</button>`}</code>
                </pre>
                <button onClick={() => copyToClipboard(`data-ozi-form="${embedSlug}"`)} className="absolute top-2 right-2 p-1.5 bg-dark-card rounded border border-gray-600 text-gray-400 hover:text-teal-accent transition-colors" title="Copiar atributo">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-5">
              <h4 className="text-xs font-medium text-blue-400 mb-1">💡 No Elementor</h4>
              <p className="text-xs text-gray-400">Clique no botão → Avançado → Atributos personalizados → cole:</p>
              <div className="relative mt-2">
                <code className="block bg-dark-lighter text-blue-300 text-xs p-2 rounded border border-gray-700">data-ozi-form|{embedSlug}</code>
                <button onClick={() => copyToClipboard(`data-ozi-form|${embedSlug}`)} className="absolute top-1 right-1 p-1 bg-dark-card rounded border border-gray-600 text-gray-400 hover:text-blue-400 transition-colors" title="Copiar">
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div className="bg-dark-lighter rounded-lg p-3 border border-gray-700">
              <h4 className="text-xs font-medium text-gray-300 mb-1">⚡ Via JavaScript</h4>
              <div className="relative">
                <code className="block text-xs text-gray-400">OziWidget.open('{embedSlug}')</code>
                <button onClick={() => copyToClipboard(`OziWidget.open('${embedSlug}')`)} className="absolute top-0 right-0 p-1 text-gray-500 hover:text-teal-accent transition-colors" title="Copiar">
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
