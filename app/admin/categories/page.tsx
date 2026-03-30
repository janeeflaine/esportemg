'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Pencil, Trash2, Plus } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export default function CategoriesAdmin() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'categories'));
      const categoriesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Category[];
      setCategories(categoriesData.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    if (!editingCategory) {
      setSlug(generateSlug(newName));
    }
  };

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setName(category.name);
      setSlug(category.slug);
      setDescription(category.description || '');
    } else {
      setEditingCategory(null);
      setName('');
      setSlug('');
      setDescription('');
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const categoryData = {
        name,
        slug,
        description,
      };

      if (editingCategory) {
        await updateDoc(doc(db, 'categories', editingCategory.id), categoryData);
      } else {
        await addDoc(collection(db, 'categories'), {
          ...categoryData,
          createdAt: Date.now()
        });
      }
      fetchCategories();
      handleCloseModal();
      setFeedbackMsg({ type: 'success', text: 'Categoria salva com sucesso!' });
    } catch (error) {
      console.error('Error saving category:', error);
      setFeedbackMsg({ type: 'error', text: 'Erro ao salvar a categoria.' });
    }
  };

  const handleDelete = (id: string) => {
    setCategoryToDelete(id);
  };

  const executeDelete = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteDoc(doc(db, 'categories', categoryToDelete));
      fetchCategories();
      setFeedbackMsg({ type: 'success', text: 'Categoria excluída com sucesso!' });
    } catch (error) {
      console.error('Error deleting category:', error);
      setFeedbackMsg({ type: 'error', text: 'Erro ao excluir a categoria.' });
    } finally {
      setCategoryToDelete(null);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gerenciar Categorias</h1>
        <button
          onClick={() => handleOpenModal()}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center"
        >
          <Plus size={20} className="mr-2" />
          Nova Categoria
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.map((category) => (
              <tr key={category.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{category.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{category.slug}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-500 truncate max-w-xs">{category.description}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleOpenModal(category)} className="text-blue-600 hover:text-blue-900 mr-4">
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => handleDelete(category.id)} className="text-red-600 hover:text-red-900">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  Nenhuma categoria cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</h2>
            <form onSubmit={handleSave}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={handleNameChange}
                  className="w-full p-2 border rounded focus:ring-green-500 focus:border-green-500"
                  placeholder="Ex: Futebol"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-green-500 focus:border-green-500"
                  placeholder="Ex: futebol"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-green-500 focus:border-green-500"
                  rows={3}
                  placeholder="Descrição da categoria..."
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {categoryToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir Categoria</h3>
              <p className="text-gray-600">Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.</p>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setCategoryToDelete(null)}
                className="px-5 py-2 text-gray-700 font-semibold hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={executeDelete}
                className="px-5 py-2 bg-red-600 text-white font-semibold hover:bg-red-700 rounded-lg transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de Feedback */}
      {feedbackMsg && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg font-semibold text-white z-50 flex items-center gap-2 ${feedbackMsg.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {feedbackMsg.text}
          <button onClick={() => setFeedbackMsg(null)} className="ml-4 text-white hover:text-gray-200">
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
