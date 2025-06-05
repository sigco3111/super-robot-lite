
import { RobotDefinition, SpiritCommand, SpiritCommandEffect, TerrainType, TerrainEffectDefinition, EquipmentDefinition, EquipmentSlotType, ScenarioDefinition } from './types';

// --- Spirit Command Definitions ---
export const STRIKE_SPIRIT: SpiritCommand = {
  id: 'strike',
  name: '필중 (Strike)',
  cost: 20,
  effect: SpiritCommandEffect.GUARANTEED_HIT,
  description: '다음 공격이 반드시 명중합니다.',
};

export const ALERT_SPIRIT: SpiritCommand = {
  id: 'alert',
  name: '번뜩임 (Alert)',
  cost: 15,
  effect: SpiritCommandEffect.GUARANTEED_EVADE,
  description: '다음 적의 공격을 반드시 회피합니다.',
};

export const VALOR_SPIRIT: SpiritCommand = {
  id: 'valor',
  name: '열혈 (Valor)',
  cost: 40,
  effect: SpiritCommandEffect.DOUBLE_DAMAGE,
  description: '다음 공격의 최종 대미지가 2배가 됩니다.',
};

export const PRESSURE_SPIRIT: SpiritCommand = {
    id: 'pressure',
    name: '위압 (Pressure)',
    cost: 25,
    effect: SpiritCommandEffect.GUARANTEED_HIT, 
    description: '뉴타입의 압박감으로 적을 위축시킵니다. (효과: 필중)',
};


// --- Terrain Definitions ---
export const TERRAIN_EFFECTS: TerrainEffectDefinition[] = [
  {
    id: TerrainType.SPACE,
    name: '우주',
    defenseBonusPercent: 0,
    description: '표준 우주 공간입니다. 특별한 지형 효과는 없습니다.'
  },
  {
    id: TerrainType.ASTEROID_FIELD,
    name: '소행성 지대',
    defenseBonusPercent: 0.20,
    description: '밀집된 소행성 지대입니다. 방어 보너스 +20%를 제공합니다.'
  },
  {
    id: TerrainType.COLONY_INTERIOR,
    name: '콜로니 내부',
    defenseBonusPercent: 0.10,
    description: '콜로니 내부 구조물입니다. 방어 보너스 +10%를 제공합니다.'
  }
];

export const TERRAIN_EFFECTS_MAP: Map<TerrainType, TerrainEffectDefinition> = new Map(
  TERRAIN_EFFECTS.map(effect => [effect.id, effect])
);

export const TERRAIN_ZONE_ASTEROID_FIELD_MAX_Y = 33.33;
export const TERRAIN_ZONE_COLONY_INTERIOR_MAX_Y = 66.66;

// --- Equipment Definitions ---
export const EQUIPMENT_DEFINITIONS: EquipmentDefinition[] = [
  // WEAPONS
  {
    id: 'eq_beam_rifle_std', name: '빔 라이플', slotType: EquipmentSlotType.WEAPON,
    baseStatsBoost: { attack: 150 }, upgradeStatsPerLevel: { attack: 30 },
    maxLevel: 5, baseUpgradeCost: 500, upgradeCostIncreasePerLevel: 250,
    description: '표준형 빔 라이플입니다. 안정적인 성능을 제공합니다.'
  },
  {
    id: 'eq_hyper_bazooka', name: '하이퍼 바주카', slotType: EquipmentSlotType.WEAPON,
    baseStatsBoost: { attack: 250 }, upgradeStatsPerLevel: { attack: 50 },
    maxLevel: 5, baseUpgradeCost: 800, upgradeCostIncreasePerLevel: 400,
    description: '강력한 실탄형 바주카입니다. 높은 일격 데미지를 자랑합니다.'
  },
  {
    id: 'eq_beam_rifle_custom', name: '커스텀 빔 라이플', slotType: EquipmentSlotType.WEAPON,
    baseStatsBoost: { attack: 200 }, upgradeStatsPerLevel: { attack: 40 },
    maxLevel: 5, baseUpgradeCost: 650, upgradeCostIncreasePerLevel: 300,
    description: '에이스 파일럿용으로 개조된 빔 라이플입니다.'
  },
  {
    id: 'eq_hyper_mega_cannon', name: '하이퍼 메가 캐논', slotType: EquipmentSlotType.WEAPON,
    baseStatsBoost: { attack: 500 }, upgradeStatsPerLevel: { attack: 100 },
    maxLevel: 5, baseUpgradeCost: 1500, upgradeCostIncreasePerLevel: 700,
    description: 'ZZ건담의 주력 무장. 압도적인 화력을 자랑합니다.'
  },
  {
    id: 'eq_funnels', name: '판넬', slotType: EquipmentSlotType.WEAPON,
    baseStatsBoost: { attack: 400 }, upgradeStatsPerLevel: { attack: 80 },
    maxLevel: 3, baseUpgradeCost: 1200, upgradeCostIncreasePerLevel: 600,
    description: '뉴타입 전용 원격 유도 병기입니다.'
  },

  // ARMOR
  {
    id: 'eq_standard_armor', name: '표준 장갑', slotType: EquipmentSlotType.ARMOR,
    baseStatsBoost: { defense: 100, hp: 500 }, upgradeStatsPerLevel: { defense: 20, hp: 100 },
    maxLevel: 5, baseUpgradeCost: 400, upgradeCostIncreasePerLevel: 200,
    description: '일반적인 추가 장갑입니다. 방어력과 내구도를 향상시킵니다.'
  },
  {
    id: 'eq_gundarium_alloy', name: '건다리움 합금 장갑', slotType: EquipmentSlotType.ARMOR,
    baseStatsBoost: { defense: 200, hp: 800 }, upgradeStatsPerLevel: { defense: 40, hp: 150 },
    maxLevel: 5, baseUpgradeCost: 700, upgradeCostIncreasePerLevel: 350,
    description: '건다리움 합금으로 제작된 고급 장갑입니다. 뛰어난 방호력을 제공합니다.'
  },
  {
    id: 'eq_heavy_armor', name: '중장갑', slotType: EquipmentSlotType.ARMOR,
    baseStatsBoost: { defense: 300, hp: 1500 }, upgradeStatsPerLevel: { defense: 60, hp: 300 },
    maxLevel: 5, baseUpgradeCost: 1000, upgradeCostIncreasePerLevel: 500,
    description: '내탄성을 극한까지 끌어올린 장갑입니다. 기동성은 다소 저하될 수 있습니다.'
  },

  // BOOSTERS
  {
    id: 'eq_standard_booster', name: '표준 부스터', slotType: EquipmentSlotType.BOOSTER,
    baseStatsBoost: { mobility: 10 }, upgradeStatsPerLevel: { mobility: 3 },
    maxLevel: 5, baseUpgradeCost: 300, upgradeCostIncreasePerLevel: 150,
    description: '기본형 부스터 유닛입니다. 기동성을 소폭 향상시킵니다.'
  },
  {
    id: 'eq_high_mobility_booster', name: '고기동 부스터', slotType: EquipmentSlotType.BOOSTER,
    baseStatsBoost: { mobility: 20 }, upgradeStatsPerLevel: { mobility: 5 },
    maxLevel: 5, baseUpgradeCost: 600, upgradeCostIncreasePerLevel: 300,
    description: '고출력 부스터입니다. 기동성을 대폭 향상시킵니다.'
  }
];

export const EQUIPMENT_DEFS_MAP: Map<string, EquipmentDefinition> = new Map(
  EQUIPMENT_DEFINITIONS.map(def => [def.id, def])
);

// --- Robot Definitions ---
// Player Units
export const GUNDAM_DEF: RobotDefinition = {
  id: 'rx-78-2-gundam', name: 'RX-78-2 Gundam', pilotName: '아무로 레이', pilotNameEn: 'Amuro Ray',
  spriteUrl: 'https://picsum.photos/seed/gundam/150/150',
  maxHp: 12000, maxEn: 150, maxSp: 100, attack: 2200, defense: 1500, mobility: 120,
  availableSpiritCommands: [STRIKE_SPIRIT, ALERT_SPIRIT, VALOR_SPIRIT],
  initialEquipment: {
    [EquipmentSlotType.WEAPON]: 'eq_beam_rifle_std',
    [EquipmentSlotType.ARMOR]: 'eq_standard_armor',
  }
};

export const FA_ZZ_GUNDAM_DEF: RobotDefinition = {
  id: 'fa-010s-fazz', name: 'FA-010S Full Armor ZZ Gundam', pilotName: '쥬도 아시타', pilotNameEn: 'Judau Ashta',
  spriteUrl: 'https://picsum.photos/seed/fazz/150/150',
  maxHp: 18000, maxEn: 200, maxSp: 140, attack: 2800, defense: 1800, mobility: 100,
  availableSpiritCommands: [VALOR_SPIRIT, STRIKE_SPIRIT, ALERT_SPIRIT],
  initialEquipment: {
    [EquipmentSlotType.WEAPON]: 'eq_hyper_mega_cannon',
    [EquipmentSlotType.ARMOR]: 'eq_heavy_armor',
    [EquipmentSlotType.BOOSTER]: 'eq_standard_booster',
  }
};

export const HYAKU_SHIKI_DEF: RobotDefinition = {
  id: 'msn-00100-hyakushiki', name: 'MSN-00100 Hyaku Shiki', pilotName: '크와트로 버지나', pilotNameEn: 'Quattro Bajeena',
  spriteUrl: 'https://picsum.photos/seed/hyakushiki/150/150',
  maxHp: 13000, maxEn: 160, maxSp: 130, attack: 2400, defense: 1600, mobility: 140,
  availableSpiritCommands: [STRIKE_SPIRIT, ALERT_SPIRIT, PRESSURE_SPIRIT],
  initialEquipment: {
    [EquipmentSlotType.WEAPON]: 'eq_beam_rifle_custom',
    [EquipmentSlotType.ARMOR]: 'eq_gundarium_alloy',
    [EquipmentSlotType.BOOSTER]: 'eq_high_mobility_booster',
  }
};

// Enemy Units (Existing)
export const ZAKU_II_DEF: RobotDefinition = {
  id: 'ms-06-zaku-ii', name: 'MS-06 Zaku II', pilotName: '지온 병사', pilotNameEn: 'Zeon Soldier',
  spriteUrl: 'https://picsum.photos/seed/zaku/150/150',
  maxHp: 8000, maxEn: 100, maxSp: 60, attack: 1800, defense: 1200, mobility: 90,
  availableSpiritCommands: [STRIKE_SPIRIT],
};

export const RICK_DOM_DEF: RobotDefinition = {
  id: 'ms-09r-rickdom', name: 'MS-09R Rick Dom', pilotName: '지온 베테랑 병사', pilotNameEn: 'Zeon Veteran',
  spriteUrl: 'https://picsum.photos/seed/rickdom/150/150',
  maxHp: 9000, maxEn: 90, maxSp: 50, attack: 1900, defense: 1300, mobility: 95,
  availableSpiritCommands: [STRIKE_SPIRIT],
  initialEquipment: {
    [EquipmentSlotType.WEAPON]: 'eq_hyper_bazooka',
  }
};

export const GELGOOG_DEF: RobotDefinition = {
  id: 'ms-14-gelgoog', name: 'MS-14 Gelgoog', pilotName: '샤아 아즈나블', pilotNameEn: 'Char Aznable (Gelgoog)',
  spriteUrl: 'https://picsum.photos/seed/gelgoog/150/150',
  maxHp: 10000, maxEn: 130, maxSp: 120, attack: 2100, defense: 1400, mobility: 110,
  availableSpiritCommands: [STRIKE_SPIRIT, ALERT_SPIRIT, PRESSURE_SPIRIT],
  initialEquipment: {
    [EquipmentSlotType.WEAPON]: 'eq_beam_rifle_std',
    [EquipmentSlotType.ARMOR]: 'eq_standard_armor',
    [EquipmentSlotType.BOOSTER]: 'eq_standard_booster',
  }
};

export const DOVEN_WOLF_DEF: RobotDefinition = {
  id: 'amx-014-dovenwolf', name: 'AMX-014 Döven Wolf', pilotName: '지온 잔당 병사', pilotNameEn: 'Zeon Remnant',
  spriteUrl: 'https://picsum.photos/seed/dovenwolf/150/150',
  maxHp: 11000, maxEn: 120, maxSp: 70, attack: 2200, defense: 1500, mobility: 100,
  availableSpiritCommands: [STRIKE_SPIRIT, VALOR_SPIRIT],
  initialEquipment: {
    [EquipmentSlotType.WEAPON]: 'eq_hyper_bazooka',
    [EquipmentSlotType.ARMOR]: 'eq_standard_armor',
  }
};

export const QUBELEY_DEF: RobotDefinition = {
  id: 'amx-004-qubeley', name: 'AMX-004 Qubeley', pilotName: '하만 칸', pilotNameEn: 'Haman Karn',
  spriteUrl: 'https://picsum.photos/seed/qubeley/150/150',
  maxHp: 16000, maxEn: 180, maxSp: 150, attack: 2700, defense: 1700, mobility: 150,
  availableSpiritCommands: [ALERT_SPIRIT, PRESSURE_SPIRIT, VALOR_SPIRIT],
  initialEquipment: {
    [EquipmentSlotType.WEAPON]: 'eq_funnels',
    [EquipmentSlotType.ARMOR]: 'eq_gundarium_alloy',
    [EquipmentSlotType.BOOSTER]: 'eq_high_mobility_booster',
  }
};

// New Enemy Robot Definitions
export const GM_DEF: RobotDefinition = {
  id: 'rgm-79-gm', name: 'RGM-79 GM', pilotName: '연방군 병사', pilotNameEn: 'Federation Soldier',
  spriteUrl: 'https://picsum.photos/seed/gm/150/150',
  maxHp: 7500, maxEn: 90, maxSp: 50, attack: 1700, defense: 1100, mobility: 100,
  availableSpiritCommands: [STRIKE_SPIRIT],
};

export const MARASAI_DEF: RobotDefinition = {
  id: 'rms-108-marasai', name: 'RMS-108 Marasai', pilotName: '티탄즈 병사', pilotNameEn: 'Titans Soldier',
  spriteUrl: 'https://picsum.photos/seed/marasai/150/150',
  maxHp: 10000, maxEn: 120, maxSp: 80, attack: 2000, defense: 1400, mobility: 115,
  availableSpiritCommands: [STRIKE_SPIRIT, VALOR_SPIRIT],
};

export const BIG_ZAM_DEF: RobotDefinition = {
  id: 'ma-08-bigzam', name: 'MA-08 Big Zam', pilotName: '도즐 자비', pilotNameEn: 'Dozle Zabi',
  spriteUrl: 'https://picsum.photos/seed/bigzam/150/150',
  maxHp: 35000, maxEn: 250, maxSp: 100, attack: 3200, defense: 2500, mobility: 70,
  availableSpiritCommands: [VALOR_SPIRIT, STRIKE_SPIRIT], 
};

export const ELMETH_DEF: RobotDefinition = {
  id: 'man-08-elmeth', name: 'MAN-08 Elmeth', pilotName: '라라아 슨', pilotNameEn: 'Lalah Sune',
  spriteUrl: 'https://picsum.photos/seed/elmeth/150/150',
  maxHp: 14000, maxEn: 170, maxSp: 160, attack: 2600, defense: 1600, mobility: 140,
  availableSpiritCommands: [ALERT_SPIRIT, PRESSURE_SPIRIT, STRIKE_SPIRIT],
  initialEquipment: { [EquipmentSlotType.WEAPON]: 'eq_funnels' } 
};

export const ZEONG_DEF: RobotDefinition = {
  id: 'msn-02-zeong', name: 'MSN-02 Zeong', pilotName: '샤아 아즈나블', pilotNameEn: 'Char Aznable (Zeong)',
  spriteUrl: 'https://picsum.photos/seed/zeong/150/150',
  maxHp: 20000, maxEn: 220, maxSp: 180, attack: 3000, defense: 1900, mobility: 130,
  availableSpiritCommands: [PRESSURE_SPIRIT, VALOR_SPIRIT, STRIKE_SPIRIT],
};

export const GAPLANT_DEF: RobotDefinition = {
  id: 'orx-005-gaplant', name: 'ORX-005 Gaplant', pilotName: '야잔 게블', pilotNameEn: 'Yazan Gable',
  spriteUrl: 'https://picsum.photos/seed/gaplant/150/150',
  maxHp: 12000, maxEn: 150, maxSp: 110, attack: 2300, defense: 1500, mobility: 160,
  availableSpiritCommands: [STRIKE_SPIRIT, VALOR_SPIRIT],
};

export const PALACE_ATHENE_DEF: RobotDefinition = {
  id: 'pmx-001-palace-athene', name: 'PMX-001 Palace Athene', pilotName: '레코아 론도', pilotNameEn: 'Reccoa Londe',
  spriteUrl: 'https://picsum.photos/seed/palaceathene/150/150',
  maxHp: 15000, maxEn: 160, maxSp: 130, attack: 2500, defense: 1700, mobility: 120,
  availableSpiritCommands: [ALERT_SPIRIT, STRIKE_SPIRIT],
};

export const THE_O_DEF: RobotDefinition = {
  id: 'pmx-003-the-o', name: 'PMX-003 The O', pilotName: '팝티머스 시로코', pilotNameEn: 'Paptimus Scirocco',
  spriteUrl: 'https://picsum.photos/seed/theo/150/150',
  maxHp: 22000, maxEn: 200, maxSp: 170, attack: 3100, defense: 2200, mobility: 135,
  availableSpiritCommands: [PRESSURE_SPIRIT, VALOR_SPIRIT, ALERT_SPIRIT],
};


export const INITIAL_PLAYER_UNITS_DEFS: RobotDefinition[] = [GUNDAM_DEF, FA_ZZ_GUNDAM_DEF, HYAKU_SHIKI_DEF];

export const SCENARIO_DEFINITIONS: ScenarioDefinition[] = [
  {
    id: 'scenario_01',
    title: '최초의 접촉',
    description: '사이이드 7 근처에서 정찰 중인 지온군 부대와 조우합니다. 기본적인 전투를 익히세요.',
    enemyUnitDefs: [ZAKU_II_DEF, ZAKU_II_DEF, GM_DEF], 
    introNarration: '긴급 상황! 미확인 기체 접근! 아무래도 지온의 정찰 부대인 것 같다. 요격 준비!',
  },
  {
    id: 'scenario_02',
    title: '루나 2 방어선 돌파',
    description: '지온군이 루나 2 기지를 향해 공세를 펼치고 있습니다. 방어선을 뚫고 기지를 사수하세요.',
    enemyUnitDefs: [ZAKU_II_DEF, RICK_DOM_DEF, RICK_DOM_DEF, GM_DEF],
    introNarration: '루나 2가 공격받고 있다! 적의 공세를 막아내고 기지를 지켜야 한다!',
  },
  {
    id: 'scenario_03',
    title: '붉은 혜성의 추격',
    description: '전설적인 에이스, 샤아 아즈나블이 직접 부대를 이끌고 추격해옵니다. 그의 겔구그를 격파하세요.',
    enemyUnitDefs: [GELGOOG_DEF, ZAKU_II_DEF, RICK_DOM_DEF],
    introNarration: '후방에서 강력한 기운이 느껴진다... 저것은... 샤아 아즈나블인가! 모두 전투 태세!',
  },
  {
    id: 'scenario_04',
    title: '소행성 지대의 복병',
    description: '소행성 지대에 매복한 지온 잔당들을 소탕해야 합니다. 지형을 활용한 전투에 주의하세요.',
    enemyUnitDefs: [RICK_DOM_DEF, DOVEN_WOLF_DEF, MARASAI_DEF, ZAKU_II_DEF],
    introNarration: '소행성 지대에 적의 매복이다! 신중하게 대응하여 적을 격파하라!',
  },
  {
    id: 'scenario_05',
    title: '뉴타입의 위협: 엘메스',
    description: '강력한 뉴타입 파일럿, 라라아 슨이 엘메스를 타고 나타납니다. 그녀의 판넬 공격을 경계하세요.',
    enemyUnitDefs: [ELMETH_DEF, GELGOOG_DEF, RICK_DOM_DEF], 
    introNarration: '전장에 나타난 압도적인 존재감... 뉴타입인가! 라라아 슨과 엘메스의 등장이군. 전력을 다해 막아야 한다.',
  },
  {
    id: 'scenario_06',
    title: '공포의 거대 MA: 빅잠',
    description: '지온의 거대 모빌아머, 빅잠이 전장을 압도합니다. 강력한 화력과 방어력을 뚫고 격파해야 합니다.',
    enemyUnitDefs: [BIG_ZAM_DEF, RICK_DOM_DEF, RICK_DOM_DEF, GELGOOG_DEF],
    introNarration: '대형 모빌아머 접근! 저것은... 빅잠인가! 전 부대, 화력을 집중하여 저지하라!',
  },
  {
    id: 'scenario_07',
    title: '티탄즈의 망령',
    description: '과거 티탄즈의 에이스들이 사용했던 기체들이 네오지온에 의해 재등장합니다. 그들의 강력함을 시험하세요.',
    enemyUnitDefs: [MARASAI_DEF, MARASAI_DEF, GAPLANT_DEF, PALACE_ATHENE_DEF],
    introNarration: '티탄즈의 기체들이 나타났다! 네오지온이 구시대의 망령을 불러낸 것인가... 방심하지 마라!',
  },
  {
    id: 'scenario_08',
    title: '액시즈의 첨병: 큐벨레이',
    description: '네오지온의 지도자, 하만 칸이 직접 큐벨레이를 타고 전선에 나섭니다. 그녀의 강력한 판넬과 뉴타입 능력을 극복하세요.',
    enemyUnitDefs: [QUBELEY_DEF, DOVEN_WOLF_DEF, DOVEN_WOLF_DEF, MARASAI_DEF],
    introNarration: '하만 칸이 직접 나왔나! 큐벨레이의 위력은 상상을 초월한다. 모두 정신 바짝 차려라!',
  },
  {
    id: 'scenario_09',
    title: '목성에서 온 남자: 시로코의 야망',
    description: '팝티머스 시로코가 직접 설계한 강력한 PMX 시리즈 기체들이 등장합니다. 그의 야망을 저지하세요.',
    enemyUnitDefs: [THE_O_DEF, PALACE_ATHENE_DEF, GAPLANT_DEF, MARASAI_DEF], 
    introNarration: '이 프레셔는... 목성에서 온 그 남자인가! 시로코... 그의 기체들은 상상을 초월한다. 전력으로 맞서라!',
  },
  {
    id: 'scenario_10',
    title: '최종 결전: 지옹 강림',
    description: '샤아 아즈나블이 그의 최종 병기, 지옹을 타고 인류의 운명을 건 마지막 전투를 시작합니다. 모든 것을 걸고 승리하세요!',
    enemyUnitDefs: [ZEONG_DEF, GELGOOG_DEF, GELGOOG_DEF, RICK_DOM_DEF, RICK_DOM_DEF],
    introNarration: '결전의 시간이다! 샤아가 지옹을 타고 나타났다! 여기서 물러설 순 없다. 인류의 미래를 위해, 마지막 힘까지 짜내어 싸워라!',
  },
];


export const XP_FOR_ATTACK = 10;
export const XP_FOR_DEFEAT = 30;
export const INITIAL_XP_TO_NEXT_LEVEL_BASE = 100;
export const STAT_INCREASES_PER_LEVEL = {
  hp: 500, attack: 50, defense: 30, sp: 5, en: 10, mobility: 5
};

export const INITIAL_CREDITS = 10000; 
export const CREDITS_PER_ENEMY_DEFEAT = 750; 
export const INITIAL_PLAYER_EQUIPMENT_INSTANCE_IDS: string[] = [
    'eq_standard_booster', 
    'eq_beam_rifle_std', 
    'eq_standard_armor'  
]; 

export const RADAR_FULL_MARKS = {
  maxHp: 40000, 
  maxEn: 500,
  attack: 7000,
  defense: 5000,
  mobility: 400,
};

export const GEMINI_MODEL_TEXT = 'gemini-2.5-flash-preview-04-17';

// New Game Plus constants
export const ENEMY_NG_PLUS_STAT_MULTIPLIER = 0.10; // 10% increase per NG+ cycle for HP, ATK, DEF
export const ENEMY_NG_PLUS_CREDIT_MULTIPLIER = 0.05; // 5% increase per NG+ cycle for credits

export const ALL_ROBOT_DEFS_MAP: Map<string, RobotDefinition> = new Map([
  // Player Units
  [GUNDAM_DEF.id, GUNDAM_DEF],
  [FA_ZZ_GUNDAM_DEF.id, FA_ZZ_GUNDAM_DEF],
  [HYAKU_SHIKI_DEF.id, HYAKU_SHIKI_DEF],
  // Enemy Units (Existing + New)
  [ZAKU_II_DEF.id, ZAKU_II_DEF],
  [RICK_DOM_DEF.id, RICK_DOM_DEF],
  [GELGOOG_DEF.id, GELGOOG_DEF],
  [DOVEN_WOLF_DEF.id, DOVEN_WOLF_DEF],
  [QUBELEY_DEF.id, QUBELEY_DEF],
  [GM_DEF.id, GM_DEF],
  [MARASAI_DEF.id, MARASAI_DEF],
  [BIG_ZAM_DEF.id, BIG_ZAM_DEF],
  [ELMETH_DEF.id, ELMETH_DEF],
  [ZEONG_DEF.id, ZEONG_DEF],
  [GAPLANT_DEF.id, GAPLANT_DEF],
  [PALACE_ATHENE_DEF.id, PALACE_ATHENE_DEF],
  [THE_O_DEF.id, THE_O_DEF]
]);
