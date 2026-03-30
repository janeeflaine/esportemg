'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestore-error';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import AdManager from '@/components/AdManager';
import StickyAd from '@/components/StickyAd';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useAuth } from '@/components/AuthProvider';

export default function ArticlePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin, logout } = useAuth();

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const q = query(collection(db, 'articles'), where('slug', '==', slug));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const data = querySnapshot.docs[0].data();
          setArticle({ id: querySnapshot.docs[0].id, ...data });
          document.title = `${data.title} | Esporte MG`;
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'articles');
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchArticle();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  if (!article) return <div className="min-h-screen flex items-center justify-center text-2xl font-bold text-gray-500">Artigo não encontrado.</div>;

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <header className="bg-[#15803d] text-white sticky top-0 z-50 shadow-md">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center max-w-6xl">
          <Link href="/" className="text-2xl font-black tracking-tighter uppercase flex items-center">
            <span>ESPORTE</span><span className="text-yellow-400">MG</span>
          </Link>
          <nav className="hidden md:flex space-x-6 font-semibold text-sm">
            <Link href="/" className="hover:text-green-300 transition-colors">Início</Link>
            <Link href="#" className="hover:text-green-300 transition-colors">Cruzeiro</Link>
            <Link href="#" className="hover:text-green-300 transition-colors">Atlético-MG</Link>
            <Link href="#" className="hover:text-green-300 transition-colors">América-MG</Link>
            <Link href="#" className="hover:text-green-300 transition-colors">Tabela</Link>
          </nav>
          <div className="flex space-x-4 items-center">
            <button className="hover:text-green-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </button>
            {user ? (
              <div className="flex items-center space-x-4">
                {isAdmin && (
                  <Link href="/admin" className="text-sm font-semibold hover:text-green-300">
                    Admin
                  </Link>
                )}
                <button onClick={logout} className="text-sm font-semibold hover:text-green-300">
                  Sair
                </button>
              </div>
            ) : (
              <Link href="/login" className="flex items-center space-x-2 hover:text-green-300 text-sm font-semibold">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span className="hidden sm:inline">Entrar</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 pb-32 xl:pb-8 max-w-3xl relative">
        <StickyAd position="Código Lateral Esquerdo (Desktop)" />
        <StickyAd position="Código Lateral Direito (Desktop)" />
        <StickyAd position="Código Fixo Rodapé (Mobile)" />

        <AdManager position="Artigo Início" />

        <article className="mt-6">
          <header className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {article.category}
              </span>
              <span className="text-gray-500 text-sm font-medium">
                {format(article.createdAt, "d 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-6 tracking-tight">
              {article.title}
            </h1>
          </header>

          {article.imageUrl && (
            <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-8 shadow-lg">
              <Image 
                src={article.imageUrl} 
                alt={article.title} 
                fill 
                sizes="(max-width: 768px) 100vw, 768px"
                priority={true}
                className="object-contain p-8 bg-gray-50"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          <div className="prose prose-lg prose-green max-w-none text-gray-800 leading-relaxed">
            <div dangerouslySetInnerHTML={{ __html: article.content }} />
          </div>

          <div className="my-10">
            <AdManager position="Artigo Fim" />
          </div>

          {article.tags && article.tags.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag: string) => (
                  <span key={tag} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm font-medium hover:bg-gray-200 cursor-pointer transition-colors">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>
    </div>
  );
}
