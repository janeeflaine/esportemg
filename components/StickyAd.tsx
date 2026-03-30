'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

interface StickyAdProps {
  position: 'Código Lateral Esquerdo (Desktop)' | 'Código Lateral Direito (Desktop)' | 'Código Fixo Rodapé (Mobile)';
}

export default function StickyAd({ position }: StickyAdProps) {
  const [adCode, setAdCode] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'ads'),
      where('position', '==', position),
      where('active', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setAdCode(snapshot.docs[0].data().code);
      } else {
        setAdCode(null);
      }
    });

    return () => unsubscribe();
  }, [position]);

  useEffect(() => {
    if (adCode && containerRef.current && isVisible) {
      containerRef.current.innerHTML = '';
      const fragment = document.createRange().createContextualFragment(adCode);
      containerRef.current.appendChild(fragment);
    }
  }, [adCode, isVisible]);

  if (!adCode || !isVisible) return null;

  const handleClose = () => setIsVisible(false);

  if (position === 'Código Lateral Esquerdo (Desktop)') {
    return (
      <div className="hidden xl:block fixed top-32 left-4 z-40 w-[160px] xl:w-[300px]">
        <div className="relative bg-white shadow-lg border border-gray-200 rounded-lg p-2">
          <button 
            onClick={handleClose}
            className="absolute -top-3 -right-3 bg-gray-800 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-gray-700 z-50 shadow-md"
            aria-label="Fechar anúncio"
          >
            X
          </button>
          <div className="text-[10px] text-gray-400 text-center mb-1 uppercase tracking-wider">Publicidade</div>
          <div ref={containerRef} className="min-h-[600px] flex justify-center items-center overflow-hidden" />
        </div>
      </div>
    );
  }

  if (position === 'Código Lateral Direito (Desktop)') {
    return (
      <div className="hidden xl:block fixed top-32 right-4 z-40 w-[160px] xl:w-[300px]">
        <div className="relative bg-white shadow-lg border border-gray-200 rounded-lg p-2">
          <button 
            onClick={handleClose}
            className="absolute -top-3 -left-3 bg-gray-800 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-gray-700 z-50 shadow-md"
            aria-label="Fechar anúncio"
          >
            X
          </button>
          <div className="text-[10px] text-gray-400 text-center mb-1 uppercase tracking-wider">Publicidade</div>
          <div ref={containerRef} className="min-h-[600px] flex justify-center items-center overflow-hidden" />
        </div>
      </div>
    );
  }

  if (position === 'Código Fixo Rodapé (Mobile)') {
    return (
      <div className="xl:hidden fixed bottom-0 left-0 right-0 z-50 w-full bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] border-t border-gray-200">
        <div className="relative w-full max-w-md mx-auto">
          <button 
            onClick={handleClose}
            className="absolute -top-8 right-2 bg-gray-800 text-white rounded-t-lg px-3 py-1 text-xs font-bold hover:bg-gray-700 shadow-md"
            aria-label="Fechar anúncio"
          >
            Fechar X
          </button>
          <div className="text-[10px] text-gray-400 text-center pt-1 uppercase tracking-wider bg-gray-50">Publicidade</div>
          <div ref={containerRef} className="min-h-[50px] flex justify-center items-center overflow-hidden p-1 bg-gray-50" />
        </div>
      </div>
    );
  }

  return null;
}
