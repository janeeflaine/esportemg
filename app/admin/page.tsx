'use client';

import { useAuth } from '@/components/AuthProvider';
import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { useState } from 'react';

const SEED_ARTICLES = [
  {
    title: "Palmeiras vence clássico com gol no último minuto",
    slug: "palmeiras-vence-classico-gol-ultimo-minuto",
    content: "O Palmeiras mostrou mais uma vez a força do seu elenco ao vencer o clássico deste domingo. Em uma partida truncada, o gol salvador saiu aos 48 minutos do segundo tempo, levando a torcida ao delírio no Allianz Parque.\n\n## O Jogo\n\nDesde o início, a equipe buscou o ataque, mas esbarrou na forte retranca adversária. O técnico fez substituições precisas no segundo tempo que mudaram a cara da partida.\n\n* Destaque para a defesa sólida.\n* Meio-campo criativo.\n* Ataque eficiente no momento certo.",
    category: "Brasileirão",
    tags: ["Palmeiras", "Vitória", "Clássico"],
    imageUrl: "https://picsum.photos/seed/palmeiras1/800/400",
    published: true
  },
  {
    title: "Cruzeiro anuncia nova contratação para o meio-campo",
    slug: "cruzeiro-anuncia-nova-contratacao-meio-campo",
    content: "A diretoria do Cruzeiro confirmou hoje a contratação do novo camisa 10. O jogador, que estava no futebol europeu, chega com status de titular absoluto e promete elevar o nível da equipe na temporada.\n\n## Expectativas\n\nA torcida celeste já comemora nas redes sociais. A apresentação oficial será na próxima terça-feira, na Toca da Raposa.",
    category: "Mercado da Bola",
    tags: ["Cruzeiro", "Contratação", "Futebol Mineiro"],
    imageUrl: "https://picsum.photos/seed/cruzeiro1/800/400",
    published: true
  },
  {
    title: "Atlético-MG se prepara para confronto decisivo na Libertadores",
    slug: "atletico-mg-prepara-confronto-decisivo-libertadores",
    content: "O Galo finalizou hoje a preparação para o jogo mais importante do ano até aqui. O técnico fechou o treino e fez mistério sobre a escalação titular.\n\n> 'Sabemos da dificuldade, mas estamos prontos para buscar a classificação', disse o capitão da equipe.\n\nA expectativa é de casa cheia na Arena MRV.",
    category: "Libertadores",
    tags: ["Galo", "Atlético-MG", "Libertadores"],
    imageUrl: "https://picsum.photos/seed/galo1/800/400",
    published: true
  },
  {
    title: "América-MG foca na base para revelar novos talentos",
    slug: "america-mg-foca-base-revelar-talentos",
    content: "Reconhecido nacionalmente por sua excelente categoria de base, o América-MG investe ainda mais na estrutura do CT Lanna Drumond. O objetivo é revelar pelo menos 3 jogadores para o time profissional este ano.\n\nO Coelho segue sua tradição de formar grandes atletas para o futebol brasileiro e mundial.",
    category: "Categorias de Base",
    tags: ["América-MG", "Coelho", "Base"],
    imageUrl: "https://picsum.photos/seed/america1/800/400",
    published: true
  },
  {
    title: "Análise: O esquema tático do Palmeiras na temporada",
    slug: "analise-esquema-tatico-palmeiras-temporada",
    content: "Neste artigo, dissecamos a forma como o Palmeiras tem jogado. A variação entre o 4-3-3 e o 3-5-2 tem confundido os adversários e garantido vitórias importantes.\n\n### Pontos Fortes\n1. Transição rápida.\n2. Bolas paradas letais.\n3. Marcação pressão no campo do adversário.",
    category: "Análise Tática",
    tags: ["Palmeiras", "Tática", "Futebol"],
    imageUrl: "https://picsum.photos/seed/tatico1/800/400",
    published: true
  },
  {
    title: "Os maiores ídolos da história do futebol mineiro",
    slug: "maiores-idolos-historia-futebol-mineiro",
    content: "Uma viagem no tempo para relembrar os craques que marcaram época vestindo as camisas de Cruzeiro, Atlético-MG e América-MG. De Tostão a Reinaldo, passando por Jair Bala.\n\nMinas Gerais sempre foi um celeiro de craques que encantaram não só o Brasil, mas o mundo inteiro.",
    category: "História",
    tags: ["História", "Ídolos", "Minas Gerais"],
    imageUrl: "https://picsum.photos/seed/historia1/800/400",
    published: true
  },
  {
    title: "Palmeiras renova contrato com patrocinador master",
    slug: "palmeiras-renova-contrato-patrocinador-master",
    content: "Uma excelente notícia para as finanças do clube. O Palmeiras anunciou a renovação do contrato de patrocínio master por mais 3 anos, com valores que superam o acordo anterior.\n\nIsso garante estabilidade para manter o elenco forte e buscar mais títulos.",
    category: "Negócios",
    tags: ["Palmeiras", "Patrocínio", "Finanças"],
    imageUrl: "https://picsum.photos/seed/patrocinio1/800/400",
    published: true
  },
  {
    title: "Cruzeiro lança nova camisa em homenagem às origens",
    slug: "cruzeiro-lanca-nova-camisa-homenagem-origens",
    content: "O novo manto celeste já está disponível nas lojas. Com detalhes que remetem à fundação do clube, a camisa foi muito elogiada pelos torcedores nas redes sociais.\n\nA estreia do novo uniforme será no próximo domingo, no Mineirão.",
    category: "Marketing",
    tags: ["Cruzeiro", "Camisa", "Marketing"],
    imageUrl: "https://picsum.photos/seed/camisa1/800/400",
    published: true
  },
  {
    title: "Galo inaugura nova área interativa na Arena MRV",
    slug: "galo-inaugura-nova-area-interativa-arena-mrv",
    content: "A experiência do torcedor atleticano ficou ainda melhor. A nova área interativa conta com museu digital, simuladores e praça de alimentação com vista para o gramado.\n\nUm verdadeiro espetáculo de tecnologia e conforto para a Massa.",
    category: "Estádios",
    tags: ["Galo", "Arena MRV", "Inovação"],
    imageUrl: "https://picsum.photos/seed/arena1/800/400",
    published: true
  },
  {
    title: "A importância da preparação física no calendário apertado",
    slug: "importancia-preparacao-fisica-calendario-apertado",
    content: "Com jogos a cada 3 dias, os departamentos médicos e físicos dos clubes trabalham dobrado. Entrevistamos especialistas para entender como Palmeiras e os times mineiros estão lidando com o desgaste dos atletas.\n\nO controle de carga e a nutrição são fundamentais para evitar lesões.",
    category: "Saúde e Esporte",
    tags: ["Preparação Física", "Futebol", "Bastidores"],
    imageUrl: "https://picsum.photos/seed/fisico1/800/400",
    published: true
  }
];

const SEED_MATCHES = [
  { teamA: 'Palmeiras', teamB: 'São Paulo', scoreA: 2, scoreB: 1, date: '2023-10-25', time: '21:30', status: 'finished' },
  { teamA: 'Cruzeiro', teamB: 'Atlético-MG', scoreA: 0, scoreB: 0, date: '2023-10-28', time: '16:00', status: 'live' },
  { teamA: 'América-MG', teamB: 'Palmeiras', scoreA: 0, scoreB: 0, date: '2023-11-02', time: '20:00', status: 'upcoming', whereToWatch: 'https://premiere.globo.com' }
];

const SEED_ADS = [
  { position: 'Home Topo', code: '<div style="background:#facc15;color:#854d0e;padding:10px;text-align:center;font-weight:bold;border-radius:4px;">Anúncio Adsterra - Topo (728x90)</div>', active: true },
  { position: 'Home Entre Blocos', code: '<div style="background:#bfdbfe;color:#1e40af;padding:20px;text-align:center;font-weight:bold;border-radius:4px;">Anúncio AdSense - Nativo</div>', active: true },
  { position: 'Sidebar', code: '<div style="background:#fecaca;color:#991b1b;padding:50px 10px;text-align:center;font-weight:bold;border-radius:4px;height:250px;">Anúncio Sidebar (300x250)</div>', active: true }
];

const SEED_VIDEO = {
  title: 'MELHORES MOMENTOS: PALMEIRAS X RIVAL',
  youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  active: true
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [seeding, setSeeding] = useState(false);

  const handleSeed = async () => {
    if (!confirm('Isso irá adicionar dados de teste ao banco. Continuar?')) return;
    setSeeding(true);
    try {
      // Seed Articles
      for (const article of SEED_ARTICLES) {
        await addDoc(collection(db, 'articles'), {
          ...article,
          createdAt: Date.now() - Math.floor(Math.random() * 10000000),
          authorId: user?.uid
        });
      }
      // Seed Matches
      for (const match of SEED_MATCHES) {
        await addDoc(collection(db, 'matches'), {
          ...match,
          createdAt: Date.now()
        });
      }
      // Seed Ads
      for (const ad of SEED_ADS) {
        await addDoc(collection(db, 'ads'), {
          ...ad,
          createdAt: Date.now()
        });
      }
      // Seed Video
      await addDoc(collection(db, 'videos'), {
        ...SEED_VIDEO,
        createdAt: Date.now()
      });

      alert('Dados inseridos com sucesso!');
    } catch (error) {
      console.error('Erro ao inserir dados:', error);
      alert('Erro ao inserir dados.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard Administrativo</h1>
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">Bem-vindo, {user?.email}</h2>
        <p className="text-gray-600">
          Utilize o menu lateral para gerenciar os artigos, jogos, anúncios e vídeos do portal.
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-yellow-500">
        <h2 className="text-xl font-semibold mb-2">Ações Rápidas</h2>
        <p className="text-gray-600 mb-4">
          Preencha o banco de dados com 10 artigos, jogos, anúncios e um vídeo de teste.
        </p>
        <button 
          onClick={handleSeed} 
          disabled={seeding}
          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded"
        >
          {seeding ? 'Inserindo dados...' : 'Gerar Dados de Teste (Seed)'}
        </button>
      </div>
    </div>
  );
}
