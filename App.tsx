
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RobotInstance, RobotDefinition, GamePhase, BattleMessage, SpiritCommandEffect, TerrainType,
  PlayerState, EquipmentInstance, EquipmentSlotType, EquipmentDefinition, HangarScreenProps, SpiritCommand,
  ScenarioDefinition
} from './types';
import {
  INITIAL_PLAYER_UNITS_DEFS,
  ALL_ROBOT_DEFS_MAP,
  TERRAIN_EFFECTS_MAP, TERRAIN_ZONE_ASTEROID_FIELD_MAX_Y, TERRAIN_ZONE_COLONY_INTERIOR_MAX_Y,
  INITIAL_XP_TO_NEXT_LEVEL_BASE, STAT_INCREASES_PER_LEVEL,
  EQUIPMENT_DEFS_MAP, INITIAL_CREDITS, CREDITS_PER_ENEMY_DEFEAT, INITIAL_PLAYER_EQUIPMENT_INSTANCE_IDS,
  ENEMY_NG_PLUS_STAT_MULTIPLIER, ENEMY_NG_PLUS_CREDIT_MULTIPLIER,
  SCENARIO_DEFINITIONS
} from './constants';
import RobotCard from './components/RobotCard';
import BattleLog from './components/BattleLog';
import ActionPanel from './components/ActionPanel';
import UnitStatsChart from './components/UnitStatsChart';
import Minimap from './components/Minimap';
import HangarScreenComponent from './components/HangarScreen';
import DelegationToggle from './components/DelegationToggle';
import { calculateAttack, BattleOutcome } from './services/battleService';
import { generateBattleNarration, generateScenarioIntro } from './services/geminiService';

const SP_REGEN_PER_TURN = 5;
const CPU_ACTION_DELAY_MS = 750;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const STORAGE_KEY = 'srwLiteGameState';

interface SavedGameState {
  currentScenarioIndex: number;
  newGamePlusCycle: number;
  turnCount: number;
  playerState: PlayerState;
  rosterUnits: RobotInstance[];
  isDelegationModeActive: boolean;
  gamePhase: GamePhase;
  playerUnitsInBattle?: RobotInstance[];
  enemyUnitsInBattle?: RobotInstance[];
  activeScenarioTitle?: string;
}

const getTerrainIdForPosition = (yPercent: number): TerrainType => {
  if (yPercent < TERRAIN_ZONE_ASTEROID_FIELD_MAX_Y) return TerrainType.ASTEROID_FIELD;
  if (yPercent < TERRAIN_ZONE_COLONY_INTERIOR_MAX_Y) return TerrainType.COLONY_INTERIOR;
  return TerrainType.SPACE;
};

const calculateEffectiveStats = (
  baseStats: { hp: number, en: number, sp: number, attack: number, defense: number, mobility: number },
  equippedItems: Partial<Record<EquipmentSlotType, string | null>>,
  allEquipmentInstances: EquipmentInstance[]
): { effectiveMaxHp: number, effectiveMaxEn: number, effectiveMaxSp: number, effectiveAttack: number, effectiveDefense: number, effectiveMobility: number } => {
  let bonuses = { hp: 0, en: 0, sp: 0, attack: 0, defense: 0, mobility: 0 };

  for (const slot in equippedItems) {
    const instanceId = equippedItems[slot as EquipmentSlotType];
    if (instanceId) {
      const eqInstance = allEquipmentInstances.find(eq => eq.instanceId === instanceId);
      if (eqInstance) {
        const eqDef = EQUIPMENT_DEFS_MAP.get(eqInstance.definitionId);
        if (eqDef) {
          Object.keys(eqDef.baseStatsBoost).forEach(key => {
            const statKey = key as keyof typeof bonuses;
            bonuses[statKey] += (eqDef.baseStatsBoost[statKey] || 0);
            if (eqInstance.currentLevel > 1 && eqDef.upgradeStatsPerLevel[statKey]) {
              bonuses[statKey] += (eqDef.upgradeStatsPerLevel[statKey] || 0) * (eqInstance.currentLevel - 1);
            }
          });
        }
      }
    }
  }
  return {
    effectiveMaxHp: baseStats.hp + bonuses.hp,
    effectiveMaxEn: baseStats.en + bonuses.en,
    effectiveMaxSp: baseStats.sp + bonuses.sp,
    effectiveAttack: baseStats.attack + bonuses.attack,
    effectiveDefense: baseStats.defense + bonuses.defense,
    effectiveMobility: baseStats.mobility + bonuses.mobility,
  };
};

const createUnitInstance = (
    definition: RobotDefinition,
    index: number,
    isPlayer: boolean,
    unitEquipmentContext: EquipmentInstance[],
    ngCycle: number = 0,
    existingInstance?: Partial<RobotInstance>,
    otherPlayerUnitsInSameBatch: RobotInstance[] = []
  ): RobotInstance => {
  const prefix = isPlayer ? 'player' : 'enemy';
  const id = existingInstance?.id || `${prefix}-${definition.id}-${index}-${Math.random().toString(36).substring(7)}`;

  const minimapX = existingInstance?.minimapX ?? (10 + Math.random() * 80);
  const minimapY = existingInstance?.minimapY ?? (isPlayer
    ? TERRAIN_ZONE_COLONY_INTERIOR_MAX_Y + Math.random() * (100 - TERRAIN_ZONE_COLONY_INTERIOR_MAX_Y - 5)
    : 5 + Math.random() * (TERRAIN_ZONE_ASTEROID_FIELD_MAX_Y - 10));
  const currentTerrainId = getTerrainIdForPosition(minimapY);

  const level = existingInstance?.level || 1;
  const currentXp = existingInstance?.currentXp || 0;
  const xpToNextLevel = existingInstance?.xpToNextLevel || (INITIAL_XP_TO_NEXT_LEVEL_BASE * level);

  let baseMaxHp = definition.maxHp;
  let baseMaxEn = definition.maxEn;
  let baseMaxSp = definition.maxSp;
  let baseAttack = definition.attack;
  let baseDefense = definition.defense;
  let baseMobility = definition.mobility;

  if (level > 1) {
      const levelUps = level -1;
      baseMaxHp += STAT_INCREASES_PER_LEVEL.hp * levelUps;
      baseMaxEn += STAT_INCREASES_PER_LEVEL.en * levelUps;
      baseMaxSp += STAT_INCREASES_PER_LEVEL.sp * levelUps;
      baseAttack += STAT_INCREASES_PER_LEVEL.attack * levelUps;
      baseDefense += STAT_INCREASES_PER_LEVEL.defense * levelUps;
      baseMobility += STAT_INCREASES_PER_LEVEL.mobility * levelUps;
  }
  
  if (!isPlayer && ngCycle > 0) {
    const statScaleFactor = 1 + (ENEMY_NG_PLUS_STAT_MULTIPLIER * ngCycle);
    baseMaxHp = Math.round(baseMaxHp * statScaleFactor);
    baseAttack = Math.round(baseAttack * statScaleFactor);
    baseDefense = Math.round(baseDefense * statScaleFactor);
  }

  const initialEquippedItems: Partial<Record<EquipmentSlotType, string | null>> = existingInstance?.equippedItems || {};
  if (!existingInstance?.equippedItems && definition.initialEquipment && isPlayer) {
    for (const slotKey in definition.initialEquipment) {
        const slot = slotKey as EquipmentSlotType;
        const defId = definition.initialEquipment[slot];
        if (defId) {
            const instanceToEquip = unitEquipmentContext.find(invInst =>
                invInst.definitionId === defId &&
                !Object.values(initialEquippedItems).includes(invInst.instanceId) && 
                !otherPlayerUnitsInSameBatch.some(rUnit => rUnit.id !== id && Object.values(rUnit.equippedItems).includes(invInst.instanceId))
            );
            if (instanceToEquip) {
                 initialEquippedItems[slot] = instanceToEquip.instanceId;
            }
        }
    }
  }

  const baseStats = { hp: baseMaxHp, en: baseMaxEn, sp: baseMaxSp, attack: baseAttack, defense: baseDefense, mobility: baseMobility };
  const effectiveStats = calculateEffectiveStats(baseStats, initialEquippedItems, unitEquipmentContext);
  
  const currentHp = existingInstance?.currentHp ?? effectiveStats.effectiveMaxHp;
  const currentEn = existingInstance?.currentEn ?? effectiveStats.effectiveMaxEn;
  const currentSp = existingInstance?.currentSp ?? effectiveStats.effectiveMaxSp;


  return {
    id, definitionId: definition.id,
    name: definition.name, pilotName: definition.pilotName,
    level, currentXp, xpToNextLevel,
    baseMaxHp, baseMaxEn, baseMaxSp, baseAttack, baseDefense, baseMobility,
    ...effectiveStats,
    currentHp: Math.min(currentHp, effectiveStats.effectiveMaxHp), // Ensure currentHP doesn't exceed new effectiveMaxHP
    currentEn: Math.min(currentEn, effectiveStats.effectiveMaxEn),
    currentSp: Math.min(currentSp, effectiveStats.effectiveMaxSp),
    activeSpiritEffect: existingInstance?.activeSpiritEffect || null, 
    hasActed: existingInstance?.hasActed || false, 
    isPlayerUnit: isPlayer,
    spriteUrl: definition.spriteUrl, minimapX, minimapY, currentTerrainId,
    equippedItems: initialEquippedItems,
  };
};

const updateMinimapPositionsAndTerrain = (units: RobotInstance[], isPlayerList: boolean): RobotInstance[] => {
  return units.map(unit => {
    if (unit.currentHp > 0) {
      const newMinimapX = 10 + Math.random() * 80;
      const newMinimapY = isPlayerList
        ? TERRAIN_ZONE_COLONY_INTERIOR_MAX_Y + Math.random() * (100 - TERRAIN_ZONE_COLONY_INTERIOR_MAX_Y - 5)
        : 5 + Math.random() * (TERRAIN_ZONE_ASTEROID_FIELD_MAX_Y - 10);
      return { ...unit, minimapX: newMinimapX, minimapY: newMinimapY, currentTerrainId: getTerrainIdForPosition(newMinimapY) };
    }
    return unit;
  });
};

const translateGamePhase = (phase: GamePhase): string => {
  switch (phase) {
    case GamePhase.PLAYER_TURN_SELECT_UNIT: return '플레이어 턴: 유닛 선택';
    case GamePhase.PLAYER_TURN_ACTION: return '플레이어 턴: 행동 선택';
    case GamePhase.PLAYER_TURN_SELECT_TARGET: return '플레이어 턴: 목표 선택';
    case GamePhase.ENEMY_TURN: return '적 턴';
    case GamePhase.BATTLE_RESOLUTION: return '전투 결과';
    case GamePhase.GAME_OVER_VICTORY: return '게임 종료: 승리';
    case GamePhase.GAME_OVER_DEFEAT: return '게임 종료: 패배';
    case GamePhase.SCENARIO_START: return '시나리오 준비 중...';
    case GamePhase.HANGAR_SCREEN: return '편성 및 강화';
    default: return (phase as string).replace(/_/g, ' ');
  }
};

const App: React.FC = () => {
  const [gamePhase, setGamePhase] = useState<GamePhase>(GamePhase.HANGAR_SCREEN);
  const [rosterUnits, setRosterUnits] = useState<RobotInstance[]>([]);
  const [playerUnits, setPlayerUnits] = useState<RobotInstance[]>([]);
  const [enemyUnits, setEnemyUnits] = useState<RobotInstance[]>([]);
  const [selectedPlayerUnitId, setSelectedPlayerUnitId] = useState<string | null>(null);
  const [selectedEnemyTargetId, setSelectedEnemyTargetId] = useState<string | null>(null);
  const [battleMessages, setBattleMessages] = useState<BattleMessage[]>([]);

  const [scenarios] = useState<ScenarioDefinition[]>(SCENARIO_DEFINITIONS);
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState<number>(0);
  const [newGamePlusCycle, setNewGamePlusCycle] = useState<number>(0);
  const [activeScenarioTitle, setActiveScenarioTitle] = useState<string>("");
  const [scenarioIntro, setScenarioIntro] = useState<string>('');

  const [turnCount, setTurnCount] = useState<number>(1);

  const [playerState, setPlayerState] = useState<PlayerState>({
    credits: INITIAL_CREDITS,
    equipmentInventory: INITIAL_PLAYER_EQUIPMENT_INSTANCE_IDS.map((defId, index) => ({
        instanceId: `player-owned-${defId}-${index}`,
        definitionId: defId,
        currentLevel: 1,
    })),
  });

  const [isDelegationModeActive, setIsDelegationModeActive] = useState<boolean>(false);
  const [hasHangarAutomationRunThisSession, setHasHangarAutomationRunThisSession] = useState<boolean>(false);
  const cpuActionLock = useRef<boolean>(false);
  const enemyTurnMessageDisplayed = useRef<boolean>(false);
  const [gameLoadedFromStorage, setGameLoadedFromStorage] = useState(false);
  const prevGamePhaseRef = useRef<GamePhase>();


  const addMessage = useCallback((text: string, type: BattleMessage['type']) => {
    setBattleMessages(prev => [...prev, { id: Date.now().toString() + Math.random(), text, type }]);
  }, []);

  const handleToggleDelegationMode = useCallback(() => {
    const updater = (prev: boolean): boolean => {
        const newState = !prev;
        addMessage(`위임 모드가 ${newState ? '활성화' : '비활성화'}되었습니다.`, newState ? 'cpu_action' : 'system');
        if (!newState) {
            cpuActionLock.current = false;
        } else {
           if (gamePhase === GamePhase.HANGAR_SCREEN) {
             setHasHangarAutomationRunThisSession(false);
           }
        }
        return newState;
    };
    setIsDelegationModeActive(updater);
  }, [addMessage, gamePhase]);

  const recalculateSingleUnitEffectiveStats = useCallback((unitToUpdate: RobotInstance, allPlayerEquipment: EquipmentInstance[]): RobotInstance => {
    const baseStats = { hp: unitToUpdate.baseMaxHp, en: unitToUpdate.baseMaxEn, sp: unitToUpdate.baseMaxSp, attack: unitToUpdate.baseAttack, defense: unitToUpdate.baseDefense, mobility: unitToUpdate.baseMobility };
    const newEffectiveStats = calculateEffectiveStats(baseStats, unitToUpdate.equippedItems, allPlayerEquipment);

    let currentHp = unitToUpdate.currentHp;
    if (newEffectiveStats.effectiveMaxHp > unitToUpdate.effectiveMaxHp) {
        currentHp += (newEffectiveStats.effectiveMaxHp - unitToUpdate.effectiveMaxHp);
    }
    currentHp = Math.min(currentHp, newEffectiveStats.effectiveMaxHp);
    currentHp = Math.max(0, currentHp);

    let currentEn = unitToUpdate.currentEn;
    if (newEffectiveStats.effectiveMaxEn > unitToUpdate.effectiveMaxEn) {
        currentEn += (newEffectiveStats.effectiveMaxEn - unitToUpdate.effectiveMaxEn);
    }
    currentEn = Math.min(currentEn, newEffectiveStats.effectiveMaxEn);

    let currentSp = unitToUpdate.currentSp;
     if (newEffectiveStats.effectiveMaxSp > unitToUpdate.effectiveMaxSp) {
        currentSp += (newEffectiveStats.effectiveMaxSp - unitToUpdate.effectiveMaxSp);
    }
    currentSp = Math.min(currentSp, newEffectiveStats.effectiveMaxSp);

    return { ...unitToUpdate, ...newEffectiveStats, currentHp, currentEn, currentSp };
  }, []);

  const initializeFullGame = useCallback<() => void>(() => {
    let newInventory = [...INITIAL_PLAYER_EQUIPMENT_INSTANCE_IDS.map((defId, index) => ({
        instanceId: `player-owned-${defId}-${index}`, definitionId: defId, currentLevel: 1,
    }))];

    INITIAL_PLAYER_UNITS_DEFS.forEach((pDef, pIdx) => {
        if (pDef.initialEquipment) {
            Object.values(pDef.initialEquipment).forEach(eqDefId => {
                if (eqDefId && !newInventory.some(invItem => invItem.definitionId === eqDefId)) {
                    const instanceId = `player-initial-${pDef.id}-${eqDefId}-${pIdx}-${Math.random().toString(16).slice(2)}`;
                    if (!newInventory.some(item => item.instanceId === instanceId)) {
                       newInventory.push({ instanceId, definitionId: eqDefId, currentLevel: 1});
                    }
                }
            });
        }
    });

    setPlayerState({ credits: INITIAL_CREDITS, equipmentInventory: newInventory });
    
    const initialRosterUnits = INITIAL_PLAYER_UNITS_DEFS.reduce<RobotInstance[]>((acc, def, i) => {
        const newUnit = createUnitInstance(def, i, true, newInventory, 0, undefined, acc);
        acc.push(newUnit);
        return acc;
    }, []);

    setRosterUnits(initialRosterUnits);
    setBattleMessages([]);
    setCurrentScenarioIndex(0);
    setNewGamePlusCycle(0);
    setTurnCount(1);
    setGamePhase(GamePhase.HANGAR_SCREEN);
    const firstScenario = scenarios[0];
    if (firstScenario) {
        setActiveScenarioTitle(firstScenario.title); // NG+ text will be added by Hangar/ReturnToHangar
        addMessage(`격납고입니다. 첫 시나리오 "${firstScenario.title}" 출격 준비를 해주세요.`, 'hangar');
    } else {
        setActiveScenarioTitle("시나리오 없음");
        addMessage("격납고입니다. 설정된 시나리오가 없습니다.", 'hangar');
    }
    setHasHangarAutomationRunThisSession(false);
  }, [addMessage, scenarios]);


  const saveGameStateToLocalStorage = useCallback(() => {
    if (gamePhase === GamePhase.SCENARIO_START || !gameLoadedFromStorage) return;

    const stateToSave: SavedGameState = {
      currentScenarioIndex,
      newGamePlusCycle,
      turnCount,
      playerState,
      rosterUnits,
      isDelegationModeActive,
      gamePhase,
      activeScenarioTitle,
    };

    if (gamePhase !== GamePhase.HANGAR_SCREEN && gamePhase !== GamePhase.GAME_OVER_DEFEAT && gamePhase !== GamePhase.GAME_OVER_VICTORY) {
      stateToSave.playerUnitsInBattle = playerUnits;
      stateToSave.enemyUnitsInBattle = enemyUnits;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      if (gamePhase !== GamePhase.HANGAR_SCREEN) {
          addMessage("게임 상태가 자동으로 저장되었습니다.", 'system');
      }
    } catch (error) {
      console.error("Error saving game state:", error);
      if (gamePhase !== GamePhase.HANGAR_SCREEN) {
        addMessage("오류: 게임 상태를 저장하지 못했습니다.", 'system');
      }
    }
  }, [
    currentScenarioIndex, newGamePlusCycle, turnCount, playerState, rosterUnits,
    isDelegationModeActive, gamePhase, playerUnits, enemyUnits, activeScenarioTitle, addMessage, gameLoadedFromStorage
  ]);

  const loadGameStateFromLocalStorage = useCallback<() => boolean>(() => {
    try {
      const savedStateJSON = localStorage.getItem(STORAGE_KEY);
      if (!savedStateJSON) return false;

      const savedState: SavedGameState = JSON.parse(savedStateJSON);

      if (typeof savedState.currentScenarioIndex !== 'number' ||
          typeof savedState.newGamePlusCycle !== 'number' ||
          !savedState.playerState || !savedState.rosterUnits) {
        console.warn("저장된 게임 데이터가 유효하지 않습니다. 새 게임을 시작합니다.");
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }
      
      setCurrentScenarioIndex(savedState.currentScenarioIndex);
      setNewGamePlusCycle(savedState.newGamePlusCycle);
      setTurnCount(savedState.turnCount || 1);
      setPlayerState(savedState.playerState);
      // When loading roster, ensure transient states like `hasActed` are reset.
      // For units in battle, their `hasActed` state should be preserved from the save.
      setRosterUnits(savedState.rosterUnits.map(u => ({
        ...createUnitInstance(ALL_ROBOT_DEFS_MAP.get(u.definitionId)!, 0, true, savedState.playerState.equipmentInventory, savedState.newGamePlusCycle, u),
        hasActed: false, activeSpiritEffect: null // Reset for hangar context
      })));
      setIsDelegationModeActive(savedState.isDelegationModeActive);
      
      setBattleMessages([]);
      setSelectedPlayerUnitId(null);
      setSelectedEnemyTargetId(null);
      setScenarioIntro('');
      cpuActionLock.current = false;
      enemyTurnMessageDisplayed.current = false;
      setHasHangarAutomationRunThisSession(false);

      if (savedState.gamePhase && savedState.gamePhase !== GamePhase.HANGAR_SCREEN && savedState.gamePhase !== GamePhase.SCENARIO_START && savedState.playerUnitsInBattle && savedState.enemyUnitsInBattle) {
        // Re-create instances to ensure they are fresh and methods (if any) are bound.
        // Also ensures stats are recalculated based on loaded equipment and levels.
        const loadedPlayerUnits = savedState.playerUnitsInBattle.map(u => 
            createUnitInstance(ALL_ROBOT_DEFS_MAP.get(u.definitionId)!, 0, true, savedState.playerState.equipmentInventory, savedState.newGamePlusCycle, u)
        );
        const loadedEnemyUnits = savedState.enemyUnitsInBattle.map(u => 
            createUnitInstance(ALL_ROBOT_DEFS_MAP.get(u.definitionId)!, 0, false, [], savedState.newGamePlusCycle, u)
        );

        setPlayerUnits(loadedPlayerUnits);
        setEnemyUnits(loadedEnemyUnits);
        setGamePhase(savedState.gamePhase);
        setActiveScenarioTitle(savedState.activeScenarioTitle || scenarios[savedState.currentScenarioIndex]?.title || "시나리오");
        addMessage("저장된 게임 상태를 불러왔습니다.", 'system');
      } else {
        setGamePhase(GamePhase.HANGAR_SCREEN);
        setPlayerUnits([]);
        setEnemyUnits([]);
        let nextScenarioTitle = "모든 시나리오 클리어";
        if (savedState.currentScenarioIndex < scenarios.length) {
            nextScenarioTitle = scenarios[savedState.currentScenarioIndex].title;
        }
        const ngCycleText = savedState.newGamePlusCycle > 0 ? ` (NG+ ${savedState.newGamePlusCycle})` : "";
        setActiveScenarioTitle(`${nextScenarioTitle}${ngCycleText}`);
        addMessage(`저장된 게임 상태를 불러와 격납고로 이동합니다. 다음 시나리오: "${nextScenarioTitle}"`, 'hangar');
      }
      
      return true;
    } catch (error) {
      console.error("저장된 게임 상태 불러오기 오류:", error);
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }
  }, [addMessage, scenarios, setPlayerState, setRosterUnits]);

  useEffect(() => {
    if (!gameLoadedFromStorage) {
      const successfullyLoaded = loadGameStateFromLocalStorage();
      if (!successfullyLoaded) {
        initializeFullGame();
      }
      setGameLoadedFromStorage(true);
    }
  }, [gameLoadedFromStorage, loadGameStateFromLocalStorage, initializeFullGame]);

  useEffect(() => {
    // Save when transitioning from ENEMY_TURN to PLAYER_TURN_SELECT_UNIT
    if (prevGamePhaseRef.current === GamePhase.ENEMY_TURN && gamePhase === GamePhase.PLAYER_TURN_SELECT_UNIT) {
        saveGameStateToLocalStorage();
    }
    prevGamePhaseRef.current = gamePhase;
  }, [gamePhase, saveGameStateToLocalStorage]);


  const handleStartScenario = useCallback(async () => {
    let scenarioIdxToLoad = currentScenarioIndex;
    let cycleForEnemyScaling = newGamePlusCycle;

    if (currentScenarioIndex >= scenarios.length) { 
        const nextNGPlusCycle = newGamePlusCycle + 1;
        setNewGamePlusCycle(nextNGPlusCycle);
        cycleForEnemyScaling = nextNGPlusCycle; 
        scenarioIdxToLoad = 0;
        setCurrentScenarioIndex(0);
        addMessage(`새로운 회차 (NG+ ${nextNGPlusCycle}회차)를 시작합니다! 모든 유닛의 HP/EN/SP가 회복됩니다.`, 'system');

        setRosterUnits(prevRoster => prevRoster.map(unit => {
            const def = ALL_ROBOT_DEFS_MAP.get(unit.definitionId);
            if (!def) return unit; // Should not happen
            const refreshedUnit = createUnitInstance(def, 0, true, playerState.equipmentInventory, nextNGPlusCycle, {...unit, currentHp: unit.effectiveMaxHp, currentEn: unit.effectiveMaxEn, currentSp: unit.effectiveMaxSp});
            return {
                ...refreshedUnit,
                hasActed: false,
                activeSpiritEffect: null,
            };
        }));
        await delay(100); 
    }
    
    const selectedScenario = scenarios[scenarioIdxToLoad];
    if (!selectedScenario) {
        addMessage("시나리오 데이터를 찾을 수 없습니다.", 'system');
        setGamePhase(GamePhase.HANGAR_SCREEN);
        return;
    }
    
    const currentRosterForDeployment = rosterUnits.map(unit => ({...unit}));


    const deployedPlayerUnits = currentRosterForDeployment.map(rUnit => {
      const def = ALL_ROBOT_DEFS_MAP.get(rUnit.definitionId);
      if(!def) return rUnit; // Should not happen
      const unitWithPosition = createUnitInstance(def, 0, true, playerState.equipmentInventory, cycleForEnemyScaling, {
        ...rUnit,
        currentHp: rUnit.effectiveMaxHp, currentEn: rUnit.effectiveMaxEn, currentSp: rUnit.effectiveMaxSp,
        hasActed: false, activeSpiritEffect: null,
        minimapX: 10 + Math.random() * 80,
        minimapY: TERRAIN_ZONE_COLONY_INTERIOR_MAX_Y + Math.random() * (100 - TERRAIN_ZONE_COLONY_INTERIOR_MAX_Y - 5),
      });
      unitWithPosition.currentTerrainId = getTerrainIdForPosition(unitWithPosition.minimapY);
      return recalculateSingleUnitEffectiveStats(unitWithPosition, playerState.equipmentInventory);
    });
    setPlayerUnits(deployedPlayerUnits);

    const initialEnemyUnits = selectedScenario.enemyUnitDefs.map((def, i) => createUnitInstance(def, i, false, [], cycleForEnemyScaling));
    setEnemyUnits(initialEnemyUnits);

    setBattleMessages([]); // Clear messages for new scenario
    setSelectedPlayerUnitId(null); setSelectedEnemyTargetId(null);
    setTurnCount(1);
    
    const ngCycleText = cycleForEnemyScaling === 0 ? "1회차" : `NG+ ${cycleForEnemyScaling}회차`;
    setActiveScenarioTitle(`${selectedScenario.title} (${ngCycleText})`);


    let introText = selectedScenario.introNarration || `작전명: "${selectedScenario.title}". 전투 개시!`;
    if (!selectedScenario.introNarration) { // Keep mock generation if no narration provided
        introText = await generateScenarioIntro(selectedScenario.title);
    }
    setScenarioIntro(introText);
    addMessage(introText, 'system'); // Add intro to new messages
    enemyTurnMessageDisplayed.current = false; 

    setGamePhase(GamePhase.PLAYER_TURN_SELECT_UNIT);
    cpuActionLock.current = false;
    addMessage(`--- 플레이어 턴 1 ---`, 'system');
    setHasHangarAutomationRunThisSession(false);
  }, [addMessage, rosterUnits, currentScenarioIndex, scenarios, newGamePlusCycle, playerState.equipmentInventory, recalculateSingleUnitEffectiveStats]);


  const awardXpAndLevelUp = useCallback((unitId: string, xpAmount: number) => {
    const unitListUpdater = (units: RobotInstance[]) => {
        const unitIndex = units.findIndex(u => u.id === unitId);
        if (unitIndex === -1 || !units[unitIndex].isPlayerUnit) return units;

        let unitToUpdate = { ...units[unitIndex] };
        unitToUpdate.currentXp += xpAmount;
        let leveledUpThisCheck = false;

        while (unitToUpdate.currentXp >= unitToUpdate.xpToNextLevel) {
            leveledUpThisCheck = true;
            unitToUpdate.level += 1;
            unitToUpdate.currentXp -= unitToUpdate.xpToNextLevel;
            unitToUpdate.xpToNextLevel = INITIAL_XP_TO_NEXT_LEVEL_BASE * unitToUpdate.level;

            unitToUpdate.baseMaxHp += STAT_INCREASES_PER_LEVEL.hp;
            unitToUpdate.baseAttack += STAT_INCREASES_PER_LEVEL.attack;
            unitToUpdate.baseDefense += STAT_INCREASES_PER_LEVEL.defense;
            unitToUpdate.baseMaxSp += STAT_INCREASES_PER_LEVEL.sp;
            unitToUpdate.baseMaxEn += STAT_INCREASES_PER_LEVEL.en;
            unitToUpdate.baseMobility += STAT_INCREASES_PER_LEVEL.mobility;
            
            unitToUpdate = recalculateSingleUnitEffectiveStats(unitToUpdate, playerState.equipmentInventory);

            unitToUpdate.currentHp = unitToUpdate.effectiveMaxHp;
            unitToUpdate.currentEn = unitToUpdate.effectiveMaxEn;
            unitToUpdate.currentSp = unitToUpdate.effectiveMaxSp;
            addMessage(`${unitToUpdate.pilotName}의 ${unitToUpdate.name} 레벨 업! (Lv. ${unitToUpdate.level}) 주요 능력치 상승!`, 'level_up');
        }
        if (xpAmount > 0 && !leveledUpThisCheck) {
            addMessage(`${unitToUpdate.name}이(가) ${xpAmount} XP를 획득했습니다. (현재 XP: ${unitToUpdate.currentXp}/${unitToUpdate.xpToNextLevel})`, 'info');
        }
        return units.map((u, i) => i === unitIndex ? unitToUpdate : u);
    };
    setPlayerUnits(prev => unitListUpdater(prev));
    setRosterUnits(prev => unitListUpdater(prev)); 
  }, [addMessage, playerState.equipmentInventory, recalculateSingleUnitEffectiveStats]);


  const processBattle = useCallback(async (
    attacker: RobotInstance,
    defender: RobotInstance,
    isPlayerAttack: boolean
  ): Promise<'victory' | 'defeat' | 'continue'> => {
    const attackerSpiritEffect = attacker.activeSpiritEffect;
    const defenderSpiritEffect = isPlayerAttack ? null : defender.activeSpiritEffect; 
    const defenderTerrainDef = TERRAIN_EFFECTS_MAP.get(defender.currentTerrainId ?? TerrainType.SPACE);
    const defenderTerrainBonus = defenderTerrainDef?.defenseBonusPercent ?? 0;

    const outcome: BattleOutcome = calculateAttack(attacker, defender, attackerSpiritEffect, defenderSpiritEffect, defenderTerrainBonus);
    outcome.log.forEach(logMsg => addMessage(logMsg, isPlayerAttack ? 'player_attack' : 'enemy_attack'));

    if (isPlayerAttack && outcome.xpGained > 0) awardXpAndLevelUp(attacker.id, outcome.xpGained);
    
    if (outcome.defenderDefeated && isPlayerAttack) {
        let creditsForThisDefeat = CREDITS_PER_ENEMY_DEFEAT;
        if (newGamePlusCycle > 0) {
            creditsForThisDefeat = Math.round(creditsForThisDefeat * (1 + (ENEMY_NG_PLUS_CREDIT_MULTIPLIER * newGamePlusCycle)));
        }
        setPlayerState(prev => ({...prev, credits: prev.credits + creditsForThisDefeat }));
        addMessage(`${defender.name} 격파! ${creditsForThisDefeat} 크레딧 획득.`, 'system');
    }

    // Mock narration is fine for now.
    // const narration = await generateBattleNarration(attacker, defender, outcome.damage, outcome.isCritical, outcome.isMiss, outcome.defenderDefeated);
    // addMessage(narration, 'narration'); // This might be too much if Gemini is not active. Let's keep it simple.

    let finalAttackerState = { ...attacker };
    let finalDefenderState = { ...defender };

    let currentBattleResultStatus: 'victory' | 'defeat' | 'continue' = 'continue';

    if (isPlayerAttack) {
        finalDefenderState.currentHp = outcome.defenderRemainingHp;
        finalAttackerState.hasActed = true;
        if (outcome.attackerSpiritConsumed) finalAttackerState.activeSpiritEffect = null;

        const updatedEnemyUnits = enemyUnits.map(u => u.id === finalDefenderState.id ? finalDefenderState : u);
        const updatedPlayerUnits = playerUnits.map(u => u.id === finalAttackerState.id ? finalAttackerState : u);
        setEnemyUnits(updatedEnemyUnits);
        setPlayerUnits(updatedPlayerUnits);

        setRosterUnits(prevRoster => prevRoster.map(u => {
            if (u.id === finalAttackerState.id) { 
                const battleUnit = updatedPlayerUnits.find(p => p.id === u.id);
                return battleUnit ? {...u, ...battleUnit} : u; 
            }
            return u;
        }));

        if (outcome.defenderDefeated && updatedEnemyUnits.filter(e => e.currentHp > 0).length === 0 && enemyUnits.length > 0) {
            currentBattleResultStatus = 'victory';
        }

    } else { 
        finalDefenderState.currentHp = outcome.defenderRemainingHp;
        if (outcome.defenderSpiritConsumed) finalDefenderState.activeSpiritEffect = null;
        finalAttackerState.hasActed = true; 

        const updatedPlayerUnits = playerUnits.map(u => u.id === finalDefenderState.id ? finalDefenderState : u);
        const updatedEnemyUnits = enemyUnits.map(u => u.id === finalAttackerState.id ? finalAttackerState : u);

        setPlayerUnits(updatedPlayerUnits);
        setEnemyUnits(updatedEnemyUnits);

        setRosterUnits(prevRoster => prevRoster.map(u => {
             if (u.id === finalDefenderState.id) { 
                const battleUnit = updatedPlayerUnits.find(p => p.id === u.id);
                return battleUnit ? {...u, ...battleUnit} : u; 
             }
             return u;
        }));

        if (outcome.defenderDefeated && updatedPlayerUnits.filter(p => p.currentHp > 0).length === 0 && playerUnits.length > 0) {
            currentBattleResultStatus = 'defeat';
        }
    }

    if (currentBattleResultStatus === 'victory') {
        setGamePhase(prevPhase => {
            if (prevPhase === GamePhase.GAME_OVER_VICTORY || prevPhase === GamePhase.GAME_OVER_DEFEAT) return prevPhase;
            addMessage("모든 적 유닛 격파! 승리!", 'system');
            return GamePhase.GAME_OVER_VICTORY;
        });
    } else if (currentBattleResultStatus === 'defeat') {
        setGamePhase(prevPhase => {
            if (prevPhase === GamePhase.GAME_OVER_VICTORY || prevPhase === GamePhase.GAME_OVER_DEFEAT) return prevPhase;
            addMessage("모든 아군 유닛 격파! 패배!", 'system');
            return GamePhase.GAME_OVER_DEFEAT;
        });
    }
    return currentBattleResultStatus;
  }, [addMessage, awardXpAndLevelUp, playerUnits, enemyUnits, newGamePlusCycle]);


  const selectedPlayerUnit = playerUnits.find(u => u.id === selectedPlayerUnitId);

  const handleSelectPlayerUnit = useCallback((unitId: string) => {
    const unit = playerUnits.find(u => u.id === unitId);
    if (unit && !unit.hasActed && unit.currentHp > 0) {
      setSelectedPlayerUnitId(unitId);
      setSelectedEnemyTargetId(null);
      setGamePhase(GamePhase.PLAYER_TURN_ACTION);
      if (!isDelegationModeActive) addMessage(`${unit.name} 선택됨. 행동을 선택하세요.`, 'info');
    }
  }, [playerUnits, isDelegationModeActive, addMessage]);

  const handleSelectEnemyTarget = (targetId: string) => {
    if (selectedPlayerUnit && gamePhase === GamePhase.PLAYER_TURN_SELECT_TARGET) {
      const target = enemyUnits.find(u => u.id === targetId);
      if (target && target.currentHp > 0) {
        setSelectedEnemyTargetId(targetId);
        if (!isDelegationModeActive) addMessage(`${target.name} 목표 지정됨. 공격을 확인하세요.`, 'info');
        if(!isDelegationModeActive) handleConfirmAttack(target.id);
      }
    }
  };

  const handleConfirmAttack = useCallback(async (targetIdToAttack?: string) => {
    const currentTargetId = targetIdToAttack || selectedEnemyTargetId;
    const attackerUnit = playerUnits.find(u => u.id === selectedPlayerUnitId);

    if (attackerUnit && currentTargetId && (gamePhase === GamePhase.PLAYER_TURN_SELECT_TARGET || gamePhase === GamePhase.PLAYER_TURN_ACTION)) {
      const target = enemyUnits.find(u => u.id === currentTargetId);
      if (target) {
        const battleResult = await processBattle(attackerUnit, target, true);
        setSelectedEnemyTargetId(null);

        if (battleResult === 'victory' || battleResult === 'defeat') {
             setSelectedPlayerUnitId(null);
             return;
        }
        setGamePhase(GamePhase.PLAYER_TURN_SELECT_UNIT);
      }
    }
  }, [selectedPlayerUnitId, selectedEnemyTargetId, gamePhase, playerUnits, enemyUnits, processBattle]);


  const handleAttackAction = useCallback(() => {
    const currentSelectedUnit = playerUnits.find(u => u.id === selectedPlayerUnitId);
    if (currentSelectedUnit) {
      const messageText = currentSelectedUnit.activeSpiritEffect
        ? `${currentSelectedUnit.name} (${currentSelectedUnit.activeSpiritEffect.replace(/_/g, ' ')})의 공격 대상을 선택하세요.`
        : `${currentSelectedUnit.name}의 공격 대상을 선택하세요.`;
      setGamePhase(GamePhase.PLAYER_TURN_SELECT_TARGET);
      setSelectedEnemyTargetId(null);
      if(!isDelegationModeActive) addMessage(messageText, 'info');
    }
  },[selectedPlayerUnitId, playerUnits, isDelegationModeActive, addMessage]);

  const handleWaitAction = useCallback(() => {
    const currentSelectedUnit = playerUnits.find(u => u.id === selectedPlayerUnitId);
    if (currentSelectedUnit) {
      addMessage(`${currentSelectedUnit.name} 대기.`, 'info');
      const actingUnitId = currentSelectedUnit.id;
      
      let updatedBattleUnit: RobotInstance | undefined;
      setPlayerUnits(prev => {
          const newPlayerUnits = prev.map(u => u.id === actingUnitId ? { ...u, hasActed: true, activeSpiritEffect: null } : u);
          updatedBattleUnit = newPlayerUnits.find(u => u.id === actingUnitId);
          return newPlayerUnits;
      });

      setRosterUnits(prev => { 
          return prev.map(rUnit => {
              if (rUnit.id === actingUnitId && updatedBattleUnit) {
                return {...rUnit, ...updatedBattleUnit}; 
              }
              return rUnit;
          });
      });
      setSelectedPlayerUnitId(null);
      setGamePhase(GamePhase.PLAYER_TURN_SELECT_UNIT);
    }
  }, [selectedPlayerUnitId, playerUnits, addMessage]);

  const handleEndPlayerTurn = useCallback(() => {
    setGamePhase(prevPhase => {
        if (prevPhase === GamePhase.GAME_OVER_DEFEAT || prevPhase === GamePhase.GAME_OVER_VICTORY) return prevPhase;

        setSelectedPlayerUnitId(null);
        setSelectedEnemyTargetId(null);
        addMessage("플레이어 턴 종료.", 'system');
        enemyTurnMessageDisplayed.current = false; 

        const updatedPlayerUnits = playerUnits.map(u => ({
            ...u,
            activeSpiritEffect: u.activeSpiritEffect === SpiritCommandEffect.GUARANTEED_EVADE ? u.activeSpiritEffect : null
        }));
        setPlayerUnits(updatedPlayerUnits);

        setRosterUnits(prevRoster => prevRoster.map(rUnit => {
            const pUnit = updatedPlayerUnits.find(pu => pu.id === rUnit.id);
            return pUnit ? {...rUnit, activeSpiritEffect: pUnit.activeSpiritEffect === SpiritCommandEffect.GUARANTEED_EVADE ? pUnit.activeSpiritEffect : null } : rUnit;
        }));
        return GamePhase.ENEMY_TURN;
    });
  }, [addMessage, playerUnits]);


  const handleActivateSpiritCommand = useCallback((spiritId: string) => {
    let spiritActivated = false;
    let activatedSpiritName = '';
    let pilotName = '';

    setPlayerUnits(prevPlayerUnits => {
        const currentSelectedPlayerUnit = prevPlayerUnits.find(u => u.id === selectedPlayerUnitId);
        if (!currentSelectedPlayerUnit) return prevPlayerUnits;

        const unitDef = ALL_ROBOT_DEFS_MAP.get(currentSelectedPlayerUnit.definitionId);
        if (!unitDef) return prevPlayerUnits;

        const spiritToActivate = unitDef.availableSpiritCommands.find(s => s.id === spiritId);
        if (!spiritToActivate) return prevPlayerUnits;

        if (currentSelectedPlayerUnit.currentSp >= spiritToActivate.cost && !currentSelectedPlayerUnit.activeSpiritEffect) {
            const updatedUnits = prevPlayerUnits.map(u =>
                u.id === currentSelectedPlayerUnit.id
                ? { ...u, currentSp: u.currentSp - spiritToActivate.cost, activeSpiritEffect: spiritToActivate.effect }
                : u
            );
            spiritActivated = true;
            activatedSpiritName = spiritToActivate.name;
            pilotName = currentSelectedPlayerUnit.pilotName;
            return updatedUnits;
        } else if (currentSelectedPlayerUnit.activeSpiritEffect) {
            if(!isDelegationModeActive) addMessage(`이미 다른 정신 커맨드가 활성화되어 있습니다.`, 'info');
        } else {
            if(!isDelegationModeActive) addMessage(`SP가 부족합니다. (필요 SP: ${spiritToActivate.cost})`, 'info');
        }
        return prevPlayerUnits;
    });

    if(spiritActivated){
        setRosterUnits(prevRoster => prevRoster.map(rUnit => {
            if (rUnit.id === selectedPlayerUnitId) {
                const battleUnit = playerUnits.find(pUnit => pUnit.id === selectedPlayerUnitId); 
                return battleUnit ? {...rUnit, ...battleUnit } : rUnit; 
            }
            return rUnit;
        }));
        if(!isDelegationModeActive) addMessage(`${pilotName}이(가) [${activatedSpiritName}] 정신 커맨드 발동!`, 'spirit');
    }
  }, [selectedPlayerUnitId, addMessage, playerUnits, isDelegationModeActive]);

  const handleEquipItemToUnit = (unitId: string, slot: EquipmentSlotType, equipmentInstanceId: string | null) => {
    setRosterUnits(prevUnits =>
        prevUnits.map(unit => {
            if (unit.id === unitId) {
                if (equipmentInstanceId) { 
                    prevUnits.forEach(otherUnit => {
                        if (otherUnit.id !== unitId) {
                            for (const s in otherUnit.equippedItems) {
                                if (otherUnit.equippedItems[s as EquipmentSlotType] === equipmentInstanceId) {
                                    otherUnit.equippedItems[s as EquipmentSlotType] = null;
                                    Object.assign(otherUnit, recalculateSingleUnitEffectiveStats(otherUnit, playerState.equipmentInventory));
                                }
                            }
                        }
                    });
                }
                const newEquippedItems = { ...unit.equippedItems, [slot]: equipmentInstanceId };
                return recalculateSingleUnitEffectiveStats({ ...unit, equippedItems: newEquippedItems }, playerState.equipmentInventory);
            }
            return unit;
        })
    );
    if(!isDelegationModeActive || gamePhase !== GamePhase.HANGAR_SCREEN) addMessage("장비가 변경되었습니다.", 'hangar');
  };

  const handleUpgradeEquipmentItem = (equipmentInstanceId: string) => {
    let actualUpgradeCost = 0;
    let itemName = "";
    let itemNewLevel = 0;
    let upgradedItemDefinitionId = ""; 

    setPlayerState(prevPlayerState => {
        const itemIndex = prevPlayerState.equipmentInventory.findIndex(item => item.instanceId === equipmentInstanceId);
        if (itemIndex === -1) return prevPlayerState;

        const itemInstance = prevPlayerState.equipmentInventory[itemIndex];
        const itemDef = EQUIPMENT_DEFS_MAP.get(itemInstance.definitionId);
        if (!itemDef || itemInstance.currentLevel >= itemDef.maxLevel) {
            if(!isDelegationModeActive || gamePhase !== GamePhase.HANGAR_SCREEN) addMessage("최대 레벨이거나 장비 정보 없음.", 'hangar');
            return prevPlayerState;
        }

        const upgradeCost = itemDef.baseUpgradeCost + itemDef.upgradeCostIncreasePerLevel * (itemInstance.currentLevel -1);
        if (prevPlayerState.credits < upgradeCost) {
            if(!isDelegationModeActive || gamePhase !== GamePhase.HANGAR_SCREEN) addMessage("크레딧이 부족합니다.", 'hangar');
            return prevPlayerState;
        }
        actualUpgradeCost = upgradeCost;
        itemName = itemDef.name;
        itemNewLevel = itemInstance.currentLevel + 1;
        upgradedItemDefinitionId = itemInstance.definitionId; 

        const updatedInventory = prevPlayerState.equipmentInventory.map((item, idx) =>
            idx === itemIndex ? { ...item, currentLevel: item.currentLevel + 1 } : item
        );
        return { ...prevPlayerState, credits: prevPlayerState.credits - upgradeCost, equipmentInventory: updatedInventory };
    });

    if(actualUpgradeCost > 0 && itemName && upgradedItemDefinitionId) {
      const tempUpdatedInventory = playerState.equipmentInventory.map(invItem =>
          invItem.instanceId === equipmentInstanceId ? { ...invItem, currentLevel: itemNewLevel, definitionId: upgradedItemDefinitionId } : invItem
      );

      setRosterUnits(prevUnits =>
        prevUnits.map(unit => {
          const isEquippedByThisUnit = Object.values(unit.equippedItems).includes(equipmentInstanceId);
          if (isEquippedByThisUnit) {
            return recalculateSingleUnitEffectiveStats(unit, tempUpdatedInventory);
          }
          return unit;
        })
      );
      if (itemNewLevel > 0 && (!isDelegationModeActive || gamePhase !== GamePhase.HANGAR_SCREEN)){
        addMessage(`${itemName}이(가) Lv.${itemNewLevel}(으)로 강화되었습니다! (-${actualUpgradeCost} C)`, 'hangar');
      }
    }
  };

  const executeAutomatedHangarTasks = useCallback(async (): Promise<{
    roster: RobotInstance[],
    inventory: EquipmentInstance[],
    credits: number
  }> => {
    addMessage("CPU: 자동 편성 및 강화를 시작합니다...", 'cpu_action');
    await delay(CPU_ACTION_DELAY_MS / 2);

    let tempRosterUnits = rosterUnits.map(u => ({ ...u, equippedItems: { ...u.equippedItems } }));
    let tempInventory = playerState.equipmentInventory.map(i => ({ ...i }));
    let tempCredits = playerState.credits;
    let rosterNeedsRecalc = false;

    for (const unit of tempRosterUnits) {
      if (!isDelegationModeActive) throw new Error("Delegation mode turned off during Hangar automation.");
      const unitDef = ALL_ROBOT_DEFS_MAP.get(unit.definitionId);
      if (!unitDef) continue;

      for (const slot of Object.values(EquipmentSlotType)) {
        if (unit.equippedItems[slot]) continue;

        const bestItemForSlot = tempInventory
          .filter(invItem => {
            const itemDef = EQUIPMENT_DEFS_MAP.get(invItem.definitionId);
            return itemDef && itemDef.slotType === slot &&
                   !tempRosterUnits.some(rUnit => Object.values(rUnit.equippedItems).includes(invItem.instanceId));
          })
          .sort((a, b) => {
            const defA = EQUIPMENT_DEFS_MAP.get(a.definitionId)!;
            const defB = EQUIPMENT_DEFS_MAP.get(b.definitionId)!;
            let statA = 0, statB = 0;
            if (slot === EquipmentSlotType.WEAPON) { statA = (defA.baseStatsBoost.attack || 0) + ((defA.upgradeStatsPerLevel.attack || 0) * (a.currentLevel-1)); statB = (defB.baseStatsBoost.attack || 0)  + ((defB.upgradeStatsPerLevel.attack || 0) * (b.currentLevel-1));}
            else if (slot === EquipmentSlotType.ARMOR) { statA = (defA.baseStatsBoost.defense || 0) + ((defA.upgradeStatsPerLevel.defense || 0) * (a.currentLevel-1)); statB = (defB.baseStatsBoost.defense || 0) + ((defB.upgradeStatsPerLevel.defense || 0) * (b.currentLevel-1)); }
            else if (slot === EquipmentSlotType.BOOSTER) { statA = (defA.baseStatsBoost.mobility || 0) + ((defA.upgradeStatsPerLevel.mobility || 0) * (a.currentLevel-1)); statB = (defB.baseStatsBoost.mobility || 0) + ((defB.upgradeStatsPerLevel.mobility || 0) * (b.currentLevel-1));}
            return statB - statA;
          })[0];

        if (bestItemForSlot) {
          addMessage(`CPU: ${unit.name}에 ${EQUIPMENT_DEFS_MAP.get(bestItemForSlot.definitionId)?.name} 장착.`, 'cpu_action');
          unit.equippedItems[slot] = bestItemForSlot.instanceId;
          rosterNeedsRecalc = true;
          await delay(CPU_ACTION_DELAY_MS / 4);
        }
      }
    }
    if (rosterNeedsRecalc) {
        tempRosterUnits = tempRosterUnits.map(u => recalculateSingleUnitEffectiveStats(u, tempInventory));
    }
    await delay(CPU_ACTION_DELAY_MS / 3);

    addMessage("CPU: 자동 장비 강화를 시작합니다...", 'cpu_action');
    const itemsToConsiderUpgrade = tempInventory.filter(invItem =>
        tempRosterUnits.some(rUnit => Object.values(rUnit.equippedItems).includes(invItem.instanceId))
    ).sort((a,b) => b.currentLevel - a.currentLevel); 

    let anyUpgradeHappened = false;
    for (const itemInstance of itemsToConsiderUpgrade) {
        if (!isDelegationModeActive) throw new Error("Delegation mode turned off during Hangar automation.");
        const itemDef = EQUIPMENT_DEFS_MAP.get(itemInstance.definitionId);
        if (!itemDef || itemInstance.currentLevel >= itemDef.maxLevel) continue;

        const upgradeCost = itemDef.baseUpgradeCost + itemDef.upgradeCostIncreasePerLevel * (itemInstance.currentLevel - 1);
        if (tempCredits >= upgradeCost) {
            addMessage(`CPU: ${itemDef.name} Lv.${itemInstance.currentLevel + 1} 강화 (비용: ${upgradeCost}C)`, 'cpu_action');
            tempCredits -= upgradeCost;
            const originalInvItem = tempInventory.find(i => i.instanceId === itemInstance.instanceId);
            if (originalInvItem) originalInvItem.currentLevel += 1;
            anyUpgradeHappened = true;
            await delay(CPU_ACTION_DELAY_MS / 4);
        }
    }
    
    if (anyUpgradeHappened) {
        tempRosterUnits = tempRosterUnits.map(u => recalculateSingleUnitEffectiveStats(u, tempInventory));
    }

    addMessage("CPU: 편성 및 강화 완료.", 'cpu_action');
    await delay(CPU_ACTION_DELAY_MS / 3);
    return { roster: tempRosterUnits, inventory: tempInventory, credits: tempCredits };
  }, [addMessage, isDelegationModeActive, rosterUnits, playerState, recalculateSingleUnitEffectiveStats]);

  useEffect(() => {
    if (isDelegationModeActive && gamePhase === GamePhase.HANGAR_SCREEN && rosterUnits.length > 0 && !hasHangarAutomationRunThisSession && !cpuActionLock.current) {
      cpuActionLock.current = true;
      setHasHangarAutomationRunThisSession(true);

      const autoHangarOperations = async () => {
        try {
            const hangarResults = await executeAutomatedHangarTasks();
            setRosterUnits(hangarResults.roster); 
            setPlayerState({ credits: hangarResults.credits, equipmentInventory: hangarResults.inventory });
            await delay(CPU_ACTION_DELAY_MS / 2); 

            if (isDelegationModeActive) { 
                addMessage("CPU: 준비 완료. 다음 시나리오/NG+를 시작합니다.", 'cpu_action');
                await delay(CPU_ACTION_DELAY_MS);
                await handleStartScenario(); 
            }
        } catch (err: any) {
          console.error("Hangar automation error:", err);
          const customMessage = err.message === "Delegation mode turned off during Hangar automation."
            ? "CPU: 위임 모드 해제됨. 자동 편성 중단."
            : "CPU: 자동 편성 중 오류 발생.";
          addMessage(customMessage, "system");
        } finally {
            if (gamePhase === GamePhase.HANGAR_SCREEN || !isDelegationModeActive) {
                 cpuActionLock.current = false;
            }
        }
      };
      autoHangarOperations();
    } else if (!isDelegationModeActive && gamePhase === GamePhase.HANGAR_SCREEN) {
        if (cpuActionLock.current) cpuActionLock.current = false;
        if (hasHangarAutomationRunThisSession) setHasHangarAutomationRunThisSession(false); 
    }
  }, [isDelegationModeActive, gamePhase, rosterUnits, playerState, hasHangarAutomationRunThisSession, addMessage, handleStartScenario, executeAutomatedHangarTasks]);

  useEffect(() => {
    if (gamePhase === GamePhase.GAME_OVER_VICTORY && isDelegationModeActive && !cpuActionLock.current) {
        cpuActionLock.current = true; 

        const performPostVictoryAutomation = async () => {
            try {
                addMessage("승리! CPU가 자동으로 다음 단계를 준비합니다...", 'system');
                await delay(CPU_ACTION_DELAY_MS);

                const hangarResults = await executeAutomatedHangarTasks();
                setRosterUnits(hangarResults.roster);
                setPlayerState({ credits: hangarResults.credits, equipmentInventory: hangarResults.inventory });
                await delay(CPU_ACTION_DELAY_MS / 2);
                
                setCurrentScenarioIndex(prev => prev + 1); 
                
                addMessage(`CPU: 다음 시나리오/NG+ 자동 시작.`, 'cpu_action');
                await delay(CPU_ACTION_DELAY_MS);
                
                setPlayerUnits([]); 
                setEnemyUnits([]);
                setSelectedPlayerUnitId(null);
                setSelectedEnemyTargetId(null);
                // turnCount will be reset by handleStartScenario
                setScenarioIntro('');
                // battleMessages will be cleared by handleStartScenario
                enemyTurnMessageDisplayed.current = false; 


                await handleStartScenario(); 
                setHasHangarAutomationRunThisSession(true); 
            } catch (error: any) {
                console.error("Error in post-victory automation:", error);
                 const customMessage = error.message === "Delegation mode turned off during Hangar automation."
                    ? "CPU: 위임 모드 해제됨. 자동 진행 중단."
                    : "오류: 자동 시나리오 진행 중 문제 발생.";
                addMessage(customMessage, "system");
                setGamePhase(GamePhase.HANGAR_SCREEN); 
            } finally {
                 if (gamePhase === GamePhase.GAME_OVER_VICTORY || gamePhase === GamePhase.HANGAR_SCREEN) {
                    cpuActionLock.current = false;
                 }
            }
        };
        performPostVictoryAutomation();
    }
  }, [gamePhase, isDelegationModeActive, scenarios, addMessage, handleStartScenario, executeAutomatedHangarTasks, currentScenarioIndex]);


  useEffect(() => {
    if (gamePhase === GamePhase.HANGAR_SCREEN || gamePhase === GamePhase.SCENARIO_START) return;
    if (gamePhase === GamePhase.GAME_OVER_VICTORY || gamePhase === GamePhase.GAME_OVER_DEFEAT) return; 

    const activePlayerUnits = playerUnits.filter(u => u.currentHp > 0);
    const activeEnemyUnits = enemyUnits.filter(e => e.currentHp > 0);

    if (playerUnits.length > 0 && activePlayerUnits.length === 0) {
        setGamePhase(prevPhase => {
            if (prevPhase === GamePhase.GAME_OVER_VICTORY || prevPhase === GamePhase.GAME_OVER_DEFEAT) return prevPhase;
            addMessage("모든 아군 유닛 격파! 패배!", 'system');
            return GamePhase.GAME_OVER_DEFEAT;
        });
    } else if (enemyUnits.length > 0 && activeEnemyUnits.length === 0) {
        setGamePhase(prevPhase => {
            if (prevPhase === GamePhase.GAME_OVER_VICTORY || prevPhase === GamePhase.GAME_OVER_DEFEAT) return prevPhase;
            addMessage("모든 적 유닛 격파! 승리!", 'system');
            return GamePhase.GAME_OVER_VICTORY;
        });
    }
  }, [playerUnits, enemyUnits, gamePhase, addMessage]);

  useEffect(() => {
    if ( (gamePhase === GamePhase.PLAYER_TURN_SELECT_UNIT || gamePhase === GamePhase.PLAYER_TURN_ACTION) ) {
      const currentLivePlayerUnits = playerUnits.filter(u => u.currentHp > 0);
      if (currentLivePlayerUnits.length > 0 && currentLivePlayerUnits.every(u => u.hasActed)) {
        if (!cpuActionLock.current) { 
            handleEndPlayerTurn();
        }
      }
    }
  }, [playerUnits, gamePhase, handleEndPlayerTurn]);

  const endEnemyTurnAndStartPlayerTurn = useCallback(() => {
    setGamePhase(prevPhase => {
        if (prevPhase === GamePhase.GAME_OVER_DEFEAT || prevPhase === GamePhase.GAME_OVER_VICTORY) return prevPhase;

        const updateUnitsForNewTurn = (units: RobotInstance[], isPlayer: boolean) => {
            const unitsWithNewPosAndTerrain = updateMinimapPositionsAndTerrain(units, isPlayer);
            return unitsWithNewPosAndTerrain.map(u => ({
                ...u, hasActed: false,
                activeSpiritEffect: u.activeSpiritEffect === SpiritCommandEffect.GUARANTEED_EVADE ? u.activeSpiritEffect : null, 
                currentSp: u.currentHp > 0 && isPlayer ? Math.min(u.effectiveMaxSp, u.currentSp + SP_REGEN_PER_TURN) : u.currentSp
            }));
        };

        const updatedPlayerUnits = updateUnitsForNewTurn(playerUnits, true);
        setPlayerUnits(updatedPlayerUnits);
        setRosterUnits(prevRoster =>
            prevRoster.map(rUnit => {
                const battleUnit = updatedPlayerUnits.find(bUnit => bUnit.id === rUnit.id);
                return battleUnit ? { 
                    ...rUnit, 
                    currentSp: battleUnit.currentSp, 
                    hasActed: false, 
                    activeSpiritEffect: battleUnit.activeSpiritEffect 
                } : rUnit;
            })
        );

        setEnemyUnits(prevEnemyUnits => updateUnitsForNewTurn(prevEnemyUnits, false));
        
        const nextTurn = turnCount + 1; 
        addMessage(`--- 플레이어 턴 ${nextTurn} ---`, 'system'); 
        setTurnCount(nextTurn);

        setSelectedPlayerUnitId(null); setSelectedEnemyTargetId(null);
        return GamePhase.PLAYER_TURN_SELECT_UNIT;
    });
    
    cpuActionLock.current = false;
    enemyTurnMessageDisplayed.current = false; 
  }, [addMessage, playerUnits, enemyUnits, turnCount]); // Removed recalculateSingleUnitEffectiveStats as it's not directly used here and stats regen, not recalc

  useEffect(() => {
    if (gamePhase === GamePhase.GAME_OVER_DEFEAT || gamePhase === GamePhase.GAME_OVER_VICTORY) {
      if(cpuActionLock.current) cpuActionLock.current = false; 
      return;
    }

    const isActualPlayerTurnPhase = gamePhase === GamePhase.PLAYER_TURN_SELECT_UNIT ||
                                   gamePhase === GamePhase.PLAYER_TURN_ACTION ||
                                   gamePhase === GamePhase.PLAYER_TURN_SELECT_TARGET;

    if (!isDelegationModeActive || !isActualPlayerTurnPhase || cpuActionLock.current) {
      return;
    }

    const performCpuPlayerAction = async () => {
        if (gamePhase === GamePhase.PLAYER_TURN_SELECT_UNIT) {
            const actionablePlayerUnits = playerUnits.filter(u => u.currentHp > 0 && !u.hasActed);
            if (actionablePlayerUnits.length === 0) {
                return;
            }
        }
        try {
            cpuActionLock.current = true;
            await delay(CPU_ACTION_DELAY_MS / 3); 

            const currentSelectedUnit = playerUnits.find(u => u.id === selectedPlayerUnitId);

            if (gamePhase === GamePhase.PLAYER_TURN_SELECT_UNIT) {
                if (selectedPlayerUnitId && currentSelectedUnit && (currentSelectedUnit.hasActed || currentSelectedUnit.currentHp <= 0)) {
                    setSelectedPlayerUnitId(null); 
                } else if (!selectedPlayerUnitId) { 
                    const nextUnitToAct = playerUnits.find(u => u.currentHp > 0 && !u.hasActed);
                    if (nextUnitToAct) {
                        addMessage(`CPU: ${nextUnitToAct.name} 선택.`, 'cpu_action');
                        await delay(CPU_ACTION_DELAY_MS);
                        if (!isDelegationModeActive || gamePhase !== GamePhase.PLAYER_TURN_SELECT_UNIT) return; 
                        handleSelectPlayerUnit(nextUnitToAct.id); 
                    }
                }
            } else if (gamePhase === GamePhase.PLAYER_TURN_ACTION && currentSelectedUnit && !currentSelectedUnit.hasActed && currentSelectedUnit.currentHp > 0) {
                addMessage(`CPU: ${currentSelectedUnit.name} 행동 결정 중...`, 'cpu_action');
                await delay(CPU_ACTION_DELAY_MS);
                if (!isDelegationModeActive || gamePhase !== GamePhase.PLAYER_TURN_ACTION) return;

                const unitDef = ALL_ROBOT_DEFS_MAP.get(currentSelectedUnit.definitionId);
                let spiritUsedThisTurn = false;
                if (unitDef && Math.random() < 0.33 && !currentSelectedUnit.activeSpiritEffect) { 
                    const affordableSpirits = unitDef.availableSpiritCommands.filter(s => currentSelectedUnit.currentSp >= s.cost);
                    if (affordableSpirits.length > 0) {
                        const spiritToUse = affordableSpirits[Math.floor(Math.random() * affordableSpirits.length)];
                        handleActivateSpiritCommand(spiritToUse.id); 
                        spiritUsedThisTurn = true; 
                        addMessage(`CPU: ${currentSelectedUnit.name}이(가) ${spiritToUse.name} 사용.`, 'cpu_action'); 
                        await delay(CPU_ACTION_DELAY_MS / 2);
                        if (!isDelegationModeActive || gamePhase !== GamePhase.PLAYER_TURN_ACTION) return;
                    }
                }
                handleAttackAction(); 
                addMessage(`CPU: ${currentSelectedUnit.name}, ${spiritUsedThisTurn ? '정신 효과와 함께 ' : ''}공격 준비.`, 'cpu_action');
            } else if (gamePhase === GamePhase.PLAYER_TURN_SELECT_TARGET && currentSelectedUnit && currentSelectedUnit.currentHp > 0) {
                addMessage(`CPU: ${currentSelectedUnit.name} 목표물 탐색 중...`, 'cpu_action');
                await delay(CPU_ACTION_DELAY_MS);
                if (!isDelegationModeActive || gamePhase !== GamePhase.PLAYER_TURN_SELECT_TARGET) return;

                const livingEnemies = enemyUnits.filter(e => e.currentHp > 0);
                if (livingEnemies.length > 0) {
                    const targetEnemy = livingEnemies.sort((a, b) => a.currentHp - b.currentHp)[0]; 
                    addMessage(`CPU: ${currentSelectedUnit.name}이(가) ${targetEnemy.name}을(를) 목표로 지정. 공격 실행.`, 'cpu_action');
                    await delay(CPU_ACTION_DELAY_MS / 2);
                    if (!isDelegationModeActive || gamePhase !== GamePhase.PLAYER_TURN_SELECT_TARGET) return;
                    await handleConfirmAttack(targetEnemy.id); 
                } else {
                    addMessage(`CPU: ${currentSelectedUnit.name}, 공격할 대상 없음. 대기.`, 'cpu_action');
                    await delay(CPU_ACTION_DELAY_MS / 2);
                    if (!isDelegationModeActive || gamePhase !== GamePhase.PLAYER_TURN_SELECT_TARGET) return;
                    handleWaitAction(); 
                }
            }
        } catch (error) {
            console.error("CPU player action error:", error);
            addMessage("CPU: 플레이어 턴 행동 중 오류 발생.", "system");
        } finally {
             cpuActionLock.current = false; 
        }
    };

    if (isDelegationModeActive && ( 
        gamePhase === GamePhase.PLAYER_TURN_SELECT_UNIT ||
        (gamePhase === GamePhase.PLAYER_TURN_ACTION && selectedPlayerUnitId && playerUnits.find(u=>u.id === selectedPlayerUnitId && !u.hasActed && u.currentHp > 0)) ||
        (gamePhase === GamePhase.PLAYER_TURN_SELECT_TARGET && selectedPlayerUnitId && playerUnits.find(u=>u.id === selectedPlayerUnitId && u.currentHp > 0))
      )) {
        performCpuPlayerAction();
    }

  }, [isDelegationModeActive, gamePhase, playerUnits, enemyUnits, selectedPlayerUnitId, handleSelectPlayerUnit, handleAttackAction, handleConfirmAttack, handleWaitAction, handleActivateSpiritCommand, addMessage]);


  useEffect(() => {
    let isCancelled = false; 

    if (gamePhase === GamePhase.ENEMY_TURN) {
      if (!enemyTurnMessageDisplayed.current) {
        addMessage("--- 적 턴 ---", 'system');
        enemyTurnMessageDisplayed.current = true;
      }
      cpuActionLock.current = true; 

      const enemyTurnLogic = async () => {
        try {
            const activeEnemies = enemyUnits.filter(e => e.currentHp > 0 && !e.hasActed);
            if (activeEnemies.length === 0 && !isCancelled) { 
                 endEnemyTurnAndStartPlayerTurn();
                 return;
            }

            for (const enemy of activeEnemies) {
              if (isCancelled) { break; }

              if (playerUnits.filter(p => p.currentHp > 0).length === 0) {
                if (!isCancelled) addMessage(`적 ${enemy.name} 행동 중단 (공격 대상 없음 - 플레이어 전멸).`, 'system');
                break; 
              }

              addMessage(`CPU: ${enemy.name} 행동 중...`, 'cpu_action');
              await delay(CPU_ACTION_DELAY_MS);
              if (isCancelled) break;

              const targetablePlayerUnits = playerUnits.filter(p => p.currentHp > 0);
              if (targetablePlayerUnits.length > 0) {
                const target = targetablePlayerUnits.sort((a, b) => a.currentHp - b.currentHp)[0];
                addMessage(`CPU: ${enemy.name}이(가) ${target.name}을(를) 목표로 지정.`, 'cpu_action');
                await delay(CPU_ACTION_DELAY_MS / 2);
                if (isCancelled) break;

                const battleResultStatus = await processBattle(enemy, target, false);
                
                if (!isCancelled) { 
                    setEnemyUnits(prevEnemies => prevEnemies.map(e => e.id === enemy.id ? {...e, hasActed: true} : e));
                }

                if (isCancelled) break; 

                if (battleResultStatus === 'victory' || battleResultStatus === 'defeat') {
                    return; 
                }
              } else {
                addMessage(`CPU: ${enemy.name}, 공격할 대상 없음. 대기.`, 'cpu_action');
                 if (!isCancelled) { 
                    setEnemyUnits(prevEnemies => prevEnemies.map(e => e.id === enemy.id ? {...e, hasActed: true} : e));
                }
              }
              await delay(CPU_ACTION_DELAY_MS); 
              if (isCancelled) break;
            } 

            if (!isCancelled) { 
                endEnemyTurnAndStartPlayerTurn();
            }
        } catch (err) {
            console.error("Enemy turn error:", err);
            if (!isCancelled) {
              addMessage("CPU: 적 턴 중 오류 발생.", "system");
              endEnemyTurnAndStartPlayerTurn(); 
            }
        }
      };

      enemyTurnLogic();

      return () => {
        isCancelled = true;
      };
    } else { 
        if (enemyTurnMessageDisplayed.current) {
            enemyTurnMessageDisplayed.current = false;
        }
    }
  }, [gamePhase, enemyUnits, playerUnits, processBattle, addMessage, endEnemyTurnAndStartPlayerTurn, isDelegationModeActive]);

  const handleReturnToHangar = () => {
    let scenarioIdxForHangarDisplay = currentScenarioIndex;

    if (gamePhase === GamePhase.GAME_OVER_VICTORY) {
        scenarioIdxForHangarDisplay = currentScenarioIndex; // This will be advanced if manually returning
    }
    
    setGamePhase(GamePhase.HANGAR_SCREEN);
    setBattleMessages([]); // Clear for Hangar
    setPlayerUnits([]);
    setEnemyUnits([]);
    setSelectedPlayerUnitId(null);
    setSelectedEnemyTargetId(null);
    // turnCount will be reset by handleStartScenario if a new scenario starts
    setScenarioIntro('');
    setHasHangarAutomationRunThisSession(false); 
    enemyTurnMessageDisplayed.current = false;


    setRosterUnits(prevRoster => prevRoster.map(unit => {
        const def = ALL_ROBOT_DEFS_MAP.get(unit.definitionId);
        if (!def) return unit;
        // Re-create instance essentially, but preserving level/xp/etc.
        const refreshedUnit = createUnitInstance(
            def, 0, true, playerState.equipmentInventory, newGamePlusCycle, 
            {...unit, currentHp: unit.effectiveMaxHp, currentEn: unit.effectiveMaxEn, currentSp: unit.effectiveMaxSp }
        );
        return {
            ...refreshedUnit,
            hasActed: false,
            activeSpiritEffect: null,
        };
    }));


    if (scenarioIdxForHangarDisplay < scenarios.length) {
        const scenarioDef = scenarios[scenarioIdxForHangarDisplay];
        const ngCycleText = newGamePlusCycle === 0 ? "" : ` (NG+ ${newGamePlusCycle})`; // No "1회차" for hangar display
        setActiveScenarioTitle(`${scenarioDef.title}${ngCycleText}`);
        addMessage(`격납고입니다. 시나리오 "${scenarioDef.title}"${ngCycleText} 출격 준비를 해주세요.`, 'hangar');
    } else { 
        setActiveScenarioTitle(`NG+ ${newGamePlusCycle + 1}회차 준비 완료`);
        addMessage(`모든 시나리오를 클리어했습니다! NG+ ${newGamePlusCycle + 1}회차를 시작할 수 있습니다.`, 'hangar');
    }
  };

  const hangarScreenProps: HangarScreenProps = {
    rosterUnits, playerState,
    onClose: handleStartScenario, 
    onEquipItem: handleEquipItemToUnit,
    onUpgradeItem: handleUpgradeEquipmentItem,
    scenarios,
    currentScenarioIndex,
    onStartScenario: handleStartScenario,
    isDelegationModeActive,
    onToggleDelegationMode: handleToggleDelegationMode,
    newGamePlusCycle,
  };
  
  if (!gameLoadedFromStorage) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-4 flex items-center justify-center">
        <p className="text-xl animate-pulse">게임 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-2 sm:p-4 flex flex-col items-center">
      {gamePhase === GamePhase.HANGAR_SCREEN && <HangarScreenComponent {...hangarScreenProps} />}

      {gamePhase !== GamePhase.HANGAR_SCREEN && (
        <div className="w-full max-w-7xl mx-auto">
          <header className="my-3 text-center">
            <h1 className="text-3xl sm:text-4xl font-bold text-sky-400">{activeScenarioTitle}</h1>
            <p className="text-slate-300">
                {`${newGamePlusCycle === 0 ? '1회차' : `NG+ ${newGamePlusCycle}회차`} | `}
                턴: {turnCount} | 단계: {translateGamePhase(gamePhase)}
            </p>
             <div className="mt-2 flex justify-center items-center space-x-4">
                 <DelegationToggle isActive={isDelegationModeActive} onToggle={handleToggleDelegationMode} />
                 {(gamePhase === GamePhase.GAME_OVER_VICTORY || gamePhase === GamePhase.GAME_OVER_DEFEAT) && !isDelegationModeActive && (
                    <button
                        onClick={() => {
                            if (gamePhase === GamePhase.GAME_OVER_VICTORY) {
                                setCurrentScenarioIndex(prev => prev + 1); 
                            }
                            handleReturnToHangar();
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1.5 px-3 rounded transition-colors text-sm"
                    >
                        편성 화면으로 돌아가기
                    </button>
                 )}
             </div>
          </header>

          {scenarioIntro && gamePhase === GamePhase.SCENARIO_START && ( 
            <div className="bg-slate-800 p-4 rounded-lg shadow-lg my-4">
              <p className="text-lg italic text-purple-300">{scenarioIntro}</p>
            </div>
          )}

          {(gamePhase === GamePhase.GAME_OVER_VICTORY || gamePhase === GamePhase.GAME_OVER_DEFEAT) && (
            <div className={`p-6 my-4 rounded-lg shadow-xl text-center ${gamePhase === GamePhase.GAME_OVER_VICTORY ? 'bg-green-700' : 'bg-red-700'}`}>
              <h2 className="text-4xl font-extrabold mb-3">{gamePhase === GamePhase.GAME_OVER_VICTORY ? '✨ 승리! ✨' : '💀 패배... 💀'}</h2>
              <p className="text-xl mb-4">{gamePhase === GamePhase.GAME_OVER_VICTORY ? '모든 적을 격파하고 평화를 되찾았습니다!' : '아군이 모두 격파되었습니다. 다음 기회에...'}</p>
            </div>
          )}
          
          <div className="my-3 sm:my-4">
            <BattleLog messages={battleMessages} />
          </div>

          <main className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            <section className="lg:col-span-1 space-y-3">
              <h2 className="text-xl font-semibold text-sky-300 border-b-2 border-sky-500 pb-1 mb-2">아군 유닛</h2>
              <div className="space-y-2 max-h-[calc(100vh-380px)] sm:max-h-[calc(100vh-420px)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 pr-1">
                {playerUnits.length > 0 ? playerUnits.map(unit => (
                  <RobotCard
                    key={unit.id}
                    robotInstance={unit}
                    isSelected={selectedPlayerUnitId === unit.id && gamePhase !== GamePhase.PLAYER_TURN_SELECT_TARGET}
                    onClick={ (gamePhase === GamePhase.PLAYER_TURN_SELECT_UNIT || (gamePhase === GamePhase.PLAYER_TURN_ACTION && selectedPlayerUnitId === unit.id && !isDelegationModeActive)) && !unit.hasActed && unit.currentHp > 0 ?
                                () => handleSelectPlayerUnit(unit.id) : undefined }
                    hasActed={unit.hasActed}
                  />
                )) : <p className="text-slate-400 italic">배치된 아군 유닛 없음.</p>}
              </div>
            </section>

            <section className="lg:col-span-1 space-y-3 sm:space-y-4">
               <Minimap playerUnits={playerUnits} enemyUnits={enemyUnits} selectedPlayerUnitId={selectedPlayerUnitId} selectedEnemyTargetId={selectedEnemyTargetId}/>
               {(gamePhase === GamePhase.PLAYER_TURN_ACTION && selectedPlayerUnit) || (gamePhase === GamePhase.PLAYER_TURN_SELECT_TARGET && selectedPlayerUnit) ? (
                <ActionPanel
                  selectedUnit={playerUnits.find(u => u.id === selectedPlayerUnitId)}
                  onAttack={handleAttackAction}
                  onWait={handleWaitAction}
                  onEndTurn={handleEndPlayerTurn}
                  canEndTurn={playerUnits.filter(u => u.currentHp > 0).every(u => u.hasActed) || playerUnits.filter(u => u.currentHp > 0).length === 0}
                  onActivateSpirit={handleActivateSpiritCommand}
                  isDelegationModeActive={isDelegationModeActive}
                />
              ) : (
                <UnitStatsChart selectedUnit={rosterUnits.find(u => u.id === selectedPlayerUnitId) || playerUnits.find(u => u.id === selectedPlayerUnitId)} />
              )}
                {gamePhase === GamePhase.PLAYER_TURN_SELECT_UNIT && playerUnits.filter(u => u.currentHp > 0).every(u => u.hasActed) && playerUnits.length > 0 && !isDelegationModeActive && !cpuActionLock.current && (
                     <button
                        onClick={handleEndPlayerTurn}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors mt-3"
                     >
                        플레이어 턴 종료
                     </button>
                )}
            </section>

            <section className="lg:col-span-1 space-y-3">
              <h2 className="text-xl font-semibold text-red-400 border-b-2 border-red-500 pb-1 mb-2">적 유닛</h2>
              <div className="space-y-2 max-h-[calc(100vh-380px)] sm:max-h-[calc(100vh-420px)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 pr-1">
                {enemyUnits.length > 0 ? enemyUnits.map(unit => (
                  <RobotCard
                    key={unit.id}
                    robotInstance={unit}
                    isSelected={selectedEnemyTargetId === unit.id}
                    onClick={gamePhase === GamePhase.PLAYER_TURN_SELECT_TARGET && unit.currentHp > 0 ? () => handleSelectEnemyTarget(unit.id) : undefined}
                    isTargetable={gamePhase === GamePhase.PLAYER_TURN_SELECT_TARGET && unit.currentHp > 0}
                  />
                )) : <p className="text-slate-400 italic">남은 적 유닛 없음.</p>}
              </div>
            </section>
          </main>
        </div>
      )}
    </div>
  );
};

export default App;
