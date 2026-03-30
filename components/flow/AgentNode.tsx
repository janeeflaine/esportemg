import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Loader2, CheckCircle2, AlertCircle, Eye, Settings2, Trash2 } from 'lucide-react';

export type AgentNodeStatus = 'idle' | 'running' | 'success' | 'error';

export interface AgentNodeData {
    label: string;
    role: string;
    emoji: string;
    systemPrompt?: string;
    status: AgentNodeStatus;
    output?: string;
    error?: string;
    onViewOutput?: () => void;
}

export default function AgentNode({ id, data, isConnectable }: { id: string, data: AgentNodeData, isConnectable: boolean }) {
    const { setNodes, setEdges } = useReactFlow();

    const handleDelete = () => {
        setNodes((nds) => nds.filter((n) => n.id !== id));
        setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    };

    const handleEdit = () => {
        window.dispatchEvent(new CustomEvent('edit-agent', { detail: { id } }));
    };

    return (
        <div className={`bg-white rounded-xl shadow-lg border-2 w-72 transition-colors relative group ${data.status === 'running' ? 'border-blue-400 shadow-blue-100' :
            data.status === 'success' ? 'border-green-400 shadow-green-100' :
                data.status === 'error' ? 'border-red-400 shadow-red-100' :
                    'border-gray-200'
            }`}>
            {/* Input */}
            <Handle
                type="target"
                position={Position.Left}
                id="input"
                isConnectable={isConnectable}
                className={`w-3 h-3 rounded-full ${data.status === 'success' ? 'bg-green-500' : 'bg-gray-400'
                    }`}
            />

            {/* Floating Action Buttons (visible on hover) */}
            <div className="absolute -top-3 -right-3 hidden group-hover:flex gap-1">
                <button
                    onClick={handleEdit}
                    className="bg-white p-1.5 rounded-full shadow-md border border-gray-200 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                    title="Editar Agente"
                >
                    <Settings2 size={14} />
                </button>
                <button
                    onClick={handleDelete}
                    className="bg-white p-1.5 rounded-full shadow-md border border-gray-200 text-gray-600 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                    title="Excluir Agente"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            <div className="p-4 flex gap-3 items-center border-b border-gray-100">
                <div className="text-3xl p-2 bg-gray-50 rounded-lg">{data.emoji}</div>
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 truncate">{data.label}</div>
                    <div className="text-xs text-gray-500 truncate" title={data.role}>{data.role}</div>
                </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-b-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {data.status === 'idle' && <span className="text-xs font-semibold text-gray-500 px-2 py-1 bg-gray-200 rounded">Aguardando</span>}
                    {data.status === 'running' && (
                        <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded flex items-center gap-1">
                            <Loader2 size={12} className="animate-spin" />Processando...
                        </span>
                    )}
                    {data.status === 'success' && (
                        <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded flex items-center gap-1">
                            <CheckCircle2 size={12} />Concluído
                        </span>
                    )}
                    {data.status === 'error' && (
                        <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded flex items-center gap-1">
                            <AlertCircle size={12} />Falhou
                        </span>
                    )}
                </div>

                {(data.status === 'success' || data.output) && data.onViewOutput && (
                    <button
                        className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        onClick={data.onViewOutput}
                        title="Ver Resultado"
                    >
                        <Eye size={18} />
                    </button>
                )}
            </div>

            {/* Output */}
            <Handle
                type="source"
                position={Position.Right}
                id="output"
                isConnectable={isConnectable}
                className={`w-3 h-3 rounded-full ${data.status === 'success' ? 'bg-green-500' : 'bg-gray-400'
                    }`}
            />
        </div>
    );
}
