import { Handle, Position } from '@xyflow/react';
import { PencilLine } from 'lucide-react';
import { useState } from 'react';

interface TriggerNodeData {
    topic: string;
    onTopicChange?: (newTopic: string) => void;
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
            <div className="p-4">
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-2">Tema Principal</label>
                <input
                    type="text"
                    value={topic}
                    onChange={handleChange}
                    autoFocus={true} // Allow interaction within canvas
                    className="w-full p-2 border border-gray-300 rounded-md text-sm nodrag"
                    placeholder="Ex: Novo técnico do Cruzeiro"
                />
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
