import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { subscribeWithSelector } from 'zustand/middleware';
import { AppState, Pet, DeadPet, AppRestriction, AppUsageData, GameStats, AppSettings } from '@/shared/types';
import { DEFAULT_VALUES } from '@/shared/constants';
import { createLogger } from '@/shared/utils';

const logger = createLogger('AppStore');

// =============================================================================
// 스토어 액션 타입 정의
// =============================================================================

interface AppActions {
  // 펫 관련 액션
  createPet: (name: string, personality: Pet['personality']) => void;
  updatePetHealth: (health: number) => void;
  updatePetStatus: (status: Pet['status']) => void;
  killPet: (causeOfDeath: string, deathReason: DeadPet['deathReason']) => void;
  
  // 앱 사용량 관련 액션
  setAppRestrictions: (restrictions: readonly AppRestriction[]) => void;
  updateAppUsage: (usage: readonly AppUsageData[]) => void;
  toggleAppRestriction: (appId: string) => void;
  updateAppLimit: (appId: string, dailyLimit: number, weeklyLimit: number) => void;
  
  // 게임 시스템 액션
  addPoints: (points: number) => void;
  updateStreak: (days: number) => void;
  unlockDecoration: (decorationId: string) => void;
  buyDecoration: (decorationId: string, price: number) => void;
  
  // 설정 액션
  updateSettings: (settings: Partial<AppSettings>) => void;
  
  // UI 액션
  setCurrentScreen: (screen: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  completeOnboarding: () => void;
  
  // 유틸리티 액션
  reset: () => void;
  hydrate: (state: Partial<AppState>) => void;
}

// =============================================================================
// 초기 상태 정의
// =============================================================================

const initialState: AppState = {
  pet: {
    current: null,
    isMonitoring: false,
    lastUpdateTime: Date.now(),
  },
  
  appUsage: {
    restrictions: [],
    currentUsage: [],
    totalWeeklyLimit: 0,
    isTrackingEnabled: false,
  },
  
  game: {
    stats: DEFAULT_VALUES.GAME_STATS,
    decorations: [],
    aquariumConfig: {
      waterQuality: DEFAULT_VALUES.AQUARIUM_WATER_QUALITY,
      temperature: DEFAULT_VALUES.AQUARIUM_TEMPERATURE,
      decorationPositions: [],
    },
  },
  
  memorial: {
    deadPets: [],
    usedNames: [],
  },
  
  settings: DEFAULT_VALUES.SETTINGS,
  
  ui: {
    isOnboarded: false,
    currentScreen: 'onboarding',
    isLoading: false,
    error: null,
  },
};

// =============================================================================
// 메인 스토어 생성
// =============================================================================

export const useAppStore = create<AppState & AppActions>()(
  subscribeWithSelector(
    immer((set, get) => ({
      ...initialState,
      
      // =================================================================
      // 펫 관련 액션
      // =================================================================
      
      createPet: (name: string, personality: Pet['personality']) => {
        set((state) => {
          const petId = `pet_${Date.now()}`;
          const now = new Date();
          
          const newPet: Pet = {
            id: petId,
            name: name.trim(),
            personality,
            createdAt: now,
            health: DEFAULT_VALUES.PET_HEALTH,
            status: 'alive',
            lastFeedTime: now,
            totalLifetime: 0,
          };
          
          state.pet.current = newPet;
          state.pet.isMonitoring = true;
          state.pet.lastUpdateTime = now.getTime();
          state.memorial.usedNames.push(name.trim());
          state.game.stats.totalPetsRaised += 1;
          
          logger.info(`새 펫 생성: ${name} (${personality})`);
        });
      },
      
      updatePetHealth: (health: number) => {
        set((state) => {
          if (state.pet.current) {
            const clampedHealth = Math.max(0, Math.min(100, health));
            
            // 비교를 위해 새로운 값 계산
            if (state.pet.current.health !== clampedHealth) {
              state.pet.current.health = clampedHealth;
              state.pet.lastUpdateTime = Date.now();
              
              // 물의 탁도도 업데이트 (값이 변경된 경우만)
              state.game.aquariumConfig.waterQuality = clampedHealth;
            }
          }
        });
      },
      
      updatePetStatus: (status: Pet['status']) => {
        set((state) => {
          if (state.pet.current) {
            state.pet.current.status = status;
            state.pet.lastUpdateTime = Date.now();
          }
        });
      },
      
      killPet: (causeOfDeath: string, deathReason: DeadPet['deathReason']) => {
        set((state) => {
          if (state.pet.current) {
            const now = new Date();
            const totalLifetime = now.getTime() - state.pet.current.createdAt.getTime();
            
            const deadPet: DeadPet = {
              id: state.pet.current.id,
              name: state.pet.current.name,
              personality: state.pet.current.personality,
              createdAt: state.pet.current.createdAt,
              diedAt: now,
              causeOfDeath,
              totalLifetime,
              deathReason,
            };
            
            state.memorial.deadPets.push(deadPet);
            state.pet.current = null;
            state.pet.isMonitoring = false;
            state.game.stats.totalPetDeaths += 1;
            state.game.stats.currentStreak = 0;
            
            logger.info(`펫 사망: ${deadPet.name}, 원인: ${causeOfDeath}`);
          }
        });
      },
      
      // =================================================================
      // 앱 사용량 관련 액션
      // =================================================================
      
      setAppRestrictions: (restrictions: readonly AppRestriction[]) => {
        set((state) => {
          state.appUsage.restrictions = restrictions as AppRestriction[];
          logger.info(`앱 제한 설정 업데이트: ${restrictions.length}개 앱`);
        });
      },
      
      updateAppUsage: (usage: readonly AppUsageData[]) => {
        set((state) => {
          // 기존 데이터와 비교하여 변경된 경우만 업데이트
          const currentUsage = state.appUsage.currentUsage;
          const hasChanges = usage.length !== currentUsage.length || 
            usage.some((newUsage, index) => {
              const existing = currentUsage[index];
              return !existing || 
                existing.packageName !== newUsage.packageName ||
                existing.totalTime !== newUsage.totalTime;
            });
          
          if (hasChanges) {
            state.appUsage.currentUsage = usage as AppUsageData[];
            state.pet.lastUpdateTime = Date.now();
          }
        });
      },
      
      toggleAppRestriction: (appId: string) => {
        set((state) => {
          const restriction = state.appUsage.restrictions.find(r => r.appId === appId);
          if (restriction) {
            restriction.isActive = !restriction.isActive;
          }
        });
      },
      
      updateAppLimit: (appId: string, dailyLimit: number, weeklyLimit: number) => {
        set((state) => {
          const restriction = state.appUsage.restrictions.find(r => r.appId === appId);
          if (restriction) {
            restriction.dailyLimit = dailyLimit;
            restriction.weeklyLimit = weeklyLimit;
          }
        });
      },
      
      // =================================================================
      // 게임 시스템 액션
      // =================================================================
      
      addPoints: (points: number) => {
        set((state) => {
          state.game.stats.totalPoints += points;
          logger.info(`포인트 획득: +${points} (총합: ${state.game.stats.totalPoints})`);
        });
      },
      
      updateStreak: (days: number) => {
        set((state) => {
          state.game.stats.currentStreak = days;
          if (days > state.game.stats.longestStreak) {
            state.game.stats.longestStreak = days;
          }
        });
      },
      
      unlockDecoration: (decorationId: string) => {
        set((state) => {
          const decoration = state.game.decorations.find(d => d.id === decorationId);
          if (decoration && !decoration.unlockedAt) {
            decoration.unlockedAt = new Date();
          }
        });
      },
      
      buyDecoration: (decorationId: string, price: number) => {
        set((state) => {
          if (state.game.stats.totalPoints >= price) {
            state.game.stats.totalPoints -= price;
            
            const decoration = state.game.decorations.find(d => d.id === decorationId);
            if (decoration) {
              decoration.isOwned = true;
            }
            
            logger.info(`장식 구매: ${decorationId} (-${price} 포인트)`);
          }
        });
      },
      
      // =================================================================
      // 설정 액션
      // =================================================================
      
      updateSettings: (settings: Partial<AppSettings>) => {
        set((state) => {
          Object.assign(state.settings, settings);
          logger.info('설정 업데이트:', settings);
        });
      },
      
      // =================================================================
      // UI 액션
      // =================================================================
      
      setCurrentScreen: (screen: string) => {
        set((state) => {
          state.ui.currentScreen = screen;
        });
      },
      
      setLoading: (loading: boolean) => {
        set((state) => {
          state.ui.isLoading = loading;
        });
      },
      
      setError: (error: string | null) => {
        set((state) => {
          state.ui.error = error;
          if (error) {
            logger.error('앱 에러:', error);
          }
        });
      },
      
      completeOnboarding: () => {
        set((state) => {
          state.ui.isOnboarded = true;
          state.ui.currentScreen = 'main';
          logger.info('온보딩 완료');
        });
      },
      
      // =================================================================
      // 유틸리티 액션
      // =================================================================
      
      reset: () => {
        set(() => ({ ...initialState }));
        logger.info('앱 상태 리셋');
      },
      
      hydrate: (newState: Partial<AppState>) => {
        set((state) => {
          Object.assign(state, newState);
          logger.info('상태 하이드레이션 완료');
        });
      },
    }))
  )
);

// =============================================================================
// 성능 최적화된 셀렉터 함수들
// =============================================================================

// 펫 관련 셀렉터 (메모이제이션 적용)
export const selectCurrentPet = (state: AppState) => state.pet.current;
export const selectPetHealth = (state: AppState) => state.pet.current?.health ?? 0;
export const selectPetStatus = (state: AppState) => state.pet.current?.status ?? 'dead';
export const selectIsMonitoring = (state: AppState) => state.pet.isMonitoring;
export const selectPetLastUpdate = (state: AppState) => state.pet.lastUpdateTime;

// 복합 펫 정보 셀렉터 (의존성 배열로 최적화)
export const selectPetInfo = (state: AppState) => ({
  pet: state.pet.current,
  health: state.pet.current?.health ?? 0,
  status: state.pet.current?.status ?? 'dead',
  isMonitoring: state.pet.isMonitoring,
  lastUpdate: state.pet.lastUpdateTime,
});

// 앱 사용량 관련 셀렉터
export const selectAppRestrictions = (state: AppState) => state.appUsage.restrictions;
export const selectCurrentUsage = (state: AppState) => state.appUsage.currentUsage;
export const selectIsTrackingEnabled = (state: AppState) => state.appUsage.isTrackingEnabled;

// 활성화된 제한만 필터링 (계산 최소화)
export const selectActiveRestrictions = (state: AppState) => 
  state.appUsage.restrictions.filter(r => r.isActive);

// 총 사용량 계산 (메모이제이션)
export const selectTotalUsageTime = (state: AppState) => 
  state.appUsage.currentUsage.reduce((total, usage) => total + usage.todayUsage, 0);

// 게임 관련 셀렉터
export const selectGameStats = (state: AppState) => state.game.stats;
export const selectTotalPoints = (state: AppState) => state.game.stats.totalPoints;
export const selectCurrentStreak = (state: AppState) => state.game.stats.currentStreak;
export const selectAquariumConfig = (state: AppState) => state.game.aquariumConfig;

// 추모 관련 셀렉터
export const selectDeadPets = (state: AppState) => state.memorial.deadPets;
export const selectUsedNames = (state: AppState) => state.memorial.usedNames;

// 최근 죽은 펫들만 (성능 최적화)
export const selectRecentDeadPets = (state: AppState, limit: number = 10) => 
  state.memorial.deadPets
    .sort((a, b) => b.diedAt.getTime() - a.diedAt.getTime())
    .slice(0, limit);

// 통계 정보 (계산된 값들을 캐시)
export const selectMemorialStats = (state: AppState) => {
  const deadPets = state.memorial.deadPets;
  const totalPets = deadPets.length;
  
  if (totalPets === 0) {
    return { totalPets: 0, totalLifetime: 0, averageLifetime: 0, longestLived: null };
  }
  
  const totalLifetime = deadPets.reduce((sum, pet) => sum + pet.totalLifetime, 0);
  const averageLifetime = totalLifetime / totalPets;
  const longestLived = deadPets.reduce((longest, pet) => 
    pet.totalLifetime > longest.totalLifetime ? pet : longest, deadPets[0]
  );
  
  return {
    totalPets,
    totalLifetime,
    averageLifetime,
    longestLived,
  };
};

// UI 관련 셀렉터
export const selectSettings = (state: AppState) => state.settings;
export const selectIsOnboarded = (state: AppState) => state.ui.isOnboarded;
export const selectCurrentScreen = (state: AppState) => state.ui.currentScreen;
export const selectIsLoading = (state: AppState) => state.ui.isLoading;
export const selectError = (state: AppState) => state.ui.error;

// 앱 상태 요약 (자주 사용되는 정보들을 한번에)
export const selectAppStatus = (state: AppState) => ({
  isOnboarded: state.ui.isOnboarded,
  currentScreen: state.ui.currentScreen,
  isLoading: state.ui.isLoading,
  error: state.ui.error,
  hasPet: state.pet.current !== null,
  isMonitoring: state.pet.isMonitoring,
});