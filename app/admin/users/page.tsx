'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Trash2, Shield, ShieldAlert } from 'lucide-react';
import { handleFirestoreError, OperationType } from '@/lib/firestore-error';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: number;
}

export default function UsersAdmin() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserData[];
      setUsers(usersData.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (window.confirm(`Tem certeza que deseja alterar o nível de acesso para ${newRole}?`)) {
      try {
        await updateDoc(doc(db, 'users', userId), { role: newRole });
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
      }
    }
  };

  const handleDelete = async (userId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.')) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        setUsers(users.filter(u => u.id !== userId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${userId}`);
      }
    }
  };

  if (loading) return <div>Carregando usuários...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Gerenciar Usuários</h1>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data de Cadastro</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nível de Acesso</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.role === 'admin' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role === 'admin' ? 'Administrador' : 'Assinante'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    {user.role === 'admin' ? (
                      <button
                        onClick={() => handleRoleChange(user.id, 'subscriber')}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Rebaixar para Assinante"
                      >
                        <ShieldAlert size={20} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRoleChange(user.id, 'admin')}
                        className="text-green-600 hover:text-green-900"
                        title="Promover a Administrador"
                      >
                        <Shield size={20} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Excluir Usuário"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="p-6 text-center text-gray-500">Nenhum usuário encontrado.</div>
        )}
      </div>
    </div>
  );
}
