import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../lib/api';
import { Plus, Pencil, Trash2, MapPin, Building2, Zap, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { formatCurrency } from '../utils/format';

interface Unidade {
  id: string;
  nome: string;
  cidade: string;
  endereco: string;
  total_salas: number;
  total_cadeiras: number;
  total_turmas: number;
  horas_disponiveis_dia: number;
  valor_hora_aluno: number;
  potencial_mensal: number;
}

export function Unidades() {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ nome: '', cidade: '', endereco: '', meta_pixel_id: '', meta_capi_token: '', meta_dataset_id: '', google_analytics_id: '', horas_disponiveis_dia: '', valor_hora_aluno: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, id: '', nome: '' });
  const [testingCapi, setTestingCapi] = useState<string | null>(null);
  const [capiResult, setCapiResult] = useState<Record<string, { success: boolean; message: string } | null>>({});

  async function testCapi(unidadeId: string) {
    setTestingCapi(unidadeId);
    setCapiResult(prev => ({ ...prev, [unidadeId]: null }));
    try {
      const result = await api.post(`/api/unidades/${unidadeId}/test-capi`, {});
      setCapiResult(prev => ({ ...prev, [unidadeId]: { success: result.success, message: result.message } }));
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    } catch (err: any) {
      const msg = err.message || 'Erro ao testar CAPI';
      setCapiResult(prev => ({ ...prev, [unidadeId]: { success: false, message: msg } }));
      toast.error(msg);
    } finally {
      setTestingCapi(null);
    }
  }

  const navigate = useNavigate();

  useEffect(() => {
    api.getUser().then(user => {
      if (!user?.is_super_admin) {
        toast.error('Acesso negado');
        navigate('/');
      } else {
        loadUnidades();
      }
    });
  }, [navigate]);

  async function loadUnidades() {
    try {
      const data = await api.get('/api/unidades');
      setUnidades(data);
    } catch { toast.error('Erro ao carregar unidades'); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/api/unidades/${editingId}`, formData);
        toast.success('Unidade atualizada!');
      } else {
        await api.post('/api/unidades', formData);
        toast.success('Unidade criada!');
      }
      setIsModalOpen(false);
      setFormData({ nome: '', cidade: '', endereco: '', meta_pixel_id: '', meta_capi_token: '', meta_dataset_id: '', google_analytics_id: '', horas_disponiveis_dia: '', valor_hora_aluno: '' });
      setEditingId(null);
      loadUnidades();
    } catch { toast.error('Erro ao salvar unidade'); }
  }

  function handleEdit(u: Unidade) {
    setFormData({
      nome: u.nome, cidade: u.cidade || '', endereco: u.endereco || '',
      meta_pixel_id: (u as any).meta_pixel_id || '',
      meta_capi_token: (u as any).meta_capi_token || '',
      meta_dataset_id: (u as any).meta_dataset_id || '',
      google_analytics_id: (u as any).google_analytics_id || '',
      horas_disponiveis_dia: (u.horas_disponiveis_dia || 0).toString(),
      valor_hora_aluno: (u.valor_hora_aluno || 0).toString()
    });
    setEditingId(u.id);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setFormData({ nome: '', cidade: '', endereco: '', meta_pixel_id: '', meta_capi_token: '', meta_dataset_id: '', google_analytics_id: '', horas_disponiveis_dia: '', valor_hora_aluno: '' });
    setEditingId(null);
  }

  return (
    <div className="p-8 fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Unidades</h1>
            <p className="text-gray-400 mt-2">Gerencie as unidades da escola</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-teal-accent text-dark rounded-lg hover:bg-teal-accent/90 transition-colors hover-glow"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nova Unidade
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {unidades.map((u) => (
            <div key={u.id} className="bg-dark-card rounded-2xl p-6 hover-lift hover-scale-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-5 w-5 text-teal-accent" />
                    <h3 className="text-xl font-semibold text-white">{u.nome}</h3>
                  </div>
                  {u.cidade && (
                    <div className="flex items-center gap-1 text-gray-400 text-sm">
                      <MapPin className="h-3 w-3" />
                      {u.cidade}
                    </div>
                  )}
                  {u.endereco && (
                    <p className="text-gray-500 text-xs mt-1">{u.endereco}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => handleEdit(u)} className="p-2 text-gray-400 hover:text-white transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setConfirmModal({ isOpen: true, id: u.id, nome: u.nome })}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex gap-4 mt-3 pt-3 border-t border-gray-700">
                <div className="text-center">
                  <span className="text-white font-bold text-lg">{parseInt(String(u.total_salas))}</span>
                  <p className="text-gray-400 text-xs">Salas</p>
                </div>
                <div className="text-center">
                  <span className="text-white font-bold text-lg">{u.total_cadeiras || 0}</span>
                  <p className="text-gray-400 text-xs">Cadeiras</p>
                </div>
                <div className="text-center">
                  <span className="text-white font-bold text-lg">{parseInt(String(u.total_turmas))}</span>
                  <p className="text-gray-400 text-xs">Turmas</p>
                </div>
                <div className="text-center">
                  <span className="text-white font-bold text-lg">{parseInt(String((u as any).total_formularios || 0))}</span>
                  <p className="text-gray-400 text-xs">Forms</p>
                </div>
              </div>

              {/* Capacity Info */}
              {(u.horas_disponiveis_dia > 0 || u.valor_hora_aluno > 0) && (
                <div className="mt-3 p-3 bg-dark-lighter rounded-xl space-y-1">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                    <span>Capacidade</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">{u.horas_disponiveis_dia}h/dia · {formatCurrency(u.valor_hora_aluno)}/h/aluno</span>
                  </div>
                  <p className="text-emerald-400 font-bold text-sm">
                    Potencial: {formatCurrency(u.potencial_mensal)}/mês
                  </p>
                  <p className="text-[10px] text-gray-600">{u.total_cadeiras} cadeiras × {u.horas_disponiveis_dia}h × 20 dias</p>
                </div>
              )}

              {/* Tracking Status */}
              <div className="flex flex-wrap gap-2 mt-3">
                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
                  (u as any).meta_pixel_id
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${(u as any).meta_pixel_id ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                  Meta Pixel
                </span>
                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
                  (u as any).meta_capi_token
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${(u as any).meta_capi_token ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                  CAPI
                </span>
                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
                  (u as any).google_analytics_id
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${(u as any).google_analytics_id ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                  Analytics
                </span>
              </div>

              {/* CAPI Test Button */}
              {(u as any).meta_pixel_id && (u as any).meta_capi_token && (
                <div className="mt-3">
                  <button
                    onClick={() => testCapi(u.id)}
                    disabled={testingCapi === u.id}
                    className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                  >
                    <Zap className="h-3 w-3" />
                    {testingCapi === u.id ? 'Testando...' : 'Testar CAPI'}
                  </button>
                  {capiResult[u.id] && (
                    <p className={`text-[10px] mt-1.5 px-2 py-1 rounded-lg ${
                      capiResult[u.id]!.success
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {capiResult[u.id]!.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
          {unidades.length === 0 && (
            <div className="col-span-full text-center text-gray-400 py-8">
              Nenhuma unidade cadastrada
            </div>
          )}
        </div>

        {/* Modal */}
        {isModalOpen && createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={handleCloseModal}>
            <div className="bg-dark-card rounded-2xl p-6 w-full max-w-md scale-in" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {editingId ? 'Editar Unidade' : 'Nova Unidade'}
                </h2>
                <button onClick={handleCloseModal} className="text-gray-400 hover:text-white">✕</button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Nome *</label>
                  <input
                    required
                    value={formData.nome}
                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full bg-dark-lighter text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-teal-accent outline-none"
                    placeholder="Ex: Brasília"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Cidade</label>
                  <input
                    value={formData.cidade}
                    onChange={e => setFormData({ ...formData, cidade: e.target.value })}
                    className="w-full bg-dark-lighter text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-teal-accent outline-none"
                    placeholder="Ex: Brasília - DF"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Endereço</label>
                  <input
                    value={formData.endereco}
                    onChange={e => setFormData({ ...formData, endereco: e.target.value })}
                    className="w-full bg-dark-lighter text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-teal-accent outline-none"
                    placeholder="Rua, número, bairro..."
                  />
                </div>

                {/* Tracking Pixels */}
                <div className="border-t border-gray-700 pt-4 mt-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">🎯 Tracking & Pixels</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Meta Pixel ID</label>
                      <input
                        value={formData.meta_pixel_id}
                        onChange={e => setFormData({ ...formData, meta_pixel_id: e.target.value })}
                        className="w-full bg-dark-lighter text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-teal-accent outline-none text-sm"
                        placeholder="Ex: 1234567890"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Meta CAPI Token</label>
                      <input
                        value={formData.meta_capi_token}
                        onChange={e => setFormData({ ...formData, meta_capi_token: e.target.value })}
                        className="w-full bg-dark-lighter text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-teal-accent outline-none text-sm"
                        placeholder="Token da API de Conversões"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Meta Dataset ID <span className="text-gray-600">(CRM Events)</span></label>
                      <input
                        value={formData.meta_dataset_id}
                        onChange={e => setFormData({ ...formData, meta_dataset_id: e.target.value })}
                        className="w-full bg-dark-lighter text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-teal-accent outline-none text-sm"
                        placeholder="Ex: 1271929884326336"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Google Analytics ID</label>
                      <input
                        value={formData.google_analytics_id}
                        onChange={e => setFormData({ ...formData, google_analytics_id: e.target.value })}
                        className="w-full bg-dark-lighter text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-teal-accent outline-none text-sm"
                        placeholder="Ex: G-XXXXXXXXXX"
                      />
                    </div>
                  </div>
                </div>

                {/* Capacity Planning */}
                <div className="border-t border-gray-700 pt-4 mt-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">📊 Capacidade & Faturamento</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Horas Disponíveis por Dia (por sala)</label>
                      <input
                        type="number"
                        value={formData.horas_disponiveis_dia}
                        onChange={e => setFormData({ ...formData, horas_disponiveis_dia: e.target.value })}
                        className="w-full bg-dark-lighter text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-teal-accent outline-none text-sm"
                        placeholder="Ex: 8"
                        min="0"
                        max="24"
                        step="0.5"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Valor por Hora/Aula por Aluno (R$)</label>
                      <input
                        type="number"
                        value={formData.valor_hora_aluno}
                        onChange={e => setFormData({ ...formData, valor_hora_aluno: e.target.value })}
                        className="w-full bg-dark-lighter text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-teal-accent outline-none text-sm"
                        placeholder="Ex: 25.00"
                        min="0"
                        step="0.50"
                      />
                    </div>
                  </div>
                </div>
                <button type="submit" className="w-full bg-teal-accent text-dark py-2 rounded-lg font-medium hover:bg-teal-accent/90 transition-colors">
                  {editingId ? 'Atualizar' : 'Criar'}
                </button>
              </form>
            </div>
          </div>,
          document.body
        )}

        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title="Excluir Unidade"
          message={`Tem certeza que deseja excluir a unidade "${confirmModal.nome}"?`}
          confirmText="Excluir"
          cancelText="Cancelar"
          onConfirm={async () => {
            try {
              await api.delete(`/api/unidades/${confirmModal.id}`);
              toast.success('Unidade excluída!');
              loadUnidades();
            } catch (err: any) {
              toast.error(err.message || 'Erro ao excluir unidade');
            } finally {
              setConfirmModal({ isOpen: false, id: '', nome: '' });
            }
          }}
          onCancel={() => setConfirmModal({ isOpen: false, id: '', nome: '' })}
          variant="danger"
        />
      </div>
    </div>
  );
}
