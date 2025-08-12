import { pipe, curry } from 'ramda';
import { PetStatus, AppUsageData } from '@/shared/types';
import { PET_CONSTANTS, USAGE_LIMITS } from '@/shared/constants';
import { clamp, percentage } from '@/shared/utils';

// =============================================================================
// 펫 체력 계산 관련 순수 함수들
// =============================================================================

/**
 * 앱 사용 시간에 따른 체력 감소량을 계산
 */
export const calculateHealthDecayFromUsage = curry((
  usageTime: number,
  timeLimit: number
): number => {
  if (usageTime <= 0) return 0;
  if (timeLimit <= 0) return PET_CONSTANTS.MAX_HEALTH;
  
  const usageRatio = usageTime / timeLimit;
  const decayRate = Math.min(usageRatio, 2.0); // 최대 2배까지 가속 감소
  
  return PET_CONSTANTS.HEALTH_DECAY_RATE * decayRate;
});

/**
 * 시간 경과에 따른 자연 체력 감소 계산
 */
export const calculateNaturalHealthDecay = curry((
  elapsedMinutes: number,
  baseDecayRate: number = PET_CONSTANTS.HEALTH_DECAY_RATE
): number => {
  return elapsedMinutes * baseDecayRate * 0.1; // 자연 감소는 앱 사용보다 낮음
});

/**
 * 오프라인 시간에 따른 체력 회복 계산
 */
export const calculateHealthRestoration = curry((
  offlineMinutes: number,
  restoreRate: number = PET_CONSTANTS.HEALTH_RESTORE_RATE
): number => {
  return offlineMinutes * restoreRate;
});

/**
 * 새로운 체력 값 계산
 */
export const calculateNewHealth = curry((
  currentHealth: number,
  healthChange: number
): number => {
  return clamp(PET_CONSTANTS.MIN_HEALTH, PET_CONSTANTS.MAX_HEALTH, currentHealth + healthChange);
});

/**
 * 체력을 기반으로 펫 상태 결정
 */
export const determinePetStatus = (health: number): PetStatus => {
  if (health <= PET_CONSTANTS.MIN_HEALTH) return 'dead';
  if (health <= PET_CONSTANTS.CRITICAL_HEALTH_THRESHOLD) return 'critical';
  if (health <= PET_CONSTANTS.AT_RISK_HEALTH_THRESHOLD) return 'at_risk';
  return 'alive';
};

/**
 * 전체 앱 사용량을 기반으로 총 체력 감소 계산
 */
export const calculateTotalUsageDamage = (
  appUsages: readonly AppUsageData[],
  restrictions: Record<string, number>
): number => {
  return appUsages.reduce((totalDamage, usage) => {
    const limit = restrictions[usage.appId] || USAGE_LIMITS.DEFAULT_DAILY_LIMIT;
    const damage = calculateHealthDecayFromUsage(usage.dailyUsage, limit);
    return totalDamage + damage;
  }, 0);
};

/**
 * 펫의 위험도 백분율 계산 (0-100)
 */
export const calculateRiskPercentage = (health: number): number => {
  return percentage(PET_CONSTANTS.MAX_HEALTH, PET_CONSTANTS.MAX_HEALTH - health);
};

/**
 * 생존 예상 시간 계산 (분 단위)
 */
export const calculateSurvivalTime = curry((
  currentHealth: number,
  currentDecayRate: number
): number => {
  if (currentDecayRate <= 0) return Infinity;
  return Math.max(0, currentHealth / currentDecayRate);
});

/**
 * 어항 물의 탁도 계산 (0-100, 높을수록 탁함)
 */
export const calculateWaterTurbidity = (petHealth: number): number => {
  return 100 - petHealth; // 체력이 낮을수록 물이 탁해짐
};

/**
 * 복합적인 펫 상태 업데이트 계산
 */
export const updatePetHealthComplex = curry((
  currentHealth: number,
  appUsages: readonly AppUsageData[],
  restrictions: Record<string, number>,
  elapsedMinutes: number,
  offlineMinutes: number
) => {
  return pipe(
    // 1. 앱 사용으로 인한 데미지 계산
    () => calculateTotalUsageDamage(appUsages, restrictions),
    
    // 2. 자연 감소 추가
    (usageDamage) => usageDamage + calculateNaturalHealthDecay(elapsedMinutes),
    
    // 3. 오프라인 회복 적용
    (totalDamage) => totalDamage - calculateHealthRestoration(offlineMinutes),
    
    // 4. 현재 체력에서 변화량 적용
    (netDamage) => calculateNewHealth(currentHealth, -netDamage),
    
    // 5. 최종 상태 결정
    (newHealth) => ({
      health: newHealth,
      status: determinePetStatus(newHealth),
      riskPercentage: calculateRiskPercentage(newHealth),
      waterTurbidity: calculateWaterTurbidity(newHealth),
      survivalTime: calculateSurvivalTime(newHealth, PET_CONSTANTS.HEALTH_DECAY_RATE),
    })
  )();
});

/**
 * 펫이 죽을 위험도에 따른 알림 레벨 결정
 */
export const getNotificationLevel = (health: number): 'none' | 'warning' | 'critical' | 'death' => {
  if (health <= PET_CONSTANTS.MIN_HEALTH) return 'death';
  if (health <= PET_CONSTANTS.CRITICAL_HEALTH_THRESHOLD) return 'critical';
  if (health <= PET_CONSTANTS.AT_RISK_HEALTH_THRESHOLD) return 'warning';
  return 'none';
};

/**
 * 체력에 따른 펫의 행동 패턴 결정
 */
export const getPetBehaviorPattern = (health: number): {
  movementSpeed: number;
  activityLevel: number;
  responseToTouch: number;
} => {
  const healthRatio = health / PET_CONSTANTS.MAX_HEALTH;
  
  return {
    movementSpeed: clamp(0.1, 1.0, healthRatio),
    activityLevel: clamp(0.2, 1.0, healthRatio * 1.2),
    responseToTouch: clamp(0.1, 1.0, healthRatio * 0.8),
  };
};