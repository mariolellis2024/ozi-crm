import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingButtonProps {
  isLoading: boolean;
  text: string;
}

export function LoadingButton({ isLoading, text }: LoadingButtonProps) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-dark bg-teal-accent hover:bg-teal-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover-glow"
    >
      {isLoading ? (
        <Loader2 className="animate-spin h-5 w-5" />
      ) : (
        <span>{text}</span>
      )}
    </button>
  );
}