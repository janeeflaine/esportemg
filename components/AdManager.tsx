'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function AdManager({ position }: { position: string }) {
  const [adCode, setAdCode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'ads'),
      where('position', '==', position),
      where('active', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        // Just take the first active ad for this position
        setAdCode(snapshot.docs[0].data().code);
      } else {
        setAdCode(null);
      }
    });

    return () => unsubscribe();
  }, [position]);

  useEffect(() => {
    if (adCode && containerRef.current) {
      // Clear previous content
      containerRef.current.innerHTML = '';
      
      // Create a document fragment to parse the HTML string
      const fragment = document.createRange().createContextualFragment(adCode);
      
      // Append the parsed nodes to the container
      containerRef.current.appendChild(fragment);
    }
  }, [adCode]);

  if (!adCode) return null;

  return (
    <div className="w-full my-4 flex justify-center bg-gray-50 py-2 border-y border-gray-200">
      <div ref={containerRef} />
    </div>
  );
}
