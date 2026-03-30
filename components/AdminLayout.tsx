'use client';

import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { LayoutDashboard, FileText, CalendarDays, MonitorPlay, Megaphone, LogOut, Users } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push('/');
    }
  }, [loading, isAdmin, router]);

  if (loading || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-100">
      {/* Sidebar */}
      <aside className="w-full md:w-64 md:min-h-screen bg-green-800 text-white flex flex-col flex-shrink-0">
        <div className="p-4 text-2xl font-bold border-b border-green-700 flex justify-between items-center">
          <span>CMS Portal</span>
        </div>
        <nav className="flex-1 p-4 flex flex-row md:flex-col overflow-x-auto md:overflow-visible space-x-2 md:space-x-0 md:space-y-2">
          <Link href="/admin" className="flex items-center space-x-2 p-2 hover:bg-green-700 rounded whitespace-nowrap">
            <LayoutDashboard size={20} className="flex-shrink-0" />
            <span className="hidden md:inline">Dashboard</span>
          </Link>
          <Link href="/admin/articles" className="flex items-center space-x-2 p-2 hover:bg-green-700 rounded whitespace-nowrap">
            <FileText size={20} className="flex-shrink-0" />
            <span className="hidden md:inline">Artigos</span>
          </Link>
          <Link href="/admin/categories" className="flex items-center space-x-2 p-2 hover:bg-green-700 rounded whitespace-nowrap">
            <FileText size={20} className="flex-shrink-0" />
            <span className="hidden md:inline">Categorias</span>
          </Link>
          <Link href="/admin/matches" className="flex items-center space-x-2 p-2 hover:bg-green-700 rounded whitespace-nowrap">
            <CalendarDays size={20} className="flex-shrink-0" />
            <span className="hidden md:inline">Jogos & Placares</span>
          </Link>
          <Link href="/admin/videos" className="flex items-center space-x-2 p-2 hover:bg-green-700 rounded whitespace-nowrap">
            <MonitorPlay size={20} className="flex-shrink-0" />
            <span className="hidden md:inline">Vídeos / Live</span>
          </Link>
          <Link href="/admin/ads" className="flex items-center space-x-2 p-2 hover:bg-green-700 rounded whitespace-nowrap">
            <Megaphone size={20} className="flex-shrink-0" />
            <span className="hidden md:inline">Ad-Manager</span>
          </Link>
          <Link href="/admin/agency" className="flex items-center space-x-2 p-2 hover:bg-green-700 rounded whitespace-nowrap">
            <span className="text-xl flex-shrink-0">🤖</span>
            <span className="hidden md:inline">Agência IA</span>
          </Link>
          <Link href="/admin/teams" className="flex items-center space-x-2 p-2 hover:bg-green-700 rounded whitespace-nowrap">
            <Users size={20} className="flex-shrink-0" />
            <span className="hidden md:inline">Times (Simulador)</span>
          </Link>
          <Link href="/admin/users" className="flex items-center space-x-2 p-2 hover:bg-green-700 rounded whitespace-nowrap">
            <Users size={20} className="flex-shrink-0" />
            <span className="hidden md:inline">Usuários</span>
          </Link>
        </nav>
        <div className="p-4 border-t border-green-700 hidden md:block">
          <button onClick={logout} className="flex items-center space-x-2 p-2 w-full hover:bg-green-700 rounded text-left">
            <LogOut size={20} className="flex-shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
        <div className="md:hidden flex justify-end mb-4">
           <button onClick={logout} className="flex items-center space-x-2 p-2 bg-red-600 text-white rounded text-sm">
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}
