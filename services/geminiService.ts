
import { RobotInstance } from '../types';
// import { GEMINI_MODEL_TEXT } from '../constants'; // No longer needed for API calls

// API Key 및 GoogleGenAI 초기화 코드 제거

export async function generateBattleNarration(
  attacker: RobotInstance,
  defender: RobotInstance,
  damage: number,
  isCritical: boolean,
  isMiss: boolean,
  defenderDefeated: boolean
): Promise<string> {
  // 목업 나레이션 생성
  let narration = `${attacker.pilotName} 파일럿의 ${attacker.name}이(가) ${defender.pilotName} 파일럿의 ${defender.name}을(를) 공격! `;

  if (isMiss) {
    narration += "하지만 공격은 빗나갔다!";
  } else {
    narration += `${damage}의 피해를 입혔다.`;
    if (isCritical) {
      narration += " 치명적인 일격!";
    }
    if (defenderDefeated) {
      narration += ` 그 결과 ${defender.name}은(는) 격파되었다!`;
    }
  }
  // 기존의 비동기 시그니처를 유지하기 위해 즉시 resolve되는 Promise 반환
  return Promise.resolve(narration);
}

export async function generateScenarioIntro(scenarioTitle: string): Promise<string> {
  // 목업 시나리오 소개 생성
  const intro = `작전명: "${scenarioTitle}". 모든 유닛은 즉시 전투 준비에 돌입하라! 전장의 평화를 되찾기 위한 우리의 싸움이 지금 시작된다.`;
  // 기존의 비동기 시그니처를 유지하기 위해 즉시 resolve되는 Promise 반환
  return Promise.resolve(intro);
}
