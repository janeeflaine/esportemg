'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Pencil, Trash2, Plus } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  strength: number;
}

export default function TeamsAdmin() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [name, setName] = useState('');
  const [strength, setStrength] = useState<number>(50);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'teams'));
      const teamsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Team[];
      setTeams(teamsData.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (team?: Team) => {
    if (team) {
      setEditingTeam(team);
      setName(team.name);
      setStrength(team.strength);
    } else {
      setEditingTeam(null);
      setName('');
      setStrength(50);
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTeam(null);
    setName('');
    setStrength(50);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTeam) {
        await updateDoc(doc(db, 'teams', editingTeam.id), {
          name,
          strength: Number(strength)
        });
      } else {
        await addDoc(collection(db, 'teams'), {
          name,
          strength: Number(strength),
          createdAt: Date.now()
        });
      }
      fetchTeams();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving team:', error);
      alert('Erro ao salvar o time.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este time?')) {
      try {
        await deleteDoc(doc(db, 'teams', id));
        fetchTeams();
      } catch (error) {
        console.error('Error deleting team:', error);
        alert('Erro ao excluir o time.');
      }
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gerenciar Times (Simulador)</h1>
        <button
          onClick={() => handleOpenModal()}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center"
        >
          <Plus size={20} className="mr-2" />
          Novo Time
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome do Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Força (0-100)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {teams.map((team) => (
              <tr key={team.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{team.name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{team.strength}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleOpenModal(team)} className="text-blue-600 hover:text-blue-900 mr-4">
                    <Pencil size={18} />
                  </button>
                  <button onClick={() => handleDelete(team.id)} className="text-red-600 hover:text-red-900">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {teams.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                  Nenhum time cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingTeam ? 'Editar Time' : 'Novo Time'}</h2>
            <form onSubmit={handleSave}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Time</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-green-500 focus:border-green-500"
                  placeholder="Ex: Atlético-MG"
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">Força (0 a 100)</label>
                <input
                  type="number"
                  required
                  min="0"
                  max="100"
                  value={strength}
                  onChange={(e) => setStrength(Number(e.target.value))}
                  className="w-full p-2 border rounded focus:ring-green-500 focus:border-green-500"
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
    </div>
  );
}
