import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { VturbPlayer } from '../components/VturbPlayer';
import { useParams } from 'react-router-dom';

// =====================================================
// Types
// =====================================================
interface TurmaPublicData {
  turma: {
    id: string;
    name: string;
    cadeiras: number;
    period: string;
    start_date: string;
    end_date: string;
    horario_inicio?: string;
    horario_fim?: string;
    local_aula?: string;
    endereco_aula?: string;
    days_of_week?: number[];
    sala_nome?: string;
    unidade_nome?: string;
    unidade_cidade?: string;
  };
  curso: {
    id: string;
    nome: string;
    preco: number;
    carga_horaria: number;
    imagem_url?: string;
    descricao?: string;
    trailer_youtube_url?: string;
    vturb_embed_code?: string;
    vturb_speed_code?: string;
  };
  seats: {
    total: number;
    displayed_occupied: number;
    displayed_available: number;
    is_sold_out: boolean;
  };
  modulos: Array<{
    id: string;
    titulo: string;
    descricao?: string;
    duracao_horas?: number;
    icone?: string;
    entrega?: string;
    semana?: string;
  }>;
}

type SeatStatus = 'available' | 'occupied' | 'selected' | 'flicker';

// =====================================================
// Helpers
// =====================================================


function formatDateBR(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function getPeriodLabel(period: string): string {
  switch (period) {
    case 'manha': return 'Manhã';
    case 'tarde': return 'Tarde';
    case 'noite': return 'Noite';
    case 'dia_inteiro': return 'Dia Inteiro';
    default: return period;
  }
}

function getDayNames(days: number[]): string {
  const names: Record<number, string> = { 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb', 7: 'Dom' };
  return days.map(d => names[d] || '').filter(Boolean).join(', ');
}

function getSeatsPerRow(total: number): number {
  if (total <= 15) return 5;
  if (total <= 24) return 6;
  if (total <= 35) return 7;
  return 8;
}

function getRowLabel(index: number): string {
  return String.fromCharCode(65 + index); // A, B, C...
}

function formatWhatsApp(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

// =====================================================
// Component
// =====================================================
export function ReservaVaga() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<TurmaPublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [flickerSeats, setFlickerSeats] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState({ nome: '', whatsapp: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [reserved, setReserved] = useState(false);
  const [expandedModule, setExpandedModule] = useState<number | null>(null);

  // Load turma data
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/public/turmas/${slug}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Turma não encontrada');
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  // Flicker effect — randomly animate some occupied seats
  useEffect(() => {
    if (!data || data.seats.is_sold_out) return;

    const interval = setInterval(() => {
      const occupiedCount = data.seats.displayed_occupied;
      if (occupiedCount <= 0) return;

      // Pick 1-2 random occupied seats to flicker
      const newFlicker = new Set<number>();
      const count = Math.random() > 0.6 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        // Pick from occupied seats (indices >= displayed_available)
        const availableStart = data.seats.total - data.seats.displayed_available;
        const seatIdx = Math.floor(Math.random() * availableStart);
        newFlicker.add(seatIdx);
      }
      setFlickerSeats(newFlicker);

      // Clear flicker after animation
      setTimeout(() => setFlickerSeats(new Set()), 1500);
    }, 4000 + Math.random() * 3000);

    return () => clearInterval(interval);
  }, [data]);

  // Generate seat statuses
  const seatStatuses = useMemo((): SeatStatus[] => {
    if (!data) return [];
    const { total, displayed_available } = data.seats;
    const statuses: SeatStatus[] = [];

    // Deterministic "random" distribution with seed from slug
    const seed = (slug || '').split('').reduce((acc, char, idx) => acc + char.charCodeAt(0) * (idx + 1), 7);
    const shuffled: number[] = Array.from({ length: total }, (_, i) => i);
    // Mulberry32 seeded PRNG for uniform distribution
    let s = seed | 0;
    function nextRand() {
      s |= 0; s = s + 0x6D2B79F5 | 0;
      let t = Math.imul(s ^ s >>> 15, 1 | s);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    // Fisher-Yates shuffle with proper PRNG
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(nextRand() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Mark first `displayed_available` shuffled indices as available, rest as occupied
    const availableSet = new Set(shuffled.slice(0, displayed_available));

    for (let i = 0; i < total; i++) {
      if (selectedSeat === i) {
        statuses.push('selected');
      } else if (availableSet.has(i)) {
        statuses.push('available');
      } else if (flickerSeats.has(i)) {
        statuses.push('flicker');
      } else {
        statuses.push('occupied');
      }
    }
    return statuses;
  }, [data, selectedSeat, flickerSeats, slug]);

  // Handle seat click
  const handleSeatClick = useCallback((index: number) => {
    if (!data || data.seats.is_sold_out) return;
    const status = seatStatuses[index];
    if (status === 'occupied' || status === 'flicker') return;
    setSelectedSeat(prev => prev === index ? null : index);
  }, [data, seatStatuses]);

  // Handle form submit
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedSeat === null || !data) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/public/turmas/${slug}/reserve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formData.nome,
          whatsapp: formData.whatsapp.replace(/\D/g, ''),
          email: formData.email || undefined,
          seat_number: selectedSeat + 1
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setReserved(true);
    } catch (err: any) {
      alert(err.message || 'Erro ao reservar vaga');
    } finally {
      setSubmitting(false);
    }
  }

  // =====================================================
  // Render States
  // =====================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-400 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🎬</div>
          <h1 className="text-2xl font-bold text-white mb-2">Turma não encontrada</h1>
          <p className="text-gray-400">{error || 'O link que você acessou não é válido.'}</p>
        </div>
      </div>
    );
  }

  const { turma, curso, seats, modulos } = data;
  const hasVideo = !!curso.vturb_embed_code;
  const seatsPerRow = getSeatsPerRow(seats.total);
  const rows: number[][] = [];
  for (let i = 0; i < seats.total; i += seatsPerRow) {
    rows.push(Array.from({ length: Math.min(seatsPerRow, seats.total - i) }, (_, j) => i + j));
  }

  // Success / Confirmation
  if (reserved) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center rv-fade-in">
          <div className="rv-confetti-container">
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className="rv-confetti-piece" style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                backgroundColor: ['#2cd3c7', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'][i % 5]
              }} />
            ))}
          </div>
          <div className="text-7xl mb-6">🎉</div>
          <h1 className="text-3xl font-bold text-white mb-3">Vaga Reservada!</h1>
          <div className="bg-[#1a1d25] rounded-2xl p-6 mb-6 border border-teal-400/30">
            <p className="text-teal-400 font-semibold text-xl mb-4">{curso.nome}</p>
            
            {/* Detalhes da turma */}
            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center justify-center gap-2 text-gray-300">
                <span>📅</span>
                <span>{formatDateBR(turma.start_date)}
                {turma.start_date !== turma.end_date && ` — ${formatDateBR(turma.end_date)}`}</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-gray-300">
                <span>🕐</span>
                <span>{getPeriodLabel(turma.period)}
                {turma.horario_inicio && ` • ${turma.horario_inicio}`}
                {turma.horario_fim && ` - ${turma.horario_fim}`}</span>
              </div>
              {(turma.local_aula || turma.unidade_nome) && (
                <div className="flex items-center justify-center gap-2 text-gray-300">
                  <span>📍</span>
                  <span>{turma.local_aula || turma.unidade_nome}
                  {turma.unidade_cidade && ` • ${turma.unidade_cidade}`}</span>
                </div>
              )}
              {turma.days_of_week && turma.days_of_week.length > 0 && (
                <div className="flex items-center justify-center gap-2 text-gray-300">
                  <span>📆</span>
                  <span>{getDayNames(turma.days_of_week)}</span>
                </div>
              )}
            </div>

            {selectedSeat !== null && (
              <div className="inline-flex items-center gap-2 bg-teal-400/10 px-4 py-2 rounded-full">
                <span className="text-2xl">💺</span>
                <span className="text-teal-400 font-bold text-lg">
                  Cadeira #{selectedSeat + 1}
                </span>
              </div>
            )}
          </div>

          {/* Destaque: contato */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5 mb-4">
            <p className="text-amber-400 font-bold text-lg mb-1">📞 Aguarde nosso contato!</p>
            <p className="text-gray-300 text-sm">Em breve nossa equipe entrará em contato para finalizar sua matrícula.</p>
          </div>

          <p className="text-gray-500 text-xs">Sua vaga está reservada em seu nome.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* ===== Header ===== */}
      <header className="bg-[#1a1d25] border-b border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <img src="/icon.webp" alt="Logo" className="h-8 rounded" />
          {!seats.is_sold_out && (
            <span className="rv-urgency-badge">
              🔥 Vagas Limitadas
            </span>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8 rv-fade-in">
        {/* ===== Course Info ===== */}
        <section className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{curso.nome}</h1>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-400">
            <span className="inline-flex items-center gap-1.5 bg-[#1a1d25] px-3 py-1.5 rounded-full">
              📅 {formatDateBR(turma.start_date)}
              {turma.start_date !== turma.end_date && ` — ${formatDateBR(turma.end_date)}`}
            </span>
            <span className="inline-flex items-center gap-1.5 bg-[#1a1d25] px-3 py-1.5 rounded-full">
              🕐 {getPeriodLabel(turma.period)}
              {turma.horario_inicio && ` • ${turma.horario_inicio}`}
              {turma.horario_fim && ` - ${turma.horario_fim}`}
            </span>
            {turma.days_of_week && turma.days_of_week.length > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-[#1a1d25] px-3 py-1.5 rounded-full">
                📆 {getDayNames(turma.days_of_week)}
              </span>
            )}
            {(turma.local_aula || turma.unidade_nome) && (
              <span className="inline-flex items-center gap-1.5 bg-[#1a1d25] px-3 py-1.5 rounded-full">
                📍 {turma.local_aula || turma.unidade_nome}
                {turma.unidade_cidade && ` • ${turma.unidade_cidade}`}
              </span>
            )}
          </div>
        </section>

        {/* ===== Trailer / Hero Image ===== */}
        {hasVideo ? (
          <section className="rv-video-section">
            <VturbPlayer
              embedCode={curso.vturb_embed_code!}
              speedCode={curso.vturb_speed_code}
            />
          </section>
        ) : curso.imagem_url ? (
          <section>
            <img
              src={curso.imagem_url}
              alt={curso.nome}
              className="w-full rounded-2xl object-cover max-h-[400px]"
            />
          </section>
        ) : null}

        {/* ===== Course Description ===== */}
        {curso.descricao && (
          <section className="bg-[#1a1d25] rounded-2xl p-6 border border-gray-800">
            <p className="text-gray-300 leading-relaxed">{curso.descricao}</p>
          </section>
        )}

        {/* ===== Modules / Ementa ===== */}
        {modulos.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              📋 O que você vai aprender
            </h2>
            <div className="space-y-2">
              {modulos.map((mod, idx) => (
                <div
                  key={mod.id}
                  className="bg-[#1a1d25] rounded-xl border border-gray-800 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setExpandedModule(expandedModule === idx ? null : idx)}
                    className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#1f2230] transition-colors"
                  >
                    <span className="text-teal-400 font-mono text-xs font-bold min-w-[28px]">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-lg">{mod.icone || '📚'}</span>
                    <span className="flex-1 text-white font-medium">{mod.titulo}</span>
                    {mod.duracao_horas ? (
                      <span className="text-gray-500 text-xs">{mod.duracao_horas}h</span>
                    ) : null}
                    <span className={`text-gray-500 transition-transform ${expandedModule === idx ? 'rotate-180' : ''}`}>
                      ▾
                    </span>
                  </button>
                  {expandedModule === idx && (mod.descricao || mod.entrega || mod.semana) && (
                    <div className="px-5 pb-4 pt-0 border-t border-gray-800/50">
                      {mod.semana && <p className="text-teal-400/70 text-xs mb-2">{mod.semana}</p>}
                      {mod.descricao && <p className="text-gray-400 text-sm mb-2">{mod.descricao}</p>}
                      {mod.entrega && (
                        <p className="text-emerald-400/80 text-xs flex items-center gap-1">
                          📦 {mod.entrega}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ===== CINEMA SEAT SELECTOR ===== */}
        <section className="rv-cinema-section">
          <h2 className="text-2xl font-bold text-white mb-2 text-center">
            {seats.is_sold_out ? '🔒 Turma Lotada' : '🎬 Escolha sua Cadeira'}
          </h2>

          {!seats.is_sold_out && (
            <p className="text-center mb-6 rv-urgency-pulse">
              <span className="text-amber-400 font-bold text-lg">
                🔥 Apenas {seats.displayed_available} {seats.displayed_available === 1 ? 'vaga' : 'vagas'} restante{seats.displayed_available === 1 ? '' : 's'}!
              </span>
            </p>
          )}

          {seats.is_sold_out ? (
            // SOLD OUT UI
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎓</div>
              <h3 className="text-xl font-bold text-white mb-2">Todas as vagas foram preenchidas</h3>
              <p className="text-gray-400 mb-6">Entre em contato conosco para saber sobre novas turmas.</p>
              <a
                href="https://wa.me/5511999999999"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full font-medium transition-colors"
              >
                💬 Falar no WhatsApp
              </a>
            </div>
          ) : (
            <>
              {/* Screen / Stage */}
              <div className="rv-stage">
                <div className="rv-stage-bar" />
                <span className="rv-stage-label">INSTRUTOR</span>
              </div>

              {/* Seat Grid */}
              <div className="rv-seat-grid">
                {rows.map((row, rowIdx) => {
                  const half = Math.ceil(row.length / 2);
                  const leftSeats = row.slice(0, half);
                  const rightSeats = row.slice(half);

                  return (
                    <div key={rowIdx} className="rv-seat-row">
                      <span className="rv-row-label">{getRowLabel(rowIdx)}</span>
                      <div className="rv-seat-block">
                        {leftSeats.map(seatIdx => (
                          <button
                            key={seatIdx}
                            className={`rv-seat rv-seat--${seatStatuses[seatIdx]}`}
                            onClick={() => handleSeatClick(seatIdx)}
                            disabled={seatStatuses[seatIdx] === 'occupied'}
                            title={`Cadeira ${seatIdx + 1}`}
                          >
                            <SeatIcon />
                          </button>
                        ))}
                      </div>
                      <div className="rv-aisle" />
                      <div className="rv-seat-block">
                        {rightSeats.map(seatIdx => (
                          <button
                            key={seatIdx}
                            className={`rv-seat rv-seat--${seatStatuses[seatIdx]}`}
                            onClick={() => handleSeatClick(seatIdx)}
                            disabled={seatStatuses[seatIdx] === 'occupied'}
                            title={`Cadeira ${seatIdx + 1}`}
                          >
                            <SeatIcon />
                          </button>
                        ))}
                      </div>
                      <span className="rv-row-label">{getRowLabel(rowIdx)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="rv-legend">
                <div className="rv-legend-item">
                  <span className="rv-legend-dot rv-legend-dot--available" />
                  <span>Disponível</span>
                </div>
                <div className="rv-legend-item">
                  <span className="rv-legend-dot rv-legend-dot--occupied" />
                  <span>Ocupado</span>
                </div>
                <div className="rv-legend-item">
                  <span className="rv-legend-dot rv-legend-dot--selected" />
                  <span>Selecionado</span>
                </div>
              </div>
            </>
          )}
        </section>

        {/* ===== Registration Form ===== */}
        {selectedSeat !== null && !seats.is_sold_out && (
          <section className="rv-form-section rv-fade-in">
            <div className="bg-gradient-to-b from-[#1a1d25] to-[#151820] rounded-2xl p-6 border border-teal-400/20">
              <h3 className="text-xl font-bold text-white mb-1 text-center">
                Reservar Cadeira #{selectedSeat + 1}
              </h3>
              <p className="text-gray-400 text-sm text-center mb-6">
                Preencha seus dados para garantir sua vaga
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Nome completo *</label>
                  <input
                    type="text"
                    required
                    value={formData.nome}
                    onChange={e => setFormData(f => ({ ...f, nome: e.target.value }))}
                    placeholder="Seu nome"
                    className="rv-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={formData.whatsapp}
                    onChange={e => setFormData(f => ({ ...f, whatsapp: formatWhatsApp(e.target.value) }))}
                    placeholder="(11) 99999-9999"
                    className="rv-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">E-mail <span className="text-gray-600">(opcional)</span></label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                    placeholder="seu@email.com"
                    className="rv-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="rv-submit-btn"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      Reservando...
                    </span>
                  ) : (
                    '🎯 Reservar Minha Vaga'
                  )}
                </button>
              </form>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-16">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center text-gray-600 text-xs">
          © {new Date().getFullYear()} • Todos os direitos reservados
        </div>
      </footer>
    </div>
  );
}

// =====================================================
// SVG Seat Icon
// =====================================================
function SeatIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
      <path d="M4 18v3h3v-3h10v3h3v-3h1a1 1 0 001-1V8a4 4 0 00-4-4H6a4 4 0 00-4 4v9a1 1 0 001 1h1zm1-9a3 3 0 013-3h8a3 3 0 013 3v7H5V9z" />
    </svg>
  );
}
