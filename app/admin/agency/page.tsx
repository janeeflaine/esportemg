"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  doc, getDoc, collection, setDoc, getDocs
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
import { GoogleGenAI } from '@google/genai';
import { Play, Save, Plus, X } from 'lucide-react';

const nodeTypes = {
  trigger: TriggerNode,
  agent: AgentNode,
};

// Available Agents to Drag
const AVAILABLE_AGENTS = [
  { id: 'seo_orchestrator', label: 'Orquestrador SEO', role: 'Define a Estratégia Inicial', emoji: '🧠' },
  { id: 'research_specialist', label: 'Pesquisador', role: 'Busca Dados e Fatos', emoji: '🔍' },
  { id: 'writer_standard', label: 'Redator Padrão', role: 'Escreve a Matéria Base', emoji: '✍️' },
  { id: 'writer_opinion', label: 'Redator Opinativo', role: 'Escreve com Ponto de Vista', emoji: '🗣️' },
  { id: 'writer_tactical', label: 'Analista Tático', role: 'Análise de Jogo e Esquemas', emoji: '📊' },
  { id: 'copywriter_social', label: 'Copywriter Social', role: 'Gera Posts Curtos (Twitter)', emoji: '📱' },
  { id: 'copywriter_visual', label: 'Roteirista Visual', role: 'Roteiros (TikTok/Reels)', emoji: '🎬' },
  { id: 'creative_director', label: 'Diretor de Arte', role: 'Gera Prompts de Imagem', emoji: '🎨' },
  { id: 'reviewer_grammar', label: 'Revisor Ouro', role: 'Corrige Erros e Estilo', emoji: '✅' },
  { id: 'reviewer_seo', label: 'Otimizador SEO', role: 'Ajusta Palavras-chave/Tags', emoji: '📈' },
  { id: 'editor_in_chief', label: 'Editor-Chefe', role: 'Aprovação Final da Matéria', emoji: '👑' },
  { id: 'publisher_newsletter', label: 'Agente Newsletter', role: 'Formata para E-mail', emoji: '✉️' }
];

let id = 0;
const getId = () => `dndnode_${id++}`;

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

  // Edit Modal State
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingPrompt, setEditingPrompt] = useState('');

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

  // Listen for 'edit-agent' events from AgentNode
  useEffect(() => {
    const handler = (e: Event) => {
      const { id } = (e as CustomEvent).detail;
      setNodes((nds) => {
        const node = nds.find(n => n.id === id);
        if (node) {
          setEditingPrompt((node.data as any).systemPrompt || '');
          setEditingNodeId(id);
        }
        return nds;
      });
    };
    window.addEventListener('edit-agent', handler);
    return () => window.removeEventListener('edit-agent', handler);
  }, [setNodes]);

  const onConnect = useCallback((params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)), []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowInstance) return;

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      let newNode: Node;

      if (type === 'trigger') {
        newNode = {
          id: getId(),
          type,
          position,
          data: { topic: '' },
        };
      } else {
        const agentData = AVAILABLE_AGENTS.find(a => a.id === type);
        newNode = {
          id: getId(),
          type: 'agent',
          position,
          data: {
            ...agentData,
            status: 'idle',
            output: '',
            systemPrompt: 'Você é um assistente útil e focado em jornalismo esportivo.' // We should load this from DB ideally, keeping simple for now
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
      const provider = process.env.NEXT_PUBLIC_AI_PROVIDER || 'gemini';
      const prompt = `Contexto Anterior:\n${contextString}\n\nPor favor, execute sua tarefa baseda no seu papel: ${node.data.role}.\nResponda em Português do Brasil.`;

      let outputText = '';

      if (provider === 'gemini') {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
        const ai = new GoogleGenAI({ apiKey: apiKey || '' });
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: `System: ${node.data.systemPrompt || 'Você é um assistente'}\n\nUser: ${prompt}`,
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
            prompt: `System: ${node.data.systemPrompt}\n\nUser:\n${prompt}`,
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

    // Reset statuses
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: n.type === 'trigger' ? 'success' : 'idle', output: '' } })));

    try {
      // Find trigger
      const triggerNode = nodes.find(n => n.type === 'trigger');
      if (!triggerNode) throw new Error("Cadê o Gatilho? Arraste um nó 'Gatilho' para a tela.");

      const topicContext = `Tema da Pauta: ${triggerNode.data.topic}`;

      // Find children of trigger
      const directChildrenEdges = edges.filter(e => e.source === triggerNode.id);

      // Simple Breadth-First Execution (Level by Level)
      let currentLevelNodes = directChildrenEdges.map(e => e.target);
      let contextMap: Record<string, string> = { [triggerNode.id]: topicContext };

      while (currentLevelNodes.length > 0) {
        // Run all nodes in this level concurrently
        const promises = currentLevelNodes.map(async (targetId) => {
          // Gather incoming context from all sources pointing to this target
          const incomingEdges = edges.filter(e => e.target === targetId);
          let inputContext = '';
          incomingEdges.forEach(edge => {
            inputContext += `\n[Da Etapa Anterior]: ${contextMap[edge.source] || ''}\n`;
          });

          // Run Node
          const out = await runNode(targetId, inputContext);
          contextMap[targetId] = out || '';
          return targetId;
        });

        await Promise.all(promises);

        // Find next level
        let nextLevel = new Set<string>();
        currentLevelNodes.forEach(nodeId => {
          edges.filter(e => e.source === nodeId).forEach(e => nextLevel.add(e.target));
        });
        currentLevelNodes = Array.from(nextLevel);
      }

      alert("Workflow Concluído com Sucesso!");
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
          <h1 className="text-2xl font-black flex items-center gap-2">
            🤖 Agência Flow <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">Beta</span>
          </h1>
          <p className="text-sm text-gray-500">Desenhe os caminhos da IA (Estilo n8n)</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRunWorkflow}
            disabled={isRunning}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg disabled:opacity-50"
          >
            <Play size={18} fill="currentColor" /> {isRunning ? 'Processando...' : 'Rodar FLuxo'}
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden" style={{ minHeight: "600px" }}>

        {/* Sidebar */}
        <aside className="w-80 bg-gray-50 border-r overflow-y-auto p-4 flex flex-col gap-4 shadow-inner z-10 shrink-0">
          <div className="text-sm font-bold text-gray-400 uppercase tracking-wider">Gatilhos</div>
          <div
            onDragStart={(e) => { e.dataTransfer.setData('application/reactflow', 'trigger'); }}
            draggable
            className="bg-indigo-500 text-white p-3 rounded-lg shadow cursor-grab hover:bg-indigo-600 transition flex items-center gap-3"
          >
            <span className="text-xl">⚡</span> Gatilho: Pauta
          </div>

          <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mt-4">Agentes IA</div>
          {AVAILABLE_AGENTS.map(agent => (
            <div
              key={agent.id}
              onDragStart={(e) => { e.dataTransfer.setData('application/reactflow', agent.id); }}
              draggable
              className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm cursor-grab hover:border-indigo-400 transition flex gap-3 items-center"
            >
              <div className="text-2xl bg-gray-50 p-2 rounded">{agent.emoji}</div>
              <div>
                <div className="font-bold text-gray-800">{agent.label}</div>
                <div className="text-xs text-gray-500">{agent.role}</div>
              </div>
            </div>
          ))}\n        </aside>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden" ref={reactFlowWrapper}>
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
              <Controls />
              <Background gap={16} size={1} />
              <Panel position="top-right" className="bg-white p-2 rounded shadow text-xs text-gray-500">
                Powered by {process.env.NEXT_PUBLIC_AI_PROVIDER || 'gemini'}
              </Panel>
            </ReactFlow>
          </ReactFlowProvider>
        </div>
      </div>

      {/* Edit Agent Modal */}
      {editingNodeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 m-4 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">✏️ Editar Prompt do Agente</h2>
              <button onClick={() => setEditingNodeId(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <p className="text-sm text-gray-500">Escreva as instruções que este agente deve seguir ao executar sua tarefa.</p>
            <textarea
              className="w-full border border-gray-300 rounded-xl p-3 text-sm h-64 font-mono resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={editingPrompt}
              onChange={e => setEditingPrompt(e.target.value)}
              placeholder="Você é um redator esportivo especializado em..."
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingNodeId(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setNodes(nds => nds.map(n => {
                    if (n.id === editingNodeId) {
                      return { ...n, data: { ...n.data, systemPrompt: editingPrompt } };
                    }
                    return n;
                  }));
                  setEditingNodeId(null);
                }}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
