
import React from 'react';
import { RobotInstance, SpiritCommand } from '../types';
import { ALL_ROBOT_DEFS_MAP } from '../constants';


interface ActionPanelProps {
  selectedUnit: RobotInstance | null;
  onAttack: () => void;
  onWait: () => void;
  onEndTurn: () => void;
  canEndTurn: boolean;
  onActivateSpirit: (spiritId: string) => void;
  isDelegationModeActive: boolean; // New prop
}

const ActionPanel: React.FC<ActionPanelProps> = ({ selectedUnit, onAttack, onWait, onEndTurn, canEndTurn, onActivateSpirit, isDelegationModeActive }) => {
  const unitDef = selectedUnit ? ALL_ROBOT_DEFS_MAP.get(selectedUnit.definitionId) : null;

  if (isDelegationModeActive || !selectedUnit || selectedUnit.hasActed || selectedUnit.currentHp <= 0) {
    return (
      <div className="p-4 bg-slate-800 rounded-lg shadow-md border border-slate-700">
        <h3 className="text-lg font-semibold mb-2 text-slate-200">행동</h3>
        <p className="text-slate-400 italic">
          {isDelegationModeActive ? 'CPU가 행동을 결정하고 있습니다...' :
           selectedUnit && selectedUnit.currentHp <= 0 ? `${selectedUnit.name}은(는) 파괴되었습니다.` :
           selectedUnit && selectedUnit.hasActed ? `${selectedUnit.name}은(는) 이미 행동했습니다.` :
           '행동을 보려면 활동 가능한 유닛을 선택하세요.'}
        </p>
        {canEndTurn && !isDelegationModeActive && (
          <button
            onClick={onEndTurn}
            className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
          >
            플레이어 턴 종료
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 bg-slate-800 rounded-lg shadow-md border border-slate-700">
      <h3 className="text-lg font-semibold mb-2 text-slate-200">행동: {selectedUnit.name}</h3>
      <div className="space-y-2">
        <button
          onClick={onAttack}
          disabled={!!selectedUnit.activeSpiritEffect || isDelegationModeActive} 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
        >
          공격 {selectedUnit.activeSpiritEffect ? `(${selectedUnit.activeSpiritEffect.split('_').map(s => s.toLowerCase()).join(' ')})` : ''}
        </button>
        <button
          onClick={onWait}
          disabled={!!selectedUnit.activeSpiritEffect || isDelegationModeActive} 
          className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded transition-colors disabled:opacity-50"
        >
          대기
        </button>
      </div>

      {unitDef && unitDef.availableSpiritCommands.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-700">
          <h4 className="text-md font-semibold mb-2 text-purple-300">정신 커맨드 (SP: {selectedUnit.currentSp})</h4>
          <div className="space-y-1">
            {unitDef.availableSpiritCommands.map((spirit: SpiritCommand) => (
              <button
                key={spirit.id}
                onClick={() => onActivateSpirit(spirit.id)}
                disabled={selectedUnit.currentSp < spirit.cost || !!selectedUnit.activeSpiritEffect || isDelegationModeActive}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-1.5 px-3 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={spirit.description}
              >
                {spirit.name} (SP: {spirit.cost})
              </button>
            ))}
            {selectedUnit.activeSpiritEffect && (
                <p className="text-xs text-yellow-300 text-center mt-1">활성 정신: {selectedUnit.activeSpiritEffect.replace(/_/g, ' ')}. 공격 또는 대기를 선택하세요.</p>
            )}
          </div>
        </div>
      )}

      {canEndTurn && !isDelegationModeActive && (
        <button
          onClick={onEndTurn}
          className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
        >
          플레이어 턴 종료
        </button>
      )}
    </div>
  );
};

export default ActionPanel;
