import { AppUsageData, WaterQualityState } from '@/shared/types';
import { createLogger, pipe, clamp } from '@/shared/utils';
import { USAGE_LIMITS, DEFAULT_VALUES } from '@/shared/constants';

const logger = createLogger('WaterQualityManager');

// =============================================================================
// 물 탁도 관리 상수
// =============================================================================

const WATER_QUALITY_CONSTANTS = {
  // 최대 탁도 (100% = 완전히 탁함)
  MAX_TURBIDITY: 100,
  MIN_TURBIDITY: 0,
  
  // 탁도 증가율 (분당 증가량)
  TURBIDITY_INCREASE_RATE: 2, // 분당 2% 증가
  
  // 탁도 감소율 (앱 사용 안할 때)
  TURBIDITY_DECREASE_RATE: 0.5, // 분당 0.5% 감소
  
  // 임계값
  CLEAN_THRESHOLD: 20,      // 20% 미만 = 깨끗한 물
  MODERATE_THRESHOLD: 50,   // 50% 미만 = 약간 탁한 물
  DIRTY_THRESHOLD: 80,      // 80% 미만 = 탁한 물
  // 80% 이상 = 매우 탁한 물
  
  // 주간 리셋 시간 (일요일 자정)
  WEEKLY_RESET_DAY: 0, // 0 = 일요일
  WEEKLY_RESET_HOUR: 0,
  
  // 계산 간격
  UPDATE_INTERVAL: 10 * 1000, // 10초
} as const;

// =============================================================================
// 물 품질 상태 타입
// =============================================================================

export type WaterQualityLevel = 'clean' | 'moderate' | 'dirty' | 'very_dirty';

export interface WaterQualityInfo {
  turbidity: number; // 0-100%
  level: WaterQualityLevel;
  isHarmful: boolean;
  timeUntilDanger: number; // 위험 상태까지 남은 시간 (밀리초)
  lastResetTime: Date;
  nextResetTime: Date;
}

// =============================================================================
// 물 품질 관리자 클래스
// =============================================================================

export class WaterQualityManager {
  private static instance: WaterQualityManager;
  private currentTurbidity: number = DEFAULT_VALUES.AQUARIUM_WATER_QUALITY;
  private lastUpdateTime: Date = new Date();
  private lastResetTime: Date = new Date();
  private isActive: boolean = false;
  private updateTimer: NodeJS.Timeout | null = null;
  private onStateChange: ((state: WaterQualityInfo) => void) | null = null;
  
  private constructor() {
    this.initializeResetTime();
  }
  
  static getInstance(): WaterQualityManager {
    if (!WaterQualityManager.instance) {
      WaterQualityManager.instance = new WaterQualityManager();
    }
    return WaterQualityManager.instance;
  }
  
  // =================================================================
  // 초기화 및 설정
  // =================================================================
  
  /**
   * 주간 리셋 시간 초기화
   */
  private initializeResetTime(): void {
    const now = new Date();
    const lastSunday = this.getLastSunday(now);
    this.lastResetTime = lastSunday;
    
    logger.info(`마지막 물갈이 시간: ${this.lastResetTime.toISOString()}`);
  }
  
  /**
   * 지난 일요일 자정 시간 계산
   */
  private getLastSunday(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay(); // 0 = 일요일
    const diff = day === 0 ? 0 : day; // 일요일이면 0, 아니면 경과된 날수
    
    result.setDate(result.getDate() - diff);
    result.setHours(0, 0, 0, 0);
    
    return result;
  }
  
  /**
   * 다음 일요일 자정 시간 계산
   */
  private getNextSunday(date: Date): Date {
    const result = new Date(date);
    const day = result.getDay();
    const daysUntilSunday = day === 0 ? 7 : 7 - day;
    
    result.setDate(result.getDate() + daysUntilSunday);
    result.setHours(0, 0, 0, 0);
    
    return result;
  }
  
  // =================================================================
  // 물 품질 계산
  // =================================================================
  
  /**
   * 현재 앱 사용량 기반으로 탁도 업데이트
   */
  updateTurbidity(appUsageData: AppUsageData[]): void {
    const now = new Date();
    
    // 주간 리셋 확인
    this.checkWeeklyReset(now);
    
    // 시간 경과 계산
    const timeDeltaMs = now.getTime() - this.lastUpdateTime.getTime();
    const timeDeltaMinutes = timeDeltaMs / (1000 * 60);
    
    if (timeDeltaMinutes <= 0) {
      return; // 시간이 역행했거나 변화없음
    }
    
    // 현재 제한된 앱들의 총 사용 시간 계산
    const totalUsageTime = this.calculateTotalUsageTime(appUsageData);
    
    // 탁도 변화량 계산
    const turbidityChange = this.calculateTurbidityChange(
      totalUsageTime, 
      timeDeltaMinutes
    );
    
    // 탁도 업데이트
    this.currentTurbidity = clamp(
      this.currentTurbidity + turbidityChange, 
      WATER_QUALITY_CONSTANTS.MIN_TURBIDITY, 
      WATER_QUALITY_CONSTANTS.MAX_TURBIDITY
    );
    
    this.lastUpdateTime = now;
    
    logger.debug(`탁도 업데이트: ${this.currentTurbidity.toFixed(1)}% (변화: ${turbidityChange.toFixed(2)}%)`);
    
    // 상태 변화 알림
    this.notifyStateChange();
  }
  
  /**
   * 앱 사용 시간 기반 탁도 변화량 계산
   */
  private calculateTurbidityChange(
    totalUsageTimeMs: number, 
    timeDeltaMinutes: number
  ): number {
    // 사용 시간이 있으면 탁도 증가, 없으면 감소
    if (totalUsageTimeMs > 0) {
      // 사용 시간에 비례하여 탁도 증가
      const usageMinutes = totalUsageTimeMs / (1000 * 60);
      const increaseRate = WATER_QUALITY_CONSTANTS.TURBIDITY_INCREASE_RATE;
      
      // 실제 사용 시간에 비례한 증가량
      return Math.min(usageMinutes * increaseRate, timeDeltaMinutes * increaseRate);
    } else {
      // 사용하지 않으면 자연적으로 감소
      const decreaseRate = WATER_QUALITY_CONSTANTS.TURBIDITY_DECREASE_RATE;
      return -timeDeltaMinutes * decreaseRate;
    }
  }
  
  /**
   * 총 앱 사용 시간 계산 (지금부터 마지막 업데이트까지)
   */
  private calculateTotalUsageTime(appUsageData: AppUsageData[]): number {
    const now = new Date();
    const timeSinceLastUpdate = now.getTime() - this.lastUpdateTime.getTime();
    
    // 마지막 업데이트 이후의 사용량만 계산
    return appUsageData.reduce((total, usage) => {
      const timeSinceLastUsed = now.getTime() - usage.lastUsed.getTime();
      
      // 마지막 업데이트 이후에 사용된 앱만 포함
      if (timeSinceLastUsed <= timeSinceLastUpdate) {
        // 실제로는 증분 사용량을 계산해야 하지만, 
        // 간단히 현재 세션의 추정 사용량으로 계산
        const sessionUsage = Math.min(usage.todayUsage, timeSinceLastUpdate);
        return total + sessionUsage;
      }
      
      return total;
    }, 0);
  }
  
  /**
   * 주간 리셋 확인 및 실행
   */
  private checkWeeklyReset(currentTime: Date): void {
    const nextResetTime = this.getNextSunday(this.lastResetTime);
    
    if (currentTime >= nextResetTime) {
      this.performWeeklyReset(currentTime);
    }
  }
  
  /**
   * 주간 물갈이 리셋 실행
   */
  private performWeeklyReset(currentTime: Date): void {
    logger.info('주간 물갈이 실행');
    
    this.currentTurbidity = DEFAULT_VALUES.AQUARIUM_WATER_QUALITY;
    this.lastResetTime = this.getLastSunday(currentTime);
    this.lastUpdateTime = currentTime;
    
    this.notifyStateChange();
  }
  
  // =================================================================
  // 상태 조회
  // =================================================================
  
  /**
   * 현재 물 품질 정보 조회
   */
  getCurrentWaterQuality(): WaterQualityInfo {
    const level = this.getTurbidityLevel(this.currentTurbidity);
    const isHarmful = this.isHarmfulToFish(this.currentTurbidity);
    const timeUntilDanger = this.calculateTimeUntilDanger();
    const nextResetTime = this.getNextSunday(new Date());
    
    return {
      turbidity: Math.round(this.currentTurbidity * 100) / 100,
      level,
      isHarmful,
      timeUntilDanger,
      lastResetTime: new Date(this.lastResetTime),
      nextResetTime,
    };
  }
  
  /**
   * 탁도 수준 분류
   */
  private getTurbidityLevel(turbidity: number): WaterQualityLevel {
    if (turbidity < WATER_QUALITY_CONSTANTS.CLEAN_THRESHOLD) {
      return 'clean';
    } else if (turbidity < WATER_QUALITY_CONSTANTS.MODERATE_THRESHOLD) {
      return 'moderate';
    } else if (turbidity < WATER_QUALITY_CONSTANTS.DIRTY_THRESHOLD) {
      return 'dirty';
    } else {
      return 'very_dirty';
    }
  }
  
  /**
   * 물고기에게 해로운 수준인지 확인
   */
  private isHarmfulToFish(turbidity: number): boolean {
    return turbidity >= WATER_QUALITY_CONSTANTS.MODERATE_THRESHOLD;
  }
  
  /**
   * 위험 상태까지 남은 시간 계산 (밀리초)
   */
  private calculateTimeUntilDanger(): number {
    if (this.currentTurbidity >= WATER_QUALITY_CONSTANTS.DIRTY_THRESHOLD) {
      return 0; // 이미 위험 상태
    }
    
    const remainingTurbidity = WATER_QUALITY_CONSTANTS.DIRTY_THRESHOLD - this.currentTurbidity;
    const increaseRate = WATER_QUALITY_CONSTANTS.TURBIDITY_INCREASE_RATE; // 분당 %
    const minutesUntilDanger = remainingTurbidity / increaseRate;
    
    return Math.max(0, minutesUntilDanger * 60 * 1000); // 밀리초로 변환
  }
  
  // =================================================================
  // 모니터링 제어
  // =================================================================
  
  /**
   * 물 품질 모니터링 시작
   */
  startMonitoring(onStateChange: (state: WaterQualityInfo) => void): void {
    if (this.isActive) {
      this.stopMonitoring();
    }
    
    this.onStateChange = onStateChange;
    this.isActive = true;
    
    logger.info('물 품질 모니터링 시작');
    
    // 초기 상태 알림
    this.notifyStateChange();
    
    // 주기적 업데이트 시작 (앱 사용량은 외부에서 주입)
    this.updateTimer = setInterval(() => {
      // 자연적 탁도 감소만 처리 (사용량 없을 때)
      this.updateTurbidity([]);
    }, WATER_QUALITY_CONSTANTS.UPDATE_INTERVAL);
  }
  
  /**
   * 물 품질 모니터링 중단
   */
  stopMonitoring(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    this.isActive = false;
    this.onStateChange = null;
    
    logger.info('물 품질 모니터링 중단');
  }
  
  /**
   * 상태 변화 알림
   */
  private notifyStateChange(): void {
    if (this.onStateChange) {
      const state = this.getCurrentWaterQuality();
      this.onStateChange(state);
    }
  }
  
  // =================================================================
  // 유틸리티 메서드
  // =================================================================
  
  /**
   * 수동 물갈이 (긴급 리셋)
   */
  performManualWaterChange(): void {
    logger.info('수동 물갈이 실행');
    
    this.currentTurbidity = DEFAULT_VALUES.AQUARIUM_WATER_QUALITY;
    this.lastUpdateTime = new Date();
    
    this.notifyStateChange();
  }
  
  /**
   * 탁도를 직접 설정 (테스트용)
   */
  setTurbidity(turbidity: number): void {
    this.currentTurbidity = clamp(
      turbidity, 
      WATER_QUALITY_CONSTANTS.MIN_TURBIDITY, 
      WATER_QUALITY_CONSTANTS.MAX_TURBIDITY
    );
    
    this.notifyStateChange();
  }
  
  /**
   * 현재 모니터링 상태 확인
   */
  isMonitoring(): boolean {
    return this.isActive;
  }
}

// =============================================================================
// 싱글톤 인스턴스 및 편의 함수들
// =============================================================================

export const waterQualityManager = WaterQualityManager.getInstance();

/**
 * 물 품질 레벨에 따른 UI 색상 반환
 */
export const getWaterColor = (level: WaterQualityLevel): string => {
  switch (level) {
    case 'clean':
      return '#87CEEB';    // Sky Blue
    case 'moderate':
      return '#98D8C8';    // Light Sea Green
    case 'dirty':
      return '#8FBC8F';    // Dark Sea Green  
    case 'very_dirty':
      return '#696969';    // Dark Gray
    default:
      return '#87CEEB';
  }
};

/**
 * 물 품질 레벨 설명 텍스트
 */
export const getWaterQualityDescription = (level: WaterQualityLevel): string => {
  switch (level) {
    case 'clean':
      return '깨끗하고 맑은 물';
    case 'moderate':
      return '약간 탁한 물';
    case 'dirty':
      return '탁하고 더러운 물';
    case 'very_dirty':
      return '매우 탁하고 위험한 물';
    default:
      return '알 수 없는 상태';
  }
};