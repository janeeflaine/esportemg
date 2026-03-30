import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

export async function GET() {
  const baseUrl = process.env.APP_URL || 'http://localhost:3000';
  
  try {
    const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'), limit(100));
    const snapshot = await getDocs(q);
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n`;
    
    snapshot.docs.forEach(doc => {
      const article = doc.data();
      const date = new Date(article.createdAt).toISOString();
      
      xml += `  <url>\n`;
      xml += `    <loc>${baseUrl}/article/${article.slug}</loc>\n`;
      xml += `    <news:news>\n`;
      xml += `      <news:publication>\n`;
      xml += `        <news:name>VerdãoMinas Portal</news:name>\n`;
      xml += `        <news:language>pt-br</news:language>\n`;
      xml += `      </news:publication>\n`;
      xml += `      <news:publication_date>${date}</news:publication_date>\n`;
      xml += `      <news:title>${article.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</news:title>\n`;
      xml += `    </news:news>\n`;
      xml += `  </url>\n`;
    });
    
    xml += `</urlset>`;
    
    return new Response(xml, {
      headers: {
        'Content-Type': 'application/xml',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response('Error generating sitemap', { status: 500 });
  }
}
