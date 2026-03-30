'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestore-error';

export default function VideosAdmin() {
  const [videos, setVideos] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [active, setActive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'videos');
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const videoData = { title, youtubeUrl, active, createdAt: Date.now() };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'videos', editingId), videoData);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'videos'), videoData);
      }
      setTitle(''); setYoutubeUrl(''); setActive(true);
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'videos');
    }
  };

  const handleEdit = (video: any) => {
    setTitle(video.title); setYoutubeUrl(video.youtubeUrl); setActive(video.active); setEditingId(video.id);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza?')) {
      try {
        await deleteDoc(doc(db, 'videos', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'videos');
      }
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Módulo de Vídeos/Live</h1>
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Título do Vídeo/Live</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">URL do YouTube</label>
          <input type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} required placeholder="https://www.youtube.com/watch?v=..." className="w-full p-2 border rounded" />
          <p className="text-xs text-gray-500 mt-1">O player será gerado automaticamente no modo &quot;Cinema&quot; bloqueando cliques externos.</p>
        </div>
        <div className="flex items-center space-x-2">
          <input type="checkbox" id="active" checked={active} onChange={e => setActive(e.target.checked)} className="rounded" />
          <label htmlFor="active" className="text-sm font-medium">Destaque na Home</label>
        </div>
        <div>
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            {editingId ? 'Atualizar Vídeo' : 'Cadastrar Vídeo'}
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
              <th className="p-4">Título</th>
              <th className="p-4">URL</th>
              <th className="p-4">Destaque</th>
              <th className="p-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {videos.map(video => (
              <tr key={video.id} className="border-b hover:bg-gray-50">
                <td className="p-4 font-medium">{video.title}</td>
                <td className="p-4 text-sm text-gray-500">{video.youtubeUrl}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${video.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {video.active ? 'Sim' : 'Não'}
                  </span>
                </td>
                <td className="p-4 space-x-2">
                  <button onClick={() => handleEdit(video)} className="text-blue-600 hover:underline">Editar</button>
                  <button onClick={() => handleDelete(video.id)} className="text-red-600 hover:underline">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
