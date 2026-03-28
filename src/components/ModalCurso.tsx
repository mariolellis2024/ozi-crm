import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Pencil, Trash2, ImagePlus, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { LoadingButton } from './LoadingButton';
import toast from 'react-hot-toast';

interface Categoria {
  id: string;
  nome: string;
}

interface ModalCursoProps {
  isOpen: boolean;
  editingId: string | null;
  formData: {
    nome: string;
    carga_horaria: string;
    preco: string;
    categoria_id: string;
    imagem_url: string;
  };
  setFormData: React.Dispatch<React.SetStateAction<{
    nome: string;
    carga_horaria: string;
    preco: string;
    categoria_id: string;
    imagem_url: string;
  }>>;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function ModalCurso({ 
  isOpen, 
  editingId, 
  formData, 
  setFormData, 
  onSubmit, 
  onClose 
}: ModalCursoProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [showCategoriaForm, setShowCategoriaForm] = useState(false);
  const [editingCategoriaId, setEditingCategoriaId] = useState<string | null>(null);
  const [categoriaFormData, setCategoriaFormData] = useState({ nome: '' });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadCategorias();
    }
  }, [isOpen]);

  async function loadCategorias() {
    try {
      const data = await api.get('/api/categorias');
      setCategorias(data);
    } catch (error) {
      toast.error('Erro ao carregar categorias');
    }
  }

  async function handleCategoriaSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingCategoriaId) {
        await api.put(`/api/categorias/${editingCategoriaId}`, categoriaFormData);
        toast.success('Categoria atualizada com sucesso!');
      } else {
        await api.post('/api/categorias', categoriaFormData);
        toast.success('Categoria criada com sucesso!');
      }

      setCategoriaFormData({ nome: '' });
      setEditingCategoriaId(null);
      setShowCategoriaForm(false);
      loadCategorias();
    } catch (error) {
      toast.error('Erro ao salvar categoria');
    }
  }

  async function handleDeleteCategoria(id: string) {
    try {
      await api.delete(`/api/categorias/${id}`);
      toast.success('Categoria excluída com sucesso!');
      loadCategorias();
    } catch (error: any) {
      if (error.message?.includes('sendo usada')) {
        toast.error('Esta categoria não pode ser excluída pois está sendo usada por cursos');
      } else {
        toast.error('Erro ao excluir categoria');
      }
    }
  }

  function handleEditCategoria(categoria: Categoria) {
    setCategoriaFormData({ nome: categoria.nome });
    setEditingCategoriaId(categoria.id);
    setShowCategoriaForm(true);
  }

  function handleCancelCategoriaForm() {
    setCategoriaFormData({ nome: '' });
    setEditingCategoriaId(null);
    setShowCategoriaForm(false);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);

      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataUpload
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erro ao fazer upload');
      }

      const data = await response.json();
      setFormData(prev => ({ ...prev, imagem_url: data.url }));
      toast.success('Imagem enviada com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar imagem');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return createPortal(
    isOpen ? (
    <div 
      className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-dark-card rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">
            {editingId ? 'Editar Curso' : 'Novo Curso'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Imagem Hero do Curso
            </label>
            <div 
              className="relative border-2 border-dashed border-gray-600 rounded-xl overflow-hidden cursor-pointer hover:border-teal-accent/50 transition-colors"
              onClick={() => !uploading && fileInputRef.current?.click()}
            >
              {formData.imagem_url ? (
                <div className="relative group">
                  <img 
                    src={formData.imagem_url} 
                    alt="Hero do curso" 
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="px-4 py-2 bg-teal-accent text-dark rounded-lg text-sm font-medium"
                    >
                      Trocar imagem
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData(prev => ({ ...prev, imagem_url: '' }));
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  {uploading ? (
                    <>
                      <Loader2 className="h-8 w-8 animate-spin mb-2 text-teal-accent" />
                      <span className="text-sm">Enviando...</span>
                    </>
                  ) : (
                    <>
                      <ImagePlus className="h-8 w-8 mb-2" />
                      <span className="text-sm">Clique para enviar uma imagem</span>
                      <span className="text-xs text-gray-500 mt-1">JPG, PNG, WebP • Máx. 5MB</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

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
            <label htmlFor="categoria_id" className="block text-sm font-medium text-gray-400 mb-1">
              Categoria
            </label>
            <div className="flex gap-2">
              <select
                id="categoria_id"
                value={formData.categoria_id}
                onChange={(e) => setFormData({ ...formData, categoria_id: e.target.value })}
                className="flex-1 bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
              >
                <option value="">Selecione uma categoria</option>
                {categorias.map(categoria => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowCategoriaForm(true)}
                className="px-3 py-2 bg-teal-accent text-dark rounded-lg hover:bg-teal-accent/90 transition-colors"
                title="Gerenciar categorias"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {showCategoriaForm && (
            <div className="bg-dark-lighter rounded-lg p-4 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-white">
                  {editingCategoriaId ? 'Editar Categoria' : 'Nova Categoria'}
                </h3>
                <button
                  type="button"
                  onClick={handleCancelCategoriaForm}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCategoriaSubmit} className="space-y-4">
                <div>
                  <label htmlFor="categoria_nome" className="block text-sm font-medium text-gray-400 mb-1">
                    Nome da Categoria
                  </label>
                  <input
                    type="text"
                    id="categoria_nome"
                    value={categoriaFormData.nome}
                    onChange={(e) => setCategoriaFormData({ nome: e.target.value })}
                    className="w-full bg-dark border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-teal-accent text-dark font-medium rounded-lg px-4 py-2 hover:bg-teal-accent/90 transition-colors"
                >
                  {editingCategoriaId ? 'Atualizar Categoria' : 'Criar Categoria'}
                </button>
              </form>

              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Categorias Existentes</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {categorias.map(categoria => (
                    <div key={categoria.id} className="flex items-center justify-between bg-dark rounded-lg px-3 py-2">
                      <span className="text-white">{categoria.nome}</span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditCategoria(categoria)}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategoria(categoria.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {categorias.length === 0 && (
                    <div className="text-center text-gray-400 py-2 text-sm">
                      Nenhuma categoria cadastrada
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
              placeholder="0,00"
            />
          </div>

          <LoadingButton
            isLoading={uploading}
            text={editingId ? 'Atualizar' : 'Cadastrar'}
            className="w-full bg-teal-accent text-dark font-medium rounded-lg px-4 py-2 hover:bg-teal-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </form>
      </div>
    </div>
    ) : null,
    document.body
  );
}