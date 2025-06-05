
import React, { useEffect, useRef } from 'react';
import { BattleMessage } from '../types';

interface BattleLogProps {
  messages: BattleMessage[];
}

const BattleLog: React.FC<BattleLogProps> = ({ messages }) => {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getMessageColor = (type: BattleMessage['type']) => {
    switch (type) {
      case 'player_attack': return 'text-sky-400';
      case 'enemy_attack': return 'text-red-400';
      case 'damage': return 'text-yellow-400';
      case 'critical': return 'text-orange-400 font-bold';
      case 'miss': return 'text-slate-400 italic';
      case 'narration': return 'text-purple-300 italic';
      case 'system': return 'text-green-400';
      case 'spirit': return 'text-teal-300 font-semibold';
      case 'level_up': return 'text-yellow-300 font-bold glowing-text';
      case 'hangar': return 'text-indigo-300';
      case 'cpu_action': return 'text-cyan-300 italic'; // Style for CPU actions
      default: return 'text-slate-300';
    }
  };

  return (
    <div className="h-64 bg-slate-800 p-3 rounded-lg shadow-inner overflow-y-auto border border-slate-700">
      <style>
        {`
          .glowing-text {
            text-shadow: 0 0 5px #fde047, 0 0 10px #fde047, 0 0 15px #facc15;
          }
        `}
      </style>
      <h3 className="text-lg font-semibold mb-2 text-slate-200 sticky top-0 bg-slate-800 py-1">전투 기록</h3>
      <div className="space-y-1.5 text-sm">
        {messages.map((msg) => (
          <p key={msg.id} className={`${getMessageColor(msg.type)}`}>
            <span className="font-mono text-xs mr-1">{`> `}</span>{msg.text}
          </p>
        ))}
        <div ref={logEndRef} />
      </div>
      {messages.length === 0 && <p className="text-slate-500 italic">아직 행동 없음...</p>}
    </div>
  );
};

export default BattleLog;
