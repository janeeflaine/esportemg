import { Handle, Position } from '@xyflow/react';
import { PencilLine } from 'lucide-react';
import { useState } from 'react';

interface TriggerNodeData {
    topic: string;
    onTopicChange?: (newTopic: string) => void;
    schedule?: string;
    isScheduled?: boolean;
    onScheduleChange?: (enabled: boolean, time: string) => void;
}

export default function TriggerNode({ data, isConnectable }: { data: TriggerNodeData, isConnectable: boolean }) {
    const [topic, setTopic] = useState(data.topic || '');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTopic(e.target.value);
        if (data.onTopicChange) {
            data.onTopicChange(e.target.value);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border-2 border-indigo-500 w-72 overflow-hidden">
            <div className="bg-indigo-500 text-white px-4 py-2 font-bold flex items-center gap-2">
                <PencilLine size={18} />
                Gatilho: Nova Pauta
            </div>
            <div className="p-4 flex flex-col gap-4">
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Pauta Central</label>
                    <input
                        type="text"
                        value={topic}
                        onChange={handleChange}
                        autoFocus={true}
                        className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none nodrag transition-all"
                        placeholder="Ex: Reforços do Galo 2026"
                    />
                </div>

                <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Agendamento</label>
                        <input
                            type="checkbox"
                            checked={data.isScheduled}
                            onChange={(e) => data.onScheduleChange?.(e.target.checked, data.schedule || '06:00')}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                    </div>
                    {data.isScheduled && (
                        <div className="flex items-center gap-2 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                            <span className="text-xs text-indigo-700 font-bold">Todo dia às:</span>
                            <input
                                type="time"
                                value={data.schedule || '06:00'}
                                onChange={(e) => data.onScheduleChange?.(true, e.target.value)}
                                className="bg-white border border-indigo-200 rounded px-1 text-sm font-mono text-indigo-800 outline-none"
                            />
                        </div>
                    )}
                </div>
            </div>
            <Handle
                type="source"
                position={Position.Right}
                id="output"
                isConnectable={isConnectable}
                className="w-3 h-3 bg-indigo-500 rounded-full"
            />
        </div>
    );
}
