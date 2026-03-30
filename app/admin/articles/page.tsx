'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestore-error';
import Link from 'next/link';

export default function ArticlesAdmin() {
  const [articles, setArticles] = useState<any[]>([]);
  const [articleToDelete, setArticleToDelete] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setArticles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'articles');
    });
    return () => unsubscribe();
  }, []);

  const handleDelete = (id: string) => {
    setArticleToDelete(id);
  };

  const executeDelete = async () => {
    if (!articleToDelete) return;
    try {
      await deleteDoc(doc(db, 'articles', articleToDelete));
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.DELETE, 'articles');
      } catch (e) {}
    } finally {
      setArticleToDelete(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gerenciar Artigos</h1>
        <Link href="/admin/articles/new" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          + Novo Artigo
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4">Título</th>
              <th className="p-4">Categoria</th>
              <th className="p-4">Status</th>
              <th className="p-4">Data</th>
              <th className="p-4">Ações</th>
            </tr>
          </thead>
          <tbody>
            {articles.map(article => (
              <tr key={article.id} className="border-b hover:bg-gray-50">
                <td className="p-4 font-medium">{article.title}</td>
                <td className="p-4">{article.category}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${article.published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                    {article.published ? 'Publicado' : 'Rascunho'}
                  </span>
                </td>
                <td className="p-4 text-sm text-gray-500">
                  {new Date(article.createdAt).toLocaleDateString('pt-BR')}
                </td>
                <td className="p-4 space-x-2">
                  <Link href={`/admin/articles/${article.id}/edit`} className="text-blue-600 hover:underline">Editar</Link>
                  <button onClick={() => handleDelete(article.id)} className="text-red-600 hover:underline">Excluir</button>
                </td>
              </tr>
            ))}
            {articles.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">Nenhum artigo encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {articleToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir Artigo</h3>
              <p className="text-gray-600">Tem certeza que deseja excluir este artigo? Esta ação não pode ser desfeita.</p>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setArticleToDelete(null)}
                className="px-5 py-2 text-gray-700 font-semibold hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={executeDelete}
                className="px-5 py-2 bg-red-600 text-white font-semibold hover:bg-red-700 rounded-lg transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
