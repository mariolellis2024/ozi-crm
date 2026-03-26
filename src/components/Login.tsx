import React, { useState } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import { InputField } from './InputField';
import { LoadingButton } from './LoadingButton';

export function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await api.login(email, password);
      toast.success('Login realizado com sucesso!');
      navigate('/');
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || 'Erro ao realizar login. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center p-4 fade-in">
      <div className="max-w-md w-full space-y-8 bg-dark-card p-8 rounded-2xl scale-in hover-lift">
        <div className="text-center scale-in-delay-1">
          <img src="/icon.webp" alt="OZI CRM Logo" className="mx-auto w-[44%] h-auto rounded" />
          <p className="mt-2 text-sm text-gray-400">
            Faça login na sua conta
          </p>
        </div>

        <form className="mt-8 space-y-6 scale-in-delay-2" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <InputField
              id="email"
              type="email"
              label="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="h-5 w-5 text-gray-400" />}
            />

            <InputField
              id="password"
              type="password"
              label="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="h-5 w-5 text-gray-400" />}
            />
          </div>

          <LoadingButton isLoading={isLoading} text="Entrar" />
        </form>
      </div>
    </div>
  );
}