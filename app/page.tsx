'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, limit, where } from 'firebase/firestore';
import Link from 'next/link';
import Image from 'next/image';
import ScoreWidget from '@/components/ScoreWidget';
import AdManager from '@/components/AdManager';
import VideoPlayer from '@/components/VideoPlayer';
import SimulationTool from '@/components/SimulationTool';
import AffiliatesArea from '@/components/AffiliatesArea';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useAuth } from '@/components/AuthProvider';

export default function Home() {
  const [articles, setArticles] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { user, isAdmin, logout } = useAuth();

  useEffect(() => {
    const fetchCategories = async () => {
      const q = query(collection(db, 'categories'), orderBy('name', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    let q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'), limit(20));
    
    if (selectedCategory) {
      q = query(collection(db, 'articles'), where('category', '==', selectedCategory), orderBy('createdAt', 'desc'), limit(20));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setArticles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [selectedCategory]);

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Header */}
      <header className="bg-[#15803d] text-white sticky top-0 z-50">
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

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Score Widget (Top) */}
        <div className="mb-10">
          <h2 className="text-xl font-bold border-l-4 border-green-600 pl-3 mb-4 text-gray-800">
            Placar em Tempo Real & Próximos Jogos
          </h2>
          <ScoreWidget />
        </div>

        <AdManager position="Home Topo" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
          {/* Main Content Column */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-black border-b-2 border-green-600 pb-2 mb-6 text-gray-900">
              Últimas Notícias
            </h2>
            
            {/* Featured Video */}
            <VideoPlayer />

            {/* Category Filter */}
            {categories.length > 0 && (
              <div className="flex overflow-x-auto pb-2 mb-6 gap-2 scrollbar-hide">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                    selectedCategory === null 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Todas
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                      selectedCategory === cat.name 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
            
            {articles.length === 0 ? (
              <p className="text-gray-500">Nenhum artigo publicado ainda.</p>
            ) : (
              articles.map((article, index) => (
                <div key={article.id}>
                  <Link href={`/article/${article.slug}`} className="group block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100">
                    <div className="flex flex-col sm:flex-row">
                      {article.imageUrl && (
                        <div className="sm:w-1/3 h-48 sm:h-auto relative overflow-hidden">
                          <Image 
                            src={article.imageUrl} 
                            alt={article.title} 
                            fill 
                            sizes="(max-width: 640px) 100vw, 33vw"
                            priority={index < 4}
                            className="object-contain p-4 bg-gray-50 group-hover:scale-105 transition-transform duration-300"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                      <div className="p-5 sm:w-2/3 flex flex-col justify-between">
                        <div>
                          <span className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2 block">
                            {article.category}
                          </span>
                          <h3 className="text-xl font-bold text-gray-900 leading-tight mb-2 group-hover:text-green-700 transition-colors">
                            {article.title}
                          </h3>
                          <p className="text-gray-600 text-sm line-clamp-2">
                            {article.content.replace(/<[^>]*>?/gm, '').substring(0, 150)}...
                          </p>
                        </div>
                        <div className="mt-4 text-xs text-gray-400 font-medium">
                          {formatDistanceToNow(article.createdAt, { addSuffix: true, locale: ptBR })}
                        </div>
                      </div>
                    </div>
                  </Link>
                  
                  {/* Insert Ad after every 3 articles */}
                  {(index + 1) % 3 === 0 && (
                    <div className="my-6">
                      <AdManager position="Home Entre Blocos" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-8">
            <SimulationTool />
            <AdManager position="Sidebar" />
            <AffiliatesArea />
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-zinc-900 text-zinc-400 py-8 text-center mt-12">
        <p className="font-bold text-white mb-2">VerdãoMinas Portal</p>
        <p className="text-sm">© {new Date().getFullYear()} Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
