
import { RobotInstance, SpiritCommandEffect } from '../types'; // RobotDefinition no longer needed for stats
// import { ALL_ROBOT_DEFS_MAP } from '../constants'; // Not needed if instance has all effective stats

// function getRobotDefinition(defId: string): RobotDefinition | undefined { // No longer primary source for stats
//   return ALL_ROBOT_DEFS_MAP.get(defId);
// }

export interface BattleOutcome {
  damage: number;
  isCritical: boolean;
  isMiss: boolean;
  attackerRemainingHp: number;
  defenderRemainingHp: number;
  log: string[];
  attackerSpiritConsumed: boolean;
  defenderSpiritConsumed: boolean;
  xpGained: number; // Add XP gained for the attacker
  defenderDefeated: boolean; // Explicitly state if defender was defeated
}

export function calculateAttack(
  attacker: RobotInstance,
  defender: RobotInstance,
  attackerSpiritEffect: SpiritCommandEffect | null,
  defenderSpiritEffect: SpiritCommandEffect | null,
  defenderTerrainDefenseBonusPercent: number = 0 // e.g., 0.2 for 20%
): BattleOutcome {
  // Attacker and Defender definitions might still be useful for base names or other non-stat properties
  // but core combat stats (attack, defense) now come directly from the RobotInstance's effective stats.

  let summaryLog = "";
  let attackerSpiritConsumed = false;
  let defenderSpiritConsumed = false;
  let xpGained = 0;
  let defenderDefeated = false;

  // Check for valid instances (though this should be guaranteed by calling code)
  if (!attacker || !defender) {
    summaryLog = "오류: 유닛 정보를 찾을 수 없습니다.";
    return {
      damage: 0,
      isCritical: false,
      isMiss: true,
      attackerRemainingHp: attacker?.currentHp ?? 0,
      defenderRemainingHp: defender?.currentHp ?? 0,
      log: [summaryLog],
      attackerSpiritConsumed,
      defenderSpiritConsumed,
      xpGained,
      defenderDefeated
    };
  }

  // 1. Check Defender's GUARANTEED_EVADE
  if (defenderSpiritEffect === SpiritCommandEffect.GUARANTEED_EVADE) {
    summaryLog = `${attacker.name}의 공격... 하지만 ${defender.name}이(가) 번뜩임으로 회피했습니다!`;
    defenderSpiritConsumed = true;
    return {
      damage: 0,
      isCritical: false,
      isMiss: true,
      attackerRemainingHp: attacker.currentHp,
      defenderRemainingHp: defender.currentHp,
      log: [summaryLog],
      attackerSpiritConsumed,
      defenderSpiritConsumed,
      xpGained,
      defenderDefeated
    };
  }

  let isMiss = Math.random() < 0.1; // Base miss chance

  // 2. Check Attacker's GUARANTEED_HIT
  if (attackerSpiritEffect === SpiritCommandEffect.GUARANTEED_HIT) {
    isMiss = false;
    attackerSpiritConsumed = true;
  }

  if (isMiss) {
    summaryLog = `${attacker.name}의 공격은 ${defender.name}에게 빗나갔습니다.`;
    return {
      damage: 0,
      isCritical: false,
      isMiss: true,
      attackerRemainingHp: attacker.currentHp,
      defenderRemainingHp: defender.currentHp,
      log: [summaryLog],
      attackerSpiritConsumed,
      defenderSpiritConsumed,
      xpGained,
      defenderDefeated
    };
  }

  // --- Attack Hits ---
  if (attacker.isPlayerUnit) { // Only player units gain XP for attacking
    xpGained += 10; // XP_FOR_ATTACK from constants, or define here
  }
  summaryLog = `${attacker.name}이(가) ${defender.name}을(를) 공격!`;
  if (attackerSpiritEffect === SpiritCommandEffect.GUARANTEED_HIT && !attackerSpiritConsumed) {
    summaryLog += ` (필중 효과!)`;
    attackerSpiritConsumed = true;
  }

  // Apply terrain defense bonus to defender's effective defense stat
  const finalDefenderDefense = defender.effectiveDefense * (1 + defenderTerrainDefenseBonusPercent);

  let baseDamage = attacker.effectiveAttack - finalDefenderDefense;
  baseDamage = Math.max(baseDamage, attacker.effectiveAttack * 0.1); // Ensure minimum 10% of attack as base if defense is too high
  let finalDamage = Math.round(baseDamage * (Math.random() * 0.4 + 0.8)); // Damage variance: 80% to 120% of baseDamage

  // 3. Check Attacker's DOUBLE_DAMAGE
  if (attackerSpiritEffect === SpiritCommandEffect.DOUBLE_DAMAGE) {
    finalDamage *= 2;
    summaryLog += ` (열혈 효과!)`;
    attackerSpiritConsumed = true;
  }

  // 4. Critical Hit
  const isCritical = Math.random() < 0.15;
  if (isCritical) {
    finalDamage = Math.round(finalDamage * 1.5);
    summaryLog += ` 크리티컬 히트! 강력한 일격입니다!`;
  }

  finalDamage = Math.max(0, finalDamage);
  const defenderNewHp = Math.max(0, defender.currentHp - finalDamage);

  if (defenderTerrainDefenseBonusPercent > 0) {
    summaryLog += ` [지형 효과: 방어 +${defenderTerrainDefenseBonusPercent * 100}%]`;
  }
  summaryLog += ` ${defender.name}은(는) ${finalDamage}의 피해를 입었습니다. (HP: ${defender.currentHp} -> ${defenderNewHp})`;

  if (defenderNewHp === 0) {
    summaryLog += ` 그 결과 ${defender.name}은(는) 격파되었습니다!`;
    defenderDefeated = true;
    if (attacker.isPlayerUnit) { // Only player units gain XP for defeating
      xpGained += 30; // XP_FOR_DEFEAT from constants, or define here
    }
  }

  return {
    damage: finalDamage,
    isCritical,
    isMiss: false,
    attackerRemainingHp: attacker.currentHp, // Attacker HP doesn't change from basic attack
    defenderRemainingHp: defenderNewHp,
    log: [summaryLog],
    attackerSpiritConsumed,
    defenderSpiritConsumed,
    xpGained,
    defenderDefeated
  };
}