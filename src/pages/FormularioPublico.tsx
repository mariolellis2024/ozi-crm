import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { OrganicBackground } from '../components/OrganicBackground';
import { CheckCircle, Loader2, Clock, Sun, Moon } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

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
}

type Period = 'manha' | 'tarde' | 'noite';

export function FormularioPublico() {
  const { slug } = useParams<{ slug: string }>();
  const [formInfo, setFormInfo] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [periods, setPeriods] = useState<Period[]>([]);

  useEffect(() => {
    loadForm();
  }, [slug]);

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
      // Meta Pixel
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

      // Google Analytics
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

    // Defer tracking to after browser is idle — avoids blocking first render
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(inject);
    } else {
      setTimeout(inject, 1);
    }
  }

  function togglePeriod(p: Period) {
    setPeriods(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  }

  function formatWhatsapp(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !whatsapp.trim()) return;
    if (periods.length === 0) return;

    setSubmitting(true);
    try {
      // Read Meta cookies for CAPI matching (fbc = click ID, fbp = browser ID)
      const getCookie = (name: string) => {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? match[2] : '';
      };

      let fbc = getCookie('_fbc');
      const fbp = getCookie('_fbp');

      // If _fbc cookie doesn't exist but fbclid is in URL, construct it
      if (!fbc) {
        const urlParams = new URLSearchParams(window.location.search);
        const fbclid = urlParams.get('fbclid');
        if (fbclid) {
          fbc = `fb.1.${Date.now()}.${fbclid}`;
        }
      }

      const response = await fetch(`/api/public/forms/${slug}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          whatsapp: whatsapp.replace(/\D/g, ''),
          available_periods: periods,
          fbc,
          fbp
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao cadastrar');
      }

      // Fire client-side conversion events
      try {
        if ((window as any).fbq) {
          (window as any).fbq('track', 'Lead');
        }
        if ((window as any).gtag) {
          (window as any).gtag('event', 'generate_lead', {
            currency: 'BRL',
            value: formInfo?.curso.preco || 0
          });
        }
      } catch { /* tracking errors should not block UX */ }

      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cadastrar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center relative">
        <OrganicBackground />
        <div className="relative z-10">
          <Loader2 className="h-10 w-10 text-teal-accent animate-spin" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !formInfo) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center relative p-4">
        <OrganicBackground />
        <div className="relative z-10 text-center">
          <div className="text-6xl mb-4">😔</div>
          <h1 className="text-2xl font-bold text-white mb-2">Formulário não encontrado</h1>
          <p className="text-gray-400">{error || 'Este link não é válido ou o formulário foi desativado.'}</p>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center relative p-4">
        <OrganicBackground />
        <div className="relative z-10 text-center max-w-md mx-auto">
          <div className="mb-6">
            <CheckCircle className="h-20 w-20 text-teal-accent mx-auto animate-bounce" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Você está na lista! 🎉</h1>
          <p className="text-gray-300 text-lg mb-2">
            Seu interesse no curso <strong className="text-teal-accent">{formInfo.curso.nome}</strong> foi registrado.
          </p>
          <p className="text-gray-400">
            Entraremos em contato pelo WhatsApp assim que a turma estiver confirmada.
          </p>
          <div className="mt-8 py-3 px-6 rounded-full bg-dark-card/80 inline-block">
            <span className="text-gray-400 text-sm">📍 {formInfo.unidade.nome}</span>
          </div>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-screen bg-dark relative">
      <Toaster position="top-center" />
      <OrganicBackground />

      <div className="relative z-10 max-w-lg mx-auto px-4 py-8">
        {/* Logo */}
        <div className="text-center mb-6">
          <img
            src="/icon.webp"
            alt="OZI"
            className="h-12 mx-auto"
          />
        </div>

        {/* Hero Image */}
        {formInfo.curso.imagem_url && (
          <div className="mb-6 rounded-2xl overflow-hidden">
            <img
              src={formInfo.curso.imagem_url}
              alt={formInfo.curso.nome}
              width={512}
              height={256}
              className="w-full h-52 sm:h-64 object-cover"
            />
          </div>
        )}

        {/* Course Info */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            {formInfo.titulo}
          </h1>
          {formInfo.descricao && (
            <p className="text-gray-400 text-sm sm:text-base">{formInfo.descricao}</p>
          )}
          <div className="flex items-center justify-center gap-4 mt-3 text-sm text-gray-400">
            {formInfo.curso.carga_horaria > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> {formInfo.curso.carga_horaria}h
              </span>
            )}
            <span className="flex items-center gap-1">
              📍 {formInfo.unidade.nome}
            </span>
          </div>
        </div>

        {/* CTA Text */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-semibold text-teal-accent">
            Entre na Lista de Espera
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Garanta sua vaga quando a próxima turma abrir
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome completo"
              required
              className="w-full bg-white/5 backdrop-blur-sm border border-white/10 text-white px-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-accent/50 focus:border-teal-accent/50 placeholder-gray-500 text-base"
            />
          </div>

          <div>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(formatWhatsapp(e.target.value))}
              placeholder="WhatsApp (11) 99999-9999"
              required
              className="w-full bg-white/5 backdrop-blur-sm border border-white/10 text-white px-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-accent/50 focus:border-teal-accent/50 placeholder-gray-500 text-base"
            />
          </div>

          {/* Period Selection */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Qual horário você prefere?
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([
                { key: 'manha' as Period, label: 'Manhã', icon: Sun, color: 'amber' },
                { key: 'tarde' as Period, label: 'Tarde', icon: Sun, color: 'orange' },
                { key: 'noite' as Period, label: 'Noite', icon: Moon, color: 'indigo' },
              ]).map(({ key, label, icon: Icon }) => {
                const selected = periods.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePeriod(key)}
                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border transition-all duration-200 ${
                      selected
                        ? 'bg-teal-accent/10 border-teal-accent/50 text-teal-accent'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !nome.trim() || !whatsapp.trim() || periods.length === 0}
            className="w-full bg-teal-accent text-dark font-bold py-4 rounded-xl text-lg hover:bg-teal-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-glow hover:shadow-glow-intense"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Cadastrando...
              </span>
            ) : (
              'Quero entrar na Lista de Espera'
            )}
          </button>

          <p className="text-center text-xs text-gray-500 mt-2">
            Ao se cadastrar, você receberá informações sobre o curso pelo WhatsApp.
          </p>
        </form>
      </div>
    </div>
  );
}
