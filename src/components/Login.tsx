import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Conta criada com sucesso!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success('Login realizado com sucesso!');
      }
      navigate('/');
    } catch (error: any) {
      console.error('Auth error:', error);
      if (error.message?.includes('Failed to fetch')) {
        toast.error('Erro de conexão com o servidor. Verifique sua conexão com a internet e as configurações do Supabase.');
      } else {
        toast.error(error.message || 'Erro ao realizar operação. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Linhas orgânicas SVG */}
      <div className="organic-line">
        <svg viewBox="0 0 1600 800" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{stopColor: 'rgba(255, 255, 255, 0)', stopOpacity: 0}} />
              <stop offset="20%" style={{stopColor: 'rgba(255, 255, 255, 0.3)', stopOpacity: 1}} />
              <stop offset="80%" style={{stopColor: 'rgba(255, 255, 255, 0.3)', stopOpacity: 1}} />
              <stop offset="100%" style={{stopColor: 'rgba(255, 255, 255, 0)', stopOpacity: 0}} />
            </linearGradient>
          </defs>
          <path d="M -100,300 Q 200,200 400,300 T 800,300 T 1200,300 T 1700,300" />
        </svg>
      </div>
      
      <div className="organic-line">
        <svg viewBox="0 0 1600 800" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{stopColor: 'rgba(255, 255, 255, 0)', stopOpacity: 0}} />
              <stop offset="15%" style={{stopColor: 'rgba(255, 255, 255, 0.25)', stopOpacity: 1}} />
              <stop offset="85%" style={{stopColor: 'rgba(255, 255, 255, 0.25)', stopOpacity: 1}} />
              <stop offset="100%" style={{stopColor: 'rgba(255, 255, 255, 0)', stopOpacity: 0}} />
            </linearGradient>
          </defs>
          <path d="M -100,500 Q 300,400 600,500 T 1200,500 T 1900,500" />
        </svg>
      </div>
      
      <div className="organic-line">
        <svg viewBox="0 0 1600 800" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{stopColor: 'rgba(255, 255, 255, 0)', stopOpacity: 0}} />
              <stop offset="25%" style={{stopColor: 'rgba(255, 255, 255, 0.2)', stopOpacity: 1}} />
              <stop offset="75%" style={{stopColor: 'rgba(255, 255, 255, 0.2)', stopOpacity: 1}} />
              <stop offset="100%" style={{stopColor: 'rgba(255, 255, 255, 0)', stopOpacity: 0}} />
            </linearGradient>
          </defs>
          <path d="M -100,100 Q 400,50 800,100 T 1700,100" />
        </svg>
      </div>

      {/* Partículas orgânicas */}
      <div className="organic-particle"></div>
      <div className="organic-particle"></div>
      <div className="organic-particle"></div>
      <div className="organic-particle"></div>
      <div className="organic-particle"></div>

      <div className="content-area flex items-center justify-center">
        <div className="metric-card max-w-md w-full">
          <div className="text-center mb-8">
            <div className="prisma-icon mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="prismaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor: '#4299e1', stopOpacity: 1}} />
                    <stop offset="50%" style={{stopColor: '#63b3ed', stopOpacity: 1}} />
                    <stop offset="100%" style={{stopColor: '#90cdf4', stopOpacity: 1}} />
                  </linearGradient>
                </defs>
                <path fillRule="evenodd" clipRule="evenodd" d="M4.00341 15.7279C3.79994 15.4069 3.79686 14.9982 3.99548 14.6741L11.4738 2.47545C11.8898 1.79696 12.8941 1.85628 13.2273 2.57901L20.0591 17.3988C20.3126 17.9487 20.0208 18.5957 19.4408 18.7697L8.81343 21.9579C8.38584 22.0862 7.92513 21.9143 7.68611 21.5372L4.00341 15.7279ZM12.3367 6.04224C12.4087 5.68338 12.9004 5.63163 13.0456 5.96762L17.7581 16.8721C17.8468 17.0774 17.7364 17.3142 17.5221 17.3781L10.1794 19.57C9.9095 19.6506 9.65096 19.4147 9.70642 19.1386L12.3367 6.04224Z"/>
              </svg>
            </div>
            <h2 className="metric-value text-2xl mb-2">
              {isSignUp ? 'Crie sua conta' : 'Pepper Heads CRM'}
            </h2>
            <p className="metric-subtitle">
              {isSignUp ? 'Comece sua jornada conosco' : 'Faça login na sua conta'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors"
                placeholder="E-mail"
                required
              />
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors"
                placeholder="Senha"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="start-consultation-btn w-full justify-center"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <span>{isSignUp ? 'Criar conta' : 'Entrar'}</span>
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-blue-400 hover:text-blue-300 transition-colors text-sm"
              >
                {isSignUp ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Cadastre-se'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}