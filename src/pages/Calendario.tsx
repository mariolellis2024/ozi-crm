import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { CalendarOcupacaoSalas } from '../components/CalendarOcupacaoSalas';
import { useUnidade } from '../contexts/UnidadeContext';

interface Sala {
  id: string;
  nome: string;
  cadeiras: number;
}

interface Turma {
  id: string;
  name: string;
  curso_id: string;
  sala_id: string;
  period: 'manha' | 'tarde' | 'noite';
  start_date: string;
  end_date: string;
  cadeiras: number;
  days_of_week: number[];
  curso?: { nome: string; preco: number };
  alunos_enrolled?: Array<{ id: string; nome: string }>;
}

export function Calendario() {
  const { selectedUnidadeId } = useUnidade();
  const [salas, setSalas] = useState<Sala[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);

  useEffect(() => {
    loadData();
  }, [selectedUnidadeId]);

  async function loadData() {
    try {
      const unidadeParam = selectedUnidadeId ? `?unidade_id=${selectedUnidadeId}` : '';
      const [salasData, turmasData] = await Promise.all([
        api.get(`/api/salas${unidadeParam}`),
        api.get(`/api/turmas${unidadeParam}`)
      ]);
      setSalas(salasData);
      setTurmas(turmasData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }

  return (
    <div className="p-8 fade-in">
      <div className="max-w-full mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Calendário</h1>
          <p className="text-gray-400 mt-2">Visualização semanal de ocupação das salas</p>
        </div>

        <CalendarOcupacaoSalas salas={salas} turmas={turmas} />
      </div>
    </div>
  );
}
