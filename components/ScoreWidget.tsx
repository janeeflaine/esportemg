'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';

export default function ScoreWidget() {
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'matches'), orderBy('createdAt', 'desc'), limit(5));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMatches(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  if (matches.length === 0) return <p className="text-gray-400 italic text-sm">Nenhum jogo cadastrado no momento.</p>;

  return (
    <div className="w-full overflow-x-auto py-2">
      <div className="flex space-x-4 min-w-max">
        {matches.map(match => (
          <div key={match.id} className="flex flex-col items-center bg-white border border-gray-200 rounded-lg p-4 min-w-[200px] shadow-sm">
            <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
              {match.status === 'live' ? <span className="text-red-500 animate-pulse font-bold">● Ao Vivo</span> : match.status === 'finished' ? 'Finalizado' : `${match.date} ${match.time}`}
            </div>
            <div className="flex justify-between w-full items-center font-bold text-lg text-gray-800">
              <span className="truncate w-20 text-center">{match.teamA}</span>
              <span className="mx-2 bg-gray-100 px-3 py-1 rounded text-sm border border-gray-200">
                {match.scoreA} - {match.scoreB}
              </span>
              <span className="truncate w-20 text-center">{match.teamB}</span>
            </div>
            {match.whereToWatch && match.status === 'upcoming' && (
              <a href={match.whereToWatch} target="_blank" rel="noopener noreferrer" className="mt-3 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded w-full text-center transition-colors">
                Onde Assistir
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
