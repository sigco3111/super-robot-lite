
export interface RobotStats {
  maxHp: number;
  maxEn: number;
  attack: number;
  defense: number;
  mobility: number;
  maxSp: number;
}

export enum SpiritCommandEffect {
  GUARANTEED_HIT = 'GUARANTEED_HIT',
  GUARANTEED_EVADE = 'GUARANTEED_EVADE',
  DOUBLE_DAMAGE = 'DOUBLE_DAMAGE',
  // Future: CUSTOM_EFFECT for unique pilot skills
  // CUSTOM_PRESSURE = 'CUSTOM_PRESSURE', 
}

export interface SpiritCommand {
  id: string;
  name: string;
  cost: number;
  effect: SpiritCommandEffect;
  description: string;
}

export enum TerrainType {
  SPACE = 'SPACE',
  ASTEROID_FIELD = 'ASTEROID_FIELD',
  COLONY_INTERIOR = 'COLONY_INTERIOR',
}

export interface TerrainEffectDefinition {
  id: TerrainType;
  name: string;
  defenseBonusPercent: number;
  description: string;
}

export interface RobotDefinition extends RobotStats {
  id: string;
  name: string;
  pilotName: string;
  pilotNameEn?: string; // Optional English name for pilot
  spriteUrl: string;
  availableSpiritCommands: SpiritCommand[];
  initialEquipment?: Partial<Record<EquipmentSlotType, string>>; // string is EquipmentDefinition ID
}

// --- Equipment System Types ---
export enum EquipmentSlotType {
  WEAPON = 'WEAPON',
  ARMOR = 'ARMOR',
  BOOSTER = 'BOOSTER',
  // ACCESSORY = 'ACCESSORY', // Future expansion
}

export interface EquipmentStatsBoost {
  hp?: number;
  en?: number;
  attack?: number;
  defense?: number;
  mobility?: number;
  sp?: number;
  // Add other specific stats like crit_rate, evasion_rate etc. if needed
}

export interface EquipmentDefinition {
  id: string; // e.g., "beam-rifle-mk1"
  name: string;
  slotType: EquipmentSlotType;
  baseStatsBoost: EquipmentStatsBoost; // Stats at Level 1
  upgradeStatsPerLevel: EquipmentStatsBoost; // Additive stats per level beyond 1
  maxLevel: number;
  baseUpgradeCost: number; // Cost to upgrade from L1 to L2
  upgradeCostIncreasePerLevel: number; // How much more each subsequent upgrade costs
  description: string;
  icon?: string; // Optional: for UI
}

export interface EquipmentInstance {
  instanceId: string; // Unique ID for this specific item, e.g., "player-owned-beam-rifle-1"
  definitionId: string; // Links to EquipmentDefinition
  currentLevel: number;
}
// --- End Equipment System Types ---

export interface RobotInstance {
  id: string;
  definitionId: string;
  name: string;
  pilotName: string;

  level: number;
  currentXp: number;
  xpToNextLevel: number;

  // Base stats are derived from RobotDefinition + level-up bonuses
  baseMaxHp: number;
  baseMaxEn: number;
  baseMaxSp: number;
  baseAttack: number;
  baseDefense: number;
  baseMobility: number;

  // Effective stats are base stats + equipment bonuses
  effectiveMaxHp: number;
  effectiveMaxEn: number;
  effectiveMaxSp: number;
  effectiveAttack: number;
  effectiveDefense: number;
  effectiveMobility: number;

  currentHp: number;
  currentEn: number;
  currentSp: number;
  activeSpiritEffect: SpiritCommandEffect | null;
  hasActed: boolean;
  isPlayerUnit: boolean;
  spriteUrl: string;
  minimapX: number;
  minimapY: number;
  currentTerrainId: TerrainType | null;

  equippedItems: Partial<Record<EquipmentSlotType, string | null>>; // string is EquipmentInstance.instanceId
}

export enum GamePhase {
  PLAYER_TURN_SELECT_UNIT = 'PLAYER_TURN_SELECT_UNIT',
  PLAYER_TURN_ACTION = 'PLAYER_TURN_ACTION',
  PLAYER_TURN_SELECT_TARGET = 'PLAYER_TURN_SELECT_TARGET',
  ENEMY_TURN = 'ENEMY_TURN',
  BATTLE_RESOLUTION = 'BATTLE_RESOLUTION',
  GAME_OVER_VICTORY = 'GAME_OVER_VICTORY',
  GAME_OVER_DEFEAT = 'GAME_OVER_DEFEAT',
  SCENARIO_START = 'SCENARIO_START', // This phase might be short-lived, transitioning to HANGAR or PLAYER_TURN
  HANGAR_SCREEN = 'HANGAR_SCREEN', 
}

export interface BattleMessage {
  id: string;
  text: string;
  type: 'info' | 'player_attack' | 'enemy_attack' | 'damage' | 'critical' | 'miss' | 'narration' | 'system' | 'spirit' | 'level_up' | 'hangar' | 'cpu_action';
}

export interface RadarStat {
  subject: string;
  value: number;
  fullMark: number;
}

export interface PlayerState { 
    credits: number;
    equipmentInventory: EquipmentInstance[];
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  description: string;
  enemyUnitDefs: RobotDefinition[]; // References to RobotDefinition objects
  introNarration?: string;
  // playerUnitDefs could be used in future to restrict player choices or provide specific units
}

// For HangarScreen component
export interface HangarScreenProps {
  rosterUnits: RobotInstance[]; 
  playerState: PlayerState;
  onClose: () => void; 
  onEquipItem: (unitId: string, slot: EquipmentSlotType, equipmentInstanceId: string | null) => void;
  onUpgradeItem: (equipmentInstanceId: string) => void;
  
  scenarios: ScenarioDefinition[]; 
  currentScenarioIndex: number; 
  onStartScenario: () => void; 

  isDelegationModeActive: boolean;
  onToggleDelegationMode: () => void;

  newGamePlusCycle: number; // To display current NG+ cycle
}

// For DelegationToggle component
export interface DelegationToggleProps {
  isActive: boolean;
  onToggle: () => void;
  label?: string; // Optional label
  className?: string; // Optional custom styling
}
