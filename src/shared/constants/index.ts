// =============================================================================
// 앱 상수 정의
// =============================================================================

export const APP_CONFIG = {
  NAME: '고요의 어항',
  ENGLISH_NAME: 'Calm Aquarium',
  VERSION: '1.0.0',
  BUILD_NUMBER: 1,
} as const;

// =============================================================================
// 펫 관련 상수
// =============================================================================

export const PET_CONSTANTS = {
  MAX_HEALTH: 100,
  MIN_HEALTH: 0,
  CRITICAL_HEALTH_THRESHOLD: 20,
  AT_RISK_HEALTH_THRESHOLD: 50,
  
  HEALTH_DECAY_RATE: 1, // 분당 체력 감소량
  HEALTH_RESTORE_RATE: 0.5, // 분당 체력 회복량
  
  MAX_NAME_LENGTH: 12,
  MIN_NAME_LENGTH: 1,
  
  DEFAULT_LIFETIME_HOURS: 24, // 기본 생존 시간
} as const;

// =============================================================================
// 앱 사용 제한 관련 상수
// =============================================================================

export const USAGE_LIMITS = {
  MIN_DAILY_LIMIT: 15 * 60 * 1000, // 15분 (밀리초)
  MAX_DAILY_LIMIT: 90 * 60 * 1000, // 90분 (밀리초)
  DEFAULT_DAILY_LIMIT: 30 * 60 * 1000, // 30분 (밀리초)
  
  MIN_WEEKLY_LIMIT: 1 * 60 * 60 * 1000, // 1시간 (밀리초)
  MAX_WEEKLY_LIMIT: 10 * 60 * 60 * 1000, // 10시간 (밀리초)
  DEFAULT_WEEKLY_LIMIT: 3 * 60 * 60 * 1000, // 3시간 (밀리초)
  
  MONITORING_INTERVAL: 30 * 1000, // 30초마다 체크
  GRACE_PERIOD: 5 * 60 * 1000, // 5분 유예 시간
} as const;

// =============================================================================
// 알림 관련 상수
// =============================================================================

export const NOTIFICATION_TYPES = {
  PET_AT_RISK: 'pet_at_risk',
  PET_CRITICAL: 'pet_critical',
  PET_DIED: 'pet_died',
  APP_OVERUSE: 'app_overuse',
  DAILY_REMINDER: 'daily_reminder',
} as const;

export const NOTIFICATION_MESSAGES = {
  PET_AT_RISK: (petName: string) => `${petName}이(가) 조금씩 힘들어해요. 슬픈 표정을 짓고 있어요.`,
  PET_CRITICAL: (petName: string) => `${petName}의 색이 옅어지고 있어요! 어서 돌아와 주세요!`,
  PET_DIED: (petName: string) => `${petName}이(가) 당신을 기다리다 지쳐 별이 되었습니다...`,
  APP_OVERUSE: (petName: string) => `${petName}이(가) 어항 밖으로 나왔어요!`,
} as const;

// =============================================================================
// 게임 시스템 상수
// =============================================================================

export const POINT_SYSTEM = {
  DAILY_SURVIVAL: 10,
  WEEKLY_SURVIVAL: 50,
  MONTHLY_SURVIVAL: 200,
  
  STREAK_MULTIPLIER: 1.5, // 연속 생존 시 추가 보너스
  MAX_STREAK_BONUS: 100,
  
  DECORATION_BASE_PRICE: 50,
  PRICE_INCREMENT_FACTOR: 1.2,
} as const;

// =============================================================================
// UI 관련 상수
// =============================================================================

export const COLORS = {
  // 어항 색상
  WATER_CLEAN: '#87CEEB', // Sky Blue
  WATER_POLLUTED: '#8FBC8F', // Dark Sea Green
  AQUARIUM_GLASS: '#F0F8FF', // Alice Blue
  
  // 펫 색상
  PET_HEALTHY: '#FF6B6B',
  PET_AT_RISK: '#FFD93D',
  PET_CRITICAL: '#FF4757',
  
  // 시스템 색상
  PRIMARY: '#4A90E2',
  SECONDARY: '#7ED321',
  ACCENT: '#F5A623',
  
  SUCCESS: '#27AE60',
  WARNING: '#F39C12',
  ERROR: '#E74C3C',
  
  BACKGROUND: '#FFFFFF',
  SURFACE: '#F8F9FA',
  TEXT_PRIMARY: '#2C3E50',
  TEXT_SECONDARY: '#7F8C8D',
} as const;

export const FONTS = {
  REGULAR: 'SUIT-Regular',
  MEDIUM: 'SUIT-Medium',
  BOLD: 'SUIT-Bold',
  
  SIZE: {
    SMALL: 12,
    MEDIUM: 16,
    LARGE: 20,
    XLARGE: 24,
    TITLE: 28,
  },
} as const;

export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
} as const;

// =============================================================================
// 애니메이션 상수
// =============================================================================

export const ANIMATIONS = {
  DURATION: {
    SHORT: 200,
    MEDIUM: 300,
    LONG: 500,
  },
  
  EASING: {
    EASE_IN_OUT: 'ease-in-out',
    EASE_OUT: 'ease-out',
    SPRING: 'spring',
  },
  
  PET_MOVEMENT: {
    IDLE_SPEED: 0.5,
    ACTIVE_SPEED: 1.0,
    SWIM_PATTERN_DURATION: 10000, // 10초
  },
} as const;

// =============================================================================
// 스토리지 키
// =============================================================================

export const STORAGE_KEYS = {
  APP_STATE: 'calm_aquarium_app_state',
  CURRENT_PET: 'calm_aquarium_current_pet',
  DEAD_PETS: 'calm_aquarium_dead_pets',
  USED_NAMES: 'calm_aquarium_used_names',
  APP_SETTINGS: 'calm_aquarium_app_settings',
  GAME_STATS: 'calm_aquarium_game_stats',
  APP_RESTRICTIONS: 'calm_aquarium_app_restrictions',
  DECORATIONS: 'calm_aquarium_decorations',
  ONBOARDING_COMPLETED: 'calm_aquarium_onboarding_completed',
  LAST_APP_USAGE: 'calm_aquarium_last_app_usage',
} as const;

// =============================================================================
// 기본값
// =============================================================================

export const DEFAULT_VALUES = {
  PET_HEALTH: 100,
  AQUARIUM_WATER_QUALITY: 100,
  AQUARIUM_TEMPERATURE: 24, // Celsius
  
  SETTINGS: {
    theme: 'light' as const,
    notificationsEnabled: true,
    notificationType: 'all' as const,
    soundEnabled: true,
    hapticFeedbackEnabled: true,
    reminderInterval: 60, // 1시간
    language: 'ko',
  },
  
  GAME_STATS: {
    totalPoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    totalPetsRaised: 0,
    totalPetDeaths: 0,
  },
} as const;

// =============================================================================
// 개발/테스트용 상수
// =============================================================================

export const DEV_CONFIG = {
  ENABLE_DEBUG_LOGS: __DEV__,
  MOCK_APP_USAGE: __DEV__,
  FAST_PET_DECAY: __DEV__ && false, // 개발 중 빠른 테스트용
  SKIP_PERMISSIONS: __DEV__ && false,
} as const;