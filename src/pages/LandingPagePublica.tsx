import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, Loader2, ChevronDown } from 'lucide-react';
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

interface LPData {
  id: string;
  slug: string;
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
  hero: {
    headline: string | null;
    subheadline: string | null;
    image_url: string | null;
  };
  para_quem: {
    headline: string | null;
    texto: string | null;
    sem_curso_items: string[];
    com_curso_items: string[];
  };
  bonus: {
    titulo: string | null;
    descricao: string | null;
    entrega: string | null;
    image_url: string | null;
  };
  investimento: {
    headline: string | null;
    descricao: string | null;
    parcelas: number;
    valor_parcela: number | null;
    desconto: string | null;
    items: string[];
  };
  social_proof: {
    headline1: string | null;
    headline2: string | null;
    items: SocialProofItem[];
  };
  modulos: Modulo[];
  tracking: {
    meta_pixel_id: string | null;
    google_analytics_id: string | null;
  };
}

type Period = 'manha' | 'tarde' | 'noite';

const SOCIAL_PROOF_STATS = [
  { value: '+23', label: 'anos de experiência' },
  { value: '2003', label: 'ano de fundação da OZI' },
  { value: '+9 mil', label: 'alunos presenciais' },
  { value: '+20 mil', label: 'alunos online' },
];

export function LandingPagePublica() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<LPData | null>(null);
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

  useEffect(() => { loadLP(); }, [slug]);

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

  async function loadLP() {
    try {
      const response = await fetch(`/api/public/landing/${slug}`);
      if (!response.ok) {
        const d = await response.json();
        setError(d.error || 'Landing page não encontrada');
        return;
      }
      const d = await response.json();
      setData(d);
      injectTracking(d.tracking);
    } catch {
      setError('Erro ao carregar landing page');
    } finally {
      setLoading(false);
    }
  }

  function injectTracking(tracking: LPData['tracking']) {
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

      const response = await fetch(`/api/public/landing/${slug}/register`, {
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
        const d = await response.json();
        throw new Error(d.error || 'Erro ao cadastrar');
      }

      try {
        if ((window as any).fbq) (window as any).fbq('track', 'Lead');
        if ((window as any).gtag) (window as any).gtag('event', 'generate_lead', { currency: 'BRL', value: data?.curso.preco || 0 });
      } catch { /* ignore */ }

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f5f5f0' }}>
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: '#0d1117' }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh',
        textAlign: 'center', padding: '2rem',
        background: '#f5f5f0', color: '#0d1117',
        fontFamily: "'DM Sans', -apple-system, sans-serif"
      }}>
        <div>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>😔</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Página não encontrada</h1>
          <p style={{ color: '#5a5a5a' }}>{error || 'Este link não é válido ou a página foi desativada.'}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh',
        textAlign: 'center', padding: '2rem',
        background: '#f5f5f0', color: '#0d1117',
        fontFamily: "'DM Sans', -apple-system, sans-serif"
      }}>
        <div>
          <CheckCircle className="h-20 w-20 mx-auto mb-6" style={{ color: '#2CD3C7' }} />
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem' }}>Você está na lista! 🎉</h1>
          <p style={{ color: '#5a5a5a', fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            Seu interesse no curso <strong style={{ color: '#2CD3C7' }}>{data.curso.nome}</strong> foi registrado.
          </p>
          <p style={{ color: '#5a5a5a' }}>Entraremos em contato pelo WhatsApp assim que a turma estiver confirmada.</p>
          <div style={{ marginTop: '2rem', padding: '0.75rem 1.5rem', borderRadius: '100px', background: '#e8e8e3', display: 'inline-block' }}>
            <span style={{ color: '#5a5a5a', fontSize: '0.9rem' }}>📍 {data.unidade.nome}</span>
          </div>
        </div>
      </div>
    );
  }

  const modulos = data.modulos || [];
  const hasParaQuem = data.para_quem.headline || (data.para_quem.sem_curso_items.length > 0 && data.para_quem.com_curso_items.length > 0);
  const hasBonus = data.bonus.titulo;
  const hasInvestimento = data.investimento.valor_parcela;
  const hasSocialProof = data.social_proof.items.length > 0;

  // Calculate dynamic course info from modules
  const totalHoras = data.curso.carga_horaria;

  // Compute schedule description from carga_horaria
  // e.g. 30 horas / 3h per day = 10 days = 2 weeks
  const horasPorDia = 3;
  const totalDias = totalHoras > 0 ? Math.ceil(totalHoras / horasPorDia) : 0;
  const totalSemanas = totalDias > 0 ? Math.ceil(totalDias / 5) : 0;

  return (
    <>
      <Toaster position="top-center" />
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <style>{`
        :root {
          --bg: #f5f5f0;
          --bg-card: #ffffff;
          --bg-card-h: #fafafa;
          --ac: #0d1117;
          --ac-soft: #2CD3C7;
          --ac-dim: rgba(13,17,23,.06);
          --gold: #f0c850;
          --gold-dim: rgba(240,200,80,.10);
          --red: #e5534b;
          --green: #2CD3C7;
          --tx: #0d1117;
          --tx2: #5a5a5a;
          --txm: #8a8a8a;
          --brd: rgba(0,0,0,.08);
          --shadow: 0 1px 3px rgba(0,0,0,.06), 0 4px 12px rgba(0,0,0,.04);
          --shadow-hover: 0 8px 32px rgba(0,0,0,.1);
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--tx); line-height: 1.7; -webkit-font-smoothing: antialiased; }
        .c { max-width: 1080px; margin: 0 auto; padding: 0 32px; }

        /* Nav */
        .nav { padding: 20px 0; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--brd); }
        .nav-logo { height: 28px; width: auto; filter: brightness(0); }
        .nav-cta { padding: 10px 24px; background: var(--ac); color: #fff; border: none; border-radius: 100px; font-family: 'DM Sans', sans-serif; font-size: .82rem; font-weight: 700; text-decoration: none; letter-spacing: .5px; transition: all .3s; cursor: pointer; }
        .nav-cta:hover { opacity: .9; transform: translateY(-1px); }

        /* Hero */
        .hero { padding: 80px 0 60px; }
        .hero-layout { display: grid; grid-template-columns: 1.1fr .9fr; gap: 48px; align-items: center; }
        .badge { display: inline-block; padding: 6px 16px; border: 1px solid var(--brd); border-radius: 100px; font-size: .72rem; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--tx2); background: var(--bg-card); margin-bottom: 24px; box-shadow: var(--shadow); }
        .hero h1 { font-family: 'Space Grotesk', sans-serif; font-size: clamp(2.2rem,5vw,3.4rem); font-weight: 700; line-height: 1.1; margin-bottom: 20px; letter-spacing: -.03em; color: var(--tx); }
        .hero-img-col { display: flex; align-items: center; }
        .hl { color: var(--green); }
        .hero-sub { font-size: 1.05rem; color: var(--tx2); line-height: 1.8; margin-bottom: 28px; }
        .hero-meta { display: flex; gap: 10px; flex-wrap: wrap; }
        .tag { display: flex; align-items: center; gap: 6px; font-size: .82rem; color: var(--tx2); padding: 7px 14px; background: var(--bg-card); border: 1px solid var(--brd); border-radius: 100px; font-weight: 500; box-shadow: var(--shadow); }
        .hero-img-wrap { position: relative; }
        .hero-img { width: 100%; height: 400px; object-fit: contain; }
        .hero-ph { width: 100%; height: 400px; border-radius: 20px; border: 2px dashed var(--brd); background: var(--bg-card); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 28px; }
        .ph-i { font-size: 2rem; margin-bottom: 10px; opacity: .4; }
        .ph-l { font-size: .85rem; font-weight: 700; color: var(--tx); margin-bottom: 4px; }

        /* Scroll CTA */
        .lp-scroll-cta { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-top: 32px; color: var(--txm); font-size: .8rem; cursor: pointer; transition: color .3s; }
        .lp-scroll-cta:hover { color: var(--green); }

        /* Labels */
        .lb { font-size: .72rem; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: var(--green); margin-bottom: 16px; }

        /* Para quem */
        .fw { padding: 80px 0; border-top: 1px solid var(--brd); }
        .fw h2 { font-family: 'Space Grotesk', sans-serif; font-size: clamp(1.5rem,3.5vw,2.2rem); font-weight: 700; line-height: 1.25; margin-bottom: 20px; }
        .fw-text { font-size: 1rem; color: var(--tx2); max-width: 720px; line-height: 1.9; margin-bottom: 32px; }
        .fw-text p+p { margin-top: 14px; }
        .cg { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .cc { padding: 32px; border-radius: 20px; border: none; }
        .cc.prob { background: linear-gradient(135deg,#fff5f5 0%,#fee); border: 1px solid rgba(229,83,75,.12); }
        .cc.sol { background: linear-gradient(135deg,#f0fdfb 0%,#e8faf6); border: 1px solid rgba(44,211,199,.15); }
        .cc-lb { font-size: .7rem; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }
        .cc.prob .cc-lb { color: var(--red); }
        .cc.sol .cc-lb { color: var(--green); }
        .cc-lb-icon { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .75rem; font-weight: 800; }
        .cc.prob .cc-lb-icon { background: rgba(229,83,75,.12); color: var(--red); }
        .cc.sol .cc-lb-icon { background: rgba(44,211,199,.15); color: var(--green); }
        .cc-items { list-style: none; display: flex; flex-direction: column; gap: 14px; }
        .cc-items li { display: flex; align-items: flex-start; gap: 12px; font-size: .9rem; color: var(--tx2); line-height: 1.6; }
        .cc-items li .ic { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: .65rem; font-weight: 800; margin-top: 3px; }
        .cc.prob .cc-items li .ic { background: rgba(229,83,75,.1); color: var(--red); }
        .cc.sol .cc-items li .ic { background: rgba(44,211,199,.12); color: var(--green); }

        /* Modules */
        .mods { padding: 80px 0; border-top: 1px solid var(--brd); }
        .mods-hd { margin-bottom: 48px; }
        .mods-hd h2 { font-family: 'Space Grotesk', sans-serif; font-size: clamp(1.8rem,4vw,2.6rem); font-weight: 700; margin-bottom: 8px; }
        .mods-hd p { font-size: 1rem; color: var(--tx2); }
        .mg { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .mc { background: var(--bg-card); border: 1px solid var(--brd); border-radius: 16px; padding: 28px 24px 20px; display: flex; flex-direction: column; transition: all .3s; box-shadow: var(--shadow); }
        .mc:hover { box-shadow: var(--shadow-hover); transform: translateY(-2px); }
        .mn { font-size: .78rem; font-weight: 800; color: var(--green); margin-bottom: 2px; }
        .mw { font-size: .75rem; color: var(--txm); margin-bottom: 12px; }
        .mi { font-size: 1.5rem; margin-bottom: 10px; }
        .mt { font-size: 1.1rem; font-weight: 700; margin-bottom: 4px; }
        .mh { font-size: .78rem; color: var(--txm); font-weight: 500; margin-bottom: 10px; }
        .md { font-size: .88rem; color: var(--tx2); line-height: 1.7; flex: 1; }
        .mdl { margin-top: 14px; padding: 8px 12px; background: rgba(44,211,199,.08); border-left: 3px solid var(--green); border-radius: 0 8px 8px 0; font-size: .8rem; font-weight: 600; color: var(--green); }

        /* Bonus */
        .bon { padding: 60px 0; border-top: 1px solid var(--brd); }
        .bb { background: linear-gradient(135deg,#1a1a2e 0%,#0d1117 100%); border: 1px solid var(--gold); border-radius: 20px; padding: 44px 40px; position: relative; overflow: hidden; color: #e6edf3; }
        .bb::before { content: ''; position: absolute; top: -40%; right: -15%; width: 280px; height: 280px; background: radial-gradient(circle,rgba(240,200,80,.08) 0%,transparent 70%); pointer-events: none; }
        .bt { display: inline-block; padding: 5px 14px; background: linear-gradient(135deg,var(--gold),#ffe082); border-radius: 100px; font-size: .68rem; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #1a1a1a; margin-bottom: 18px; }
        .bb h3 { font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; font-weight: 700; margin-bottom: 14px; }
        .bb>p { font-size: .95rem; color: #8b949e; line-height: 1.8; max-width: 600px; margin-bottom: 20px; }
        .bb-layout { display: grid; grid-template-columns: 1fr; gap: 28px; align-items: center; }
        .bb-layout.has-img { grid-template-columns: 1fr 1fr; }
        .bb-img { width: 100%; max-height: 260px; object-fit: contain; filter: drop-shadow(0 8px 24px rgba(0,0,0,.4)); }
        .bdl { padding: 8px 14px; background: var(--gold-dim); border-left: 3px solid var(--gold); border-radius: 0 8px 8px 0; font-size: .82rem; font-weight: 600; color: var(--gold); display: inline-flex; align-items: center; gap: 8px; }

        /* Pricing */
        .pri { padding: 80px 0; border-top: 1px solid var(--brd); text-align: center; }
        .pri h2 { font-family: 'Space Grotesk', sans-serif; font-size: clamp(1.4rem,3vw,2rem); font-weight: 700; margin-bottom: 8px; }
        .pri-sub { font-size: .95rem; color: var(--tx2); margin-bottom: 40px; }
        .pc { display: inline-block; background: var(--bg-card); border: 2px solid var(--ac); border-radius: 20px; padding: 44px 56px; position: relative; box-shadow: var(--shadow-hover); }
        .pp-n { font-size: .88rem; color: var(--tx2); margin-bottom: 4px; }
        .pp { font-family: 'Space Grotesk', sans-serif; font-size: 3rem; font-weight: 700; line-height: 1; margin-bottom: 4px; color: var(--tx); }
        .pp .x { font-size: 1.3rem; color: var(--tx2); margin-right: 4px; }
        .pp .cr { font-size: 1.3rem; vertical-align: top; margin-right: 2px; }
        .pp-t { font-size: .78rem; color: var(--txm); margin-bottom: 20px; }
        .pdv { border: none; border-top: 1px solid var(--brd); margin: 20px 0; }
        .pa-n { font-size: .85rem; color: var(--tx2); margin-bottom: 6px; }
        .pa { font-family: 'Space Grotesk', sans-serif; font-size: 2rem; font-weight: 700; color: var(--green); margin-bottom: 6px; }
        .po { display: inline-block; padding: 4px 14px; background: rgba(44,211,199,.1); border: 1px solid var(--green); border-radius: 100px; font-size: .75rem; font-weight: 700; color: var(--green); margin-bottom: 24px; }
        .pl { text-align: left; border-top: 1px solid var(--brd); padding-top: 20px; list-style: none; font-size: .86rem; color: var(--tx2); line-height: 2.1; }
        .pl li { padding-left: 20px; position: relative; }
        .pl li::before { content: '✓'; position: absolute; left: 0; color: var(--green); font-weight: 700; }

        /* Social Proof */
        .soc { padding: 80px 0; border-top: 1px solid var(--brd); }
        .soc-hd { text-align: center; margin-bottom: 48px; }
        .soc-hd h2 { font-family: 'Space Grotesk', sans-serif; font-size: clamp(1.5rem,3.5vw,2.2rem); font-weight: 700; margin-bottom: 6px; }
        .soc-hd .nx { font-size: clamp(1.4rem, 3.5vw, 2rem); font-weight: 700; color: var(--tx); }
        .ar { display: grid; grid-template-columns: repeat(4,1fr); gap: 20px; margin-bottom: 48px; }
        @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
        .al { background: var(--bg-card); border: 1px solid var(--brd); border-radius: 20px; overflow: hidden; position: relative; transition: all .35s cubic-bezier(.22,.68,0,1.2); opacity: 0; transform: translateY(30px); animation: fadeUp .6s ease forwards; box-shadow: var(--shadow); }
        .al:nth-child(1) { animation-delay: .1s; }
        .al:nth-child(2) { animation-delay: .2s; }
        .al:nth-child(3) { animation-delay: .3s; }
        .al:nth-child(4) { animation-delay: .4s; }
        .al:hover { transform: translateY(-6px); box-shadow: var(--shadow-hover); }
        .al-img-wrap { width: 100%; aspect-ratio: 1/1; position: relative; overflow: hidden; }
        .al-img-wrap img { width: 100%; height: 100%; object-fit: cover; object-position: top center; display: block; transition: transform .5s ease; }
        .al:hover .al-img-wrap img { transform: scale(1.04); }
        .al-img-wrap::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 40%; background: linear-gradient(to top,var(--bg-card) 0%,transparent 100%); pointer-events: none; }
        .al-placeholder { width: 100%; aspect-ratio: 1/1; display: flex; align-items: center; justify-content: center; font-size: 3rem; font-weight: 800; color: rgba(0,0,0,.06); background: linear-gradient(135deg,#eee 0%,#e2e2e2 100%); letter-spacing: -.03em; }
        .al-body { padding: 20px 22px 26px; }
        .al-n { font-size: 1.1rem; font-weight: 700; letter-spacing: -.02em; margin-bottom: 14px; line-height: 1.2; color: var(--tx); }
        .al-platforms { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }
        .al-platform { display: flex; align-items: center; gap: 10px; font-size: .82rem; color: var(--tx2); font-weight: 500; text-decoration: none; transition: color .2s; }
        a.al-platform:hover { color: var(--green); }
        .al-platform-icon { width: 18px; height: 18px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .al-platform-icon svg { width: 16px; height: 16px; }
        .al-platform-count { font-weight: 700; color: var(--tx); margin-left: auto; font-variant-numeric: tabular-nums; }
        .al-divider { height: 1px; background: linear-gradient(90deg,transparent,var(--brd),var(--brd),transparent); margin-bottom: 16px; }
        .al-total-row { display: flex; align-items: baseline; justify-content: space-between; }
        .al-total-label { font-size: .7rem; font-weight: 600; text-transform: uppercase; letter-spacing: .12em; color: var(--tx2); }
        .al-total-num { font-family: 'Space Grotesk', monospace; font-size: 1.6rem; font-weight: 700; color: var(--green); line-height: 1; }
        .sr { display: flex; justify-content: center; gap: 56px; flex-wrap: wrap; }
        .st { text-align: center; }
        .st-n { font-family: 'Space Grotesk', sans-serif; font-size: 2.2rem; font-weight: 700; color: var(--tx); line-height: 1; margin-bottom: 4px; }
        .st-l { font-size: .82rem; color: var(--txm); font-weight: 500; }

        /* Form */
        .su { padding: 80px 0 100px; border-top: 1px solid var(--brd); }
        .su-w { max-width: 480px; margin: 0 auto; text-align: center; }
        .su h2 { font-family: 'Space Grotesk', sans-serif; font-size: 1.6rem; font-weight: 700; margin-bottom: 8px; }
        .su-sub { font-size: .92rem; color: var(--tx2); margin-bottom: 32px; }
        .fd { margin-bottom: 14px; }
        .fd input { width: 100%; padding: 14px 18px; background: var(--bg-card); border: 1px solid var(--brd); border-radius: 12px; color: var(--tx); font-family: 'DM Sans', sans-serif; font-size: .92rem; outline: none; transition: border-color .3s; box-shadow: var(--shadow); }
        .fd input::placeholder { color: var(--txm); }
        .fd input:focus { border-color: var(--ac); }
        .tq { font-size: .88rem; color: var(--tx2); margin-bottom: 10px; text-align: left; font-weight: 500; }
        .tr { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 24px; }
        .tb { padding: 12px; background: var(--bg-card); border: 1px solid var(--brd); border-radius: 12px; text-align: center; cursor: pointer; transition: all .3s; font-size: .88rem; color: var(--tx2); font-weight: 500; box-shadow: var(--shadow); font-family: 'DM Sans', sans-serif; }
        .tb:hover, .tb.a { border-color: var(--ac); color: var(--ac); background: rgba(13,17,23,.04); }
        .tb .ti { display: block; font-size: 1.2rem; margin-bottom: 4px; }
        .cbtn { width: 100%; padding: 16px; background: var(--ac); color: #fff; border: none; border-radius: 12px; font-family: 'DM Sans', sans-serif; font-size: 1rem; font-weight: 700; cursor: pointer; letter-spacing: .5px; transition: all .3s; box-shadow: 0 4px 14px rgba(13,17,23,.2); }
        .cbtn:hover { opacity: .9; transform: translateY(-1px); }
        .cbtn:disabled { opacity: .5; cursor: not-allowed; transform: none; }
        .disc { margin-top: 12px; font-size: .75rem; color: var(--txm); }

        /* Footer */
        .ft { padding: 28px 0; border-top: 1px solid var(--brd); text-align: center; font-size: .8rem; color: var(--txm); }

        /* Floating CTA */
        .fc { position: fixed; bottom: 0; left: 0; right: 0; background: rgba(255,255,255,.92); backdrop-filter: blur(16px); border-top: 1px solid var(--brd); padding: 12px 24px; display: flex; justify-content: center; align-items: center; gap: 20px; z-index: 100; transform: translateY(100%); transition: transform .4s; box-shadow: 0 -4px 20px rgba(0,0,0,.06); }
        .fc.sh { transform: translateY(0); }
        .fc-t { font-size: .88rem; color: var(--tx2); }
        .fc-t strong { color: var(--tx); }
        .fc-b { padding: 10px 24px; background: var(--ac); color: #fff; border: none; border-radius: 100px; font-family: 'DM Sans', sans-serif; font-size: .85rem; font-weight: 700; text-decoration: none; letter-spacing: .5px; white-space: nowrap; transition: opacity .3s; cursor: pointer; }
        .fc-b:hover { opacity: .85; }

        @media(max-width:768px) { .hero-layout { grid-template-columns: 1fr; gap: 16px; } .hero-img-col { order: -1; } .hero-img { height: auto; max-height: 320px; } .badge { margin-bottom: 12px; } .cg,.mg { grid-template-columns: 1fr; } .ar { grid-template-columns: 1fr 1fr; } .sr { gap: 32px; } .pc { padding: 32px 28px; } .bb { padding: 28px 22px; } .bb-layout.has-img { grid-template-columns: 1fr; } .bb-layout.has-img .bb-img-wrap { order: -1; } .fc { flex-direction: column; gap: 8px; padding: 10px 18px; } .hero { padding: 20px 0 32px; } .c { padding: 0 20px; } }
      `}</style>

      <div>
        {/* Nav */}
        <nav className="c"><div className="nav">
          <img src="/icon.webp" alt="OZI" className="nav-logo" />
          <button onClick={scrollToForm} className="nav-cta">Reservar Vaga</button>
        </div></nav>

        {/* Hero */}
        <section className="hero" ref={heroRef}><div className="c">
          <span className="badge">Curso Presencial</span>
          <div className="hero-layout"><div>
          <h1 dangerouslySetInnerHTML={{ __html: data.hero.headline || data.curso.nome }} />
          {data.hero.subheadline && <p className="hero-sub">{data.hero.subheadline}</p>}
          <div className="hero-meta">
            {totalHoras > 0 && <span className="tag">⏱ {totalHoras} horas</span>}
            <span className="tag">📍 {data.unidade.cidade || data.unidade.nome}</span>
            <span className="tag">👥 Turma de 20</span>
            {totalSemanas > 0 && <span className="tag">📅 {totalSemanas} semana{totalSemanas > 1 ? 's' : ''} · {horasPorDia}h/dia</span>}
          </div>
        </div>
        <div className="hero-img-col">
          {(data.hero.image_url || data.curso.imagem_url) ? (
            <img src={data.hero.image_url || data.curso.imagem_url!} alt={data.curso.nome} className="hero-img" />
          ) : (
            <div className="hero-ph">
              <span className="ph-i">📸</span>
              <span className="ph-l">Banner do curso ou foto do estúdio</span>
            </div>
          )}
        </div>
        </div>
        <div className="lp-scroll-cta" onClick={scrollToForm}>
          <span>Saiba mais</span>
          <ChevronDown className="h-5 w-5" style={{ animation: 'bounce 2s infinite' }} />
        </div>
        </div></section>

        {/* Para quem é */}
        {hasParaQuem && (
          <section className="fw"><div className="c">
            <p className="lb">Para quem é esse curso</p>
            {data.para_quem.headline && <h2 dangerouslySetInnerHTML={{ __html: data.para_quem.headline }} />}
            {data.para_quem.texto && (
              <div className="fw-text">
                {data.para_quem.texto.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
              </div>
            )}
            {(data.para_quem.sem_curso_items.length > 0 || data.para_quem.com_curso_items.length > 0) && (
              <div className="cg">
                {data.para_quem.sem_curso_items.length > 0 && (
                  <div className="cc prob">
                    <p className="cc-lb"><span className="cc-lb-icon">✕</span>Sem o curso</p>
                    <ul className="cc-items">
                      {data.para_quem.sem_curso_items.map((item, i) => (
                        <li key={i}><span className="ic">✕</span>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.para_quem.com_curso_items.length > 0 && (
                  <div className="cc sol">
                    <p className="cc-lb"><span className="cc-lb-icon">✓</span>Com o curso</p>
                    <ul className="cc-items">
                      {data.para_quem.com_curso_items.map((item, i) => (
                        <li key={i}><span className="ic">✓</span>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div></section>
        )}

        {/* Módulos */}
        {modulos.length > 0 && (
          <section className="mods" id="modulos"><div className="c">
            <div className="mods-hd">
              <p className="lb">O curso</p>
              <h2>{modulos.length} módulos. {totalHoras > 0 && <span className="hl">{totalHoras} horas.</span>}</h2>
              <p>{totalSemanas > 0 ? `${totalSemanas} semana${totalSemanas > 1 ? 's' : ''} presenciais (seg-sex, ${horasPorDia}h/dia).` : ''} Cada módulo entrega um resultado concreto.</p>
            </div>
            <div className="mg">
              {modulos.map((m, i) => (
                <div key={m.id} className="mc">
                  <span className="mn">{String(i + 1).padStart(2, '0')}</span>
                  {m.semana && <span className="mw">{m.semana}</span>}
                  <div className="mi">{m.icone || '📚'}</div>
                  <h3 className="mt">{m.titulo}</h3>
                  {m.duracao_horas > 0 && <span className="mh">{m.duracao_horas} horas</span>}
                  {m.descricao && <p className="md">{m.descricao}</p>}
                  {m.entrega && <div className="mdl">{m.entrega}</div>}
                </div>
              ))}
            </div>
          </div></section>
        )}

        {/* Bônus */}
        {hasBonus && (
          <section className="bon"><div className="c"><div className="bb">
            <div className={`bb-layout ${data.bonus.image_url ? 'has-img' : ''}`}>
              <div>
                <span className="bt">Bônus Exclusivo</span>
                <h3>{data.bonus.titulo}</h3>
                {data.bonus.descricao && <p>{data.bonus.descricao}</p>}
                {data.bonus.entrega && <div className="bdl">{data.bonus.entrega}</div>}
              </div>
              {data.bonus.image_url && (
                <div className="bb-img-wrap">
                  <img src={data.bonus.image_url} alt={data.bonus.titulo || 'Bônus'} className="bb-img" />
                </div>
              )}
            </div>
          </div></div></section>
        )}

        {/* Investimento */}
        {hasInvestimento && (
          <section className="pri" id="preco"><div className="c">
            <p className="lb" style={{ textAlign: 'center' }}>Investimento</p>
            {data.investimento.headline && <h2>{data.investimento.headline}</h2>}
            {data.investimento.descricao && <p className="pri-sub">{data.investimento.descricao}</p>}
            <div className="pc">
              <p className="pp-n">No cartão em até</p>
              <div className="pp">
                <span className="x">{data.investimento.parcelas}x</span>
                <span className="cr">R$</span>
                {data.investimento.valor_parcela?.toFixed(2).replace('.', ',')}
              </div>
              <hr className="pdv" />
              {data.investimento.desconto && (
                <>
                  <p className="pa-n">Ou à vista com</p>
                  <div className="pa">{data.investimento.desconto}</div>
                </>
              )}
              {data.investimento.items.length > 0 && (
                <ul className="pl">
                  {data.investimento.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          </div></section>
        )}

        {/* Social Proof */}
        {hasSocialProof && (
          <section className="soc"><div className="c">
            <div className="soc-hd">
              <p className="lb">Quem já passou por aqui</p>
              <h2>{data.social_proof.headline1 || <>Grandes nomes já passaram pela <span className="hl">OZI.</span></>}</h2>
              <p className="nx">{data.social_proof.headline2 || 'Quem sabe você não é o próximo.'}</p>
            </div>
            <div className="ar">
              {data.social_proof.items.map((a) => {
                const initials = a.nome.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div key={a.id} className="al">
                    {a.foto_url ? (
                      <div className="al-img-wrap"><img src={a.foto_url} alt={a.nome} /></div>
                    ) : (
                      <div className="al-placeholder">{initials}</div>
                    )}
                    <div className="al-body">
                      <div className="al-n">{a.nome}</div>
                      <div className="al-platforms">
                        {(a.metricas || []).map((s, j) => {
                          const pl = s.platform.toLowerCase();
                          const isYt = pl.includes('youtube');
                          const isIg = pl.includes('instagram');
                          const iconColor = isYt ? '#ff4444' : isIg ? '#e040a0' : 'var(--tx2)';
                          const Tag = s.url ? 'a' : 'div';
                          const linkProps = s.url ? { href: s.url, target: '_blank', rel: 'noopener noreferrer' } : {};
                          return (
                            <Tag key={j} className="al-platform" {...linkProps}>
                              <span className="al-platform-icon">
                                {isYt ? (
                                  <svg viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17"/>
                                    <path d="m10 15 5-3-5-3z"/>
                                  </svg>
                                ) : isIg ? (
                                  <svg viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                                    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                                  </svg>
                                ) : null}
                              </span>
                              {s.platform}
                              <span className="al-platform-count">{s.value}</span>
                            </Tag>
                          );
                        })}
                      </div>
                      {a.total_seguidores && (
                        <>
                          <div className="al-divider" />
                          <div className="al-total-row">
                            <span className="al-total-label">Total seguidores</span>
                            <span className="al-total-num">{a.total_seguidores}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="sr">
              {SOCIAL_PROOF_STATS.map((s, i) => (
                <div key={i} className="st">
                  <div className="st-n">{s.value}</div>
                  <div className="st-l">{s.label}</div>
                </div>
              ))}
            </div>
          </div></section>
        )}

        {/* Cadastro */}
        <section className="su" id="cadastro" ref={formSectionRef}><div className="c"><div className="su-w">
          <p className="lb">Lista de Espera</p>
          <h2>Garanta sua vaga na próxima turma</h2>
          <p className="su-sub">Preencha seus dados e nossa equipe entrará em contato pelo WhatsApp com todos os detalhes.</p>
          <form onSubmit={handleSubmit}>
            <div className="fd"><input type="text" placeholder="Seu nome completo" value={nome} onChange={e => setNome(e.target.value)} required /></div>
            <div className="fd"><input type="tel" placeholder="WhatsApp (11) 99999-9999" value={whatsapp} onChange={e => setWhatsapp(formatWhatsapp(e.target.value))} required /></div>
            <p className="tq">Qual horário prefere?</p>
            <div className="tr">
              <button type="button" className={`tb ${periods.includes('manha') ? 'a' : ''}`} onClick={() => togglePeriod('manha')}>
                <span className="ti">☀️</span>Manhã
              </button>
              <button type="button" className={`tb ${periods.includes('tarde') ? 'a' : ''}`} onClick={() => togglePeriod('tarde')}>
                <span className="ti">🌤️</span>Tarde
              </button>
              <button type="button" className={`tb ${periods.includes('noite') ? 'a' : ''}`} onClick={() => togglePeriod('noite')}>
                <span className="ti">🌙</span>Noite
              </button>
            </div>
            <button type="submit" className="cbtn" disabled={submitting || !nome.trim() || !whatsapp.trim() || periods.length === 0}>
              {submitting ? 'Cadastrando...' : 'Quero garantir minha vaga'}
            </button>
            <p className="disc">Ao se cadastrar, você receberá informações sobre o curso pelo WhatsApp.</p>
          </form>
        </div></div></section>

        {/* Footer */}
        <footer className="ft"><div className="c">OZI Educação LTDA · Brasília / São Paulo · Desde 2003</div></footer>

        {/* Floating CTA */}
        {hasInvestimento && (
          <div className={`fc ${showFloating ? 'sh' : ''}`}>
            <span className="fc-t">
              <strong>{data.investimento.parcelas}x de R$ {data.investimento.valor_parcela?.toFixed(2).replace('.', ',')}</strong>
              {data.investimento.desconto && <> ou à vista com {data.investimento.desconto}</>}
            </span>
            <button onClick={scrollToForm} className="fc-b">Reservar Vaga</button>
          </div>
        )}
      </div>
    </>
  );
}
