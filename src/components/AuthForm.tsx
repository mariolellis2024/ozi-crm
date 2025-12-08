import React from 'react';
import { Mail, Lock, User } from 'lucide-react';
import { InputField } from './InputField';
import { LoadingButton } from './LoadingButton';

interface AuthFormProps {
  isSignUp: boolean;
  isLoading: boolean;
  email: string;
  password: string;
  name?: string;
  confirmPassword?: string;
  onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNameChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onConfirmPasswordChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggleMode: () => void;
}

export function AuthForm({
  isSignUp,
  isLoading,
  email,
  password,
  name = '',
  confirmPassword = '',
  onEmailChange,
  onPasswordChange,
  onNameChange,
  onConfirmPasswordChange,
  onSubmit,
  onToggleMode,
}: AuthFormProps) {
  return (
    <form className="mt-8 space-y-6" onSubmit={onSubmit}>
      <div className="space-y-4">
        {isSignUp && (
          <InputField
            id="name"
            type="text"
            label="Nome completo"
            value={name}
            onChange={onNameChange!}
            icon={<User className="h-5 w-5 text-gray-400" />}
          />
        )}

        <InputField
          id="email"
          type="email"
          label="E-mail"
          value={email}
          onChange={onEmailChange}
          icon={<Mail className="h-5 w-5 text-gray-400" />}
        />

        <InputField
          id="password"
          type="password"
          label="Senha"
          value={password}
          onChange={onPasswordChange}
          icon={<Lock className="h-5 w-5 text-gray-400" />}
        />

        {isSignUp && (
          <InputField
            id="confirmPassword"
            type="password"
            label="Confirmar senha"
            value={confirmPassword}
            onChange={onConfirmPasswordChange!}
            icon={<Lock className="h-5 w-5 text-gray-400" />}
          />
        )}
      </div>

      <LoadingButton isLoading={isLoading} text={isSignUp ? 'Criar conta' : 'Entrar'} />

      <div className="text-center">
        <button
          type="button"
          onClick={onToggleMode}
          className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
        >
          {isSignUp ? 'Já tem uma conta? Entrar' : 'Não tem uma conta? Criar'}
        </button>
      </div>
    </form>
  );
}