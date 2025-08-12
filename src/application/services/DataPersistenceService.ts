import { database } from '@/infrastructure/database/AsyncStorageDB';
import { useAppStore } from '@/application/store';
import { AppState, Pet, DeadPet, AppRestriction, GameStats, AppSettings } from '@/shared/types';
import { createLogger, asyncSafeExecute, debounce } from '@/shared/utils';
import { DatabaseData } from '@/infrastructure/database/schema';

const logger = createLogger('DataPersistenceService');

// =============================================================================
// 데이터 영속화 서비스 클래스
// =============================================================================

export class DataPersistenceService {
  private static instance: DataPersistenceService;
  private isInitialized = false;
  private saveQueue: (() => Promise<void>)[] = [];
  private isProcessingQueue = false;
  
  // 디바운스된 저장 함수들 (성능 최적화)
  private debouncedSavePet = debounce(this.savePetImmediate.bind(this), 1000);
  private debouncedSaveSettings = debounce(this.saveSettingsImmediate.bind(this), 500);
  private debouncedSaveGameStats = debounce(this.saveGameStatsImmediate.bind(this), 2000);
  
  // 캐시 및 성능 최적화
  private lastSavedState: string | null = null; // 마지막 저장된 상태의 해시
  private savePendingTimer: NodeJS.Timeout | null = null;
  private isSaving: boolean = false;
  
  private constructor() {}
  
  static getInstance(): DataPersistenceService {
    if (!DataPersistenceService.instance) {
      DataPersistenceService.instance = new DataPersistenceService();
    }
    return DataPersistenceService.instance;
  }
  
  // =================================================================
  // 초기화 및 설정
  // =================================================================
  
  /**
   * 서비스 초기화 및 데이터 복원
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      logger.info('데이터 영속화 서비스 초기화 시작');
      
      // 데이터베이스 초기화
      const dbResult = await database.initialize();
      if (!dbResult.success) {
        throw new Error(dbResult.error);
      }
      
      // 저장된 데이터 복원
      await this.restoreAppState();
      
      // 자동 저장 설정
      this.setupAutoSave();
      
      this.isInitialized = true;
      logger.info('데이터 영속화 서비스 초기화 완료');
      
    } catch (error) {
      logger.error('서비스 초기화 실패:', error);
      throw error;
    }
  }
  
  /**
   * 저장된 앱 상태 복원
   */
  private async restoreAppState(): Promise<void> {
    const result = await database.loadData();
    
    if (result.success) {
      const data = result.data;
      const store = useAppStore.getState();
      
      // 스토어에 데이터 하이드레이션
      store.hydrate({
        pet: {
          current: data.currentPet,
          isMonitoring: data.currentPet !== null,
          lastUpdateTime: data.lastUpdated.getTime(),
        },
        appUsage: {
          restrictions: data.appRestrictions,
          currentUsage: data.currentUsage,
          totalWeeklyLimit: 0, // TODO: 계산 로직 추가
          isTrackingEnabled: data.appRestrictions.length > 0,
        },
        game: {
          stats: data.gameStats,
          decorations: data.decorations,
          aquariumConfig: data.aquariumConfig,
        },
        memorial: {
          deadPets: data.deadPets,
          usedNames: data.usedNames,
        },
        settings: data.appSettings,
        ui: {
          isOnboarded: true, // 데이터가 있으면 온보딩 완료로 간주
          currentScreen: 'main',
          isLoading: false,
          error: null,
        },
      });
      
      logger.info('앱 상태 복원 완료');
    } else {
      logger.warn('저장된 데이터가 없거나 손상됨:', result.error);
    }
  }
  
  /**
   * 자동 저장 설정
   */
  private setupAutoSave(): void {
    const store = useAppStore.getState();
    
    // 스토어 구독하여 변경사항 자동 저장
    useAppStore.subscribe(
      (state) => state.pet.current,
      (pet) => {
        if (pet) {
          this.debouncedSavePet();
        }
      }
    );
    
    useAppStore.subscribe(
      (state) => state.settings,
      () => {
        this.debouncedSaveSettings();
      }
    );
    
    useAppStore.subscribe(
      (state) => state.game.stats,
      () => {
        this.debouncedSaveGameStats();
      }
    );
    
    logger.info('자동 저장 설정 완료');
  }
  
  // =================================================================
  // 개별 데이터 저장 메서드들
  // =================================================================
  
  /**
   * 펫 데이터 즉시 저장
   */
  private async savePetImmediate(): Promise<void> {
    const state = useAppStore.getState();
    const pet = state.pet.current;
    
    if (pet) {
      const result = await database.savePet(pet);
      if (!result.success) {
        logger.error('펫 데이터 저장 실패:', result.error);
      }
    }
  }
  
  /**
   * 설정 데이터 즉시 저장
   */
  private async saveSettingsImmediate(): Promise<void> {
    const state = useAppStore.getState();
    const settings = state.settings;
    
    const result = await database.saveSettings(settings);
    if (!result.success) {
      logger.error('설정 데이터 저장 실패:', result.error);
    }
  }
  
  /**
   * 게임 통계 즉시 저장
   */
  private async saveGameStatsImmediate(): Promise<void> {
    const state = useAppStore.getState();
    const stats = state.game.stats;
    
    const result = await database.updateGameStats(stats);
    if (!result.success) {
      logger.error('게임 통계 저장 실패:', result.error);
    }
  }
  
  // =================================================================
  // 공개 메서드들
  // =================================================================
  
  /**
   * 펫 데이터 저장 (디바운스됨)
   */
  savePet(): void {
    this.debouncedSavePet();
  }
  
  /**
   * 죽은 펫 추가
   */
  async addDeadPet(deadPet: DeadPet): Promise<boolean> {
    const result = await database.addDeadPet(deadPet);
    
    if (result.success) {
      logger.info(`죽은 펫 저장 완료: ${deadPet.name}`);
      return true;
    } else {
      logger.error('죽은 펫 저장 실패:', result.error);
      return false;
    }
  }
  
  /**
   * 앱 제한 설정 저장
   */
  async saveAppRestrictions(restrictions: readonly AppRestriction[]): Promise<boolean> {
    const result = await database.saveAppRestrictions([...restrictions]);
    
    if (result.success) {
      logger.info('앱 제한 설정 저장 완료');
      return true;
    } else {
      logger.error('앱 제한 설정 저장 실패:', result.error);
      return false;
    }
  }
  
  /**
   * 전체 앱 상태 즉시 저장 (중복 저장 방지 및 동시성 보장)
   */
  async saveAllData(): Promise<boolean> {
    // 이미 저장 중이면 대기
    if (this.isSaving) {
      logger.warn('이미 저장 작업이 진행 중입니다');
      return false;
    }
    
    this.isSaving = true;
    
    try {
      const state = useAppStore.getState();
      
      // 상태 해시 계산으로 중복 저장 방지
      const stateHash = this.calculateStateHash(state);
      if (this.lastSavedState === stateHash) {
        logger.debug('상태 값이 변경되지 않았어 저장을 생략합니다');
        return true;
      }
      
      const databaseData: Partial<DatabaseData> = {
        currentPet: state.pet.current,
        deadPets: state.memorial.deadPets,
        usedNames: state.memorial.usedNames,
        appRestrictions: [...state.appUsage.restrictions],
        currentUsage: [...state.appUsage.currentUsage],
        gameStats: state.game.stats,
        decorations: [...state.game.decorations],
        aquariumConfig: state.game.aquariumConfig,
        appSettings: state.settings,
      };
      
      const result = await database.saveData(databaseData);
      
      if (result.success) {
        this.lastSavedState = stateHash;
        logger.info('전체 데이터 저장 완료');
        return true;
      } else {
        logger.error('전체 데이터 저장 실패:', result.error);
        return false;
      }
    } finally {
      this.isSaving = false;
    }
  }
  
  /**
   * 상태 해시 계산 (중복 저장 방지용)
   */
  private calculateStateHash(state: any): string {
    const relevantData = {
      pet: state.pet.current,
      settings: state.settings,
      gameStats: state.game.stats,
      deadPetsLength: state.memorial.deadPets.length,
      restrictionsLength: state.appUsage.restrictions.length,
    };
    
    // 간단한 해시 생성 (JSON 문자열 기반)
    return JSON.stringify(relevantData);
  }
  
  /**
   * 데이터 내보내기
   */
  async exportData(): Promise<string | null> {
    const result = await database.exportData();
    
    if (result.success) {
      logger.info('데이터 내보내기 완료');
      return result.data;
    } else {
      logger.error('데이터 내보내기 실패:', result.error);
      return null;
    }
  }
  
  /**
   * 데이터 가져오기
   */
  async importData(jsonData: string): Promise<boolean> {
    const result = await database.importData(jsonData);
    
    if (result.success) {
      // 가져온 데이터로 앱 상태 다시 복원
      await this.restoreAppState();
      logger.info('데이터 가져오기 완료');
      return true;
    } else {
      logger.error('데이터 가져오기 실패:', result.error);
      return false;
    }
  }
  
  /**
   * 모든 데이터 초기화
   */
  async resetAllData(): Promise<boolean> {
    const result = await database.reset();
    
    if (result.success) {
      // 스토어도 리셋
      const store = useAppStore.getState();
      store.reset();
      
      logger.info('모든 데이터 초기화 완료');
      return true;
    } else {
      logger.error('데이터 초기화 실패:', result.error);
      return false;
    }
  }
  
  /**
   * 저장 공간 정보 조회
   */
  async getStorageInfo(): Promise<{
    totalSize: number;
    keys: string[];
  } | null> {
    const result = await database.getStorageInfo();
    
    if (result.success) {
      return result.data;
    } else {
      logger.error('저장 공간 정보 조회 실패:', result.error);
      return null;
    }
  }
  
  // =================================================================
  // 앱 생명주기 처리
  // =================================================================
  
  /**
   * 앱이 백그라운드로 이동할 때 호출
   */
  async onAppBackground(): Promise<void> {
    logger.info('앱 백그라운드 진입 - 데이터 저장');
    await this.saveAllData();
  }
  
  /**
   * 앱이 포어그라운드로 복귀할 때 호출
   */
  async onAppForeground(): Promise<void> {
    logger.info('앱 포어그라운드 복귀 - 데이터 동기화');
    // 필요시 데이터 동기화 로직 추가
  }
  
  /**
   * 앱 종료 시 호출
   */
  async onAppTerminate(): Promise<void> {
    logger.info('앱 종료 - 최종 데이터 저장');
    await this.saveAllData();
  }
}

// =============================================================================
// 싱글톤 인스턴스 및 편의 함수들
// =============================================================================

export const dataPersistenceService = DataPersistenceService.getInstance();

/**
 * 데이터 영속화 서비스 초기화 (앱 시작시 호출)
 */
export const initializeDataPersistence = async (): Promise<void> => {
  await dataPersistenceService.initialize();
};

/**
 * 현재 앱 상태를 모두 저장
 */
export const saveAppState = async (): Promise<boolean> => {
  return await dataPersistenceService.saveAllData();
};

/**
 * 펫 사망 처리 및 저장
 */
export const handlePetDeath = async (deadPet: DeadPet): Promise<boolean> => {
  return await dataPersistenceService.addDeadPet(deadPet);
};