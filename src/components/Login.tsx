import React, { useState } from 'react';
import { api } from '../lib/api';
import toast from 'react-hot-toast';
import { AuthForm } from './AuthForm';
import { useNavigate } from 'react-router-dom';

export function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim()) {
          toast.error('Por favor, digite seu nome completo');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          toast.error('As senhas não correspondem');
          setIsLoading(false);
          return;
        }
        if (password.length < 6) {
          toast.error('A senha deve ter no mínimo 6 caracteres');
          setIsLoading(false);
          return;
        }

        await api.signup(email, password, name);
        toast.success('Conta criada com sucesso!');
        setName('');
        setConfirmPassword('');
        setIsSignUp(false);
      } else {
        await api.login(email, password);
        toast.success('Login realizado com sucesso!');
        navigate('/');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error(error.message || 'Erro ao realizar operação. Tente novamente.');
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
            {isSignUp ? 'Comece sua jornada conosco' : 'Faça login na sua conta'}
          </p>
        </div>

        <div className="scale-in-delay-2">
          <AuthForm
          isSignUp={isSignUp}
          isLoading={isLoading}
          email={email}
          password={password}
          name={name}
          confirmPassword={confirmPassword}
          onEmailChange={(e) => setEmail(e.target.value)}
          onPasswordChange={(e) => setPassword(e.target.value)}
          onNameChange={(e) => setName(e.target.value)}
          onConfirmPasswordChange={(e) => setConfirmPassword(e.target.value)}
          onSubmit={handleSubmit}
          onToggleMode={() => setIsSignUp(!isSignUp)}
          />
        </div>
      </div>
    </div>
  );
}