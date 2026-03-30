'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';

export default function VideoPlayer() {
  const [video, setVideo] = useState<any>(null);
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'videos'), where('active', '==', true), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setVideo({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
      } else {
        setVideo(null);
      }
    });
    return () => unsubscribe();
  }, []);

  if (!video) return null;

  // Extract YouTube ID
  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = getYoutubeId(video.youtubeUrl);
  if (!videoId) return null;

  const handleFirstClick = () => {
    if (!clicked) {
      setClicked(true);
      // Simulate Pop-under ad
      window.open('https://example-ad-network.com/popunder', '_blank');
    }
  };

  return (
    <div className="w-full bg-black rounded-lg overflow-hidden shadow-xl my-6 relative">
      <div className="p-3 bg-zinc-900 text-white font-semibold flex items-center justify-between">
        <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2"></span> {video.title}</span>
        <span className="text-xs text-zinc-400 uppercase tracking-wider">Modo Cinema</span>
      </div>
      <div className="relative w-full aspect-video overflow-hidden">
        {!clicked && (
          <div 
            className="absolute inset-0 z-10 cursor-pointer flex items-center justify-center bg-black/20 hover:bg-black/10 transition-colors"
            onClick={handleFirstClick}
            title="Clique para assistir"
          >
            {/* Invisible overlay to catch the first click */}
          </div>
        )}
        {/* Wrapper to hide YouTube title and logo by scaling and translating */}
        <div className="absolute inset-0 w-full h-full" style={{ transform: 'scale(1.2)', transformOrigin: 'center' }}>
          <iframe
            className="absolute top-0 left-0 w-full h-full pointer-events-auto"
            src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&controls=1&showinfo=0&fs=0`}
            title={video.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </div>
  );
}
