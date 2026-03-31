"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  doc, getDoc, collection, setDoc, getDocs, query, deleteDoc
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import AdminLayout from '@/components/AdminLayout';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  Edge,
  Node,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import TriggerNode from '@/components/flow/TriggerNode';
import AgentNode from '@/components/flow/AgentNode';
import ResearcherNode from '@/components/flow/ResearcherNode';
import { GoogleGenAI } from '@google/genai';
import { Play, Save, Plus, X, ChevronRight, FileText, Copy, CheckCheck } from 'lucide-react';

const nodeTypes = {
  trigger: TriggerNode,
  agent: AgentNode,
  researcher: ResearcherNode,
};

// Available Agents to Drag
const AVAILABLE_AGENTS = [
  { id: 'research_specialist', label: 'Pesquisador Turbo', role: 'Busca Dados na Internet (Tavily)', emoji: '🔍', nodeType: 'researcher' },
  { id: 'seo_orchestrator', label: 'Orquestrador SEO', role: 'Define a Estratégia Inicial', emoji: '🧠', nodeType: 'agent' },
  { id: 'writer_standard', label: 'Redator Padrão', role: 'Escreve a Matéria Base', emoji: '✍️', nodeType: 'agent' },
  { id: 'writer_opinion', label: 'Redator Opinativo', role: 'Escreve com Ponto de Vista', emoji: '🗣️', nodeType: 'agent' },
  { id: 'writer_standard_no_topic', label: 'Escritor Criativo', role: 'Conteúdo sem Pauta Fixa', emoji: '✒️', nodeType: 'agent' },
  { id: 'writer_tactical', label: 'Analista Tático', role: 'Análise de Jogo e Esquemas', emoji: '📊', nodeType: 'agent' },
  { id: 'copywriter_social', label: 'Copywriter Social', role: 'Gera Posts Curtos (Twitter)', emoji: '📱', nodeType: 'agent' },
  { id: 'copywriter_visual', label: 'Roteirista Visual', role: 'Roteiros (TikTok/Reels)', emoji: '🎬', nodeType: 'agent' },
  { id: 'creative_director', label: 'Diretor de Arte', role: 'Gera Prompts de Imagem', emoji: '🎨', nodeType: 'agent' },
  { id: 'reviewer_grammar', label: 'Revisor Ouro', role: 'Corrige Erros e Estilo', emoji: '✅', nodeType: 'agent' },
  { id: 'reviewer_seo', label: 'Otimizador SEO', role: 'Ajusta Palavras-chave/Tags', emoji: '📈', nodeType: 'agent' },
  { id: 'editor_in_chief', label: 'Editor-Chefe', role: 'Aprovação Final da Matéria', emoji: '👑', nodeType: 'agent' },
  { id: 'publisher_newsletter', label: 'Agente Newsletter', role: 'Formata para E-mail', emoji: '✉️', nodeType: 'agent' }
];

let idCounter = 0;
const getId = () => `dndnode_${idCounter++}`;

export default function AgencyFlowDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();

  // Workflow State
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Results Panel State
  const [showResults, setShowResults] = useState(false);
  const [workflowResults, setWorkflowResults] = useState<Array<{ nodeId: string; label: string; emoji: string; output: string; type: string }>>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Workflow Selection State
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string>('main');
  const [activeWorkflowName, setActiveWorkflowName] = useState('Fluxo Principal');

  // Edit Modal State
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState('');
  const [editingUrls, setEditingUrls] = useState(''); // newline-separated list for researcher

  // Workflow Name Modal State
  const [workflowModalOpen, setWorkflowModalOpen] = useState(false);
  const [workflowModalName, setWorkflowModalName] = useState('');
  const [workflowModalTargetId, setWorkflowModalTargetId] = useState<string | null>(null); // null = new, string = rename

  // Delete Confirmation Modal State
  const [deleteModalFlowId, setDeleteModalFlowId] = useState<string | null>(null);
  const deleteModalFlow = workflows.find(w => w.id === deleteModalFlowId);

  useEffect(() => {
    setIsClient(true);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true);
        } else {
          router.push('/login');
        }
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Load Workflow List
  const loadWorkflowList = useCallback(async () => {
    try {
      const q = query(collection(db, 'workflows'));
      const querySnapshot = await getDocs(q);
      const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setWorkflows(list);
    } catch (error) {
      console.error('Erro ao listar workflows:', error);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadWorkflowList();
  }, [isAdmin, loadWorkflowList]);

  // Load Specific Workflow data
  useEffect(() => {
    if (!isAdmin || !activeWorkflowId) return;

    const loadWorkflow = async () => {
      try {
        const workflowDoc = await getDoc(doc(db, 'workflows', activeWorkflowId));
        if (workflowDoc.exists()) {
          const data = workflowDoc.data();

          // Enrich nodes with callbacks
          const enrichedNodes = (data.nodes || []).map((n: any) => {
            if (n.type === 'trigger') {
              return {
                ...n,
                data: {
                  ...n.data,
                  onTopicChange: (val: string) => {
                    setNodes((nds) => nds.map((node) => node.id === n.id ? { ...node, data: { ...node.data, topic: val } } : node));
                  },
                  onScheduleChange: (enabled: boolean, time: string) => {
                    setNodes((nds) => nds.map((node) => node.id === n.id ? { ...node, data: { ...node.data, isScheduled: enabled, schedule: time } } : node));
                  }
                }
              };
            }
            return n;
          });

          setNodes(enrichedNodes);
          setEdges(data.edges || []);
          setActiveWorkflowName(data.name || 'Fluxo Sem Nome');
        } else {
          setNodes([]);
          setEdges([]);
        }
      } catch (error) {
        console.error('Erro ao carregar workflow:', error);
      }
    };

    loadWorkflow();
  }, [isAdmin, activeWorkflowId, setNodes, setEdges]);

  // Create New Workflow — opens modal
  const handleCreateWorkflow = () => {
    setWorkflowModalName('');
    setWorkflowModalTargetId(null);
    setWorkflowModalOpen(true);
  };

  // Rename Workflow — opens modal with current name
  const handleRenameWorkflow = (flowId: string) => {
    const workflow = workflows.find(w => w.id === flowId);
    if (!workflow) return;
    setWorkflowModalName(workflow.name || '');
    setWorkflowModalTargetId(flowId);
    setWorkflowModalOpen(true);
  };

  // Confirm create/rename
  const handleWorkflowModalConfirm = async () => {
    const name = workflowModalName.trim();
    if (!name) return;
    setWorkflowModalOpen(false);

    if (workflowModalTargetId === null) {
      // CREATE
      const newId = `flow_${Date.now()}`;
      const newWorkflow = { name, nodes: [], edges: [], createdAt: new Date().toISOString() };
      try {
        setWorkflows(prev => [...prev, { id: newId, ...newWorkflow }]);
        await setDoc(doc(db, 'workflows', newId), newWorkflow);
        setActiveWorkflowId(newId);
        setActiveWorkflowName(name);
        setNodes([]);
        setEdges([]);
      } catch (error: any) {
        console.error('Erro ao criar:', error);
        alert('Erro ao criar fluxo: ' + error.message);
        loadWorkflowList();
      }
    } else {
      // RENAME
      const flowId = workflowModalTargetId;
      try {
        setWorkflows(prev => prev.map(w => w.id === flowId ? { ...w, name } : w));
        if (activeWorkflowId === flowId) setActiveWorkflowName(name);
        await setDoc(doc(db, 'workflows', flowId), { name }, { merge: true });
      } catch (error) {
        console.error('Erro ao renomear:', error);
        alert('Erro ao renomear fluxo.');
        loadWorkflowList();
      }
    }
  };

  // Delete Workflow
  const handleDeleteWorkflow = (flowId: string) => {
    if (flowId === 'main') return; // protect main
    setDeleteModalFlowId(flowId);
  };

  const handleDeleteWorkflowConfirm = async () => {
    const flowId = deleteModalFlowId;
    if (!flowId) return;
    setDeleteModalFlowId(null);

    try {
      // Remove from local state immediately
      setWorkflows(prev => prev.filter(w => w.id !== flowId));
      // Switch to main if we were on that flow
      if (activeWorkflowId === flowId) {
        setActiveWorkflowId('main');
        setActiveWorkflowName('Fluxo Principal');
      }
      // Delete from Firestore
      await deleteDoc(doc(db, 'workflows', flowId));
    } catch (error: any) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir: ' + error.message);
      loadWorkflowList(); // Re-sync on failure
    }
  };

  // Save Workflow to Firebase
  const handleSaveWorkflow = async () => {
    setIsSaving(true);
    try {
      // Clean nodes from non-serializable data before saving
      const cleanNodes = nodes.map(n => {
        const { onTopicChange, onScheduleChange, ...restData } = n.data as any;
        // JSON round-trip strips undefined values (Firestore rejects them)
        return JSON.parse(JSON.stringify({ ...n, data: restData }));
      });

      await setDoc(doc(db, 'workflows', activeWorkflowId), {
        name: activeWorkflowName,
        nodes: cleanNodes,
        edges,
        updatedAt: new Date().toISOString()
      });
      loadWorkflowList();
      alert(`Fluxo "${activeWorkflowName}" salvo com sucesso!`);
    } catch (error) {
      console.error('Erro ao salvar workflow:', error);
      alert('Erro ao salvar fluxo.');
    } finally {
      setIsSaving(false);
    }
  };

  // Listen for 'edit-agent' events from AgentNode
  useEffect(() => {
    const handler = (e: Event) => {
      const { id } = (e as CustomEvent).detail;
      setNodes((nds) => {
        const node = nds.find(n => n.id === id);
        if (node) {
          setEditingPrompt((node.data as any).systemPrompt || '');
          setEditingUrls(((node.data as any).urls || []).join('\n'));
          setEditingNodeId(id);
        }
        return nds;
      });
    };
    window.addEventListener('edit-agent', handler);
    return () => window.removeEventListener('edit-agent', handler);
  }, [setNodes]);

  const onConnect = useCallback((params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!reactFlowInstance) return;

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      let newNode: Node;

      if (type === 'trigger') {
        const nodeId = getId();
        newNode = {
          id: nodeId,
          type,
          position,
          data: {
            topic: '',
            onTopicChange: (val: string) => {
              setNodes((nds) => nds.map((node) => node.id === nodeId ? { ...node, data: { ...node.data, topic: val } } : node));
            },
            onScheduleChange: (enabled: boolean, time: string) => {
              setNodes((nds) => nds.map((node) => node.id === nodeId ? { ...node, data: { ...node.data, isScheduled: enabled, schedule: time } } : node));
            }
          },
        };
      } else {
        const agentData = AVAILABLE_AGENTS.find(a => a.id === type);
        const resolvedNodeType = (agentData as any)?.nodeType || 'agent';
        newNode = {
          id: getId(),
          type: resolvedNodeType,
          position,
          data: {
            ...agentData,
            status: 'idle',
            output: '',
            urls: resolvedNodeType === 'researcher' ? [] : undefined,
            systemPrompt: 'Você é um assistente útil e focado em jornalismo esportivo.'
          },
        };
      }

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const runNode = async (nodeId: string, contextString: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;

    setNodes((nds) => nds.map((n) => {
      if (n.id === nodeId) { n.data = { ...n.data, status: 'running' }; }
      return n;
    }));

    try {
      let outputText = '';

      // === RESEARCHER (Tavily Web Search) ===
      if (node.type === 'researcher') {
        const urls: string[] = (node.data as any).urls || [];
        // Extract the main topic from context
        const topicMatch = contextString.match(/Tema da Pauta:\s*(.+)/);
        const searchQuery = topicMatch ? topicMatch[1].trim() : contextString.slice(0, 200);

        setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, status: 'running' } } : n));

        const searchResp = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: searchQuery, urls: urls.length > 0 ? urls : undefined, maxResults: 5 })
        });

        const searchData = await searchResp.json();

        if (!searchResp.ok) throw new Error(searchData.error || 'Erro na busca Tavily');

        // Format results into a readable digest for the next AI agent
        const resultLines = (searchData.results || []).map((r: any, i: number) =>
          `[${i + 1}] ${r.title}\nURL: ${r.url}\nResumo: ${r.content?.slice(0, 400)}...`
        ).join('\n\n');

        outputText = [
          `🔍 RESULTADO DA PESQUISA: "${searchQuery}"`,
          searchData.answer ? `\n📌 Resposta Direta: ${searchData.answer}` : '',
          `\n\n📰 Notícias Encontradas:\n${resultLines}`
        ].filter(Boolean).join('');

        setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, status: 'success', output: outputText } } : n));
        return outputText;
      }

      // === AI AGENTS (Ollama / Gemini) ===
      const provider = process.env.NEXT_PUBLIC_AI_PROVIDER || 'gemini';
      const promptText = `Contexto Anterior:\n${contextString}\n\nPor favor, execute sua tarefa baseada no seu papel: ${node.data.role}.\nResponda em Português do Brasil.`;

      if (provider === 'gemini') {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        const ai = new GoogleGenAI({ apiKey: apiKey || '' });
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: `System: ${node.data.systemPrompt || 'Você é um assistente'}\n\nUser: ${promptText}`,
        });
        outputText = response.text || '';
      } else if (provider === 'ollama') {
        const ollamaUrl = process.env.NEXT_PUBLIC_OLLAMA_URL || 'http://localhost:11434/api/generate';
        const ollamaModel = process.env.NEXT_PUBLIC_OLLAMA_MODEL || 'llama3';

        const response = await fetch(ollamaUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ollamaModel,
            prompt: `System: ${node.data.systemPrompt}\n\nUser:\n${promptText}`,
            stream: false
          })
        });
        const data = await response.json();
        outputText = data.response;
      }

      setNodes((nds) => nds.map((n) => {
        if (n.id === nodeId) { n.data = { ...n.data, status: 'success', output: outputText }; }
        return n;
      }));

      return outputText;
    } catch (e: any) {
      setNodes((nds) => nds.map((n) => {
        if (n.id === nodeId) { n.data = { ...n.data, status: 'error', error: e.message }; }
        return n;
      }));
      throw e;
    }
  };

  const handleRunWorkflow = async () => {
    setIsRunning(true);
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: n.type === 'trigger' ? 'success' : 'idle', output: '' } })));

    try {
      const triggerNode = nodes.find(n => n.type === 'trigger');
      if (!triggerNode) throw new Error("Cadê o Gatilho? Arraste um nó 'Gatilho' para a tela.");

      const topicContext = `Tema da Pauta: ${triggerNode.data.topic}`;
      const directChildrenEdges = edges.filter(e => e.source === triggerNode.id);
      let currentLevelNodes = directChildrenEdges.map(e => e.target);
      let contextMap: Record<string, string> = { [triggerNode.id]: topicContext };

      while (currentLevelNodes.length > 0) {
        const promises = currentLevelNodes.map(async (targetId) => {
          const incomingEdges = edges.filter(e => e.target === targetId);
          let inputContext = '';
          incomingEdges.forEach(edge => {
            inputContext += `\n[Da Etapa Anterior]: ${contextMap[edge.source] || ''}\n`;
          });

          const out = await runNode(targetId, inputContext);
          contextMap[targetId] = out || '';
          return targetId;
        });

        await Promise.all(promises);
        let nextLevel = new Set<string>();
        currentLevelNodes.forEach(nodeId => {
          edges.filter(e => e.source === nodeId).forEach(e => nextLevel.add(e.target));
        });
        currentLevelNodes = Array.from(nextLevel);
      }
      // Collect all results for the panel
      const results: Array<{ nodeId: string; label: string; emoji: string; output: string; type: string }> = [];
      for (const [nId, output] of Object.entries(contextMap)) {
        const node = nodes.find(n => n.id === nId);
        if (node && node.type !== 'trigger' && output) {
          results.push({
            nodeId: nId,
            label: (node.data as any).label || 'Agente',
            emoji: (node.data as any).emoji || '🤖',
            output: output,
            type: node.type || 'agent'
          });
        }
      }
      setWorkflowResults(results);
      setShowResults(true);
    } catch (error: any) {
      alert("Erro na execução: " + error.message);
    } finally {
      setIsRunning(false);
    }
  };

  if (!isAdmin || !isClient) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] relative w-full overflow-hidden">
      {/* Top Header */}
      <div className="bg-white p-4 border-b flex justify-between items-center shadow-sm z-10">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black flex items-center gap-2">
              🤖 Agência Flow <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">Beta</span>
            </h1>
            <div className="h-6 w-px bg-gray-200 mx-2"></div>
            <input
              type="text"
              value={activeWorkflowName}
              onChange={(e) => setActiveWorkflowName(e.target.value)}
              className="text-xl font-bold text-indigo-600 bg-transparent border-b border-transparent hover:border-indigo-200 focus:border-indigo-500 focus:outline-none transition-colors px-1"
              title="Clique para renomear este fluxo"
            />
          </div>
          <p className="text-sm text-gray-500 italic mt-1 font-medium">Multi-Fluxo com Agendamento 📅</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSaveWorkflow}
            disabled={isSaving}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-sm disabled:opacity-50 transition-all active:scale-95"
          >
            <Save size={18} /> {isSaving ? 'Salvando...' : 'Salvar Fluxo'}
          </button>
          <button
            onClick={handleRunWorkflow}
            disabled={isRunning}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all active:scale-95"
          >
            <Play size={18} fill="currentColor" /> {isRunning ? 'Processando...' : 'Rodar FLuxo'}
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">

        {/* 1. Workflows Sidebar */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-20 shrink-0">
          <div className="p-4 flex flex-col gap-5">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Meus Fluxos</span>
              <button
                onClick={handleCreateWorkflow}
                className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg text-indigo-400 border border-indigo-500/20 transition-all active:scale-95"
                title="Novo Fluxo"
              >
                <Plus size={14} />
              </button>
            </div>

            <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              {workflows.map(flow => (
                <div
                  key={flow.id}
                  onClick={() => setActiveWorkflowId(flow.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer flex items-center justify-between group border ${activeWorkflowId === flow.id
                    ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold shadow-[0_0_15px_rgba(79,70,229,0.2)]'
                    : 'bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200 shadow-sm'
                    }`}
                >
                  <span className="truncate flex-1">{flow.name || 'Sem Nome'}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRenameWorkflow(flow.id); }}
                      className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-indigo-400"
                      title="Renomear"
                    >
                      <Save size={12} className="opacity-70" />
                    </button>
                    {flow.id !== 'main' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteWorkflow(flow.id); }}
                        className="p-1 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400"
                        title="Excluir"
                      >
                        <X size={12} className="text-slate-500 group-hover:text-red-400" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* 2. Components Sidebar */}
        <aside className="w-72 bg-white border-r overflow-y-auto p-5 flex flex-col gap-6 shadow-inner z-10 shrink-0">
          <div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Gatilhos</div>
            <div
              onDragStart={(e) => { e.dataTransfer.setData('application/reactflow', 'trigger'); }}
              draggable
              className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg cursor-grab hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-4 border-b-4 border-indigo-800"
            >
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl shadow-inner">⚡</div>
              <div className="font-bold">Gatilho: Pauta</div>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 font-black">Agentes IA</div>
            <div className="grid gap-3">
              {AVAILABLE_AGENTS.map(agent => (
                <div
                  key={agent.id}
                  onDragStart={(e) => { e.dataTransfer.setData('application/reactflow', agent.id); }}
                  draggable
                  className="bg-white border border-gray-100 p-3 rounded-2xl shadow-sm cursor-grab hover:border-indigo-400 hover:shadow-md transition-all active:scale-95 flex gap-4 items-center group"
                >
                  <div className="text-2xl bg-gray-50 p-2.5 rounded-xl group-hover:bg-indigo-50 transition-colors shadow-inner">{agent.emoji}</div>
                  <div className="min-w-0">
                    <div className="font-bold text-gray-800 text-sm truncate">{agent.label}</div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{agent.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* 3. Canvas */}
        <div className="flex-1 relative overflow-hidden bg-slate-50" ref={reactFlowWrapper}>
          <ReactFlowProvider>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              nodeTypes={nodeTypes}
              fitView
              className="bg-slate-50"
            >
              <Controls className="!bg-white !border-gray-200 !shadow-xl rounded-xl" />
              <Background gap={20} size={1} color="#e2e8f0" />
              <Panel position="bottom-left" className="bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm text-[10px] text-gray-500 font-bold border border-gray-100 flex items-center gap-2 m-4">
                PROVIDER: {process.env.NEXT_PUBLIC_AI_PROVIDER?.toUpperCase() || 'GEMINI'}
              </Panel>
            </ReactFlow>
          </ReactFlowProvider>
        </div>
      </div>

      {/* Results Panel (Slide-in from right) */}
      {showResults && workflowResults.length > 0 && (
        <div className="fixed inset-0 z-40 flex">
          {/* Backdrop */}
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={() => setShowResults(false)} />
          {/* Panel */}
          <div className="w-[520px] bg-white shadow-2xl flex flex-col animate-in slide-in-from-right" style={{ animation: 'slideInRight 0.3s ease-out' }}>
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-5 flex justify-between items-center text-white shrink-0">
              <div>
                <h2 className="text-lg font-black flex items-center gap-2">
                  <FileText size={20} /> Resultados do Fluxo
                </h2>
                <p className="text-xs text-green-100 mt-1">{workflowResults.length} etapa(s) concluída(s)</p>
              </div>
              <button onClick={() => setShowResults(false)} className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {workflowResults.map((result, idx) => (
                <div key={result.nodeId} className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                  {/* Node Label */}
                  <div className={`px-4 py-2.5 flex items-center justify-between ${result.type === 'researcher' ? 'bg-blue-50 border-b border-blue-100' : 'bg-indigo-50 border-b border-indigo-100'}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{result.emoji}</span>
                      <span className="font-bold text-sm text-gray-800">{result.label}</span>
                      <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">Etapa {idx + 1}</span>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(result.output);
                        setCopiedId(result.nodeId);
                        setTimeout(() => setCopiedId(null), 2000);
                      }}
                      className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-indigo-600 transition-colors px-2 py-1 rounded-lg hover:bg-white"
                      title="Copiar texto"
                    >
                      {copiedId === result.nodeId ? <><CheckCheck size={13} className="text-green-500" /> Copiado!</> : <><Copy size={13} /> Copiar</>}
                    </button>
                  </div>
                  {/* Output */}
                  <div className="p-4 max-h-[300px] overflow-y-auto">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{result.output}</pre>
                  </div>
                </div>
              ))}
            </div>
            {/* Footer */}
            <div className="border-t p-4 bg-gray-50 shrink-0">
              <button
                onClick={() => {
                  const allText = workflowResults.map((r, i) => `--- ${r.emoji} ${r.label} (Etapa ${i + 1}) ---\n${r.output}`).join('\n\n');
                  navigator.clipboard.writeText(allText);
                  setCopiedId('all');
                  setTimeout(() => setCopiedId(null), 2000);
                }}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {copiedId === 'all' ? <><CheckCheck size={16} /> Tudo Copiado!</> : <><Copy size={16} /> Copiar Tudo</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Agent Modal */}
      {editingNodeId && (() => {
        const editingNode = nodes.find(n => n.id === editingNodeId);
        const isResearcher = editingNode?.type === 'researcher';
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100">
              <div className={`p-6 flex justify-between items-center text-white ${isResearcher ? 'bg-blue-600' : 'bg-indigo-600'}`}>
                <div>
                  <h2 className="text-xl font-black">
                    {isResearcher ? '🌐 Configurar Pesquisador Turbo' : '✏️ Editar Prompt'}
                  </h2>
                  <p className="text-xs text-white/70 font-medium uppercase tracking-widest mt-1">
                    {isResearcher ? 'Defina os sites de busca (Tavily)' : 'Configurações do Agente'}
                  </p>
                </div>
                <button
                  onClick={() => setEditingNodeId(null)}
                  className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 flex flex-col gap-4">
                {isResearcher ? (
                  <>
                    <p className="text-sm text-gray-500 leading-relaxed font-medium">
                      Insira um site por linha. O pesquisador irá buscar notícias <strong>dentro dessas URLs</strong>.
                      Deixe vazio para busca geral na web.
                    </p>
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 text-xs text-blue-700 font-mono space-y-1">
                      <div>Exemplos:</div>
                      <div>ge.globo.com</div>
                      <div>espn.com.br</div>
                      <div>goal.com/br</div>
                    </div>
                    <textarea
                      className="w-full border-2 border-gray-100 rounded-2xl p-4 text-sm h-40 font-mono resize-none focus:outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-500/5 transition-all"
                      value={editingUrls}
                      onChange={e => setEditingUrls(e.target.value)}
                      placeholder="ge.globo.com\nespn.com.br\nmaisquerido.com.br"
                    />
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 leading-relaxed font-medium">Instruções para a IA: Defina como o agente deve se comportar e o que deve priorizar.</p>
                    <textarea
                      className="w-full border-2 border-gray-100 rounded-2xl p-4 text-sm h-64 font-mono resize-none focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/5 transition-all"
                      value={editingPrompt}
                      onChange={e => setEditingPrompt(e.target.value)}
                      placeholder="Ex: Você é um redator esportivo especializado no Cruzeiro..."
                    />
                  </>
                )}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setEditingNodeId(null)}
                    className="px-6 py-3 rounded-xl border-2 border-gray-100 text-gray-500 font-bold hover:bg-gray-50 transition-all active:scale-95"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      setNodes(nds => nds.map(n => {
                        if (n.id === editingNodeId) {
                          if (isResearcher) {
                            const urlList = editingUrls.split('\n').map(u => u.trim()).filter(Boolean);
                            return { ...n, data: { ...n.data, urls: urlList } };
                          }
                          return { ...n, data: { ...n.data, systemPrompt: editingPrompt } };
                        }
                        return n;
                      }));
                      setEditingNodeId(null);
                    }}
                    className={`px-6 py-3 rounded-xl text-white font-black shadow-lg transition-all active:scale-95 ${isResearcher ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Workflow Name Modal (Create / Rename) */}
      {workflowModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100">
            <div className="bg-indigo-600 p-5 flex justify-between items-center text-white">
              <h2 className="text-lg font-black">
                {workflowModalTargetId === null ? '➕ Novo Fluxo' : '✏️ Renomear Fluxo'}
              </h2>
              <button
                onClick={() => setWorkflowModalOpen(false)}
                className="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <input
                type="text"
                autoFocus
                value={workflowModalName}
                onChange={e => setWorkflowModalName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleWorkflowModalConfirm(); if (e.key === 'Escape') setWorkflowModalOpen(false); }}
                className="w-full border-2 border-gray-100 rounded-2xl px-4 py-3 text-base font-semibold focus:outline-none focus:border-indigo-400 transition-all"
                placeholder="Ex: Fluxo Matinal, Noturno..."
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setWorkflowModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border-2 border-gray-100 text-gray-500 font-bold hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleWorkflowModalConfirm}
                  disabled={!workflowModalName.trim()}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-black hover:bg-indigo-700 disabled:opacity-40 transition-all active:scale-95"
                >
                  {workflowModalTargetId === null ? 'Criar' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalFlowId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100">
            <div className="bg-red-600 p-5 text-white">
              <h2 className="text-lg font-black">🗑️ Excluir Fluxo</h2>
              <p className="text-sm text-red-100 mt-1">Esta ação não pode ser desfeita.</p>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <p className="text-gray-700 font-medium text-sm leading-relaxed">
                Tem certeza que deseja excluir o fluxo{' '}
                <strong className="text-gray-900">&ldquo;{deleteModalFlow?.name || 'Sem Nome'}&rdquo;</strong>?
                Todos os agentes e conexões serão perdidos permanentemente.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteModalFlowId(null)}
                  className="flex-1 py-3 rounded-xl border-2 border-gray-100 text-gray-500 font-bold hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteWorkflowConfirm}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white font-black hover:bg-red-700 transition-all active:scale-95"
                >
                  Sim, Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
