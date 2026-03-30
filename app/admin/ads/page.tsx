'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestore-error';

export default function AdsAdmin() {
  const [ads, setAds] = useState<any[]>([]);
  const [position, setPosition] = useState('Home Topo');
  const [code, setCode] = useState('');
  const [active, setActive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const positions = [
    'Home Topo', 
    'Home Entre Blocos', 
    'Artigo Início', 
    'Artigo Meio', 
    'Artigo Fim', 
    'Sidebar',
    'Código Lateral Esquerdo (Desktop)',
    'Código Lateral Direito (Desktop)',
    'Código Fixo Rodapé (Mobile)'
  ];

  useEffect(() => {
    const q = query(collection(db, 'ads'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'ads');
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const adData = { position, code, active, createdAt: Date.now() };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'ads', editingId), adData);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'ads'), adData);
      }
      setCode(''); setPosition('Home Topo'); setActive(true);
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'ads');
    }
  };

  const handleEdit = (ad: any) => {
    setPosition(ad.position); setCode(ad.code); setActive(ad.active); setEditingId(ad.id);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza?')) {
      try {
        await deleteDoc(doc(db, 'ads', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'ads');
      }
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Gerenciador de Anúncios (Ad-Manager)</h1>
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Posição do Anúncio</label>
          <select value={position} onChange={e => setPosition(e.target.value)} className="w-full p-2 border rounded">
            {positions.map(pos => <option key={pos} value={pos}>{pos}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Código HTML/JS (Adsterra, AdSense)</label>
          <textarea value={code} onChange={e => setCode(e.target.value)} required rows={5} className="w-full p-2 border rounded font-mono text-sm" />
        </div>
        <div className="flex items-center space-x-2">
          <input type="checkbox" id="active" checked={active} onChange={e => setActive(e.target.checked)} className="rounded" />
          <label htmlFor="active" className="text-sm font-medium">Ativo</label>
        </div>
        <div>
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            {editingId ? 'Atualizar Anúncio' : 'Cadastrar Anúncio'}
          </button>
          {editingId && (
            <button type="button" onClick={() => setEditingId(null)} className="ml-2 text-gray-600 px-4 py-2">Cancelar</button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">Posição</th>
              <th className="p-4">Status</th>
              <th className="p-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {ads.map(ad => (
              <tr key={ad.id} className="border-b hover:bg-gray-50">
                <td className="p-4 font-medium">{ad.position}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${ad.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {ad.active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="p-4 space-x-2">
                  <button onClick={() => handleEdit(ad)} className="text-blue-600 hover:underline">Editar</button>
                  <button onClick={() => handleDelete(ad.id)} className="text-red-600 hover:underline">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
