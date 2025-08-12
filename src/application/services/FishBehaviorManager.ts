import { WaterQualityLevel, WaterQualityInfo } from './WaterQualityManager';
import { Pet } from '@/shared/types';
import { createLogger, clamp, randomBetween } from '@/shared/utils';
import { ANIMATIONS } from '@/shared/constants';

const logger = createLogger('FishBehaviorManager');

// =============================================================================
// 물고기 행동 상수
// =============================================================================

const FISH_BEHAVIOR_CONSTANTS = {
  // 기본 이동 속도
  BASE_SPEED: 1.0,
  
  // 물 품질별 속도 배율
  SPEED_MULTIPLIERS: {
    clean: 1.2,      // 깨끗한 물에서는 활발히 움직임
    moderate: 1.0,   // 보통 속도
    dirty: 0.6,      // 탁한 물에서는 느려짐
    very_dirty: 0.3, // 매우 탁한 물에서는 거의 움직이지 않음
  },
  
  // 고통 표현 강도 (0-1)
  DISTRESS_LEVELS: {
    clean: 0.0,      // 고통 없음
    moderate: 0.3,   // 약간의 불편함
    dirty: 0.7,      // 뚜렷한 고통
    very_dirty: 1.0, // 극심한 고통
  },
  
  // 색상 변화 (투명도, 0-1)
  OPACITY_LEVELS: {
    clean: 1.0,      // 선명한 색상
    moderate: 0.9,   // 약간 흐려짐
    dirty: 0.7,      // 많이 흐려짐
    very_dirty: 0.4, // 거의 투명
  },
  
  // 애니메이션 간격
  BEHAVIOR_UPDATE_INTERVAL: 2000, // 2초마다 행동 패턴 업데이트
  DISTRESS_ANIMATION_INTERVAL: 500, // 고통 애니메이션 간격
  
  // 움직임 패턴
  MOVEMENT_PATTERNS: {
    normal: 'smooth_circular',
    distressed: 'erratic_jerky',
    dying: 'slow_sinking',
    dead: 'floating',
  },
  
  // 위치 제약
  TANK_BOUNDS: {
    left: 0.1,    // 10%
    right: 0.9,   // 90%
    top: 0.2,     // 20%
    bottom: 0.8,  // 80%
  },
} as const;

// =============================================================================
// 물고기 행동 상태 타입
// =============================================================================

export interface FishPosition {
  x: number; // 0-1 (탱크 너비 기준 비율)
  y: number; // 0-1 (탱크 높이 기준 비율)
}

export interface FishBehaviorState {
  position: FishPosition;
  velocity: {
    x: number;
    y: number;
  };
  speed: number;
  opacity: number;
  isDistressed: boolean;
  distressLevel: number; // 0-1
  movementPattern: keyof typeof FISH_BEHAVIOR_CONSTANTS.MOVEMENT_PATTERNS;
  animationPhase: number; // 애니메이션 단계 (0-1)
  isDying: boolean;
  isDead: boolean;
}

// =============================================================================
// 물고기 행동 관리자 클래스
// =============================================================================

export class FishBehaviorManager {
  private static instance: FishBehaviorManager;
  private behaviorState: FishBehaviorState;
  private currentWaterQuality: WaterQualityInfo | null = null;
  private currentPet: Pet | null = null;
  private isActive: boolean = false;
  private updateTimer: NodeJS.Timeout | null = null;
  private animationTimer: NodeJS.Timeout | null = null;
  private onStateChange: ((state: FishBehaviorState) => void) | null = null;
  
  private constructor() {
    this.behaviorState = this.createInitialState();
  }
  
  static getInstance(): FishBehaviorManager {
    if (!FishBehaviorManager.instance) {
      FishBehaviorManager.instance = new FishBehaviorManager();
    }
    return FishBehaviorManager.instance;
  }
  
  // =================================================================
  // 초기화
  // =================================================================
  
  /**
   * 초기 물고기 상태 생성
   */
  private createInitialState(): FishBehaviorState {
    return {
      position: { x: 0.5, y: 0.5 }, // 중앙에서 시작
      velocity: { x: 0, y: 0 },
      speed: FISH_BEHAVIOR_CONSTANTS.BASE_SPEED,
      opacity: 1.0,
      isDistressed: false,
      distressLevel: 0,
      movementPattern: 'normal',
      animationPhase: 0,
      isDying: false,
      isDead: false,
    };
  }
  
  // =================================================================
  // 상태 업데이트
  // =================================================================
  
  /**
   * 물 품질 변화에 따른 물고기 행동 업데이트
   */
  updateBehavior(waterQuality: WaterQualityInfo, pet: Pet | null): void {
    this.currentWaterQuality = waterQuality;
    this.currentPet = pet;
    
    if (!pet) {
      this.behaviorState.isDead = true;
      this.behaviorState.movementPattern = 'dead';
      this.notifyStateChange();
      return;
    }
    
    // 물 품질에 따른 행동 변화 계산
    this.updateSpeedFromWaterQuality(waterQuality.level);
    this.updateDistressFromWaterQuality(waterQuality.level);
    this.updateOpacityFromWaterQuality(waterQuality.level);
    this.updateMovementPattern(waterQuality.level);
    
    // 펫의 건강 상태 반영
    this.updateHealthBasedBehavior(pet);
    
    this.notifyStateChange();
  }
  
  /**
   * 물 품질에 따른 이동 속도 업데이트
   */
  private updateSpeedFromWaterQuality(waterLevel: WaterQualityLevel): void {
    const multiplier = FISH_BEHAVIOR_CONSTANTS.SPEED_MULTIPLIERS[waterLevel];
    this.behaviorState.speed = FISH_BEHAVIOR_CONSTANTS.BASE_SPEED * multiplier;
  }
  
  /**
   * 물 품질에 따른 고통 수준 업데이트
   */
  private updateDistressFromWaterQuality(waterLevel: WaterQualityLevel): void {
    const distressLevel = FISH_BEHAVIOR_CONSTANTS.DISTRESS_LEVELS[waterLevel];
    this.behaviorState.distressLevel = distressLevel;
    this.behaviorState.isDistressed = distressLevel > 0.2;
  }
  
  /**
   * 물 품질에 따른 투명도 업데이트
   */
  private updateOpacityFromWaterQuality(waterLevel: WaterQualityLevel): void {
    const opacity = FISH_BEHAVIOR_CONSTANTS.OPACITY_LEVELS[waterLevel];
    this.behaviorState.opacity = opacity;
  }
  
  /**
   * 물 품질에 따른 움직임 패턴 업데이트
   */
  private updateMovementPattern(waterLevel: WaterQualityLevel): void {
    switch (waterLevel) {
      case 'clean':
        this.behaviorState.movementPattern = 'normal';
        break;
      case 'moderate':
        this.behaviorState.movementPattern = 'normal';
        break;
      case 'dirty':
        this.behaviorState.movementPattern = 'distressed';
        break;
      case 'very_dirty':
        this.behaviorState.movementPattern = 'dying';
        this.behaviorState.isDying = true;
        break;
    }
  }
  
  /**
   * 펫 건강 상태에 따른 행동 업데이트
   */
  private updateHealthBasedBehavior(pet: Pet): void {
    if (pet.health <= 0) {
      this.behaviorState.isDead = true;
      this.behaviorState.isDying = false;
      this.behaviorState.movementPattern = 'dead';
      this.behaviorState.speed = 0;
      this.behaviorState.opacity = 0.3;
    } else if (pet.health <= 20) {
      this.behaviorState.isDying = true;
      this.behaviorState.movementPattern = 'dying';
      this.behaviorState.speed *= 0.3; // 매우 느리게
    } else if (pet.health <= 50) {
      // 건강이 낮을 때 추가 속도 감소
      this.behaviorState.speed *= (pet.health / 50);
    }
    
    // 성격에 따른 행동 수정
    this.applyPersonalityModifiers(pet.personality);
  }
  
  /**
   * 성격에 따른 행동 수정
   */
  private applyPersonalityModifiers(personality: Pet['personality']): void {
    switch (personality) {
      case 'active':
        this.behaviorState.speed *= 1.3;
        break;
      case 'calm':
        this.behaviorState.speed *= 0.8;
        break;
      case 'playful':
        this.behaviorState.speed *= 1.1;
        // 더 복잡한 움직임 패턴
        break;
      case 'shy':
        this.behaviorState.speed *= 0.9;
        // 구석으로 이동하는 경향
        break;
      case 'curious':
        this.behaviorState.speed *= 1.0;
        // 더 넓은 영역 탐험
        break;
    }
  }
  
  // =================================================================
  // 위치 및 애니메이션 업데이트
  // =================================================================
  
  /**
   * 물고기 위치 업데이트
   */
  private updatePosition(): void {
    if (this.behaviorState.isDead) {
      this.updateDeadPosition();
    } else if (this.behaviorState.isDying) {
      this.updateDyingPosition();
    } else if (this.behaviorState.movementPattern === 'distressed') {
      this.updateDistressedPosition();
    } else {
      this.updateNormalPosition();
    }
    
    // 탱크 경계 제약 적용
    this.applyBoundaryConstraints();
  }
  
  /**
   * 정상 상태 위치 업데이트 (부드러운 원형 움직임)
   */
  private updateNormalPosition(): void {
    const time = Date.now() / 1000;
    const phase = this.behaviorState.animationPhase;
    
    // 원형 궤도 움직임
    const centerX = 0.5 + Math.cos(time * 0.5 + phase) * 0.2;
    const centerY = 0.5 + Math.sin(time * 0.3 + phase) * 0.15;
    
    this.behaviorState.position.x = centerX;
    this.behaviorState.position.y = centerY;
  }
  
  /**
   * 스트레스 상태 위치 업데이트 (불규칙한 움직임)
   */
  private updateDistressedPosition(): void {
    const time = Date.now() / 1000;
    const intensity = this.behaviorState.distressLevel;
    
    // 불규칙한 떨림 움직임
    const jerkX = (Math.random() - 0.5) * intensity * 0.1;
    const jerkY = (Math.random() - 0.5) * intensity * 0.1;
    
    this.behaviorState.position.x += jerkX;
    this.behaviorState.position.y += jerkY;
  }
  
  /**
   * 죽어가는 상태 위치 업데이트 (천천히 가라앉기)
   */
  private updateDyingPosition(): void {
    const sinkSpeed = 0.001; // 매우 천천히 가라앉기
    this.behaviorState.position.y = Math.min(
      this.behaviorState.position.y + sinkSpeed,
      FISH_BEHAVIOR_CONSTANTS.TANK_BOUNDS.bottom
    );
    
    // 좌우로 약간의 흔들림
    const time = Date.now() / 1000;
    const drift = Math.sin(time * 0.5) * 0.02;
    this.behaviorState.position.x += drift;
  }
  
  /**
   * 죽은 상태 위치 업데이트 (물 위에 떠있기)
   */
  private updateDeadPosition(): void {
    // 점점 수면으로 올라감
    const floatSpeed = 0.0005;
    this.behaviorState.position.y = Math.max(
      this.behaviorState.position.y - floatSpeed,
      FISH_BEHAVIOR_CONSTANTS.TANK_BOUNDS.top
    );
    
    // 약간의 수평 이동
    const time = Date.now() / 1000;
    const drift = Math.sin(time * 0.2) * 0.01;
    this.behaviorState.position.x += drift;
  }
  
  /**
   * 탱크 경계 제약 적용
   */
  private applyBoundaryConstraints(): void {
    this.behaviorState.position.x = clamp(
      this.behaviorState.position.x,
      FISH_BEHAVIOR_CONSTANTS.TANK_BOUNDS.left,
      FISH_BEHAVIOR_CONSTANTS.TANK_BOUNDS.right
    );
    
    this.behaviorState.position.y = clamp(
      this.behaviorState.position.y,
      FISH_BEHAVIOR_CONSTANTS.TANK_BOUNDS.top,
      FISH_BEHAVIOR_CONSTANTS.TANK_BOUNDS.bottom
    );
  }
  
  // =================================================================
  // 모니터링 제어
  // =================================================================
  
  /**
   * 물고기 행동 모니터링 시작
   */
  startBehaviorMonitoring(onStateChange: (state: FishBehaviorState) => void): void {
    if (this.isActive) {
      this.stopBehaviorMonitoring();
    }
    
    this.onStateChange = onStateChange;
    this.isActive = true;
    
    logger.info('물고기 행동 모니터링 시작');
    
    // 초기 상태 알림
    this.notifyStateChange();
    
    // 주기적 위치 업데이트
    this.updateTimer = setInterval(() => {
      this.updatePosition();
      this.notifyStateChange();
    }, FISH_BEHAVIOR_CONSTANTS.BEHAVIOR_UPDATE_INTERVAL);
    
    // 애니메이션 페이즈 업데이트
    this.animationTimer = setInterval(() => {
      this.behaviorState.animationPhase = Math.random() * Math.PI * 2;
    }, 10000); // 10초마다 패턴 변경
  }
  
  /**
   * 물고기 행동 모니터링 중단
   */
  stopBehaviorMonitoring(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
      this.animationTimer = null;
    }
    
    this.isActive = false;
    this.onStateChange = null;
    
    logger.info('물고기 행동 모니터링 중단');
  }
  
  /**
   * 상태 변화 알림
   */
  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange({ ...this.behaviorState });
    }
  }
  
  // =================================================================
  // 상태 조회
  // =================================================================
  
  /**
   * 현재 물고기 행동 상태 조회
   */
  getCurrentBehaviorState(): FishBehaviorState {
    return { ...this.behaviorState };
  }
  
  /**
   * 물고기 위치를 특정 좌표로 설정 (테스트용)
   */
  setPosition(x: number, y: number): void {
    this.behaviorState.position.x = clamp(x, 0, 1);
    this.behaviorState.position.y = clamp(y, 0, 1);
    this.notifyStateChange();
  }
  
  /**
   * 모니터링 상태 확인
   */
  isMonitoring(): boolean {
    return this.isActive;
  }
  
  /**
   * 물고기 상태 리셋 (새 펫 생성시)
   */
  resetBehaviorState(): void {
    this.behaviorState = this.createInitialState();
    this.notifyStateChange();
    logger.info('물고기 행동 상태 리셋');
  }
}

// =============================================================================
// 싱글톤 인스턴스 및 편의 함수들
// =============================================================================

export const fishBehaviorManager = FishBehaviorManager.getInstance();

/**
 * 물고기 고통 수준에 따른 이모지 반환
 */
export const getFishEmoji = (state: FishBehaviorState): string => {
  if (state.isDead) {
    return '💀'; // 죽은 물고기
  } else if (state.isDying) {
    return '🥀'; // 시들어가는 
  } else if (state.isDistressed) {
    return '😰'; // 고통받는
  } else {
    return '🐠'; // 건강한 물고기
  }
};

/**
 * 고통 수준에 따른 색상 필터 반환
 */
export const getFishColorFilter = (distressLevel: number): string => {
  if (distressLevel === 0) {
    return 'none';
  } else if (distressLevel < 0.5) {
    return 'sepia(30%)';
  } else if (distressLevel < 0.8) {
    return 'sepia(60%) brightness(0.8)';
  } else {
    return 'sepia(90%) brightness(0.6) contrast(0.7)';
  }
};