import React from 'react';
import { Mail, Lock } from 'lucide-react';
import { InputField } from './InputField';
import { LoadingButton } from './LoadingButton';

interface AuthFormProps {
  isSignUp: boolean;
  isLoading: boolean;
  email: string;
  password: string;
  onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onToggleMode: () => void;
}

export function AuthForm({
  isSignUp,
  isLoading,
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  onToggleMode,
}: AuthFormProps) {
  return (
    <form className="mt-8 space-y-6" onSubmit={onSubmit}>
      <div className="space-y-4">
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
      </div>

      <LoadingButton isLoading={isLoading} text={isSignUp ? 'Criar conta' : 'Entrar'} />

    </form>
  );
}