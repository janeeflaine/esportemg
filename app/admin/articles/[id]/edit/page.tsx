'use client';

import ArticleForm from '@/components/ArticleForm';
import { use } from 'react';

export default function EditArticle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Editar Artigo</h1>
      <ArticleForm articleId={id} />
    </div>
  );
}
