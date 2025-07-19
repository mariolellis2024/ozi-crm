import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { AuthForm } from './AuthForm';
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
      navigate('/'); // Redirect to home page after successful login/signup
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
    <div className="min-h-screen bg-dark flex items-center justify-center p-4 fade-in">
      <div className="max-w-md w-full space-y-8 bg-dark-card p-8 rounded-2xl scale-in hover-lift">
        <div className="text-center scale-in-delay-1">
          <img src="/favicon.webp" alt="Pepper Heads Logo" className="mx-auto h-12 w-12 rounded" />
          <h2 className="mt-6 text-3xl font-bold text-white">
            {isSignUp ? 'Crie sua conta' : 'Pepper Heads CRM'}
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            {isSignUp ? 'Comece sua jornada conosco' : 'Faça login na sua conta'}
          </p>
        </div>

        <div className="scale-in-delay-2">
            <linearGradient id="gradient2-light" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" style={{stopColor: 'rgba(66, 153, 225, 0)', stopOpacity: 0}} />
              <stop offset="15%" style={{stopColor: 'rgba(66, 153, 225, 0.35)', stopOpacity: 1}} />
              <stop offset="85%" style={{stopColor: 'rgba(66, 153, 225, 0.35)', stopOpacity: 1}} />
              <stop offset="100%" style={{stopColor: 'rgba(66, 153, 225, 0)', stopOpacity: 0}} />
            </linearGradient>
          <AuthForm
          isSignUp={isSignUp}
          isLoading={isLoading}
          email={email}
          password={password}
          onEmailChange={(e) => setEmail(e.target.value)}
          onPasswordChange={(e) => setPassword(e.target.value)}
          onSubmit={handleSubmit}
  )
}