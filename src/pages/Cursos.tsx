import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, Pencil, Trash2, Clock, TrendingUp, Users, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/format';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ModalCurso } from '../components/ModalCurso';
import { ModalCategorias } from '../components/ModalCategorias';
import { useNavigate } from 'react-router-dom';

interface Curso {
  id: string;
  nome: string;
  carga_horaria: number;
  preco: number;
  categoria_id?: string;
  interested_students_count?: number;
  categoria?: {
    nome: string;
  };
}

interface Turma {
  id: string;
  name: string;
  curso_id: string;
}

export function Cursos() {
  const navigate = useNavigate();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoriasModalOpen, setIsCategoriasModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    carga_horaria: '',
    preco: '',
    categoria_id: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    cursoId: '',
    cursoNome: ''
  });

  useEffect(() => {
    loadCursos();
  }, []);

  async function loadCursos() {
    try {
      const data = await api.get('/api/cursos');
      // The server returns cursos with categoria and interested_students_count
      // Group courses by category and sort
      const cursosGrouped = data.reduce((acc: { [key: string]: Curso[] }, curso: any) => {
        const categoryName = curso.categoria?.nome || 'Sem Categoria';
        if (!acc[categoryName]) {
          acc[categoryName] = [];
        }
        acc[categoryName].push(curso);
        return acc;
      }, {});

      const sortedCursos: Curso[] = [];
      Object.keys(cursosGrouped)
        .sort((a: string, b: string) => a.localeCompare(b))
        .forEach(categoryName => {
          const cursosInCategory = cursosGrouped[categoryName].sort((a: any, b: any) => a.nome.localeCompare(b.nome));
          sortedCursos.push(...cursosInCategory);
        });

      setCursos(sortedCursos);
    } catch (error) {
      toast.error('Erro ao carregar cursos');
    }
  }

  async function loadCursosForUpdate() {
    try {
      const data = await api.get('/api/cursos');
      setCursos(data);
    } catch (error) {
      toast.error('Erro ao carregar cursos');
    }
  }



  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const cursoData = {
        ...formData,
        carga_horaria: Number(formData.carga_horaria),
        preco: Number(formData.preco)
      };

      if (editingId) {
        await api.put(`/api/cursos/${editingId}`, cursoData);
        toast.success('Curso atualizado com sucesso!');
      } else {
        await api.post('/api/cursos', cursoData);
        toast.success('Curso adicionado com sucesso!');
      }

      setIsModalOpen(false);
      setFormData({ nome: '', carga_horaria: '', preco: '', categoria_id: '' });
      setEditingId(null);
      loadCursos();
    } catch (error) {
      toast.error('Erro ao salvar curso');
    }
  }

  async function handleDelete(id: string) {
    const curso = cursos.find(c => c.id === id);
    if (!curso) return;

    setConfirmModal({
      isOpen: true,
      cursoId: id,
      cursoNome: curso.nome
    });
  }

  async function handleConfirmDelete() {
    try {
      await api.delete(`/api/cursos/${confirmModal.cursoId}`);
      toast.success('Curso excluído com sucesso!');
      loadCursos();
    } catch (error) {
      toast.error('Erro ao excluir curso');
    } finally {
      setConfirmModal({ isOpen: false, cursoId: '', cursoNome: '' });
    }
  }

  function handleCancelDelete() {
    setConfirmModal({ isOpen: false, cursoId: '', cursoNome: '' });
  }

  function handleEdit(curso: Curso) {
    setFormData({
      nome: curso.nome,
      carga_horaria: curso.carga_horaria.toString(),
      preco: curso.preco.toString(),
      categoria_id: curso.categoria_id || ''
    });
    setEditingId(curso.id);
    setIsModalOpen(true);
  }

  // Group courses by category for display
  const cursosGrouped = cursos.reduce((acc: { [key: string]: Curso[] }, curso) => {
    const categoryName = curso.categoria?.nome || 'Sem Categoria';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(curso);
    return acc;
  }, {});

  const sortedCategories = Object.keys(cursosGrouped).sort((a, b) => a.localeCompare(b));

  return (
    <div className="p-8 fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 fade-in-delay-1">
          <div className="slide-in-left">
            <h1 className="text-3xl font-bold text-white">Cursos</h1>
            <p className="text-gray-400 mt-2">Gerencie o catálogo de cursos disponíveis</p>
          </div>
          <div className="flex items-center gap-3 slide-in-right">
            <button
              onClick={() => setIsCategoriasModalOpen(true)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors hover-glow"
            >
              <Tag className="h-5 w-5 mr-2" />
              Categorias
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center px-4 py-2 bg-teal-accent text-dark rounded-lg hover:bg-teal-accent/90 transition-colors hover-glow"
            >
              <Plus className="h-5 w-5 mr-2" />
              Novo Curso
            </button>
          </div>
        </div>

        <div className="space-y-8 scale-in-delay-1">
          {sortedCategories.map((categoryName) => (
            <div key={categoryName}>
              <h2 className="text-2xl font-bold text-white mb-4">
                {categoryName}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {cursosGrouped[categoryName].map((curso) => {
                  const lucroHora = curso.preco / curso.carga_horaria;
                  
                  return (
                    <div key={curso.id} className="bg-dark-card rounded-2xl p-6 hover-lift hover-scale-sm">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-white mb-2">{curso.nome}</h3>
                          <div className="space-y-3">
                            <div className="flex items-center text-gray-400">
                              <Clock className="h-4 w-4 mr-2" />
                              <span>{curso.carga_horaria} horas</span>
                            </div>
                            <p className="text-teal-accent font-semibold">
                              {formatCurrency(curso.preco)}
                            </p>
                            <div className="flex items-center text-emerald-500">
                              <TrendingUp className="h-4 w-4 mr-2" />
                              <span className="font-semibold">
                                {formatCurrency(lucroHora)}/hora
                              </span>
                            </div>
                            {curso.interested_students_count !== undefined && curso.interested_students_count > 0 && (
                              <>
                                <div className="flex items-center text-blue-400">
                                  <Users className="h-4 w-4 mr-2" />
                                  <span 
                                    className="font-semibold cursor-pointer hover:underline"
                                    onClick={() => navigate(`/alunos?curso=${curso.id}&status=interested`)}
                                    title="Ver alunos interessados neste curso"
                                  >
                                    {curso.interested_students_count} {curso.interested_students_count === 1 ? 'interessado' : 'interessados'}
                                  </span>
                                </div>
                                <div className="flex items-center text-purple-400">
                                  <TrendingUp className="h-4 w-4 mr-2" />
                                  <span 
                                    className="font-semibold cursor-pointer hover:underline"
                                    onClick={() => navigate(`/alunos?curso=${curso.id}&status=interested`)}
                                    title="Ver faturamento potencial deste curso"
                                  >
                                    {formatCurrency(curso.preco * curso.interested_students_count)} potencial
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(curso)}
                            className="p-2 text-gray-400 hover:text-white transition-colors"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(curso.id)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {sortedCategories.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              Nenhum curso cadastrado
            </div>
          )}
        </div>

        <ModalCurso
          isOpen={isModalOpen}
          editingId={editingId}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onClose={() => {
            setIsModalOpen(false);
            setFormData({ nome: '', carga_horaria: '', preco: '', categoria_id: '' });
            setEditingId(null);
          }}
        />

        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title="Excluir Curso"
          message={`Tem certeza que deseja excluir o curso "${confirmModal.cursoNome}"? Esta ação não pode ser desfeita e afetará todas as turmas relacionadas.`}
          confirmText="Excluir"
          cancelText="Cancelar"
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
          variant="danger"
        />

        <ModalCategorias
          isOpen={isCategoriasModalOpen}
          onClose={() => setIsCategoriasModalOpen(false)}
          onCategoriesUpdated={loadCursos}
        />
      </div>
    </div>
  );
}