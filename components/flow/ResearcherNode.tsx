"use client";

import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Search, Trash2, Settings, Loader, CheckCircle, XCircle, Globe } from 'lucide-react';

interface ResearcherData {
    label?: string;
    emoji?: string;
    status?: 'idle' | 'running' | 'success' | 'error';
    output?: string;
    error?: string;
    urls?: string[];       // Specific sites to search within
    systemPrompt?: string;
}

const STATUS_STYLES: Record<string, string> = {
    idle: 'border-gray-200 bg-white',
    running: 'border-blue-400 bg-blue-50 animate-pulse',
    success: 'border-green-400 bg-green-50',
    error: 'border-red-400 bg-red-50',
};

export default function ResearcherNode({ id, data, isConnectable }: { id: string; data: ResearcherData; isConnectable: boolean }) {
    const { deleteElements } = useReactFlow();
    const status = data.status || 'idle';

    const handleDelete = () => {
        deleteElements({ nodes: [{ id }] });
    };

    const handleEdit = () => {
        window.dispatchEvent(new CustomEvent('edit-agent', { detail: { id } }));
    };

    const urlList = data.urls || [];

    return (
        <div className={`rounded-2xl border-2 shadow-lg min-w-[260px] max-w-[300px] transition-all ${STATUS_STYLES[status]}`}>
            <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="!w-3 !h-3 !bg-blue-500" />

            {/* Header */}
            <div className="bg-blue-600 rounded-t-xl p-3 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                        <Search size={16} />
                    </div>
                    <div>
                        <div className="font-black text-sm">🔍 Pesquisador Turbo</div>
                        <div className="text-[10px] text-blue-100 uppercase tracking-wider font-bold">Tavily Web Search</div>
                    </div>
                </div>
                <div className="flex gap-1">
                    <button onClick={handleEdit} className="p-1.5 hover:bg-white/20 rounded transition-colors">
                        <Settings size={13} />
                    </button>
                    <button onClick={handleDelete} className="p-1.5 hover:bg-red-500/40 rounded transition-colors">
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>

            {/* Sites */}
            <div className="p-3 border-b border-gray-100">
                <div className="flex items-center gap-1.5 mb-2">
                    <Globe size={11} className="text-gray-400" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sites de Busca</span>
                </div>
                {urlList.length > 0 ? (
                    <div className="flex flex-col gap-1">
                        {urlList.map((url, i) => (
                            <div key={i} className="text-xs text-blue-600 bg-blue-50 rounded-lg px-2 py-1 font-mono truncate border border-blue-100">
                                {url}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-xs text-gray-400 italic">Edite para definir os sites a pesquisar</div>
                )}
            </div>

            {/* Status Output */}
            <div className="p-3">
                {status === 'idle' && (
                    <div className="text-xs text-gray-400 text-center py-1">Aguardando execução...</div>
                )}
                {status === 'running' && (
                    <div className="flex items-center gap-2 text-blue-600">
                        <Loader size={14} className="animate-spin" />
                        <span className="text-xs font-bold">Buscando na internet...</span>
                    </div>
                )}
                {status === 'success' && data.output && (
                    <div>
                        <div className="flex items-center gap-1.5 mb-1.5 text-green-600">
                            <CheckCircle size={12} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Resultado</span>
                        </div>
                        <div className="text-xs text-gray-700 bg-white rounded-xl p-2 max-h-28 overflow-y-auto border border-green-100 font-mono leading-relaxed whitespace-pre-wrap">
                            {data.output}
                        </div>
                    </div>
                )}
                {status === 'error' && (
                    <div className="flex items-center gap-2 text-red-600">
                        <XCircle size={14} />
                        <span className="text-xs font-bold">{data.error || 'Erro na pesquisa'}</span>
                    </div>
                )}
            </div>

            <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="!w-3 !h-3 !bg-blue-500" />
        </div>
    );
}
