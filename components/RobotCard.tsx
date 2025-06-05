
import React from 'react';
import { RobotInstance, TerrainType } from '../types'; // RobotDefinition no longer needed directly for stats display
import { TERRAIN_EFFECTS_MAP } from '../constants';


interface RobotCardProps {
  robotInstance: RobotInstance;
  isSelected: boolean;
  onClick?: () => void;
  isTargetable?: boolean;
  hasActed?: boolean;
}


const RobotCard: React.FC<RobotCardProps> = ({ robotInstance, isSelected, onClick, isTargetable = false, hasActed = false }) => {
  // Definition is now mainly for fallback or non-leveled info if needed, but instance has all live stats.
  // const definition = ALL_ROBOT_DEFS_MAP.get(robotInstance.definitionId);
  // if (!definition) {
  //   return <div className="p-2 border border-red-500 text-red-500">오류: 알 수 없는 로봇 정의</div>;
  // }

  const hpPercentage = (robotInstance.currentHp / robotInstance.effectiveMaxHp) * 100;
  const enPercentage = (robotInstance.currentEn / robotInstance.effectiveMaxEn) * 100;
  const spPercentage = (robotInstance.currentSp / robotInstance.effectiveMaxSp) * 100;
  const xpPercentage = robotInstance.isPlayerUnit ? (robotInstance.currentXp / robotInstance.xpToNextLevel) * 100 : 0;


  let hpBarColor = 'bg-green-500';
  if (hpPercentage < 50) hpBarColor = 'bg-yellow-500';
  if (hpPercentage < 25) hpBarColor = 'bg-red-500';

  const cardClasses = `
    p-3 rounded-lg shadow-md transition-all duration-200 ease-in-out cursor-pointer
    border-2
    ${isSelected ? 'border-yellow-400 shadow-yellow-400/50' : 'border-slate-700 hover:border-slate-500'}
    ${isTargetable ? (robotInstance.isPlayerUnit ? '' : 'bg-red-600 hover:bg-red-500 border-red-500') : (robotInstance.isPlayerUnit ? 'bg-slate-800 hover:bg-slate-700' : 'bg-red-800 hover:bg-red-700')}
    ${hasActed && robotInstance.isPlayerUnit ? 'opacity-60 grayscale' : ''}
    ${robotInstance.currentHp <= 0 ? 'opacity-40 grayscale filter brightness-50' : ''}
  `;
  
  const currentTerrain = robotInstance.currentTerrainId ? TERRAIN_EFFECTS_MAP.get(robotInstance.currentTerrainId) : TERRAIN_EFFECTS_MAP.get(TerrainType.SPACE);

  return (
    <div className={cardClasses} onClick={robotInstance.currentHp > 0 && (!hasActed || !robotInstance.isPlayerUnit) && !isTargetable ? onClick : (isTargetable && robotInstance.currentHp > 0 ? onClick : undefined)}>
      <div className="flex items-center space-x-3">
        <img src={robotInstance.spriteUrl} alt={robotInstance.name} className="w-16 h-16 rounded-md border border-slate-600 object-cover" />
        <div className="flex-1">
          <h3 className={`font-bold text-sm ${robotInstance.isPlayerUnit ? 'text-sky-400' : 'text-pink-400'}`}>{robotInstance.name} {robotInstance.isPlayerUnit && `(Lv. ${robotInstance.level})`}</h3>
          <p className="text-xs text-slate-400">{robotInstance.pilotName}</p>
        </div>
      </div>

      <div className="mt-2 space-y-1">
        <div>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="font-medium text-slate-300">체력:</span>
            <span className="text-slate-400">{robotInstance.currentHp} / {robotInstance.effectiveMaxHp}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div className={`${hpBarColor} h-2 rounded-full transition-all duration-500 ease-out`} style={{ width: `${hpPercentage}%` }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="font-medium text-slate-300">EN:</span>
            <span className="text-slate-400">{robotInstance.currentEn} / {robotInstance.effectiveMaxEn}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all duration-500 ease-out" style={{ width: `${enPercentage}%` }}></div>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="font-medium text-slate-300">SP:</span>
            <span className="text-slate-400">{robotInstance.currentSp} / {robotInstance.effectiveMaxSp}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div className="bg-purple-500 h-2 rounded-full transition-all duration-500 ease-out" style={{ width: `${spPercentage}%` }}></div>
          </div>
        </div>
        {robotInstance.isPlayerUnit && (
          <div>
            <div className="flex justify-between text-xs mb-0.5">
              <span className="font-medium text-slate-300">XP:</span>
              <span className="text-slate-400">{robotInstance.currentXp} / {robotInstance.xpToNextLevel}</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div className="bg-cyan-500 h-2 rounded-full transition-all duration-500 ease-out" style={{ width: `${xpPercentage}%` }}></div>
            </div>
          </div>
        )}
      </div>
       {currentTerrain && currentTerrain.defenseBonusPercent > 0 && (
         <p className="text-center text-xs text-cyan-300 mt-1">지형: {currentTerrain.name} (+{currentTerrain.defenseBonusPercent * 100}% 방어)</p>
       )}
       {robotInstance.activeSpiritEffect && <p className="text-center text-xs text-yellow-300 mt-1">정신: {robotInstance.activeSpiritEffect.replace(/_/g, ' ')}</p>}
       {hasActed && robotInstance.isPlayerUnit && robotInstance.currentHp > 0 && <p className="text-center text-xs text-yellow-500 mt-1">행동 완료</p>}
       {robotInstance.currentHp <= 0 && <p className="text-center text-lg font-bold text-red-500 mt-1">파괴됨</p>}
    </div>
  );
};

export default RobotCard;
