
import React, { useState, useMemo } from 'react';
import { RobotInstance, PlayerState, EquipmentSlotType, EquipmentInstance, EquipmentDefinition, HangarScreenProps, ScenarioDefinition } from '../types'; 
import { EQUIPMENT_DEFS_MAP, ALL_ROBOT_DEFS_MAP } from '../constants';
import DelegationToggle from './DelegationToggle'; 

const EquipmentSlotDisplayNames: Record<EquipmentSlotType, string> = {
  [EquipmentSlotType.WEAPON]: '무기',
  [EquipmentSlotType.ARMOR]: '장갑',
  [EquipmentSlotType.BOOSTER]: '부스터',
};

const HangarScreen: React.FC<HangarScreenProps> = ({ 
    rosterUnits, 
    playerState, 
    onClose, 
    onEquipItem, 
    onUpgradeItem, 
    
    scenarios,
    currentScenarioIndex,
    onStartScenario,

    isDelegationModeActive, 
    onToggleDelegationMode,
    newGamePlusCycle 
}) => {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(rosterUnits.length > 0 ? rosterUnits[0].id : null);
  const [selectedEquipmentSlot, setSelectedEquipmentSlot] = useState<EquipmentSlotType | null>(null);
  const [viewingInventoryItemId, setViewingInventoryItemId] = useState<string | null>(null); 

  const selectedUnit = rosterUnits.find(u => u.id === selectedUnitId);

  const getEquipmentDetails = (instanceId: string | null | undefined): (EquipmentDefinition & { instance: EquipmentInstance }) | null => {
    if (!instanceId) return null;
    const instance = playerState.equipmentInventory.find(invItem => invItem.instanceId === instanceId);
    if (!instance) return null;
    const definition = EQUIPMENT_DEFS_MAP.get(instance.definitionId);
    if (!definition) return null;
    return { ...definition, instance };
  };
  
  const calculateItemStatsAtLevel = (itemDef: EquipmentDefinition, level: number): Record<string, number> => {
    const stats: Record<string, number> = {};
    Object.keys(itemDef.baseStatsBoost).forEach(key => {
        const statKey = key as keyof typeof itemDef.baseStatsBoost;
        stats[statKey] = (itemDef.baseStatsBoost[statKey] || 0);
        if (level > 1 && itemDef.upgradeStatsPerLevel[statKey]) {
            stats[statKey] += (itemDef.upgradeStatsPerLevel[statKey] || 0) * (level - 1);
        }
    });
    return stats;
  };

  const renderStatsBoost = (stats: Record<string, number>) => {
    return Object.entries(stats)
      .filter(([, value]) => value !== 0)
      .map(([key, value]) => <span key={key} className="mr-2 text-xs">{key.toUpperCase()}: {value > 0 ? `+${value}`: value}</span>)
      .reduce((prev, curr, idx) => [prev, idx > 0 ? ', ' : '', curr] as any, []);
  };

  const handleSelectSlot = (slot: EquipmentSlotType) => {
    if (isDelegationModeActive) return; 
    setSelectedEquipmentSlot(slot);
    setViewingInventoryItemId(null); 
  };
  
  const handleEquip = (equipmentInstanceId: string) => {
    if (isDelegationModeActive) return;
    if (selectedUnit && selectedEquipmentSlot) {
      onEquipItem(selectedUnit.id, selectedEquipmentSlot, equipmentInstanceId);
      setSelectedEquipmentSlot(null); 
    }
  };

  const handleUnequip = () => {
    if (isDelegationModeActive) return;
    if (selectedUnit && selectedEquipmentSlot) {
      onEquipItem(selectedUnit.id, selectedEquipmentSlot, null);
      setSelectedEquipmentSlot(null); 
    }
  };
  
  const handleUpgrade = (instanceId: string) => {
    if (isDelegationModeActive && viewingInventoryItemId !== instanceId && !playerState.equipmentInventory.find(i => i.instanceId === instanceId && Object.values(selectedUnit?.equippedItems || {}).includes(i.instanceId))) return;
    onUpgradeItem(instanceId);
  };

  const availableForSlot = useMemo(() => {
    if (!selectedEquipmentSlot) return [];
    const equippedByAnyUnitInstanceIds = new Set<string>();
    rosterUnits.forEach(unit => {
        Object.values(unit.equippedItems).forEach(instanceId => {
            if (instanceId) equippedByAnyUnitInstanceIds.add(instanceId);
        });
    });

    return playerState.equipmentInventory.filter(itemInstance => {
      const itemDef = EQUIPMENT_DEFS_MAP.get(itemInstance.definitionId);
      if (!itemDef || itemDef.slotType !== selectedEquipmentSlot) return false;
      
      // Item is available if it's not equipped by the current unit in *any* slot,
      // AND it's not equipped by *any other* unit.
      // Exception: if it's the item currently in the selected slot of the current unit, it should not appear as "available".
      const isEquippedOnCurrentUnitInThisSlot = selectedUnit?.equippedItems[selectedEquipmentSlot] === itemInstance.instanceId;
      if (isEquippedOnCurrentUnitInThisSlot) return false;

      // Is it equipped on the current unit but in a DIFFERENT slot? (This implies it shouldn't be available for this slot)
      // const isEquippedOnCurrentUnitElsewhere = Object.values(selectedUnit?.equippedItems || {}).includes(itemInstance.instanceId);
      // if(isEquippedOnCurrentUnitElsewhere) return false;


      // Is it equipped by ANY unit at all?
      const isEquippedElsewhereByAnyUnit = rosterUnits.some(u => Object.values(u.equippedItems).includes(itemInstance.instanceId));
      
      return !isEquippedElsewhereByAnyUnit;
    });
  }, [playerState.equipmentInventory, selectedEquipmentSlot, selectedUnit, rosterUnits]);

  const isAllScenariosInCycleCleared = currentScenarioIndex >= scenarios.length;
  const nextScenarioToDisplayInfo = !isAllScenariosInCycleCleared && scenarios[currentScenarioIndex] ? scenarios[currentScenarioIndex] : null;
  
  const getStartButtonText = () => {
    if (isDelegationModeActive) return "CPU 자동 진행 중...";
    if (isAllScenariosInCycleCleared) return `NG+ ${newGamePlusCycle + 1} 시작`;
    if (nextScenarioToDisplayInfo) return `"${nextScenarioToDisplayInfo.title}" 출격`;
    return "출격 준비";
  };
  
  const getStartButtonTitle = () => {
    if (isDelegationModeActive) return "CPU가 자동으로 다음 단계를 진행합니다.";
    if (isAllScenariosInCycleCleared) return `다음 회차 (NG+ ${newGamePlusCycle + 1})를 시작합니다.`;
    if (nextScenarioToDisplayInfo) return `"${nextScenarioToDisplayInfo.title}" 시나리오를 시작합니다.`;
    return "시작할 시나리오가 없습니다.";
  };


  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl w-full max-w-6xl h-[95vh] flex flex-col p-3 sm:p-5">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-sky-300">
            편성 및 강화 {newGamePlusCycle > 0 && `(NG+ ${newGamePlusCycle})`}
          </h2>
          <button 
            onClick={onStartScenario} 
            className="text-slate-200 bg-green-600 hover:bg-green-700 font-semibold py-1.5 px-4 rounded-md text-sm sm:text-base disabled:opacity-60 disabled:bg-slate-500 disabled:cursor-not-allowed"
            disabled={isDelegationModeActive || rosterUnits.length === 0}
            title={getStartButtonTitle()}
          >
            {getStartButtonText()}
          </button>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2 sm:gap-0">
            <p className="text-md sm:text-lg text-yellow-400">보유 크레딧: {playerState.credits.toLocaleString()} C</p>
            <DelegationToggle isActive={isDelegationModeActive} onToggle={onToggleDelegationMode} />
        </div>
        
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 overflow-hidden">
          <div className="lg:col-span-1 bg-slate-700/50 p-3 rounded-md overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700 flex flex-col justify-between">
            <div>
                <h3 className="text-lg sm:text-xl font-semibold text-slate-100 mb-2 sticky top-0 bg-slate-700/80 py-1 backdrop-blur-sm z-10">다음 작전</h3>
                {isAllScenariosInCycleCleared ? (
                <div className="p-3 bg-green-700 rounded-md text-white text-center">
                    <p className="font-bold text-lg sm:text-xl">✨ 현 회차 모든 시나리오 클리어! ✨</p>
                    <p className="text-sm sm:text-base mt-1">축하합니다! NG+ {newGamePlusCycle}의 모든 임무를 완수했습니다.</p>
                    <p className="text-xs mt-2">{`다음 버튼을 눌러 NG+ ${newGamePlusCycle + 1}을(를) 시작하세요.`}</p>
                </div>
                ) : nextScenarioToDisplayInfo ? (
                <div className="p-2.5 mb-1.5 rounded bg-green-600 text-white shadow-lg">
                    <p className="font-semibold text-sm sm:text-base">{nextScenarioToDisplayInfo.title} {newGamePlusCycle > 0 ? `(NG+ ${newGamePlusCycle})` : ""}</p>
                    <p className="text-xs sm:text-sm opacity-80 mt-1">{nextScenarioToDisplayInfo.description}</p>
                </div>
                ) : (
                <p className="text-slate-400 italic p-3 text-center">다음 시나리오 정보를 불러오는 중...</p>
                )}
            </div>
            <button 
                onClick={onStartScenario}
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-3 rounded transition-colors mt-3 text-base sm:text-lg disabled:opacity-60 disabled:cursor-not-allowed sticky bottom-0"
                disabled={isDelegationModeActive || rosterUnits.length === 0}
                title={getStartButtonTitle()}
            >
                {getStartButtonText()}
            </button>
          </div>

          <div className="lg:col-span-1 bg-slate-700/50 p-3 rounded-md overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700">
            <h3 className="text-lg sm:text-xl font-semibold text-slate-100 mb-2 sticky top-0 bg-slate-700/80 py-1 backdrop-blur-sm z-10">아군 유닛</h3>
            {rosterUnits.map(unit => (
              <div
                key={unit.id}
                onClick={() => { 
                    if(isDelegationModeActive) return;
                    setSelectedUnitId(unit.id); setSelectedEquipmentSlot(null); setViewingInventoryItemId(null);
                }}
                className={`p-2 mb-1.5 rounded transition-colors ${selectedUnitId === unit.id && !isDelegationModeActive ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-600'} ${isDelegationModeActive ? 'cursor-default opacity-70' : 'cursor-pointer hover:bg-slate-500'}`}
              >
                <p className="font-semibold text-sm">{unit.name} <span className="text-xs">(Lv. {unit.level})</span></p>
                <p className="text-xs opacity-80">{ALL_ROBOT_DEFS_MAP.get(unit.definitionId)?.pilotName}</p>
              </div>
            ))}
             {rosterUnits.length === 0 && <p className="text-slate-400 italic p-3 text-center">사용 가능한 유닛이 없습니다.</p>}
          </div>

          <div className="lg:col-span-1 bg-slate-700/50 p-3 rounded-md overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700">
             <div className="sticky top-0 bg-slate-700/80 py-1 backdrop-blur-sm z-10 mb-2">
                <h3 className="text-lg sm:text-xl font-semibold text-slate-100">
                    {isDelegationModeActive ? "CPU 자동 관리 중" : (selectedUnit ? `${selectedUnit.name} 상세 정보` : "유닛 또는 장비 선택")}
                </h3>
             </div>
            {isDelegationModeActive && (
                <div className="flex flex-col items-center justify-center h-full pt-10">
                    <svg className="animate-spin h-12 w-12 text-yellow-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-xl text-yellow-400 animate-pulse">CPU 자동 편성 중...</p>
                    <p className="text-slate-300 mt-1 text-sm">위임 모드가 활성화되어 CPU가 유닛을 자동으로 관리합니다.</p>
                </div>
            )}
            {!isDelegationModeActive && selectedUnit && !viewingInventoryItemId && (
              <>
                <p className="text-xs text-slate-400 mb-2">유효 스탯: 공 {selectedUnit.effectiveAttack}, 방 {selectedUnit.effectiveDefense}, 기 {selectedUnit.effectiveMobility}, HP {selectedUnit.effectiveMaxHp}</p>
                
                {Object.values(EquipmentSlotType).map(slot => {
                  const equippedItemDetails = getEquipmentDetails(selectedUnit.equippedItems[slot]);
                  return (
                    <div key={slot} className="mb-2 p-2 bg-slate-600 rounded">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-purple-300 text-sm">{EquipmentSlotDisplayNames[slot]}</h4>
                        <button onClick={() => handleSelectSlot(slot)} className="text-xs bg-blue-500 hover:bg-blue-600 px-1.5 py-0.5 rounded">변경</button>
                      </div>
                      {equippedItemDetails ? (
                        <div>
                          <p className="text-xs sm:text-sm">{equippedItemDetails.name} (Lv. {equippedItemDetails.instance.currentLevel})</p>
                          <div className="text-xs text-slate-300 leading-tight">{renderStatsBoost(calculateItemStatsAtLevel(equippedItemDetails, equippedItemDetails.instance.currentLevel))}</div>
                            {equippedItemDetails.instance.currentLevel < equippedItemDetails.maxLevel && (
                                <div className="mt-1">
                                    <button 
                                        onClick={() => handleUpgrade(equippedItemDetails.instance.instanceId)}
                                        disabled={playerState.credits < (equippedItemDetails.baseUpgradeCost + equippedItemDetails.upgradeCostIncreasePerLevel * (equippedItemDetails.instance.currentLevel -1))}
                                        className="text-xs bg-green-500 hover:bg-green-600 px-1.5 py-0.5 rounded disabled:opacity-50"
                                    >
                                        강화 (비용: {(equippedItemDetails.baseUpgradeCost + equippedItemDetails.upgradeCostIncreasePerLevel * (equippedItemDetails.instance.currentLevel -1)).toLocaleString()} C)
                                    </button>
                                </div>
                            )}
                        </div>
                      ) : <p className="text-sm text-slate-400 italic">비어 있음</p>}
                    </div>
                  );
                })}
              </>
            )}
            {!isDelegationModeActive && viewingInventoryItemId && (() => { 
                const itemDetails = getEquipmentDetails(viewingInventoryItemId);
                if (!itemDetails) return <p>아이템 정보를 찾을 수 없습니다.</p>;
                const currentStats = calculateItemStatsAtLevel(itemDetails, itemDetails.instance.currentLevel);
                const nextLevel = itemDetails.instance.currentLevel + 1;
                const nextLevelStats = nextLevel <= itemDetails.maxLevel ? calculateItemStatsAtLevel(itemDetails, nextLevel) : null;
                const upgradeCost = itemDetails.baseUpgradeCost + itemDetails.upgradeCostIncreasePerLevel * (itemDetails.instance.currentLevel -1);

                return (
                    <div className="p-2 bg-slate-600 rounded">
                        <h3 className="text-md sm:text-lg font-semibold text-slate-100 mb-1.5">{itemDetails.name} (Lv. {itemDetails.instance.currentLevel})</h3>
                        <p className="text-sm text-slate-300 mb-1">종류: {EquipmentSlotDisplayNames[itemDetails.slotType]}</p>
                        <p className="text-sm text-slate-300 mb-1">현재 능력치: {renderStatsBoost(currentStats)}</p>
                        {itemDetails.instance.currentLevel < itemDetails.maxLevel && nextLevelStats && (
                            <>
                                <p className="text-sm text-green-400 mb-1">다음 레벨({nextLevel}) 능력치: {renderStatsBoost(nextLevelStats)}</p>
                                <p className="text-sm text-yellow-400 mb-1.5">강화 비용: {upgradeCost.toLocaleString()} C</p>
                                <button
                                    onClick={() => handleUpgrade(itemDetails.instance.instanceId)}
                                    disabled={playerState.credits < upgradeCost}
                                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-1.5 px-3 rounded transition-colors disabled:opacity-50 text-sm"
                                >
                                    강화하기
                                </button>
                            </>
                        )}
                        {itemDetails.instance.currentLevel >= itemDetails.maxLevel && <p className="text-sm text-sky-400">최대 레벨입니다.</p>}
                        <button onClick={() => setViewingInventoryItemId(null)} className="mt-2 text-xs text-slate-400 hover:text-slate-200">장비 슬롯/목록으로 돌아가기</button>
                    </div>
                );
            })()}

            {!isDelegationModeActive && selectedUnit && selectedEquipmentSlot && !viewingInventoryItemId && (
              <div className="mt-3 pt-3 border-t border-slate-500">
                <h4 className="text-md font-semibold text-purple-300 mb-1.5">{EquipmentSlotDisplayNames[selectedEquipmentSlot]} 장착 선택</h4>
                {selectedUnit.equippedItems[selectedEquipmentSlot] && (
                    <button onClick={handleUnequip} className="w-full mb-1.5 bg-red-500 hover:bg-red-600 text-white py-1 rounded text-sm">현재 장비 해제</button>
                )}
                {availableForSlot.length === 0 && <p className="text-slate-400 italic text-sm">이 슬롯에 장착할 수 있는 아이템이 인벤토리에 없습니다.</p>}
                {availableForSlot.map(itemInstance => {
                  const itemDef = EQUIPMENT_DEFS_MAP.get(itemInstance.definitionId);
                  if (!itemDef) return null;
                  return (
                    <div key={itemInstance.instanceId} className="p-1.5 mb-1 bg-slate-500 rounded flex justify-between items-center">
                      <div>
                        <p className="text-xs sm:text-sm">{itemDef.name} (Lv. {itemInstance.currentLevel})</p>
                        <div className="text-xs text-slate-300 leading-tight">{renderStatsBoost(calculateItemStatsAtLevel(itemDef, itemInstance.currentLevel))}</div>
                      </div>
                      <button onClick={() => handleEquip(itemInstance.instanceId)} className="text-xs bg-sky-500 hover:bg-sky-600 px-1.5 py-0.5 rounded">장착</button>
                    </div>
                  );
                })}
                <button onClick={() => setSelectedEquipmentSlot(null)} className="mt-2 text-xs text-slate-400 hover:text-slate-200">취소</button>
              </div>
            )}
             {!isDelegationModeActive && !selectedUnit && !viewingInventoryItemId && !selectedEquipmentSlot && (
                 <div className="mt-3 pt-3 border-t border-slate-500">
                    <h3 className="text-md font-semibold text-slate-100 mb-1.5">보유 장비 목록 (클릭하여 강화)</h3>
                    {playerState.equipmentInventory.length === 0 && <p className="text-slate-400 italic text-sm">보유한 장비가 없습니다.</p>}
                    {playerState.equipmentInventory.map(itemInstance => {
                        const itemDef = getEquipmentDetails(itemInstance.instanceId);
                        if (!itemDef) return null;
                        return (
                            <div key={itemInstance.instanceId} 
                                 className={`p-1.5 mb-1 rounded flex justify-between items-center transition-colors cursor-pointer ${viewingInventoryItemId === itemInstance.instanceId ? 'bg-purple-600 text-white' : 'bg-slate-500 hover:bg-slate-400'}`}
                                 onClick={() => {setSelectedEquipmentSlot(null); setViewingInventoryItemId(itemInstance.instanceId);}}
                            >
                                <div>
                                    <p className="text-xs sm:text-sm">{itemDef.name} (Lv. {itemInstance.currentLevel})</p>
                                    <p className="text-xs text-slate-300 opacity-80">타입: {EquipmentSlotDisplayNames[itemDef.slotType]}</p>
                                    <div className="text-xs text-slate-300 leading-tight">{renderStatsBoost(calculateItemStatsAtLevel(itemDef, itemInstance.currentLevel))}</div>
                                </div>
                                 <button 
                                    className="text-xs bg-purple-500 hover:bg-purple-600 px-1.5 py-0.5 rounded whitespace-nowrap"
                                    onClick={(e) => { e.stopPropagation(); setSelectedEquipmentSlot(null); setViewingInventoryItemId(itemInstance.instanceId);}}
                                 >
                                    강화 보기
                                 </button>
                            </div>
                        );
                    })}
                </div>
             )}
            {!isDelegationModeActive && !selectedUnit && !viewingInventoryItemId && <p className="text-slate-400 italic p-3 text-center text-sm">유닛을 선택하여 장비를 관리하거나, 장비 목록에서 아이템을 선택하여 강화하세요.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HangarScreen;
