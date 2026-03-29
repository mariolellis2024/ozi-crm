import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';
import { Plus, Pencil, Trash2, Loader2, X, ImagePlus, ChevronRight, ChevronDown, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface SocialProofGroup {
  id: string;
  nome: string;
  item_count: number;
  created_at: string;
}

interface SocialProofItem {
  id: string;
  group_id: string;
  nome: string;
  foto_url: string | null;
  metricas: { platform: string; value: string }[];
  total_seguidores: string | null;
  ordem: number;
}

interface ItemFormState {
  nome: string;
  foto_url: string;
  metricas: { platform: string; value: string }[];
}

const EMPTY_ITEM: ItemFormState = {
  nome: '', foto_url: '',
  metricas: [{ platform: '', value: '' }]
};

/** Parse "4.7M" → 4700000, "500K" → 500000, "3.94" → 3940000 (assume M if no suffix) */
function parseFollowerValue(val: string): number {
  const cleaned = val.trim().replace(/,/g, '.');
  const match = cleaned.match(/^([\d.]+)\s*(m|k|mil)?$/i);
  if (!match) return 0;
  const num = parseFloat(match[1]);
  if (isNaN(num)) return 0;
  const suffix = (match[2] || '').toLowerCase();
  if (suffix === 'm') return num * 1_000_000;
  if (suffix === 'k' || suffix === 'mil') return num * 1_000;
  // If no suffix and value < 100, assume millions (e.g., "3.94" → 3.94M)
  if (num < 100) return num * 1_000_000;
  return num;
}

/** Format 8630000 → "8.63M", 500000 → "500K" */
function formatFollowerTotal(total: number): string {
  if (total >= 1_000_000) {
    const m = total / 1_000_000;
    return m % 1 === 0 ? `${m}M` : `${parseFloat(m.toFixed(2))}M`;
  }
  if (total >= 1_000) {
    const k = total / 1_000;
    return k % 1 === 0 ? `${k}K` : `${parseFloat(k.toFixed(1))}K`;
  }
  return String(total);
}

/** Calculate total from metricas list */
function calcTotalSeguidores(metricas: { platform: string; value: string }[]): string | null {
  const valid = metricas.filter(m => m.platform.trim() && m.value.trim());
  if (valid.length === 0) return null;
  const total = valid.reduce((sum, m) => sum + parseFollowerValue(m.value), 0);
  if (total === 0) return null;
  return formatFollowerTotal(total);
}

export function SocialProofPage() {
  const [groups, setGroups] = useState<SocialProofGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [groupItems, setGroupItems] = useState<Record<string, SocialProofItem[]>>({});

  // Group modal
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');

  // Item modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormState>({ ...EMPTY_ITEM });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Confirm delete
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: '', nome: '', type: '' as 'group' | 'item' | '' });

  useEffect(() => { loadGroups(); }, []);

  async function loadGroups() {
    try {
      const data = await api.get('/api/social-proof/groups');
      setGroups(data);
    } catch { toast.error('Erro ao carregar grupos'); }
    finally { setLoading(false); }
  }

  async function loadItems(groupId: string) {
    try {
      const data = await api.get(`/api/social-proof/groups/${groupId}/items`);
      setGroupItems(prev => ({ ...prev, [groupId]: data }));
    } catch { toast.error('Erro ao carregar itens'); }
  }

  function toggleGroup(groupId: string) {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
    } else {
      setExpandedGroupId(groupId);
      if (!groupItems[groupId]) loadItems(groupId);
    }
  }

  // --- Group CRUD ---
  function openNewGroup() {
    setEditingGroupId(null);
    setGroupName('');
    setIsGroupModalOpen(true);
  }

  function openEditGroup(g: SocialProofGroup) {
    setEditingGroupId(g.id);
    setGroupName(g.nome);
    setIsGroupModalOpen(true);
  }

  async function handleGroupSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!groupName.trim()) return;
    try {
      if (editingGroupId) {
        await api.put(`/api/social-proof/groups/${editingGroupId}`, { nome: groupName });
        toast.success('Coleção atualizada!');
      } else {
        await api.post('/api/social-proof/groups', { nome: groupName });
        toast.success('Coleção criada!');
      }
      setIsGroupModalOpen(false);
      loadGroups();
    } catch { toast.error('Erro ao salvar coleção'); }
  }

  async function handleDeleteGroup(id: string) {
    try {
      await api.delete(`/api/social-proof/groups/${id}`);
      toast.success('Coleção excluída!');
      if (expandedGroupId === id) setExpandedGroupId(null);
      loadGroups();
    } catch { toast.error('Erro ao excluir'); }
    setConfirmModal({ isOpen: false, id: '', nome: '', type: '' });
  }

  // --- Item CRUD ---
  function openNewItem(groupId: string) {
    setActiveGroupId(groupId);
    setEditingItemId(null);
    setItemForm({ ...EMPTY_ITEM, metricas: [{ platform: '', value: '' }] });
    setIsItemModalOpen(true);
  }

  function openEditItem(item: SocialProofItem) {
    setActiveGroupId(item.group_id);
    setEditingItemId(item.id);
    setItemForm({
      nome: item.nome,
      foto_url: item.foto_url || '',
      metricas: item.metricas.length > 0 ? item.metricas : [{ platform: '', value: '' }]
    });
    setIsItemModalOpen(true);
  }

  async function handleItemSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!itemForm.nome.trim() || !activeGroupId) return;

    const filteredMetricas = itemForm.metricas.filter(m => m.platform.trim() && m.value.trim());
    const total_seguidores = calcTotalSeguidores(filteredMetricas);

    const payload = {
      nome: itemForm.nome,
      foto_url: itemForm.foto_url || null,
      metricas: filteredMetricas,
      total_seguidores,
      ordem: editingItemId
        ? groupItems[activeGroupId]?.find(i => i.id === editingItemId)?.ordem || 0
        : (groupItems[activeGroupId]?.length || 0)
    };

    try {
      if (editingItemId) {
        await api.put(`/api/social-proof/items/${editingItemId}`, payload);
        toast.success('Atualizado!');
      } else {
        await api.post(`/api/social-proof/groups/${activeGroupId}/items`, payload);
        toast.success('Adicionado!');
      }
      setIsItemModalOpen(false);
      loadItems(activeGroupId);
      loadGroups();
    } catch { toast.error('Erro ao salvar'); }
  }

  async function handleDeleteItem(id: string) {
    const groupId = Object.entries(groupItems).find(([, items]) => items.some(i => i.id === id))?.[0];
    try {
      await api.delete(`/api/social-proof/items/${id}`);
      toast.success('Excluído!');
      if (groupId) loadItems(groupId);
      loadGroups();
    } catch { toast.error('Erro ao excluir'); }
    setConfirmModal({ isOpen: false, id: '', nome: '', type: '' });
  }

  function addMetrica() {
    setItemForm(prev => ({ ...prev, metricas: [...prev.metricas, { platform: '', value: '' }] }));
  }

  function updateMetrica(idx: number, field: 'platform' | 'value', val: string) {
    setItemForm(prev => ({
      ...prev,
      metricas: prev.metricas.map((m, i) => i === idx ? { ...m, [field]: val } : m)
    }));
  }

  function removeMetrica(idx: number) {
    setItemForm(prev => ({ ...prev, metricas: prev.metricas.filter((_, i) => i !== idx) }));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Máx 5MB'); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/upload', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd });
      if (!res.ok) throw new Error('Erro');
      const data = await res.json();
      setItemForm(prev => ({ ...prev, foto_url: data.url }));
      toast.success('Foto enviada!');
    } catch { toast.error('Erro ao enviar foto'); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  }

  // Computed total for preview
  const computedTotal = calcTotalSeguidores(itemForm.metricas);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 text-teal-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-8 fade-in">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Quem Passou Por Aqui</h1>
            <p className="text-gray-400 text-sm mt-1">
              Crie coleções de alumni e escolha qual usar em cada formulário
            </p>
          </div>
          <button
            onClick={openNewGroup}
            className="flex items-center gap-2 bg-teal-accent text-dark px-4 py-2 rounded-xl font-medium hover:bg-teal-accent/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Nova Coleção
          </button>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-3 text-gray-600" />
            <p className="text-lg mb-2">Nenhuma coleção criada</p>
            <p className="text-sm">Crie uma coleção (ex: "Autoridade Digital") e adicione pessoas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map(g => {
              const isExpanded = expandedGroupId === g.id;
              const items = groupItems[g.id] || [];
              return (
                <div key={g.id} className="bg-dark-card rounded-xl border border-gray-800 overflow-hidden">
                  {/* Group header */}
                  <div
                    className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-dark-lighter/50 transition-colors"
                    onClick={() => toggleGroup(g.id)}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded
                        ? <ChevronDown className="h-4 w-4 text-teal-accent" />
                        : <ChevronRight className="h-4 w-4 text-gray-500" />
                      }
                      <div>
                        <p className="font-semibold text-white">{g.nome}</p>
                        <p className="text-xs text-gray-500">{g.item_count} {g.item_count === 1 ? 'pessoa' : 'pessoas'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openNewItem(g.id)} className="p-1.5 text-teal-accent hover:bg-teal-accent/10 rounded-lg transition-colors" title="Adicionar pessoa">
                        <Plus className="h-4 w-4" />
                      </button>
                      <button onClick={() => openEditGroup(g)} className="p-1.5 text-gray-500 hover:text-white transition-colors" title="Editar coleção">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setConfirmModal({ isOpen: true, id: g.id, nome: g.nome, type: 'group' })} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors" title="Excluir coleção">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Items list */}
                  {isExpanded && (
                    <div className="border-t border-gray-800 px-5 py-3">
                      {items.length === 0 ? (
                        <p className="text-center text-gray-500 py-4 text-sm">
                          Nenhuma pessoa adicionada. <button onClick={() => openNewItem(g.id)} className="text-teal-accent hover:underline">Adicionar</button>
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {items.map(item => {
                            const initials = item.nome.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                            return (
                              <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-dark-lighter/50 transition-colors">
                                <div className="flex items-center gap-3">
                                  {item.foto_url ? (
                                    <img src={item.foto_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-teal-accent/10 flex items-center justify-center text-teal-accent text-xs font-bold">
                                      {initials}
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-white text-sm font-medium">{item.nome}</p>
                                    <p className="text-gray-500 text-xs">
                                      {item.metricas.map(m => `${m.value} ${m.platform}`).join(' · ')}
                                      {item.total_seguidores && ` · Total: ${item.total_seguidores}`}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => openEditItem(item)} className="p-1 text-gray-500 hover:text-white">
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button onClick={() => setConfirmModal({ isOpen: true, id: item.id, nome: item.nome, type: 'item' })} className="p-1 text-gray-500 hover:text-red-400">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Group Modal — React Portal */}
      {isGroupModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" onClick={() => setIsGroupModalOpen(false)}>
          <div className="bg-dark-card rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">{editingGroupId ? 'Editar' : 'Nova'} Coleção</h2>
              <button onClick={() => setIsGroupModalOpen(false)} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleGroupSubmit}>
              <input
                type="text" value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="Ex: Autoridade Digital, IA, Profissionais"
                autoFocus required
                className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2.5 text-white mb-4 focus:outline-none focus:ring-2 focus:ring-teal-accent"
              />
              <button type="submit" className="w-full bg-teal-accent text-dark font-medium rounded-lg px-4 py-2.5 hover:bg-teal-accent/90 transition-colors">
                {editingGroupId ? 'Atualizar' : 'Criar Coleção'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Item Modal — React Portal */}
      {isItemModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4" onClick={() => setIsItemModalOpen(false)}>
          <div className="bg-dark-card rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white">{editingItemId ? 'Editar' : 'Nova'} Pessoa</h2>
              <button onClick={() => setIsItemModalOpen(false)} className="text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleItemSubmit} className="space-y-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center cursor-pointer hover:border-teal-accent/50 transition-colors overflow-hidden flex-shrink-0"
                  onClick={() => !uploading && fileInputRef.current?.click()}
                >
                  {itemForm.foto_url ? (
                    <img src={itemForm.foto_url} className="w-full h-full object-cover" />
                  ) : uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-teal-accent" />
                  ) : (
                    <ImagePlus className="h-5 w-5 text-gray-500" />
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <input
                  type="text" value={itemForm.nome}
                  onChange={e => setItemForm(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome completo *"
                  required
                  className="flex-1 bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-accent"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-400 font-medium">Métricas de Redes Sociais</label>
                  <button type="button" onClick={addMetrica} className="text-xs text-teal-accent hover:underline">+ Métrica</button>
                </div>
                <div className="space-y-2">
                  {itemForm.metricas.map((m, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text" value={m.platform}
                        onChange={e => updateMetrica(i, 'platform', e.target.value)}
                        placeholder="Ex: Instagram"
                        className="flex-1 bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-accent"
                      />
                      <input
                        type="text" value={m.value}
                        onChange={e => updateMetrica(i, 'value', e.target.value)}
                        placeholder="Ex: 4.7M"
                        className="w-24 bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-teal-accent"
                      />
                      {itemForm.metricas.length > 1 && (
                        <button type="button" onClick={() => removeMetrica(i)} className="text-gray-500 hover:text-red-400">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Auto-calculated total */}
              {computedTotal && (
                <div className="flex items-center gap-2 py-2 px-3 bg-teal-accent/5 border border-teal-accent/20 rounded-lg">
                  <span className="text-xs text-gray-400">Total calculado:</span>
                  <span className="text-sm font-bold text-teal-accent">{computedTotal}</span>
                  <span className="text-xs text-gray-500">seguidores</span>
                </div>
              )}

              <button type="submit" className="w-full bg-teal-accent text-dark font-medium rounded-lg px-4 py-2.5 hover:bg-teal-accent/90 transition-colors">
                {editingItemId ? 'Atualizar' : 'Adicionar'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.type === 'group' ? 'Excluir Coleção' : 'Excluir Pessoa'}
        message={`Tem certeza que deseja excluir "${confirmModal.nome}"?${confirmModal.type === 'group' ? ' Todas as pessoas desta coleção serão removidas.' : ''}`}
        confirmText="Excluir"
        onConfirm={() => confirmModal.type === 'group' ? handleDeleteGroup(confirmModal.id) : handleDeleteItem(confirmModal.id)}
        onCancel={() => setConfirmModal({ isOpen: false, id: '', nome: '', type: '' })}
      />
    </div>
  );
}
