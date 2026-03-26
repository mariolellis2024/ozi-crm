import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

interface Unidade {
  id: string;
  nome: string;
  cidade?: string;
}

interface UnidadeContextType {
  unidades: Unidade[];
  selectedUnidadeId: string; // '' = todas
  setSelectedUnidadeId: (id: string) => void;
  selectedUnidade: Unidade | null;
  queryParam: string; // '?unidade_id=xxx' or ''
}

const UnidadeContext = createContext<UnidadeContextType>({
  unidades: [],
  selectedUnidadeId: '',
  setSelectedUnidadeId: () => {},
  selectedUnidade: null,
  queryParam: '',
});

export function UnidadeProvider({ children }: { children: React.ReactNode }) {
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [selectedUnidadeId, setSelectedUnidadeId] = useState<string>(() => {
    return localStorage.getItem('ozi_selected_unidade') || '';
  });

  useEffect(() => {
    loadUnidades();
  }, []);

  useEffect(() => {
    if (selectedUnidadeId) {
      localStorage.setItem('ozi_selected_unidade', selectedUnidadeId);
    } else {
      localStorage.removeItem('ozi_selected_unidade');
    }
  }, [selectedUnidadeId]);

  async function loadUnidades() {
    try {
      const data = await api.get('/api/unidades');
      setUnidades(data);
    } catch {
      // ignore - user might not be logged in yet
    }
  }

  const selectedUnidade = unidades.find(u => u.id === selectedUnidadeId) || null;
  const queryParam = selectedUnidadeId ? `?unidade_id=${selectedUnidadeId}` : '';

  return (
    <UnidadeContext.Provider value={{
      unidades,
      selectedUnidadeId,
      setSelectedUnidadeId,
      selectedUnidade,
      queryParam,
    }}>
      {children}
    </UnidadeContext.Provider>
  );
}

export function useUnidade() {
  return useContext(UnidadeContext);
}
