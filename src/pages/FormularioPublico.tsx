import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, Loader2, Clock, MapPin, Users, ChevronDown } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface SocialProofItem {
  id: string;
  nome: string;
  foto_url: string | null;
  metricas: { platform: string; value: string; url?: string }[];
  total_seguidores: string | null;
  ordem: number;
}

interface Modulo {
  id: string;
  titulo: string;
  descricao: string | null;
  duracao_horas: number;
  icone: string;
  entrega: string | null;
  semana: string | null;
  ordem: number;
}

interface FormData {
  id: string;
  slug: string;
  titulo: string;
  descricao: string | null;
  curso: {
    id: string;
    nome: string;
    imagem_url: string | null;
    carga_horaria: number;
    preco: number;
  };
  unidade: {
    id: string;
    nome: string;
    cidade: string;
  };
  tracking: {
    meta_pixel_id: string | null;
    google_analytics_id: string | null;
  };
  social_proof?: SocialProofItem[];
  modulos?: Modulo[];
}

type Period = 'manha' | 'tarde' | 'noite';

// Fallback social proof data — used only when no data is configured in the CRM
const SOCIAL_PROOF_STATS = [
  { value: '+23', label: 'anos de experiência' },
  { value: '2003', label: 'ano de fundação da OZI' },
  { value: '+9 mil', label: 'alunos presenciais' },
  { value: '+20 mil', label: 'alunos online' },
];

const FALLBACK_ALUMNI: SocialProofItem[] = [
  { id: '1', nome: 'Patricio Carvalho', foto_url: null, metricas: [{ platform: 'Instagram', value: '4.7M' }, { platform: 'YouTube', value: '3.93M' }], total_seguidores: '8.63M', ordem: 0 },
  { id: '2', nome: 'Ir Kelly Patricia', foto_url: null, metricas: [{ platform: 'Instagram', value: '4.9M' }, { platform: 'YouTube', value: '5.02M' }], total_seguidores: '9.92M', ordem: 1 },
  { id: '3', nome: 'Raul Gazolla', foto_url: null, metricas: [{ platform: 'Instagram', value: '1.8M' }], total_seguidores: null, ordem: 2 },
  { id: '4', nome: 'Lucas Fernandes', foto_url: null, metricas: [{ platform: 'Instagram', value: '2M' }], total_seguidores: null, ordem: 3 },
];

function formatPriceInstallment(preco: number, parcelas: number = 12, taxa: number = 0.0297): { parcela: string; total: string; economia: string; economiaPct: string } {
  // Standard card installment calculation
  const totalParcelado = preco * Math.pow(1 + taxa, parcelas);
  const parcela = totalParcelado / parcelas;
  const economia = totalParcelado - preco;
  const economiaPct = ((economia / totalParcelado) * 100).toFixed(0);
  return {
    parcela: parcela.toFixed(2).replace('.', ','),
    total: totalParcelado.toFixed(2).replace('.', ','),
    economia: economia.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
    economiaPct
  };
}

function formatCurrencyBR(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export function FormularioPublico() {
  const { slug } = useParams<{ slug: string }>();
  const [formInfo, setFormInfo] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showFloating, setShowFloating] = useState(false);

  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [periods, setPeriods] = useState<Period[]>([]);

  const heroRef = useRef<HTMLDivElement>(null);
  const formSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadForm();
  }, [slug]);

  // Floating CTA bar visibility
  useEffect(() => {
    function handleScroll() {
      if (!heroRef.current || !formSectionRef.current) return;
      const heroBottom = heroRef.current.getBoundingClientRect().bottom;
      const formTop = formSectionRef.current.getBoundingClientRect().top;
      setShowFloating(heroBottom < 0 && formTop > window.innerHeight);
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  async function loadForm() {
    try {
      const response = await fetch(`/api/public/forms/${slug}`);
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Formulário não encontrado');
        return;
      }
      const data = await response.json();
      setFormInfo(data);
      injectTrackingScripts(data.tracking);
    } catch {
      setError('Erro ao carregar formulário');
    } finally {
      setLoading(false);
    }
  }

  function injectTrackingScripts(tracking: FormData['tracking']) {
    const inject = () => {
      if (tracking.meta_pixel_id) {
        const script = document.createElement('script');
        script.innerHTML = `
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
          (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${tracking.meta_pixel_id}');
          fbq('track', 'PageView');
        `;
        document.head.appendChild(script);
      }
      if (tracking.google_analytics_id) {
        const gtagScript = document.createElement('script');
        gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${tracking.google_analytics_id}`;
        gtagScript.async = true;
        document.head.appendChild(gtagScript);
        const gtagInit = document.createElement('script');
        gtagInit.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${tracking.google_analytics_id}');
        `;
        document.head.appendChild(gtagInit);
      }
    };
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(inject);
    } else {
      setTimeout(inject, 1);
    }
  }

  function togglePeriod(p: Period) {
    setPeriods(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  }

  function formatWhatsapp(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function scrollToForm() {
    formSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !whatsapp.trim()) return;
    if (periods.length === 0) {
      toast.error('Selecione pelo menos um horário');
      return;
    }

    setSubmitting(true);
    try {
      const getCookie = (name: string) => {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? match[2] : '';
      };
      let fbc = getCookie('_fbc');
      const fbp = getCookie('_fbp');
      if (!fbc) {
        const urlParams = new URLSearchParams(window.location.search);
        const fbclid = urlParams.get('fbclid');
        if (fbclid) fbc = `fb.1.${Date.now()}.${fbclid}`;
      }

      const response = await fetch(`/api/public/forms/${slug}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          whatsapp: whatsapp.replace(/\D/g, ''),
          available_periods: periods,
          fbc, fbp
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao cadastrar');
      }

      try {
        if ((window as any).fbq) (window as any).fbq('track', 'Lead');
        if ((window as any).gtag) (window as any).gtag('event', 'generate_lead', { currency: 'BRL', value: formInfo?.curso.preco || 0 });
      } catch { /* tracking errors should not block UX */ }

      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cadastrar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  // --- RENDER STATES ---

  if (loading) {
    return (
      <div className="lp-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: 'var(--ac)' }} />
      </div>
    );
  }

  if (error || !formInfo) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh',
        textAlign: 'center', padding: '2rem',
        background: '#0d1117', color: '#e6edf3',
        fontFamily: "'DM Sans', -apple-system, sans-serif"
      }}>
        <div>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>😔</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: '#e6edf3' }}>Formulário não encontrado</h1>
          <p style={{ color: '#8b949e' }}>{error || 'Este link não é válido ou o formulário foi desativado.'}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh',
        textAlign: 'center', padding: '2rem',
        background: '#0d1117', color: '#e6edf3',
        fontFamily: "'DM Sans', -apple-system, sans-serif"
      }}>
        <div>
          <CheckCircle className="h-20 w-20 mx-auto mb-6" style={{ color: '#2CD3C7' }} />
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem', color: '#e6edf3' }}>Você está na lista! 🎉</h1>
          <p style={{ color: '#8b949e', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            Seu interesse no curso <strong style={{ color: '#2CD3C7' }}>{formInfo.curso.nome}</strong> foi registrado.
          </p>
          <p style={{ color: '#8b949e' }}>Entraremos em contato pelo WhatsApp assim que a turma estiver confirmada.</p>
          <div style={{ marginTop: '2rem', padding: '0.75rem 1.5rem', borderRadius: '100px', background: '#161b22', display: 'inline-block' }}>
            <span style={{ color: '#8b949e', fontSize: '0.9rem' }}>📍 {formInfo.unidade.nome}</span>
          </div>
        </div>
      </div>
    );
  }

  const preco = formInfo.curso.preco;
  const pricing = formatPriceInstallment(preco);
  const hasPricing = preco > 0;

  return (
    <>
      <Toaster position="top-center" />
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <style>{`
        :root {
          --bg: #0d1117;
          --bg-card: #161b22;
          --bg-card-h: #1c2333;
          --ac: #2CD3C7;
          --ac-dim: rgba(44,211,199,.12);
          --gold: #f0c850;
          --gold-dim: rgba(240,200,80,.12);
          --tx: #e6edf3;
          --tx2: #8b949e;
          --txm: #555d66;
          --brd: #21262d;
        }
        .lp-page {
          font-family: 'DM Sans', -apple-system, sans-serif;
          background: var(--bg);
          color: var(--tx);
          line-height: 1.7;
          -webkit-font-smoothing: antialiased;
          min-height: 100vh;
        }
        .lp-page * { box-sizing: border-box; }
        .lp-c { max-width: 1080px; margin: 0 auto; padding: 0 24px; }
        .lp-heading { font-family: 'Space Grotesk', sans-serif; }
        .lp-hl { color: var(--ac); }

        /* Nav */
        .lp-nav { padding: 16px 0; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--brd); }
        .lp-nav-logo { height: 32px; width: auto; }
        .lp-nav-cta { padding: 10px 24px; background: var(--ac); color: #0d1117; border: none; border-radius: 8px; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; transition: opacity 0.3s; text-decoration: none; }
        .lp-nav-cta:hover { opacity: 0.85; }

        /* Hero */
        .lp-hero { padding: 60px 0 48px; }
        .lp-hero-grid { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 40px; align-items: center; }
        .lp-hero-img-col { display: flex; align-items: center; }
        .lp-badge { display: inline-block; padding: 6px 16px; border: 1px solid var(--ac); border-radius: 100px; font-size: 0.72rem; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--ac); background: var(--ac-dim); margin-bottom: 20px; }
        .lp-hero h1 { font-family: 'Space Grotesk', sans-serif; font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 700; line-height: 1.2; margin-bottom: 16px; }
        .lp-hero-sub { font-size: 1rem; color: var(--tx2); line-height: 1.8; margin-bottom: 24px; }
        .lp-hero-tags { display: flex; gap: 10px; flex-wrap: wrap; }
        .lp-tag { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: var(--tx2); padding: 6px 14px; background: var(--bg-card); border: 1px solid var(--brd); border-radius: 8px; font-weight: 500; }
        .lp-hero-img { width: 100%; height: 360px; object-fit: contain; }
        .lp-hero-placeholder { width: 100%; height: 360px; border-radius: 16px; border: 2px dashed var(--brd); background: var(--bg-card); display: flex; align-items: center; justify-content: center; color: var(--txm); font-size: 0.9rem; }

        /* Sections */
        .lp-section { padding: 64px 0; border-top: 1px solid var(--brd); }
        .lp-label { font-size: 0.72rem; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: var(--ac); margin-bottom: 14px; }

        /* Pricing */
        .lp-price-card { display: inline-block; background: var(--bg-card); border: 2px solid var(--ac); border-radius: 20px; padding: 40px 48px; position: relative; overflow: hidden; }
        .lp-price-card::after { content: ''; position: absolute; inset: -1px; border-radius: 20px; background: linear-gradient(135deg, var(--ac), transparent 50%); opacity: 0.06; pointer-events: none; }
        .lp-price-big { font-family: 'Space Grotesk', sans-serif; font-size: 2.8rem; font-weight: 700; line-height: 1; margin-bottom: 4px; }
        .lp-price-vista { font-family: 'Space Grotesk', sans-serif; font-size: 2rem; font-weight: 700; color: var(--ac); margin-bottom: 6px; }
        .lp-checklist { text-align: left; border-top: 1px solid var(--brd); padding-top: 18px; list-style: none; font-size: 0.88rem; color: var(--tx2); line-height: 2.2; margin: 0; padding-left: 0; }
        .lp-checklist li { padding-left: 22px; position: relative; }
        .lp-checklist li::before { content: '✓'; position: absolute; left: 0; color: var(--ac); font-weight: 700; }

        /* Social Proof Cards */
        .lp-alumni-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 40px; }
        @keyframes lp-fadeUp { to { opacity: 1; transform: translateY(0); } }
        .lp-alumni-card { background: var(--bg-card); border: 1px solid rgba(255,255,255,0.06); border-radius: 20px; overflow: hidden; position: relative; transition: transform 0.35s cubic-bezier(.22,.68,0,1.2), box-shadow 0.35s ease; opacity: 0; transform: translateY(30px); animation: lp-fadeUp 0.6s ease forwards; }
        .lp-alumni-card:nth-child(1) { animation-delay: 0.1s; }
        .lp-alumni-card:nth-child(2) { animation-delay: 0.2s; }
        .lp-alumni-card:nth-child(3) { animation-delay: 0.3s; }
        .lp-alumni-card:nth-child(4) { animation-delay: 0.4s; }
        .lp-alumni-card:hover { transform: translateY(-6px); box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 40px var(--ac-dim); border-color: rgba(44,211,199,0.15); }
        .lp-alumni-img-wrap { width: 100%; aspect-ratio: 1/1; position: relative; overflow: hidden; }
        .lp-alumni-img-wrap img { width: 100%; height: 100%; object-fit: cover; object-position: top center; display: block; filter: grayscale(10%) contrast(1.05); transition: transform 0.5s ease, filter 0.5s ease; }
        .lp-alumni-card:hover .lp-alumni-img-wrap img { transform: scale(1.04); filter: grayscale(0%) contrast(1.1); }
        .lp-alumni-img-wrap::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 50%; background: linear-gradient(to top, var(--bg-card) 0%, transparent 100%); pointer-events: none; }
        .lp-alumni-placeholder { width: 100%; aspect-ratio: 1/1; display: flex; align-items: center; justify-content: center; font-size: 3rem; font-weight: 800; color: rgba(255,255,255,0.08); background: linear-gradient(135deg, #1a1a2e 0%, #16162a 100%); letter-spacing: -0.03em; }
        .lp-alumni-body { padding: 20px 22px 26px; }
        .lp-alumni-name { font-size: 1.1rem; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 14px; line-height: 1.2; color: var(--tx); }
        .lp-alumni-platforms { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }
        .lp-alumni-platform { display: flex; align-items: center; gap: 10px; font-size: 0.82rem; color: var(--tx2); font-weight: 500; text-decoration: none; transition: color 0.2s; }
        a.lp-alumni-platform:hover { color: var(--ac); }
        .lp-alumni-platform-icon { width: 18px; height: 18px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .lp-alumni-platform-icon svg { width: 16px; height: 16px; }
        .lp-alumni-platform-count { font-weight: 700; color: var(--tx); margin-left: auto; font-variant-numeric: tabular-nums; }
        .lp-alumni-divider { height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), rgba(255,255,255,0.06), transparent); margin-bottom: 16px; }
        .lp-alumni-total-row { display: flex; align-items: baseline; justify-content: space-between; }
        .lp-alumni-total-label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.12em; color: var(--tx2); }
        .lp-alumni-total-num { font-family: 'Space Grotesk', monospace; font-size: 1.6rem; font-weight: 700; color: var(--ac); line-height: 1; text-shadow: 0 0 30px var(--ac-dim); }

        .lp-stats-row { display: flex; justify-content: center; gap: 48px; flex-wrap: wrap; }
        .lp-stat { text-align: center; }
        .lp-stat-num { font-family: 'Space Grotesk', sans-serif; font-size: 2rem; font-weight: 700; color: var(--ac); line-height: 1; margin-bottom: 4px; }
        .lp-stat-label { font-size: 0.82rem; color: var(--txm); font-weight: 500; }

        /* Form Section */
        .lp-form-wrapper { max-width: 480px; margin: 0 auto; }
        .lp-input { width: 100%; padding: 14px 18px; background: var(--bg-card); border: 1px solid var(--brd); border-radius: 10px; color: var(--tx); font-family: 'DM Sans', sans-serif; font-size: 0.95rem; outline: none; transition: border-color 0.3s; }
        .lp-input::placeholder { color: var(--txm); }
        .lp-input:focus { border-color: var(--ac); }
        .lp-period-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
        .lp-period-btn { padding: 12px; background: var(--bg-card); border: 1px solid var(--brd); border-radius: 10px; text-align: center; cursor: pointer; transition: all 0.3s; font-size: 0.9rem; color: var(--tx2); font-weight: 500; font-family: 'DM Sans', sans-serif; }
        .lp-period-btn:hover, .lp-period-btn.active { border-color: var(--ac); color: var(--ac); background: var(--ac-dim); }
        .lp-period-icon { display: block; font-size: 1.2rem; margin-bottom: 4px; }
        .lp-submit { width: 100%; padding: 16px; background: var(--ac); color: #0d1117; border: none; border-radius: 10px; font-family: 'DM Sans', sans-serif; font-size: 1rem; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; transition: opacity 0.3s, transform 0.2s; }
        .lp-submit:hover { opacity: 0.9; transform: translateY(-1px); }
        .lp-submit:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        /* Floating CTA */
        .lp-floating { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(13,17,23,0.95); backdrop-filter: blur(12px); border-top: 1px solid var(--brd); padding: 12px 24px; display: flex; justify-content: center; align-items: center; gap: 20px; z-index: 100; transform: translateY(100%); transition: transform 0.4s ease; }
        .lp-floating.show { transform: translateY(0); }
        .lp-floating-text { font-size: 0.9rem; color: var(--tx2); }
        .lp-floating-text strong { color: var(--tx); }

        /* Footer */
        .lp-footer { padding: 24px 0; border-top: 1px solid var(--brd); text-align: center; font-size: 0.8rem; color: var(--txm); }

        /* Scroll indicator */
        .lp-scroll-cta { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-top: 32px; color: var(--txm); font-size: 0.8rem; cursor: pointer; transition: color 0.3s; }
        .lp-scroll-cta:hover { color: var(--ac); }

        /* Modules */
        .lp-modules-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .lp-module-card { background: var(--bg-card); border: 1px solid var(--brd); border-radius: 14px; padding: 24px 20px 18px; display: flex; flex-direction: column; transition: border-color 0.3s, background 0.3s; }
        .lp-module-card:hover { background: var(--bg-card-h); border-color: #30363d; }
        .lp-module-num { font-size: 0.78rem; font-weight: 800; color: var(--ac); margin-bottom: 2px; }
        .lp-module-week { font-size: 0.72rem; color: var(--txm); margin-bottom: 10px; }
        .lp-module-icon { font-size: 1.5rem; margin-bottom: 8px; }
        .lp-module-title { font-size: 1.05rem; font-weight: 700; margin-bottom: 4px; }
        .lp-module-hours { font-size: 0.75rem; color: var(--txm); font-weight: 500; margin-bottom: 8px; }
        .lp-module-desc { font-size: 0.88rem; color: var(--tx2); line-height: 1.7; flex: 1; margin: 0; }
        .lp-module-delivery { margin-top: 12px; padding: 8px 12px; background: var(--ac-dim); border-left: 3px solid var(--ac); border-radius: 0 8px 8px 0; font-size: 0.8rem; font-weight: 600; color: var(--ac); }

        /* Responsive */
        @media (max-width: 768px) {
          .lp-hero-grid { grid-template-columns: 1fr; gap: 16px; }
          .lp-hero-img-col { order: -1; }
          .lp-hero-img, .lp-hero-placeholder { height: auto; max-height: 280px; }
          .lp-badge { margin-bottom: 12px; }
          .lp-alumni-grid { grid-template-columns: repeat(2, 1fr); }
          .lp-modules-grid { grid-template-columns: 1fr; }
          .lp-stats-row { gap: 24px; }
          .lp-price-card { padding: 28px 24px; width: 100%; }
          .lp-floating { flex-direction: column; gap: 8px; padding: 10px 18px; }
          .lp-hero { padding: 20px 0 32px; }
          .lp-c { padding: 0 16px; }
        }
      `}</style>

      <div className="lp-page">
        {/* Nav */}
        <nav className="lp-c">
          <div className="lp-nav">
            <img src="/icon.webp" alt="OZI" className="lp-nav-logo" />
            <button onClick={scrollToForm} className="lp-nav-cta">Lista de Espera</button>
          </div>
        </nav>

        {/* Hero */}
        <section className="lp-hero" ref={heroRef}>
          <div className="lp-c">
            <span className="lp-badge">
              Curso Presencial · {formInfo.unidade.cidade || formInfo.unidade.nome}
            </span>
            <div className="lp-hero-grid">
              <div>
                <h1 className="lp-heading">
                  {formInfo.titulo || formInfo.curso.nome}
                </h1>
                {formInfo.descricao && (
                  <p className="lp-hero-sub">{formInfo.descricao}</p>
                )}
                <div className="lp-hero-tags">
                  {formInfo.curso.carga_horaria > 0 && (
                    <span className="lp-tag">
                      <Clock className="h-4 w-4" /> {formInfo.curso.carga_horaria}h
                    </span>
                  )}
                  <span className="lp-tag">
                    <MapPin className="h-4 w-4" /> {formInfo.unidade.cidade || formInfo.unidade.nome}
                  </span>
                  <span className="lp-tag">
                    <Users className="h-4 w-4" /> Turmas reduzidas
                  </span>
                </div>
              </div>
              <div className="lp-hero-img-col">
                {formInfo.curso.imagem_url ? (
                  <img
                    src={formInfo.curso.imagem_url}
                    alt={formInfo.curso.nome}
                    className="lp-hero-img"
                  />
                ) : (
                  <div className="lp-hero-placeholder">
                    📸 Imagem do curso
                  </div>
                )}
              </div>
            </div>
            <div className="lp-scroll-cta" onClick={scrollToForm}>
              <span>Saiba mais</span>
              <ChevronDown className="h-5 w-5" style={{ animation: 'bounce 2s infinite' }} />
            </div>
          </div>
        </section>

        {/* Social Proof */}
        {(() => {
          const alumni = (formInfo.social_proof && formInfo.social_proof.length > 0)
            ? formInfo.social_proof
            : FALLBACK_ALUMNI;
          return (
            <section className="lp-section">
              <div className="lp-c">
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                  <p className="lp-label">Quem já passou por aqui</p>
                  <h2 className="lp-heading" style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', fontWeight: 700, marginBottom: '6px' }}>
                    Grandes nomes já passaram pela <span className="lp-hl">OZI.</span>
                  </h2>
                  <p style={{ fontSize: 'clamp(1.4rem, 3.5vw, 2rem)', fontWeight: 700, color: 'var(--tx)' }}>Quem sabe você não é o próximo.</p>
                </div>

                <div className="lp-alumni-grid">
                  {alumni.map((a: SocialProofItem) => {
                    const initials = a.nome.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                    return (
                      <div key={a.id} className="lp-alumni-card">
                        {a.foto_url ? (
                          <div className="lp-alumni-img-wrap">
                            <img src={a.foto_url} alt={a.nome} />
                          </div>
                        ) : (
                          <div className="lp-alumni-placeholder">{initials}</div>
                        )}
                        <div className="lp-alumni-body">
                          <div className="lp-alumni-name">{a.nome}</div>
                          <div className="lp-alumni-platforms">
                            {(a.metricas || []).map((s: { platform: string; value: string; url?: string }, j: number) => {
                              const pl = s.platform.toLowerCase();
                              const isYt = pl.includes('youtube') || pl.includes('yt');
                              const isIg = pl.includes('instagram') || pl.includes('insta') || pl.includes('ig');
                              const isTk = pl.includes('tiktok') || pl.includes('tik');
                              const iconColor = isYt ? '#ff4444' : isIg ? '#e040a0' : isTk ? '#69c9d0' : 'var(--tx2)';
                              const iconSvg = isYt
                                ? <svg viewBox="0 0 24 24" fill={iconColor}><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8zM9.6 15.6V8.4l6.3 3.6-6.3 3.6z"/></svg>
                                : isIg
                                ? <svg viewBox="0 0 24 24" fill={iconColor}><path d="M12 2.2c2.7 0 3 0 4.1.1 1 0 1.5.2 1.9.4.5.2.8.4 1.2.8.4.4.6.7.8 1.2.1.4.3.9.4 1.9 0 1 .1 1.4.1 4.1s0 3-.1 4.1c0 1-.2 1.5-.4 1.9-.2.5-.4.8-.8 1.2-.4.4-.7.6-1.2.8-.4.1-.9.3-1.9.4-1 0-1.4.1-4.1.1s-3 0-4.1-.1c-1 0-1.5-.2-1.9-.4a3.3 3.3 0 0 1-1.2-.8c-.4-.4-.6-.7-.8-1.2-.1-.4-.3-.9-.4-1.9C2.2 15 2.2 14.7 2.2 12s0-3 .1-4.1c0-1 .2-1.5.4-1.9.2-.5.4-.8.8-1.2.4-.4.7-.6 1.2-.8.4-.1.9-.3 1.9-.4C7 2.2 7.3 2.2 12 2.2zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8zm4.8-2.9a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z"/></svg>
                                : isTk
                                ? <svg viewBox="0 0 24 24" fill={iconColor}><path d="M19.6 6.7A5.2 5.2 0 0 1 16.4 3h-3v13.2a2.9 2.9 0 1 1-2-2.7V10a6.4 6.4 0 1 0 5.4 6.3V9.6a8.6 8.6 0 0 0 5 1.6V7.8a5.2 5.2 0 0 1-2.2-1.1z"/></svg>
                                : null;
                              const Tag = s.url ? 'a' : 'div';
                              const linkProps = s.url ? { href: s.url, target: '_blank', rel: 'noopener noreferrer' } : {};
                              return (
                                <Tag key={j} className="lp-alumni-platform" {...linkProps}>
                                  {iconSvg && <span className="lp-alumni-platform-icon">{iconSvg}</span>}
                                  {s.platform}
                                  <span className="lp-alumni-platform-count">{s.value}</span>
                                </Tag>
                              );
                            })}
                          </div>
                          {a.total_seguidores && (
                            <>
                              <div className="lp-alumni-divider" />
                              <div className="lp-alumni-total-row">
                                <span className="lp-alumni-total-label">Total seguidores</span>
                                <span className="lp-alumni-total-num">{a.total_seguidores}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="lp-stats-row">
                  {SOCIAL_PROOF_STATS.map((s, i) => (
                    <div key={i} className="lp-stat">
                      <div className="lp-stat-num">{s.value}</div>
                      <div className="lp-stat-label">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        })()}

        {/* Pricing Section */}
        {hasPricing && (
          <section className="lp-section" style={{ textAlign: 'center' }}>
            <div className="lp-c">
              <p className="lp-label" style={{ textAlign: 'center' }}>Investimento</p>
              <h2 className="lp-heading" style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)', fontWeight: 700, marginBottom: '6px' }}>
                Quanto custa construir sua carreira?
              </h2>
              <p style={{ fontSize: '0.95rem', color: 'var(--tx2)', marginBottom: '32px' }}>
                O conhecimento fica com você para sempre.
              </p>
              <div className="lp-price-card">
                <p style={{ fontSize: '0.88rem', color: 'var(--tx2)', marginBottom: '4px' }}>No cartão em até</p>
                <div className="lp-price-big">
                  <span style={{ fontSize: '1.3rem', color: 'var(--tx2)', marginRight: '4px' }}>12x</span>
                  <span style={{ fontSize: '1.3rem', verticalAlign: 'top', marginRight: '2px' }}>R$</span>
                  {pricing.parcela}
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--txm)', marginBottom: '20px' }}>
                  Total parcelado: R$ {pricing.total}
                </p>
                <hr style={{ border: 'none', borderTop: '1px solid var(--brd)', margin: '18px 0' }} />
                <p style={{ fontSize: '0.85rem', color: 'var(--tx2)', marginBottom: '6px' }}>Ou à vista por</p>
                <div className="lp-price-vista">
                  <span style={{ fontSize: '1rem', verticalAlign: 'top', marginRight: '2px' }}>R$</span>
                  {formatCurrencyBR(preco)}
                </div>
                <span style={{
                  display: 'inline-block', padding: '4px 14px', background: 'var(--ac-dim)',
                  border: '1px solid var(--ac)', borderRadius: '100px', fontSize: '0.75rem',
                  fontWeight: 700, color: 'var(--ac)', marginBottom: '20px'
                }}>
                  Economia de R$ {pricing.economia} · {pricing.economiaPct}% OFF
                </span>
                <ul className="lp-checklist">
                  <li>Curso presencial completo</li>
                  {formInfo.curso.carga_horaria > 0 && <li>{formInfo.curso.carga_horaria} horas de conteúdo</li>}
                  <li>Turma reduzida e personalizada</li>
                  <li>Certificado de conclusão</li>
                  <li>Material de apoio incluso</li>
                  <li>📍 {formInfo.unidade.nome}</li>
                </ul>
              </div>
            </div>
          </section>
        )}
        {/* Modules Section */}
        {formInfo.modulos && formInfo.modulos.length > 0 && (
          <section className="lp-section">
            <div className="lp-c">
              <div style={{ marginBottom: '40px' }}>
                <p className="lp-label">O curso</p>
                <h2 className="lp-heading" style={{ fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)', fontWeight: 700, marginBottom: '8px' }}>
                  {formInfo.modulos.length} módulos.{' '}
                  {formInfo.curso.carga_horaria > 0 && <span className="lp-hl">{formInfo.curso.carga_horaria} horas.</span>}
                </h2>
                <p style={{ fontSize: '1rem', color: 'var(--tx2)' }}>Cada módulo entrega um resultado concreto.</p>
              </div>
              <div className="lp-modules-grid">
                {formInfo.modulos.map((m, i) => (
                  <div key={m.id} className="lp-module-card">
                    <span className="lp-module-num">{String(i + 1).padStart(2, '0')}</span>
                    {m.semana && <span className="lp-module-week">{m.semana}</span>}
                    <div className="lp-module-icon">{m.icone || '📚'}</div>
                    <h3 className="lp-module-title">{m.titulo}</h3>
                    {m.duracao_horas > 0 && (
                      <span className="lp-module-hours">{m.duracao_horas} horas</span>
                    )}
                    {m.descricao && <p className="lp-module-desc">{m.descricao}</p>}
                    {m.entrega && (
                      <div className="lp-module-delivery">{m.entrega}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Form Section */}
        <section className="lp-section" ref={formSectionRef} id="cadastro">
          <div className="lp-c">
            <div className="lp-form-wrapper" style={{ textAlign: 'center' }}>
              <p className="lp-label">Lista de Espera</p>
              <h2 className="lp-heading" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '6px' }}>
                Garanta sua vaga na próxima turma
              </h2>
              <p style={{ fontSize: '0.92rem', color: 'var(--tx2)', marginBottom: '28px' }}>
                Preencha seus dados e nossa equipe entrará em contato pelo WhatsApp.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  className="lp-input"
                />
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={e => setWhatsapp(formatWhatsapp(e.target.value))}
                  placeholder="WhatsApp (11) 99999-9999"
                  required
                  className="lp-input"
                />

                <p style={{ fontSize: '0.88rem', color: 'var(--tx2)', marginTop: '4px', marginBottom: '0', textAlign: 'left', fontWeight: 500 }}>
                  Qual horário prefere?
                </p>
                <div className="lp-period-grid">
                  {([
                    { key: 'manha' as Period, label: 'Manhã', icon: '☀️' },
                    { key: 'tarde' as Period, label: 'Tarde', icon: '🌤️' },
                    { key: 'noite' as Period, label: 'Noite', icon: '🌙' },
                  ]).map(({ key, label, icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => togglePeriod(key)}
                      className={`lp-period-btn ${periods.includes(key) ? 'active' : ''}`}
                    >
                      <span className="lp-period-icon">{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={submitting || !nome.trim() || !whatsapp.trim() || periods.length === 0}
                  className="lp-submit"
                  style={{ marginTop: '8px' }}
                >
                  {submitting ? 'Cadastrando...' : 'Quero garantir minha vaga'}
                </button>

                <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--txm)', marginTop: '4px' }}>
                  Ao se cadastrar, você receberá informações sobre o curso pelo WhatsApp.
                </p>
              </form>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="lp-footer">
          <div className="lp-c">OZI Educação LTDA · Brasília / São Paulo · Desde 2003</div>
        </footer>

        {/* Floating CTA Bar */}
        {hasPricing && (
          <div className={`lp-floating ${showFloating ? 'show' : ''}`}>
            <span className="lp-floating-text">
              <strong>12x de R$ {pricing.parcela}</strong> ou R$ {formatCurrencyBR(preco)} à vista
            </span>
            <button onClick={scrollToForm} className="lp-nav-cta">Lista de Espera</button>
          </div>
        )}
      </div>
    </>
  );
}
