// =============================================================================
// 공통 타입 정의
// =============================================================================

export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export type Optional<T> = T | undefined;
export type Nullable<T> = T | null;

// =============================================================================
// 펫 관련 타입
// =============================================================================

export type PetStatus = 'alive' | 'at_risk' | 'critical' | 'dead';
export type PetPersonality = 'active' | 'calm' | 'playful' | 'shy' | 'curious';

export interface Pet {
  readonly id: string;
  readonly name: string;
  readonly personality: PetPersonality;
  readonly createdAt: Date;
  readonly health: number; // 0-100
  readonly status: PetStatus;
  readonly lastFeedTime: Date;
  readonly totalLifetime: number; // milliseconds
}

export interface DeadPet {
  readonly id: string;
  readonly name: string;
  readonly personality: PetPersonality;
  readonly createdAt: Date;
  readonly diedAt: Date;
  readonly causeOfDeath: string; // 죽음 원인이 된 앱 이름
  readonly totalLifetime: number; // milliseconds
  readonly deathReason: 'time_limit_exceeded' | 'neglect' | 'app_overuse';
}

// =============================================================================
// 앱 사용 관련 타입
// =============================================================================

export interface AppUsageData {
  readonly appId: string;
  readonly appName: string;
  readonly packageName: string;
  readonly dailyUsage: number; // milliseconds
  readonly weeklyUsage: number; // milliseconds
  readonly lastUsed: Date;
}

export interface AppRestriction {
  readonly appId: string;
  readonly appName: string;
  readonly packageName: string;
  readonly dailyLimit: number; // milliseconds
  readonly weeklyLimit: number; // milliseconds
  readonly isActive: boolean;
}

// =============================================================================
// 게임 시스템 타입
// =============================================================================

export type DecorationCategory = 'plants' | 'rocks' | 'ornaments' | 'backgrounds';

export interface Decoration {
  readonly id: string;
  readonly name: string;
  readonly category: DecorationCategory;
  readonly price: number;
  readonly description: string;
  readonly imageUrl: string;
  readonly unlockedAt: Optional<Date>;
  readonly isOwned: boolean;
}

export interface GameStats {
  readonly totalPoints: number;
  readonly currentStreak: number; // 연속 생존 일수
  readonly longestStreak: number;
  readonly totalPetsRaised: number;
  readonly totalPetDeaths: number;
}

// =============================================================================
// 설정 타입
// =============================================================================

export type Theme = 'light' | 'dark' | 'auto';
export type NotificationType = 'all' | 'critical_only' | 'none';

export interface AppSettings {
  readonly theme: Theme;
  readonly notificationsEnabled: boolean;
  readonly notificationType: NotificationType;
  readonly soundEnabled: boolean;
  readonly hapticFeedbackEnabled: boolean;
  readonly reminderInterval: number; // minutes
  readonly language: string;
}

// =============================================================================
// 상태 관리 타입
// =============================================================================

export interface AppState {
  readonly pet: {
    readonly current: Optional<Pet>;
    readonly isMonitoring: boolean;
    readonly lastUpdateTime: number;
  };
  
  readonly appUsage: {
    readonly restrictions: readonly AppRestriction[];
    readonly currentUsage: readonly AppUsageData[];
    readonly totalWeeklyLimit: number; // milliseconds
    readonly isTrackingEnabled: boolean;
  };
  
  readonly game: {
    readonly stats: GameStats;
    readonly decorations: readonly Decoration[];
    readonly aquariumConfig: AquariumConfig;
  };
  
  readonly memorial: {
    readonly deadPets: readonly DeadPet[];
    readonly usedNames: readonly string[];
  };
  
  readonly settings: AppSettings;
  
  readonly ui: {
    readonly isOnboarded: boolean;
    readonly currentScreen: string;
    readonly isLoading: boolean;
    readonly error: Optional<string>;
  };
}

// =============================================================================
// UI 관련 타입
// =============================================================================

export interface AquariumConfig {
  readonly waterQuality: number; // 0-100 (탁함 정도)
  readonly temperature: number;
  readonly decorationPositions: readonly DecorationPosition[];
}

export interface DecorationPosition {
  readonly decorationId: string;
  readonly x: number;
  readonly y: number;
  readonly rotation?: number;
}

// =============================================================================
// API 타입
// =============================================================================

export interface PlatformCapabilities {
  readonly canAccessAppUsage: boolean;
  readonly canSendNotifications: boolean;
  readonly canRequestPermissions: boolean;
  readonly supportedFeatures: readonly string[];
}

// =============================================================================
// 에러 타입
// =============================================================================

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export type ErrorCode = 
  | 'PERMISSION_DENIED'
  | 'STORAGE_ERROR'
  | 'INVALID_INPUT'
  | 'PET_ALREADY_EXISTS'
  | 'NAME_ALREADY_USED'
  | 'PLATFORM_NOT_SUPPORTED'
  | 'UNKNOWN_ERROR';