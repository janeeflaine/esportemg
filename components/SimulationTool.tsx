'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calculator, Share2, Loader2, Trophy } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import AdManager from './AdManager';

interface Team {
  id: string;
  name: string;
  strength: number;
}

export default function SimulationTool() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [homeTeamId, setHomeTeamId] = useState<string>('');
  const [awayTeamId, setAwayTeamId] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<{ home: number; draw: number; away: number } | null>(null);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'teams'));
        const teamsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Team[];
        const sortedTeams = teamsData.sort((a, b) => a.name.localeCompare(b.name));
        setTeams(sortedTeams);
        if (sortedTeams.length >= 2) {
          setHomeTeamId(sortedTeams[0].id);
          setAwayTeamId(sortedTeams[1].id);
        }
      } catch (error) {
        console.error('Error fetching teams:', error);
      }
    };
    fetchTeams();
  }, []);

  const handleSimulate = () => {
    if (!homeTeamId || !awayTeamId) {
      alert('Selecione os dois times para simular.');
      return;
    }
    if (homeTeamId === awayTeamId) {
      alert('Selecione times diferentes.');
      return;
    }

    setIsSimulating(true);
    setResult(null);

    // Simulate delay for monetization (3 seconds)
    setTimeout(() => {
      const homeTeam = teams.find(t => t.id === homeTeamId);
      const awayTeam = teams.find(t => t.id === awayTeamId);

      if (homeTeam && awayTeam) {
        // Lógica de Cálculo:
        // Probabilidade de Vitória do Mandante = (Força do Mandante + 10% de Bônus de Casa) vs (Força do Visitante).
        const homeScore = homeTeam.strength * 1.1;
        const awayScore = awayTeam.strength;
        
        // Calcular diferença para definir probabilidade de empate
        const diff = Math.abs(homeScore - awayScore);
        // Empate base de 30%, diminui conforme a diferença de força aumenta
        let drawProb = Math.max(5, 30 - (diff * 0.5)); 
        
        const remainingProb = 100 - drawProb;
        const totalScore = homeScore + awayScore;
        
        let homeProb = remainingProb * (homeScore / totalScore);
        let awayProb = remainingProb * (awayScore / totalScore);

        // Arredondar para fechar 100%
        homeProb = Math.round(homeProb);
        awayProb = Math.round(awayProb);
        drawProb = 100 - homeProb - awayProb;

        setResult({
          home: homeProb,
          draw: drawProb,
          away: awayProb
        });
      }
      setIsSimulating(false);
    }, 3000);
  };

  const handleShare = () => {
    if (!result) return;
    const homeTeam = teams.find(t => t.id === homeTeamId)?.name;
    const awayTeam = teams.find(t => t.id === awayTeamId)?.name;
    
    const text = `Vi no ESPORTEMG que as chances para ${homeTeam} x ${awayTeam} são:\n${homeTeam}: ${result.home}%\nEmpate: ${result.draw}%\n${awayTeam}: ${result.away}%\n\nO que você acha? Faça sua simulação: ${window.location.href}`;
    
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (teams.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center text-gray-500">
        Carregando simulador...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="border-t-4 border-yellow-400 p-5">
        <div className="flex items-center space-x-2 mb-6">
          <Trophy className="text-yellow-500" size={24} />
          <h3 className="text-lg font-bold text-gray-900">Simulador de Resultados Mineiros</h3>
        </div>
        
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Mandante</label>
            <select 
              value={homeTeamId} 
              onChange={e => setHomeTeamId(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-gray-700 focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none appearance-none bg-gray-50 font-medium"
            >
              <option value="">Selecione...</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          
          <div className="text-center font-black text-gray-300 text-sm">VS</div>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Visitante</label>
            <select 
              value={awayTeamId} 
              onChange={e => setAwayTeamId(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg text-gray-700 focus:border-green-600 focus:ring-1 focus:ring-green-600 outline-none appearance-none bg-gray-50 font-medium"
            >
              <option value="">Selecione...</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        <button 
          onClick={handleSimulate}
          disabled={isSimulating || !homeTeamId || !awayTeamId}
          className="w-full bg-[#15803d] hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors flex justify-center items-center shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSimulating ? (
            <>
              <Loader2 className="animate-spin mr-2" size={20} />
              Processando Dados...
            </>
          ) : (
            'Simular Resultado'
          )}
        </button>

        {/* Monetization Trigger Area */}
        {isSimulating && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 text-center flex flex-col items-center justify-center min-h-[150px]">
            <p className="text-xs text-gray-500 mb-3 font-medium">Calculando probabilidades baseadas no histórico e força das equipes...</p>
            <div className="w-full overflow-hidden flex justify-center">
               <AdManager position="Sidebar" />
            </div>
          </div>
        )}

        {result && !isSimulating && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-gray-50 rounded-lg p-4 border border-gray-200"
          >
            <div className="flex justify-between items-end mb-3">
              <div className="text-center w-1/3">
                <span className="block text-2xl font-black text-green-700">{result.home}%</span>
                <span className="text-[10px] font-bold uppercase text-gray-500 truncate block">{teams.find(t => t.id === homeTeamId)?.name}</span>
              </div>
              <div className="text-center w-1/3">
                <span className="block text-xl font-bold text-gray-400">{result.draw}%</span>
                <span className="text-[10px] font-bold uppercase text-gray-500 block">Empate</span>
              </div>
              <div className="text-center w-1/3">
                <span className="block text-2xl font-black text-blue-700">{result.away}%</span>
                <span className="text-[10px] font-bold uppercase text-gray-500 truncate block">{teams.find(t => t.id === awayTeamId)?.name}</span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden flex mt-4 shadow-inner">
              <div style={{ width: `${result.home}%` }} className="bg-green-500 h-full transition-all duration-1000"></div>
              <div style={{ width: `${result.draw}%` }} className="bg-gray-400 h-full transition-all duration-1000"></div>
              <div style={{ width: `${result.away}%` }} className="bg-blue-500 h-full transition-all duration-1000"></div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleShare}
                className="w-full bg-[#25D366] text-white font-bold py-2.5 rounded-lg hover:bg-[#128C7E] transition-colors flex items-center justify-center shadow-sm text-sm"
              >
                <Share2 className="mr-2" size={18} />
                Compartilhar no WhatsApp
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
