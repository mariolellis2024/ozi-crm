import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Settings, CheckCircle, XCircle, Loader2, ExternalLink, ChevronDown, ChevronUp, Copy, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUnidade } from '../contexts/UnidadeContext';

interface Unidade {
  id: string;
  nome: string;
  cidade: string;
  meta_pixel_id?: string;
  meta_capi_token?: string;
  meta_ad_account_id?: string;
  google_analytics_id?: string;
}

interface TestResult {
  status: 'idle' | 'testing' | 'success' | 'error';
  message: string;
}

interface AdsSummary {
  configured: boolean;
  totalSpend: number;
  totalLeads: number;
  totalPurchases: number;
  cpl: number;
  roas: number;
  ctr: number;
  totalRevenue: number;
}

export function Integracoes() {
  const { selectedUnidadeId } = useUnidade();
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    meta_capi: true, facebook_ads: false, google_analytics: false, whatsapp: false
  });
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [adsSummary, setAdsSummary] = useState<AdsSummary | null>(null);

  useEffect(() => { loadUnidades(); }, []);

  async function loadUnidades() {
    try {
      const data = await api.get('/api/unidades');
      setUnidades(data);
    } catch { toast.error('Erro ao carregar unidades'); }
    finally { setLoading(false); }
  }

  async function loadAdsSummary() {
    try {
      const param = selectedUnidadeId ? `?unidade_id=${selectedUnidadeId}` : '';
      const data = await api.get(`/api/facebook-ads/summary${param}`);
      setAdsSummary(data);
    } catch { /* silent */ }
  }

  useEffect(() => { loadAdsSummary(); }, [selectedUnidadeId]);

  function toggleSection(key: string) {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function startEditing(u: Unidade) {
    setEditingId(u.id);
    setFormData({
      meta_pixel_id: u.meta_pixel_id || '',
      meta_capi_token: u.meta_capi_token || '',
      meta_ad_account_id: u.meta_ad_account_id || '',
      google_analytics_id: u.google_analytics_id || '',
    });
  }

  async function saveConfig(unidadeId: string) {
    setSaving(true);
    try {
      const unidade = unidades.find(u => u.id === unidadeId);
      if (!unidade) return;
      await api.put(`/api/unidades/${unidadeId}`, {
        nome: unidade.nome,
        cidade: unidade.cidade,
        ...formData
      });
      toast.success('Configuração salva!');
      setEditingId(null);
      loadUnidades();
      loadAdsSummary();
    } catch { toast.error('Erro ao salvar'); }
    finally { setSaving(false); }
  }

  async function testCapiConnection(unidade: Unidade) {
    const key = `capi_${unidade.id}`;
    setTestResults(prev => ({ ...prev, [key]: { status: 'testing', message: 'Testando...' } }));
    try {
      const pixelId = editingId === unidade.id ? formData.meta_pixel_id : unidade.meta_pixel_id;
      const token = editingId === unidade.id ? formData.meta_capi_token : unidade.meta_capi_token;
      if (!pixelId || !token) {
        setTestResults(prev => ({ ...prev, [key]: { status: 'error', message: 'Pixel ID e Token são obrigatórios' } }));
        return;
      }
      const response = await fetch(`https://graph.facebook.com/v21.0/${pixelId}?access_token=${token}`);
      const data = await response.json();
      if (data.error) {
        setTestResults(prev => ({ ...prev, [key]: { status: 'error', message: data.error.message } }));
      } else {
        setTestResults(prev => ({ ...prev, [key]: { status: 'success', message: `✅ Conectado ao Pixel "${data.name}" (ID: ${data.id})` } }));
      }
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, [key]: { status: 'error', message: e.message } }));
    }
  }

  async function testAdsConnection(unidade: Unidade) {
    const key = `ads_${unidade.id}`;
    setTestResults(prev => ({ ...prev, [key]: { status: 'testing', message: 'Testando...' } }));
    try {
      const adAccountId = editingId === unidade.id ? formData.meta_ad_account_id : unidade.meta_ad_account_id;
      const token = editingId === unidade.id ? formData.meta_capi_token : unidade.meta_capi_token;
      if (!adAccountId || !token) {
        setTestResults(prev => ({ ...prev, [key]: { status: 'error', message: 'Ad Account ID e Token são obrigatórios' } }));
        return;
      }
      const accountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
      const response = await fetch(`https://graph.facebook.com/v21.0/${accountId}?fields=name,account_status,currency&access_token=${token}`);
      const data = await response.json();
      if (data.error) {
        setTestResults(prev => ({ ...prev, [key]: { status: 'error', message: data.error.message } }));
      } else {
        const statusLabels: Record<number, string> = { 1: 'Ativa', 2: 'Desativada', 3: 'Não Confirmada', 7: 'Pendente' };
        setTestResults(prev => ({ ...prev, [key]: { status: 'success', message: `✅ Conta "${data.name}" — ${statusLabels[data.account_status] || 'Desconhecido'} — ${data.currency}` } }));
      }
    } catch (e: any) {
      setTestResults(prev => ({ ...prev, [key]: { status: 'error', message: e.message } }));
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  }

  function SectionHeader({ id, title, subtitle, icon }: { id: string; title: string; subtitle: string; icon: React.ReactNode }) {
    return (
      <button onClick={() => toggleSection(id)} className="w-full flex items-center justify-between p-5 hover:bg-dark-lighter/30 transition-colors rounded-t-2xl">
        <div className="flex items-center gap-3">
          {icon}
          <div className="text-left">
            <h3 className="text-white font-semibold">{title}</h3>
            <p className="text-gray-500 text-xs">{subtitle}</p>
          </div>
        </div>
        {expandedSections[id] ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
      </button>
    );
  }

  function TestButton({ onClick, testKey }: { onClick: () => void; testKey: string }) {
    const result = testResults[testKey];
    return (
      <div>
        <button onClick={onClick} disabled={result?.status === 'testing'}
          className="px-3 py-1.5 bg-dark text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-xs flex items-center gap-1.5">
          {result?.status === 'testing' ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Testar Conexão
        </button>
        {result && result.status !== 'idle' && result.status !== 'testing' && (
          <div className={`mt-2 text-xs px-3 py-2 rounded-lg ${result.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {result.status === 'success' ? <CheckCircle className="h-3 w-3 inline mr-1" /> : <XCircle className="h-3 w-3 inline mr-1" />}
            {result.message}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-8 fade-in">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Settings className="h-8 w-8 text-teal-accent" />
            Integrações
          </h1>
          <p className="text-gray-400 mt-2">Configure APIs externas diretamente pelo painel</p>
        </div>

        {/* Facebook Ads Summary */}
        {adsSummary?.configured && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Gasto Total', value: `R$ ${adsSummary.totalSpend.toFixed(2)}`, color: 'text-red-400' },
              { label: 'CPL', value: `R$ ${adsSummary.cpl.toFixed(2)}`, color: 'text-amber-400' },
              { label: 'ROAS', value: `${adsSummary.roas.toFixed(1)}x`, color: 'text-emerald-400' },
              { label: 'Leads / Compras', value: `${adsSummary.totalLeads} / ${adsSummary.totalPurchases}`, color: 'text-blue-400' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-dark-card rounded-xl p-4">
                <p className="text-gray-500 text-xs">{kpi.label}</p>
                <p className={`text-lg font-bold ${kpi.color} mt-1`}>{kpi.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* META CAPI */}
        <div className="bg-dark-card rounded-2xl mb-4 overflow-hidden">
          <SectionHeader id="meta_capi" title="Meta Conversions API (CAPI)"
            subtitle="Envia eventos de Lead e Purchase para o Facebook"
            icon={<div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center"><svg className="w-5 h-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12c0-5.523-4.477-10-10-10z"/></svg></div>}
          />
          {expandedSections.meta_capi && (
            <div className="px-5 pb-5 space-y-4">
              <div className="bg-dark-lighter/50 rounded-xl p-4 text-xs text-gray-400 space-y-2">
                <p className="text-white font-medium text-sm">📋 Como configurar:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Vá em <a href="https://business.facebook.com/settings" target="_blank" rel="noopener" className="text-teal-accent hover:underline">Business Manager → Configurações <ExternalLink className="h-3 w-3 inline" /></a></li>
                  <li>Vá em <strong>Fontes de Dados → Pixels</strong> → copie o <strong>Pixel ID</strong></li>
                  <li>Vá em <strong>Usuários → Usuários do Sistema</strong> → selecione ou crie um System User</li>
                  <li>Clique em <strong>"Gerar Token"</strong> com permissão <code className="bg-dark px-1 rounded">ads_management</code></li>
                  <li>Cole os valores nos campos abaixo para cada unidade</li>
                </ol>
              </div>

              {unidades.map(u => (
                <div key={u.id} className="bg-dark-lighter rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${u.meta_pixel_id && u.meta_capi_token ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                      <span className="text-white font-medium text-sm">{u.nome}</span>
                      <span className="text-gray-500 text-xs">— {u.cidade}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TestButton onClick={() => testCapiConnection(u)} testKey={`capi_${u.id}`} />
                      {editingId !== u.id ? (
                        <button onClick={() => startEditing(u)} className="px-3 py-1.5 bg-teal-accent/10 text-teal-accent rounded-lg hover:bg-teal-accent/20 transition-colors text-xs">
                          Editar
                        </button>
                      ) : (
                        <div className="flex gap-1">
                          <button onClick={() => saveConfig(u.id)} disabled={saving}
                            className="px-3 py-1.5 bg-teal-accent text-dark rounded-lg hover:bg-teal-accent/90 transition-colors text-xs font-medium">
                            {saving ? 'Salvando...' : 'Salvar'}
                          </button>
                          <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-dark text-gray-400 rounded-lg hover:bg-gray-700 transition-colors text-xs">
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider">Pixel ID</label>
                      {editingId === u.id ? (
                        <input value={formData.meta_pixel_id} onChange={e => setFormData({ ...formData, meta_pixel_id: e.target.value })}
                          className="w-full bg-dark text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-teal-accent outline-none text-sm mt-1"
                          placeholder="Ex: 1234567890" />
                      ) : (
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs text-gray-300 bg-dark px-2 py-1 rounded flex-1 truncate">{u.meta_pixel_id || '—'}</code>
                          {u.meta_pixel_id && <button onClick={() => copyToClipboard(u.meta_pixel_id!)} className="text-gray-500 hover:text-white"><Copy className="h-3 w-3" /></button>}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider">CAPI Token</label>
                      {editingId === u.id ? (
                        <input value={formData.meta_capi_token} onChange={e => setFormData({ ...formData, meta_capi_token: e.target.value })}
                          className="w-full bg-dark text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-teal-accent outline-none text-sm mt-1"
                          placeholder="Token do System User" type="password" />
                      ) : (
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs text-gray-300 bg-dark px-2 py-1 rounded flex-1 truncate">{u.meta_capi_token ? '••••••••' + u.meta_capi_token.slice(-8) : '—'}</code>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Facebook Ads */}
        <div className="bg-dark-card rounded-2xl mb-4 overflow-hidden">
          <SectionHeader id="facebook_ads" title="Facebook Marketing API"
            subtitle="Puxa gastos, CPL e ROAS direto do Facebook Ads"
            icon={<div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center"><svg className="w-5 h-5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>}
          />
          {expandedSections.facebook_ads && (
            <div className="px-5 pb-5 space-y-4">
              <div className="bg-dark-lighter/50 rounded-xl p-4 text-xs text-gray-400 space-y-2">
                <p className="text-white font-medium text-sm">📋 Como configurar:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Vá em <a href="https://business.facebook.com/settings/ad-accounts" target="_blank" rel="noopener" className="text-teal-accent hover:underline">Business Manager → Contas de Anúncio <ExternalLink className="h-3 w-3 inline" /></a></li>
                  <li>Copie o <strong>ID da Conta</strong> (formato: <code className="bg-dark px-1 rounded">act_1234567890</code>)</li>
                  <li>O System User já configurado acima precisa ter permissão <code className="bg-dark px-1 rounded">ads_read</code></li>
                  <li>Cole o ID abaixo para cada unidade</li>
                </ol>
              </div>

              {unidades.map(u => (
                <div key={u.id} className="bg-dark-lighter rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${u.meta_ad_account_id ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                      <span className="text-white font-medium text-sm">{u.nome}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TestButton onClick={() => testAdsConnection(u)} testKey={`ads_${u.id}`} />
                      {editingId !== u.id ? (
                        <button onClick={() => startEditing(u)} className="px-3 py-1.5 bg-teal-accent/10 text-teal-accent rounded-lg hover:bg-teal-accent/20 transition-colors text-xs">
                          Editar
                        </button>
                      ) : (
                        <div className="flex gap-1">
                          <button onClick={() => saveConfig(u.id)} disabled={saving}
                            className="px-3 py-1.5 bg-teal-accent text-dark rounded-lg hover:bg-teal-accent/90 transition-colors text-xs font-medium">
                            {saving ? 'Salvando...' : 'Salvar'}
                          </button>
                          <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-dark text-gray-400 rounded-lg hover:bg-gray-700 transition-colors text-xs">
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider">Ad Account ID</label>
                    {editingId === u.id ? (
                      <input value={formData.meta_ad_account_id} onChange={e => setFormData({ ...formData, meta_ad_account_id: e.target.value })}
                        className="w-full bg-dark text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-teal-accent outline-none text-sm mt-1"
                        placeholder="Ex: act_1234567890" />
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs text-gray-300 bg-dark px-2 py-1 rounded flex-1 truncate">{u.meta_ad_account_id || '—'}</code>
                        {u.meta_ad_account_id && <button onClick={() => copyToClipboard(u.meta_ad_account_id!)} className="text-gray-500 hover:text-white"><Copy className="h-3 w-3" /></button>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Google Analytics */}
        <div className="bg-dark-card rounded-2xl mb-4 overflow-hidden">
          <SectionHeader id="google_analytics" title="Google Analytics"
            subtitle="Rastreamento de visitantes nos formulários públicos"
            icon={<div className="w-10 h-10 rounded-xl bg-yellow-500/20 flex items-center justify-center"><svg className="w-5 h-5 text-yellow-400" viewBox="0 0 24 24" fill="currentColor"><path d="M22.84 2.998v17.926c0 .6-.474 1.076-1.076 1.076-.163 0-.32-.036-.465-.104l-.018-.01a1.065 1.065 0 0 1-.592-.962V3.076A1.076 1.076 0 0 1 22.84 2h.002v.998zm-7.921 7.003v9.921c0 .597-.473 1.076-1.076 1.076a1.075 1.075 0 0 1-1.076-1.076V10a1.076 1.076 0 0 1 2.152 0v.001zm-9.998 4.999v4.922c0 .597-.473 1.076-1.076 1.076a1.075 1.075 0 0 1-1.076-1.076V15a1.076 1.076 0 0 1 2.152 0z"/></svg></div>}
          />
          {expandedSections.google_analytics && (
            <div className="px-5 pb-5 space-y-4">
              <div className="bg-dark-lighter/50 rounded-xl p-4 text-xs text-gray-400 space-y-2">
                <p className="text-white font-medium text-sm">📋 Como configurar:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Vá em <a href="https://analytics.google.com" target="_blank" rel="noopener" className="text-teal-accent hover:underline">Google Analytics <ExternalLink className="h-3 w-3 inline" /></a></li>
                  <li>Crie uma propriedade GA4 ou use a existente</li>
                  <li>Copie o <strong>Measurement ID</strong> (formato: <code className="bg-dark px-1 rounded">G-XXXXXXXXXX</code>)</li>
                  <li>Cole abaixo — será injetado automaticamente nos formulários públicos</li>
                </ol>
              </div>

              {unidades.map(u => (
                <div key={u.id} className="bg-dark-lighter rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${u.google_analytics_id ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                      <span className="text-white font-medium text-sm">{u.nome}</span>
                    </div>
                    {editingId !== u.id ? (
                      <button onClick={() => startEditing(u)} className="px-3 py-1.5 bg-teal-accent/10 text-teal-accent rounded-lg hover:bg-teal-accent/20 transition-colors text-xs">
                        Editar
                      </button>
                    ) : (
                      <div className="flex gap-1">
                        <button onClick={() => saveConfig(u.id)} disabled={saving}
                          className="px-3 py-1.5 bg-teal-accent text-dark rounded-lg hover:bg-teal-accent/90 transition-colors text-xs font-medium">
                          {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-dark text-gray-400 rounded-lg hover:bg-gray-700 transition-colors text-xs">
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider">Measurement ID</label>
                    {editingId === u.id ? (
                      <input value={formData.google_analytics_id} onChange={e => setFormData({ ...formData, google_analytics_id: e.target.value })}
                        className="w-full bg-dark text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-teal-accent outline-none text-sm mt-1"
                        placeholder="Ex: G-XXXXXXXXXX" />
                    ) : (
                      <code className="text-xs text-gray-300 bg-dark px-2 py-1 rounded block mt-1">{u.google_analytics_id || '—'}</code>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* WhatsApp */}
        <div className="bg-dark-card rounded-2xl mb-4 overflow-hidden">
          <SectionHeader id="whatsapp" title="WhatsApp Business API"
            subtitle="Envio automático de mensagens via WhatsApp Cloud API"
            icon={<div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center"><svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg></div>}
          />
          {expandedSections.whatsapp && (
            <div className="px-5 pb-5">
              <div className="bg-dark-lighter/50 rounded-xl p-4 text-xs text-gray-400 space-y-2">
                <p className="text-white font-medium text-sm">🚧 Em breve</p>
                <p>A integração com WhatsApp Business API será configurada aqui. Você poderá:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Cadastrar o Phone Number ID e WABA Token</li>
                  <li>Criar templates de mensagem</li>
                  <li>Configurar triggers automáticos (boas-vindas, follow-up)</li>
                  <li>Ver histórico de mensagens enviadas</li>
                </ul>
                <p className="mt-2">Custo estimado: ~R$ 0,05/msg (Utilidade) ou ~R$ 0,36/msg (Marketing)</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
