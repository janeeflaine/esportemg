'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestore-error';

export default function MatchesAdmin() {
  const [matches, setMatches] = useState<any[]>([]);
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [status, setStatus] = useState('upcoming');
  const [whereToWatch, setWhereToWatch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'matches'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'matches');
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const matchData = {
      teamA, teamB,
      scoreA: scoreA ? parseInt(scoreA) : 0,
      scoreB: scoreB ? parseInt(scoreB) : 0,
      date, time, status, whereToWatch,
      createdAt: Date.now()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'matches', editingId), matchData);
        setEditingId(null);
      } else {
        await addDoc(collection(db, 'matches'), matchData);
      }
      setTeamA(''); setTeamB(''); setScoreA(''); setScoreB(''); setDate(''); setTime(''); setStatus('upcoming'); setWhereToWatch('');
    } catch (error) {
      handleFirestoreError(error, editingId ? OperationType.UPDATE : OperationType.CREATE, 'matches');
    }
  };

  const handleEdit = (match: any) => {
    setTeamA(match.teamA); setTeamB(match.teamB); setScoreA(match.scoreA); setScoreB(match.scoreB);
    setDate(match.date); setTime(match.time); setStatus(match.status); setWhereToWatch(match.whereToWatch || '');
    setEditingId(match.id);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir?')) {
      try {
        await deleteDoc(doc(db, 'matches', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, 'matches');
      }
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Gerenciar Jogos e Placares</h1>
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Time A (Casa)</label>
          <input type="text" value={teamA} onChange={e => setTeamA(e.target.value)} required className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Time B (Fora)</label>
          <input type="text" value={teamB} onChange={e => setTeamB(e.target.value)} required className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Placar Time A</label>
          <input type="number" value={scoreA} onChange={e => setScoreA(e.target.value)} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Placar Time B</label>
          <input type="number" value={scoreB} onChange={e => setScoreB(e.target.value)} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Data (YYYY-MM-DD)</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Hora (HH:MM)</label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} required className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="w-full p-2 border rounded">
            <option value="upcoming">Próximo Jogo</option>
            <option value="live">Ao Vivo</option>
            <option value="finished">Finalizado</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Onde Assistir (Link/Canal)</label>
          <input type="text" value={whereToWatch} onChange={e => setWhereToWatch(e.target.value)} className="w-full p-2 border rounded" />
        </div>
        <div className="md:col-span-2">
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            {editingId ? 'Atualizar Jogo' : 'Cadastrar Jogo'}
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
              <th className="p-4">Jogo</th>
              <th className="p-4">Placar</th>
              <th className="p-4">Data/Hora</th>
              <th className="p-4">Status</th>
              <th className="p-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {matches.map(match => (
              <tr key={match.id} className="border-b hover:bg-gray-50">
                <td className="p-4">{match.teamA} vs {match.teamB}</td>
                <td className="p-4 font-bold">{match.scoreA} - {match.scoreB}</td>
                <td className="p-4">{match.date} {match.time}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${match.status === 'live' ? 'bg-red-100 text-red-800' : match.status === 'finished' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}`}>
                    {match.status}
                  </span>
                </td>
                <td className="p-4 space-x-2">
                  <button onClick={() => handleEdit(match)} className="text-blue-600 hover:underline">Editar</button>
                  <button onClick={() => handleDelete(match.id)} className="text-red-600 hover:underline">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
