'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { db, auth, storage } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, getDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { handleFirestoreError, OperationType } from '@/lib/firestore-error';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function ArticleForm({ articleId }: { articleId?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [published, setPublished] = useState(true);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Fetch categories
        const categoriesSnapshot = await getDocs(collection(db, 'categories'));
        const categoriesData = categoriesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Category[];
        setCategories(categoriesData.sort((a, b) => a.name.localeCompare(b.name)));

        // Fetch article if editing
        if (articleId) {
          const docRef = doc(db, 'articles', articleId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setTitle(data.title);
            setSlug(data.slug);
            setContent(data.content);
            setCategory(data.category);
            setTags(data.tags?.join(', ') || '');
            setImageUrl(data.imageUrl || '');
            setPublished(data.published ?? true);
          }
        } else if (categoriesData.length > 0) {
          setCategory(categoriesData[0].name);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, [articleId]);

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (!articleId) {
      setSlug(generateSlug(newTitle));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const storageRef = ref(storage, `articles/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error('Upload failed:', error);
        setIsUploading(false);
        alert('Falha no upload da imagem.');
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        setImageUrl(downloadURL);
        setIsUploading(false);
        setUploadProgress(0);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tagsArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    
    const articleData = {
      title,
      slug,
      content,
      category,
      tags: tagsArray,
      imageUrl,
      published,
      createdAt: Date.now(),
      authorId: auth.currentUser?.uid
    };

    try {
      if (articleId) {
        // Remove createdAt and authorId to not overwrite them on update
        const { createdAt, authorId, ...updateData } = articleData;
        await updateDoc(doc(db, 'articles', articleId), updateData);
      } else {
        await addDoc(collection(db, 'articles'), articleData);
      }
      router.push('/admin/articles');
    } catch (error) {
      handleFirestoreError(error, articleId ? OperationType.UPDATE : OperationType.CREATE, 'articles');
    }
  };

  const quillRef = useRef<any>(null);

  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const storageRef = ref(storage, `articles/content/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        null,
        (error) => {
          console.error('Upload failed:', error);
          alert('Falha no upload da imagem.');
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          const quill = quillRef.current?.getEditor();
          if (quill) {
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', downloadURL);
          }
        }
      );
    };
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    }
  }), []);

  if (loading) return <div>Carregando...</div>;

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">Título</label>
          <input type="text" value={title} onChange={handleTitleChange} required className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500" placeholder="Digite o título do post" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">Slug (URL)</label>
          <input type="text" value={slug} onChange={e => setSlug(e.target.value)} required className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500" placeholder="url-amigavel-do-post" />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700">Conteúdo</label>
        <div className="bg-white">
          {(() => {
            const ReactQuillAny = ReactQuill as any;
            return (
              <ReactQuillAny 
                ref={quillRef}
                theme="snow" 
                value={content} 
                onChange={setContent} 
                modules={modules}
                className="h-64 mb-12"
              />
            );
          })()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">Categoria</label>
          <select 
            value={category} 
            onChange={e => setCategory(e.target.value)} 
            required 
            className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500 bg-white"
          >
            <option value="" disabled>Selecione uma categoria</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
          {categories.length === 0 && (
            <p className="text-xs text-red-500 mt-1">Crie categorias primeiro no menu Categorias.</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">Status do Post</label>
          <select 
            value={published ? 'public' : 'draft'} 
            onChange={e => setPublished(e.target.value === 'public')} 
            className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500 bg-white"
          >
            <option value="public">Público (Publicado)</option>
            <option value="draft">Rascunho</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">Imagem de Destaque (Thumbnail)</label>
          <div className="flex flex-col space-y-2">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageUpload} 
              ref={fileInputRef}
              className="hidden" 
            />
            <div className="flex space-x-2">
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 font-medium transition-colors"
                disabled={isUploading}
              >
                {isUploading ? `Enviando... ${Math.round(uploadProgress)}%` : 'Fazer Upload'}
              </button>
              <input 
                type="url" 
                value={imageUrl} 
                onChange={e => setImageUrl(e.target.value)} 
                placeholder="Ou cole a URL aqui..." 
                className="flex-1 p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500" 
              />
            </div>
            {imageUrl && (
              <div className="mt-2 relative w-full h-32 rounded overflow-hidden border border-gray-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Preview" className="object-cover w-full h-full" />
              </div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">Tags (separadas por vírgula)</label>
          <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="Palmeiras, Cruzeiro, Galo" className="w-full p-2 border border-gray-300 rounded focus:ring-green-500 focus:border-green-500" />
        </div>
      </div>

      <div className="pt-6 border-t border-gray-200 flex items-center">
        <button type="submit" className="bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 font-bold shadow-sm transition-colors">
          {articleId ? 'Salvar Alterações' : 'Publicar Artigo'}
        </button>
        <button type="button" onClick={() => router.push('/admin/articles')} className="ml-4 text-gray-600 hover:text-gray-900 font-medium transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  );
}
