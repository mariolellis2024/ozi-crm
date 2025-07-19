import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Pencil, Trash2, X, Clock, TrendingUp, Users, Tag, FolderPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency } from '../utils/format';
import { ConfirmationModal } from '../components/ConfirmationModal';

interface Categoria {
  id: string;
  nome: string;
}

interface Curso {
  id: string;
  nome: string;
  carga_horaria: number;
  preco: number;
  categoria_id?: string;
  categoria?: Categoria;
  interested_students_count?: number;
}

interface Turma {
  id: string;
  name: string;
  curso_id: string;
}

export function Cursos() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    carga_horaria: '',
    preco: '',
    categoria_id: ''
  });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    cursoId: '',
    cursoNome: ''
  });

  useEffect(() => {
    loadCursos();
    loadCategorias();
  }, []);

  async function loadCategorias() {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      setCategorias(data);
    } catch (error) {
      toast.error('Erro ao carregar categorias');
    }
  }

  async function loadCursos() {
    try {
      const [cursosResult, interestsResult] = await Promise.all([
        supabase
          .from('cursos')
          .select(`
            *,
            categoria:categorias(id, nome)
          `)
          .order('created_at', { ascending: false }),
        supabase
          .from('aluno_curso_interests')
          .select('curso_id, status')
      ]);
      
      if (cursosResult.error) throw cursosResult.error;
      if (interestsResult.error) throw interestsResult.error;

      // Count interested students for each course
      const interestCounts: { [cursoId: string]: number } = {};
      interestsResult.data.forEach(interest => {
        if (interest.status === 'interested') {
          interestCounts[interest.curso_id] = (interestCounts[interest.curso_id] || 0) + 1;
        }
      });

      // Add interest count to each course
      const cursosWithInterests = cursosResult.data.map(curso => ({
        ...curso,
        interested_students_count: interestCounts[curso.id] || 0
      }));

      // Group by category and sort
      const sortedCursos = cursosWithInterests.sort((a, b) => {
        // First sort by category name (null categories go to end)
        const categoryA = a.categoria?.nome || 'ZZZ_Sem categoria';
        const categoryB = b.categoria?.nome || 'ZZZ_Sem categoria';
        
        if (categoryA !== categoryB) {
          return categoryA.localeCompare(categoryB);
        }
        
        // Then sort alphabetically by course name within category
        return a.nome.localeCompare(b.nome);
      });

      setCursos(sortedCursos);
    } catch (error) {
      toast.error('Erro ao carregar cursos');
    }
  }

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) {
      toast.error('Nome da categoria é obrigatório');
      return;
    }

    try {
      const { error } = await supabase
        .from('categorias')
        .insert([{ nome: newCategoryName.trim() }]);
      
      if (error) throw error;
      
      toast.success('Categoria criada com sucesso!');
      setNewCategoryName('');
      setShowNewCategoryInput(false);
      loadCategorias();
    } catch (error: any) {
      if (error.code === '23505') {
        toast.error('Já existe uma categoria com este nome');
      } else {
        toast.error('Erro ao criar categoria');
      }
    }
  }

  async function handleDeleteCategory(categoriaId: string) {
    try {
      // Check if category is being used
      const { data: cursosUsingCategory } = await supabase
        .from('cursos')
        .select('id')
        .eq('categoria_id', categoriaId)
        .limit(1);
      
      if (cursosUsingCategory && cursosUsingCategory.length > 0) {
        toast.error('Não é possível excluir uma categoria que está sendo usada por cursos');
        return;
      }

      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', categoriaId);
      
      if (error) throw error;
      
      toast.success('Categoria excluída com sucesso!');
      loadCategorias();
    } catch (error) {
      toast.error('Erro ao excluir categoria');
    }
  }

  async function loadCursosForUpdate() {
    try {
      const { data, error } = await supabase
        .from('cursos')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCursos(data);
    } catch (error) {
      toast.error('Erro ao carregar cursos');
    }
  }

  async function updateTurmaNames(cursoId: string, newNome: string) {
    try {
      const { data: turmas, error: fetchError } = await supabase
        .from('turmas')
        .select('id, name')
        .eq('curso_id', cursoId);

      if (fetchError) throw fetchError;

      const updatePromises = turmas.map(async (turma) => {
        const currentNumber = turma.name.split(' ').pop(); // Get the last part (number)
        const newName = `${newNome} ${currentNumber}`;
        
        const { error } = await supabase
          .from('turmas')
          .update({ name: newName })
          .eq('id', turma.id);
        
        if (error) throw error;
      });

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error updating turma names:', error);
      throw error;
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
        const { error } = await supabase
          .from('cursos')
          .update(cursoData)
          .eq('id', editingId);
        
        if (error) throw error;
        await updateTurmaNames(editingId, cursoData.nome);
        toast.success('Curso atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('cursos')
          .insert([cursoData]);
        
        if (error) throw error;
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
      const { error } = await supabase
        .from('cursos')
        .delete()
        .eq('id', confirmModal.cursoId);
      
      if (error) throw error;
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

  // Group courses by category
  const cursosPorCategoria = cursos.reduce((acc, curso) => {
    const categoryName = curso.categoria?.nome || 'Sem categoria';
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(curso);
    return acc;
  }, {} as Record<string, Curso[]>);

  const categoryNames = Object.keys(cursosPorCategoria).sort((a, b) => {
    if (a === 'Sem categoria') return 1;
    if (b === 'Sem categoria') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="p-8 fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 fade-in-delay-1">
          <div className="slide-in-left">
            <h1 className="text-3xl font-bold text-white">Cursos</h1>
            <p className="text-gray-400 mt-2">Gerencie o catálogo de cursos disponíveis</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-teal-accent text-dark rounded-lg hover:bg-teal-accent/90 transition-colors hover-glow slide-in-right"
          >
            <Plus className="h-5 w-5 mr-2" />
            Novo Curso
          </button>
        </div>

        <div className="space-y-8 scale-in-delay-1">
          {categoryNames.map((categoryName) => (
            <div key={categoryName}>
              <div className="flex items-center gap-3 mb-4">
                <Tag className="h-5 w-5 text-teal-accent" />
                <h2 className="text-xl font-semibold text-white">{categoryName}</h2>
                <div className="h-px bg-gray-700 flex-1"></div>
                <span className="text-gray-400 text-sm">
                  {cursosPorCategoria[categoryName].length} {cursosPorCategoria[categoryName].length === 1 ? 'curso' : 'cursos'}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {cursosPorCategoria[categoryName].map((curso) => {
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
                                  <span className="font-semibold">
                                    {curso.interested_students_count} {curso.interested_students_count === 1 ? 'interessado' : 'interessados'}
                                  </span>
                                </div>
                                <div className="flex items-center text-purple-400">
                                  <TrendingUp className="h-4 w-4 mr-2" />
                                  <span className="font-semibold">
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
          {cursos.length === 0 && (
            <div className="text-center text-gray-400 py-8">
              Nenhum curso cadastrado
            </div>
          )}
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-dark-card rounded-2xl p-6 w-full max-w-md mx-4">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">
                  {editingId ? 'Editar Curso' : 'Novo Curso'}
                </h2>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setFormData({ nome: '', carga_horaria: '', preco: '', categoria_id: '' });
                    setEditingId(null);
                    setShowNewCategoryInput(false);
                    setNewCategoryName('');
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="nome" className="block text-sm font-medium text-gray-400 mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="carga_horaria" className="block text-sm font-medium text-gray-400 mb-1">
                    Carga Horária (horas)
                  </label>
                  <input
                    type="number"
                    id="carga_horaria"
                    value={formData.carga_horaria}
                    onChange={(e) => setFormData({ ...formData, carga_horaria: e.target.value })}
                    className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="categoria_id" className="block text-sm font-medium text-gray-400 mb-1">
                    Categoria
                  </label>
                  <div className="space-y-2">
                    <select
                      id="categoria_id"
                      value={formData.categoria_id}
                      onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                      className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                    >
                      <option value="">Sem categoria</option>
                      {categorias.map(categoria => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.nome}
                        </option>
                      ))}
                    </select>
                    
                    {!showNewCategoryInput ? (
                      <button
                        type="button"
                        onClick={() => setShowNewCategoryInput(true)}
                        className="flex items-center gap-2 text-teal-accent hover:text-teal-accent/80 transition-colors text-sm"
                      >
                        <FolderPlus className="h-4 w-4" />
                        Nova categoria
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Nome da categoria"
                          className="flex-1 bg-dark-lighter border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-accent"
                          onKeyPress={(e) => e.key === 'Enter' && handleCreateCategory()}
                        />
                        <button
                          type="button"
                          onClick={handleCreateCategory}
                          className="px-3 py-2 bg-teal-accent text-dark rounded-lg hover:bg-teal-accent/90 transition-colors text-sm"
                        >
                          Criar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowNewCategoryInput(false);
                            setNewCategoryName('');
                          }}
                          className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                    
                    {categorias.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-2">Categorias existentes:</p>
                        <div className="flex flex-wrap gap-1">
                          {categorias.map(categoria => (
                            <div
                              key={categoria.id}
                              className="flex items-center gap-1 bg-dark text-gray-300 px-2 py-1 rounded text-xs"
                            >
                              <span>{categoria.nome}</span>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(categoria.id)}
                                className="text-red-400 hover:text-red-300 transition-colors"
                                title="Excluir categoria"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="preco" className="block text-sm font-medium text-gray-400 mb-1">
                    Preço
                  </label>
                  <input
                    type="number"
                    id="preco"
                    value={formData.preco}
                    onChange={(e) => setFormData({ ...formData, preco: e.target.value })}
                    className="w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-teal-accent text-dark font-medium rounded-lg px-4 py-2 hover:bg-teal-accent/90 transition-colors"
                >
                  {editingId ? 'Atualizar' : 'Cadastrar'}
                </button>
              </form>
            </div>
          </div>
        )}

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
      </div>
    </div>
  );
}