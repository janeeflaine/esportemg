'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc, deleteDoc, limit } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '@/lib/firestore-error';
import { useAuth } from '@/components/AuthProvider';
import { CheckCircle2, Circle, Loader2, Play, Settings, X, AlertCircle, Trash2, ArrowRight, RotateCcw } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

// --- Types ---
type AgentStatus = 'idle' | 'working' | 'waiting' | 'error';
type Phase = 'Orquestração' | 'Pesquisa' | 'Redação' | 'Visual' | 'Revisão' | 'Publicação' | 'Distribuição';

interface Agent {
  id: string;
  name: string;
  emoji: string;
  role: string;
  phase: Phase;
  systemPrompt: string;
  status: AgentStatus;
  lastRunAt: number | null;
  order: number;
}

interface PipelineJob {
  id: string;
  articleTitle: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  currentAgentId: string | null;
  currentPhase: string | null;
  createdAt: number;
  completedAt: number | null;
  phases: Record<string, 'pending' | 'in_progress' | 'completed' | 'error'>;
  outputs?: Record<string, string>;
}

// --- Constants ---
const PHASES: Phase[] = ['Orquestração', 'Pesquisa', 'Redação', 'Visual', 'Revisão', 'Publicação', 'Distribuição'];

const PHASE_COLORS: Record<Phase, string> = {
  'Orquestração': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Pesquisa': 'bg-blue-100 text-blue-800 border-blue-200',
  'Redação': 'bg-purple-100 text-purple-800 border-purple-200',
  'Visual': 'bg-pink-100 text-pink-800 border-pink-200',
  'Revisão': 'bg-orange-100 text-orange-800 border-orange-200',
  'Publicação': 'bg-green-100 text-green-800 border-green-200',
  'Distribuição': 'bg-cyan-100 text-cyan-800 border-cyan-200',
};

const INITIAL_AGENTS: Omit<Agent, 'id'>[] = [
  {
    name: 'SEO Orchestrator',
    emoji: '🧠',
    role: 'Orquestrador (SEO) - O Chefe. Define a pauta, estratégia de SEO e delega tarefas',
    phase: 'Orquestração',
    systemPrompt: 'Você é o Editor-Chefe e Especialista em SEO. Sua missão é orquestrar todo o processo de criação de conteúdo. Com base no tema fornecido, defina: 1) O título SEO ideal, 2) As 3 palavras-chave principais, 3) O ângulo da matéria (ex: crítico, informativo, passional) e 4) Uma estrutura sugerida de tópicos. Delegue essas diretrizes para o time.',
    status: 'idle',
    lastRunAt: null,
    order: 0
  },
  {
    name: 'Search Query Analyst',
    emoji: '🕵️',
    role: 'Analista de Termos de Busca - Descobre ângulos e termos de cauda longa',
    phase: 'Pesquisa',
    systemPrompt: 'Você é um especialista em SEO. Com base no tema e nas palavras-chave do Orquestrador, pesquise e identifique 5 termos de "cauda longa" (long-tail keywords) e 3 perguntas comuns que os usuários fazem no Google sobre este assunto. Explique por que esses termos são importantes para o ranking.',
    status: 'idle',
    lastRunAt: null,
    order: 1
  },
  {
    name: 'Analytics Reporter',
    emoji: '📰',
    role: 'Repórter Analítico - Analisa estatísticas e gera insights táticos',
    phase: 'Pesquisa',
    systemPrompt: 'Você é um repórter esportivo focado em dados. Analise o contexto da pauta e forneça 3 fatos estatísticos ou dados históricos relevantes que sustentem o argumento da matéria. Foque em métricas de desempenho, histórico de confrontos ou recordes.',
    status: 'idle',
    lastRunAt: null,
    order: 2
  },
  {
    name: 'Community Ninja',
    emoji: '🗣️',
    role: 'Monitor de Comunidade - Monitora reações da torcida e polêmicas',
    phase: 'Pesquisa',
    systemPrompt: 'Você é o termômetro das redes sociais. Identifique qual é o sentimento predominante da torcida em relação ao tema da pauta. Cite 2 possíveis reações ou "memes" que poderiam ser mencionados para gerar engajamento e proximidade com o leitor.',
    status: 'idle',
    lastRunAt: null,
    order: 3
  },
  {
    name: 'Content Strategist',
    emoji: '✍️',
    role: 'Estrategista de Conteúdo - Define tom de voz e esqueleto do artigo',
    phase: 'Redação',
    systemPrompt: 'Você é o arquiteto do texto. Reúna todas as pesquisas anteriores e crie o "esqueleto" detalhado do artigo. Defina os subtítulos (H2 e H3) e descreva brevemente o que deve ser escrito em cada parágrafo para garantir fluidez e retenção do leitor.',
    status: 'idle',
    lastRunAt: null,
    order: 4
  },
  {
    name: 'Storytelling Expert',
    emoji: '📖',
    role: 'Especialista em Narrativa - Escreve o rascunho passional e autoral',
    phase: 'Redação',
    systemPrompt: 'Você é um escritor passional de futebol. Transforme o esqueleto técnico em um texto vibrante, emocionante e autoral. Use metáforas esportivas, varie o tamanho das frases e crie uma introdução que prenda o leitor nos primeiros 5 segundos.',
    status: 'idle',
    lastRunAt: null,
    order: 5
  },
  {
    name: 'SEO Content Writer',
    emoji: '🌐',
    role: 'Redator SEO - Otimiza para motores de busca com H2/H3 e keywords',
    phase: 'Redação',
    systemPrompt: 'Você é o mestre da otimização. Pegue o rascunho emocional e ajuste-o para o Google: insira as palavras-chave naturalmente, garanta que os H2/H3 contenham termos de busca, otimize a legibilidade e crie uma Meta Description irresistível de até 155 caracteres.',
    status: 'idle',
    lastRunAt: null,
    order: 6
  },
  {
    name: 'Image Prompt Engineer',
    emoji: '📷',
    role: 'Engenheiro de Prompts de Imagem - Cria prompts para DALL-E/Midjourney',
    phase: 'Visual',
    systemPrompt: 'Você é um designer visual. Com base no conteúdo do artigo, crie 3 prompts detalhados para geração de imagens por IA. Os prompts devem descrever o estilo (ex: fotorealismo), a iluminação e os elementos principais para ilustrar a matéria de forma épica.',
    status: 'idle',
    lastRunAt: null,
    order: 7
  },
  {
    name: 'Fact Checker',
    emoji: '🔍',
    role: 'Checador de Fatos - Cruza dados do texto com informações reais',
    phase: 'Revisão',
    systemPrompt: 'Você é o guardião da verdade. Revise o texto final em busca de possíveis erros de datas, nomes de jogadores ou estatísticas conflitantes. Liste qualquer ponto que pareça duvidoso ou que precise de uma fonte adicional.',
    status: 'idle',
    lastRunAt: null,
    order: 8
  },
  {
    name: 'Copy Editor',
    emoji: '👁️',
    role: 'Revisor de Texto - Corrige gramática e garante tom de voz',
    phase: 'Revisão',
    systemPrompt: 'Você é o revisor gramatical. Sua tarefa é eliminar erros de português, ajustar a pontuação e garantir que o tom de voz escolhido na estratégia foi mantido do início ao fim.',
    status: 'idle',
    lastRunAt: null,
    order: 9
  },
  {
    name: 'CMS Publisher',
    emoji: '💻',
    role: 'Publicador - Formata e publica o artigo no blog',
    phase: 'Publicação',
    systemPrompt: 'Você é o técnico de publicação. Formate o texto final em HTML limpo ou Markdown, garantindo que as imagens estejam bem posicionadas (use placeholders se necessário) e que o artigo esteja pronto para ser colado no WordPress ou Blogger.',
    status: 'idle',
    lastRunAt: null,
    order: 10
  },
  {
    name: 'Social Media Coordinator',
    emoji: '📱',
    role: 'Coordenador Social - Cria posts para Twitter/TikTok/Kwai',
    phase: 'Distribuição',
    systemPrompt: 'Você é o mestre da viralização. Com o artigo pronto, crie: 1) Um tweet com gancho polêmico, 2) Uma legenda para Instagram com hashtags estratégicas e 3) Um roteiro curto de 15 segundos para um vídeo de "notícia urgente" no TikTok/Reels.',
    status: 'idle',
    lastRunAt: null,
    order: 11
  },
];

export default function AgencyDashboard() {
  const { isAdmin } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [jobs, setJobs] = useState<PipelineJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showInitConfirm, setShowInitConfirm] = useState(false);
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [newJobTitle, setNewJobTitle] = useState('');
  const [selectedJob, setSelectedJob] = useState<PipelineJob | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentOutput, setAgentOutput] = useState('');
  const [agentToDelete, setAgentToDelete] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Fetch Agents
  useEffect(() => {
    const q = query(collection(db, 'agents'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAgents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Agent)));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'agents'));
    return () => unsubscribe();
  }, []);

  // Fetch Pipeline Jobs
  useEffect(() => {
    const q = query(collection(db, 'pipeline_jobs'), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PipelineJob)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'pipeline_jobs'));
    return () => unsubscribe();
  }, []);

  const executeInitializeAgents = async () => {
    setShowInitConfirm(false);
    setIsInitializing(true);
    try {
      for (const initialAgent of INITIAL_AGENTS) {
        const existingAgent = agents.find(a => a.name === initialAgent.name);
        if (!existingAgent) {
          const docRef = doc(collection(db, 'agents'));
          await setDoc(docRef, initialAgent);
        } else {
          const docRef = doc(db, 'agents', existingAgent.id);
          await updateDoc(docRef, { order: initialAgent.order, phase: initialAgent.phase });
        }
      }
      setFeedbackMsg({ type: 'success', text: 'Agentes sincronizados com sucesso!' });
    } catch (error) {
      setFeedbackMsg({ type: 'error', text: 'Erro ao sincronizar agentes.' });
      handleFirestoreError(error, OperationType.CREATE, 'agents');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;
    try {
      const docRef = doc(db, 'agents', editingAgent.id);
      await updateDoc(docRef, {
        name: editingAgent.name,
        role: editingAgent.role,
        phase: editingAgent.phase,
        systemPrompt: editingAgent.systemPrompt,
      });
      setEditingAgent(null);
      setFeedbackMsg({ type: 'success', text: 'Agente salvo com sucesso!' });
    } catch (error) {
      setFeedbackMsg({ type: 'error', text: 'Erro ao salvar agente.' });
      handleFirestoreError(error, OperationType.UPDATE, `agents/${editingAgent.id}`);
    }
  };

  const handleDeleteAgent = (id: string) => {
    setAgentToDelete(id);
  };

  const executeDeleteAgent = async () => {
    if (!agentToDelete) return;
    try {
      await deleteDoc(doc(db, 'agents', agentToDelete));
      setFeedbackMsg({ type: 'success', text: 'Agente excluído com sucesso!' });
      if (editingAgent?.id === agentToDelete) setEditingAgent(null);
    } catch (error) {
      setFeedbackMsg({ type: 'error', text: 'Erro ao excluir agente.' });
      try {
        handleFirestoreError(error, OperationType.DELETE, `agents/${agentToDelete}`);
      } catch (e) {
        // Ignorar o erro lançado pelo handleFirestoreError para não quebrar a UI
      }
    } finally {
      setAgentToDelete(null);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJobTitle.trim()) return;

    if (agents.length === 0) {
      setFeedbackMsg({ type: 'error', text: 'Nenhum agente configurado. Sincronize os agentes primeiro.' });
      return;
    }

    try {
      const firstAgent = agents.find(a => a.order === 0) || agents[0];
      const newJob: Omit<PipelineJob, 'id'> = {
        articleTitle: newJobTitle,
        status: 'in_progress',
        currentAgentId: firstAgent.id,
        currentPhase: firstAgent.phase,
        createdAt: Date.now(),
        completedAt: null,
        phases: {
          [firstAgent.phase]: 'in_progress'
        },
        outputs: {}
      };

      const docRef = doc(collection(db, 'pipeline_jobs'));
      await setDoc(docRef, newJob);

      setNewJobTitle('');
      setShowNewJobModal(false);
      setFeedbackMsg({ type: 'success', text: 'Pauta iniciada com sucesso!' });
    } catch (error) {
      setFeedbackMsg({ type: 'error', text: 'Erro ao iniciar pauta.' });
      handleFirestoreError(error, OperationType.CREATE, 'pipeline_jobs');
    }
  };

  const handleRunAgent = async (job: PipelineJob, agent: Agent) => {
    setIsAgentRunning(true);
    setAgentOutput('');
    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('API Key não configurada.');
      }
      const ai = new GoogleGenAI({ apiKey });

      let context = `Tópico da Pauta: ${job.articleTitle}\n\n`;
      if (job.outputs) {
        for (const [aId, output] of Object.entries(job.outputs)) {
          const prevAgent = agents.find(a => a.id === aId);
          if (prevAgent) {
            context += `--- Output de ${prevAgent.name} (${prevAgent.phase}) ---\n${output}\n\n`;
          }
        }
      }

      const prompt = `Você é o agente: ${agent.name} (${agent.role}).\nSua fase é: ${agent.phase}.\n\nContexto até o momento:\n${context}\n\nInstruções do Sistema:\n${agent.systemPrompt}\n\nCom base no contexto acima, por favor, execute sua tarefa e forneça o resultado.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
      });

      setAgentOutput(response.text || '');
    } catch (error) {
      console.error('Error running agent:', error);
      setFeedbackMsg({ type: 'error', text: 'Erro ao executar o agente.' });
    } finally {
      setIsAgentRunning(false);
    }
  };

  const handleApproveOutput = async (job: PipelineJob, agent: Agent) => {
    if (!agentOutput) return;
    try {
      const nextAgentIndex = agents.findIndex(a => a.id === agent.id) + 1;
      const nextAgent = agents[nextAgentIndex];

      const updatedOutputs = { ...(job.outputs || {}), [agent.id]: agentOutput };
      const updatedPhases = { ...job.phases, [agent.phase]: 'completed' as const };

      let newStatus = job.status;
      let newCurrentAgentId = job.currentAgentId;
      let newCurrentPhase = job.currentPhase;
      let newCompletedAt = job.completedAt;

      if (nextAgent) {
        newCurrentAgentId = nextAgent.id;
        newCurrentPhase = nextAgent.phase;
        updatedPhases[nextAgent.phase] = 'in_progress';
      } else {
        newStatus = 'completed';
        newCurrentAgentId = null;
        newCurrentPhase = null;
        newCompletedAt = Date.now();
      }

      const docRef = doc(db, 'pipeline_jobs', job.id);
      await updateDoc(docRef, {
        outputs: updatedOutputs,
        phases: updatedPhases,
        status: newStatus,
        currentAgentId: newCurrentAgentId,
        currentPhase: newCurrentPhase,
        completedAt: newCompletedAt
      });

      setAgentOutput('');
      if (newStatus === 'completed') {
        setSelectedJob(null);
        setFeedbackMsg({ type: 'success', text: 'Pauta concluída com sucesso!' });
      } else {
        setFeedbackMsg({ type: 'success', text: 'Output aprovado! Avançando para o próximo agente.' });
      }
    } catch (error) {
      setFeedbackMsg({ type: 'error', text: 'Erro ao aprovar output.' });
      handleFirestoreError(error, OperationType.UPDATE, `pipeline_jobs/${job.id}`);
    }
  };

  const renderStatusIndicator = (status: AgentStatus) => {
    switch (status) {
      case 'working':
        return (
          <div className="flex items-center space-x-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-xs font-semibold text-green-600 uppercase tracking-wider">Trabalhando</span>
          </div>
        );
      case 'waiting':
        return (
          <div className="flex items-center space-x-2">
            <span className="h-3 w-3 rounded-full bg-yellow-400"></span>
            <span className="text-xs font-semibold text-yellow-600 uppercase tracking-wider">Aguardando</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center space-x-2">
            <span className="h-3 w-3 rounded-full bg-red-500"></span>
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">Erro</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-2">
            <span className="h-3 w-3 rounded-full bg-gray-300"></span>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ocioso</span>
          </div>
        );
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
            <span className="text-4xl">🤖</span> Agência EsporteMG
          </h1>
          <p className="text-gray-500 mt-1">Painel de Controle da Redação Autônoma</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowNewJobModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
          >
            <Play size={20} />
            Nova Pauta
          </button>
          {agents.length < INITIAL_AGENTS.length && (
            <button
              onClick={() => setShowInitConfirm(true)}
              disabled={isInitializing}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {isInitializing ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
              Sincronizar Agentes
            </button>
          )}
        </div>
      </div>

      {/* Section 1: Pipeline Ativo */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Loader2 className="animate-spin text-green-600" size={24} />
          Pipeline Ativo
        </h2>

        {jobs.filter(j => j.status === 'in_progress').length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            Nenhum artigo em produção no momento.
          </div>
        ) : (
          <div className="space-y-6">
            {jobs.filter(j => j.status === 'in_progress').map(job => (
              <div key={job.id} className="border border-gray-200 rounded-lg p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg text-gray-900">{job.articleTitle}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">Em Progresso</span>
                    <button
                      onClick={() => { setSelectedJob(job); setSelectedAgentId(job.currentAgentId); setAgentOutput(''); }}
                      className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1"
                    >
                      <Settings size={16} />
                      Gerenciar
                    </button>
                  </div>
                </div>

                {/* Step Indicator */}
                <div className="flex items-center justify-between relative">
                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10"></div>
                  {PHASES.map((phase, idx) => {
                    const phaseStatus = job.phases?.[phase] || 'pending';
                    let icon = <Circle size={24} className="text-gray-300 bg-white" />;
                    if (phaseStatus === 'completed') icon = <CheckCircle2 size={24} className="text-green-500 bg-white" />;
                    if (phaseStatus === 'in_progress') icon = <Loader2 size={24} className="text-blue-500 animate-spin bg-white" />;
                    if (phaseStatus === 'error') icon = <AlertCircle size={24} className="text-red-500 bg-white" />;

                    return (
                      <div key={phase} className="flex flex-col items-center gap-2 bg-white px-2">
                        {icon}
                        <span className={`text-xs font-semibold ${phaseStatus === 'in_progress' ? 'text-blue-600' : 'text-gray-500'}`}>
                          {phase}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Grid de Agentes */}
      <section>
        <h2 className="text-2xl font-black text-gray-900 mb-6">Equipe de IA</h2>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-green-600" size={40} /></div>
        ) : (
          <div className="space-y-10">
            {PHASES.map(phase => {
              const phaseAgents = agents.filter(a => a.phase === phase);
              if (phaseAgents.length === 0) return null;

              return (
                <div key={phase}>
                  <h3 className="text-lg font-bold text-gray-700 mb-4 border-b border-gray-200 pb-2">{phase}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {phaseAgents.map(agent => (
                      <div key={agent.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
                          {renderStatusIndicator(agent.status)}
                          <button
                            onClick={() => handleDeleteAgent(agent.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                            title="Excluir Agente"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        <div className="flex items-start gap-4 mb-4">
                          <div className="text-5xl bg-gray-50 p-3 rounded-2xl border border-gray-100">{agent.emoji}</div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-lg leading-tight">{agent.name}</h4>
                            <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${PHASE_COLORS[agent.phase]}`}>
                              {agent.phase}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-6 line-clamp-2 h-10">{agent.role}</p>

                        <button
                          onClick={() => setEditingAgent({ ...agent })}
                          className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors border border-gray-200"
                        >
                          <Settings size={16} />
                          Configurar Agente
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 3: Histórico */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Histórico Recente</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-sm text-gray-500 uppercase tracking-wider">
                <th className="pb-3 font-semibold">Artigo</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Fase Atual</th>
                <th className="pb-3 font-semibold">Data</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {jobs.length === 0 ? (
                <tr><td colSpan={4} className="py-4 text-center text-gray-500">Nenhum histórico encontrado.</td></tr>
              ) : (
                jobs.map(job => (
                  <tr key={job.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="py-3 font-medium text-gray-900">{job.articleTitle}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${job.status === 'completed' ? 'bg-green-100 text-green-800' :
                          job.status === 'error' ? 'bg-red-100 text-red-800' :
                            job.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                        }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-600">{job.currentPhase || '-'}</td>
                    <td className="py-3 text-gray-500">{new Date(job.createdAt).toLocaleString('pt-BR')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal de Edição */}
      {editingAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>{editingAgent.emoji}</span> Configurar {editingAgent.name}
              </h3>
              <button onClick={() => setEditingAgent(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveAgent} className="p-6 overflow-y-auto flex-1 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nome do Agente</label>
                  <input
                    type="text"
                    value={editingAgent.name}
                    onChange={e => setEditingAgent({ ...editingAgent, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fase</label>
                  <select
                    value={editingAgent.phase}
                    onChange={e => setEditingAgent({ ...editingAgent, phase: e.target.value as Phase })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    {PHASES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Role / Descrição Curta</label>
                <input
                  type="text"
                  value={editingAgent.role}
                  onChange={e => setEditingAgent({ ...editingAgent, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">System Prompt (Instruções da IA)</label>
                <p className="text-xs text-gray-500 mb-2">Este é o prompt principal que define o comportamento deste agente.</p>
                <textarea
                  value={editingAgent.systemPrompt}
                  onChange={e => setEditingAgent({ ...editingAgent, systemPrompt: e.target.value })}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                  required
                />
              </div>
            </form>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingAgent(null)}
                className="px-5 py-2 text-gray-700 font-semibold hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAgent}
                className="px-5 py-2 bg-green-600 text-white font-semibold hover:bg-green-700 rounded-lg transition-colors"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gerenciamento de Pauta */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Gerenciar Pauta</h3>
                <p className="text-sm text-gray-500">{selectedJob.articleTitle}</p>
              </div>
              <button onClick={() => { setSelectedJob(null); setSelectedAgentId(null); setAgentOutput(''); }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 flex flex-col md:flex-row gap-6">
              {/* Sidebar with Agents */}
              <div className="w-full md:w-1/3 border-r border-gray-100 pr-6">
                <h4 className="font-bold text-gray-700 mb-4">Progresso</h4>
                <div className="space-y-4">
                  {agents.map((agent, index) => {
                    const isCompleted = selectedJob.outputs && selectedJob.outputs[agent.id];
                    const isCurrent = selectedJob.currentAgentId === agent.id;
                    const isPending = !isCompleted && !isCurrent;
                    const isSelected = selectedAgentId === agent.id;

                    return (
                      <button
                        key={agent.id}
                        onClick={() => {
                          setSelectedAgentId(agent.id);
                          setAgentOutput(selectedJob.outputs?.[agent.id] || '');
                        }}
                        disabled={isPending}
                        className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border transition-colors ${isSelected ? 'ring-2 ring-blue-500' : ''} ${isCurrent ? 'border-blue-500 bg-blue-50' : isCompleted ? 'border-green-200 bg-green-50 hover:bg-green-100' : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'}`}
                      >
                        <div className="mt-1">
                          {isCompleted ? <CheckCircle2 size={18} className="text-green-500" /> : isCurrent ? <Loader2 size={18} className="text-blue-500 animate-spin" /> : <Circle size={18} className="text-gray-300" />}
                        </div>
                        <div>
                          <p className={`font-semibold text-sm ${isCurrent ? 'text-blue-900' : isCompleted ? 'text-green-900' : 'text-gray-500'}`}>{agent.name}</p>
                          <p className="text-xs text-gray-500">{agent.phase}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main Content Area */}
              <div className="w-full md:w-2/3 flex flex-col">
                {selectedAgentId ? (() => {
                  const currentAgent = agents.find(a => a.id === selectedAgentId);
                  if (!currentAgent) return <div className="text-red-500">Agente não encontrado.</div>;

                  const isCompleted = selectedJob.outputs && selectedJob.outputs[currentAgent.id];
                  const isCurrent = selectedJob.currentAgentId === currentAgent.id;

                  return (
                    <>
                      <div className="mb-6">
                        <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                          <span>{currentAgent.emoji}</span> {currentAgent.name}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">{currentAgent.role}</p>
                      </div>

                      {!agentOutput && isCurrent ? (
                        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
                          <div className="text-6xl mb-4">{currentAgent.emoji}</div>
                          <h5 className="text-lg font-bold text-gray-800 mb-2">Aguardando Execução</h5>
                          <p className="text-gray-500 text-sm mb-6 max-w-md">
                            O agente está pronto para processar a pauta com base no contexto anterior e em suas instruções.
                          </p>
                          <button
                            onClick={() => handleRunAgent(selectedJob, currentAgent)}
                            disabled={isAgentRunning}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
                          >
                            {isAgentRunning ? <Loader2 className="animate-spin" size={20} /> : <Play size={20} />}
                            {isAgentRunning ? 'Processando...' : 'Executar Agente'}
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col">
                          <h5 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <CheckCircle2 size={18} className="text-green-500" />
                            Resultado Gerado
                          </h5>
                          <textarea
                            value={agentOutput}
                            onChange={(e) => setAgentOutput(e.target.value)}
                            readOnly={!isCurrent}
                            className={`flex-1 w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm resize-none ${!isCurrent ? 'bg-gray-50' : ''}`}
                            placeholder="O resultado aparecerá aqui..."
                          />
                          {isCurrent && (
                            <div className="flex justify-end gap-3 mt-4">
                              <button
                                onClick={() => handleRunAgent(selectedJob, currentAgent)}
                                disabled={isAgentRunning}
                                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
                              >
                                {isAgentRunning ? <Loader2 className="animate-spin" size={18} /> : <RotateCcw size={18} />}
                                Refazer
                              </button>
                              <button
                                onClick={() => handleApproveOutput(selectedJob, currentAgent)}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center gap-2 transition-colors"
                              >
                                Aprovar e Avançar
                                <ArrowRight size={18} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })() : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <CheckCircle2 size={64} className="text-green-500 mb-4" />
                    <h4 className="text-2xl font-bold text-gray-900 mb-2">Pauta Concluída!</h4>
                    <p className="text-gray-500">Todos os agentes finalizaram suas tarefas com sucesso.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nova Pauta */}
      {showNewJobModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">Nova Pauta</h3>
              <button onClick={() => setShowNewJobModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateJob} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tema ou Título da Pauta</label>
                <input
                  type="text"
                  required
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Análise tática do último jogo do Galo"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowNewJobModal(false)}
                  className="px-5 py-2 text-gray-700 font-semibold hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white font-semibold hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Play size={18} />
                  Iniciar Pauta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Inicialização */}
      {showInitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Inicializar Agentes</h3>
              <p className="text-gray-600">Isso irá criar os agentes padrão no banco de dados. Deseja continuar?</p>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowInitConfirm(false)}
                className="px-5 py-2 text-gray-700 font-semibold hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={executeInitializeAgents}
                className="px-5 py-2 bg-green-600 text-white font-semibold hover:bg-green-700 rounded-lg transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {agentToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir Agente</h3>
              <p className="text-gray-600">Tem certeza que deseja excluir este agente? Esta ação não pode ser desfeita.</p>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setAgentToDelete(null)}
                className="px-5 py-2 text-gray-700 font-semibold hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={executeDeleteAgent}
                className="px-5 py-2 bg-red-600 text-white font-semibold hover:bg-red-700 rounded-lg transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de Feedback */}
      {feedbackMsg && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg font-semibold text-white z-50 flex items-center gap-2 ${feedbackMsg.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {feedbackMsg.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          {feedbackMsg.text}
          <button onClick={() => setFeedbackMsg(null)} className="ml-4 hover:opacity-75">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
