import { z } from 'zod';
import { 
  PetPersonality, 
  PetStatus, 
  DeathReason,
  Theme,
  NotificationType,
  DecorationCategory 
} from '@/shared/types';

// =============================================================================
// Zod 스키마 정의 (런타임 검증용)
// =============================================================================

/**
 * 펫 데이터 스키마
 */
export const PetSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(12),
  personality: z.enum(['active', 'calm', 'playful', 'shy', 'curious'] as const),
  createdAt: z.string().transform(date => new Date(date)),
  health: z.number().min(0).max(100),
  status: z.enum(['alive', 'at_risk', 'critical', 'dead'] as const),
  lastFeedTime: z.string().transform(date => new Date(date)),
  totalLifetime: z.number().min(0),
});

/**
 * 죽은 펫 데이터 스키마
 */
export const DeadPetSchema = z.object({
  id: z.string(),
  name: z.string(),
  personality: z.enum(['active', 'calm', 'playful', 'shy', 'curious'] as const),
  createdAt: z.string().transform(date => new Date(date)),
  diedAt: z.string().transform(date => new Date(date)),
  causeOfDeath: z.string(),
  totalLifetime: z.number().min(0),
  deathReason: z.enum(['time_limit_exceeded', 'neglect', 'app_overuse'] as const),
});

/**
 * 앱 제한 설정 스키마
 */
export const AppRestrictionSchema = z.object({
  appId: z.string(),
  appName: z.string(),
  packageName: z.string(),
  dailyLimit: z.number().min(0),
  weeklyLimit: z.number().min(0),
  isActive: z.boolean(),
});

/**
 * 앱 사용 데이터 스키마
 */
export const AppUsageDataSchema = z.object({
  appId: z.string(),
  appName: z.string(),
  packageName: z.string(),
  dailyUsage: z.number().min(0),
  weeklyUsage: z.number().min(0),
  lastUsed: z.string().transform(date => new Date(date)),
});

/**
 * 장식 아이템 스키마
 */
export const DecorationSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['plants', 'rocks', 'ornaments', 'backgrounds'] as const),
  price: z.number().min(0),
  description: z.string(),
  imageUrl: z.string(),
  unlockedAt: z.string().transform(date => new Date(date)).optional(),
  isOwned: z.boolean(),
});

/**
 * 게임 통계 스키마
 */
export const GameStatsSchema = z.object({
  totalPoints: z.number().min(0),
  currentStreak: z.number().min(0),
  longestStreak: z.number().min(0),
  totalPetsRaised: z.number().min(0),
  totalPetDeaths: z.number().min(0),
});

/**
 * 앱 설정 스키마
 */
export const AppSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto'] as const),
  notificationsEnabled: z.boolean(),
  notificationType: z.enum(['all', 'critical_only', 'none'] as const),
  soundEnabled: z.boolean(),
  hapticFeedbackEnabled: z.boolean(),
  reminderInterval: z.number().min(1),
  language: z.string(),
});

/**
 * 어항 설정 스키마
 */
export const AquariumConfigSchema = z.object({
  waterQuality: z.number().min(0).max(100),
  temperature: z.number(),
  decorationPositions: z.array(z.object({
    decorationId: z.string(),
    x: z.number(),
    y: z.number(),
    rotation: z.number().optional(),
  })),
});

// =============================================================================
// 데이터베이스 스키마 타입 (Zod에서 추론)
// =============================================================================

export type PetData = z.infer<typeof PetSchema>;
export type DeadPetData = z.infer<typeof DeadPetSchema>;
export type AppRestrictionData = z.infer<typeof AppRestrictionSchema>;
export type AppUsageData = z.infer<typeof AppUsageDataSchema>;
export type DecorationData = z.infer<typeof DecorationSchema>;
export type GameStatsData = z.infer<typeof GameStatsSchema>;
export type AppSettingsData = z.infer<typeof AppSettingsSchema>;
export type AquariumConfigData = z.infer<typeof AquariumConfigSchema>;

// =============================================================================
// 복합 데이터베이스 스키마
// =============================================================================

/**
 * 전체 앱 상태를 위한 데이터베이스 스키마
 */
export const DatabaseSchema = z.object({
  // 펫 관련 데이터
  currentPet: PetSchema.nullable(),
  deadPets: z.array(DeadPetSchema),
  usedNames: z.array(z.string()),
  
  // 앱 사용량 관련 데이터
  appRestrictions: z.array(AppRestrictionSchema),
  currentUsage: z.array(AppUsageDataSchema),
  
  // 게임 시스템 데이터
  gameStats: GameStatsSchema,
  decorations: z.array(DecorationSchema),
  aquariumConfig: AquariumConfigSchema,
  
  // 설정 데이터
  appSettings: AppSettingsSchema,
  
  // 메타데이터
  version: z.string(),
  lastUpdated: z.string().transform(date => new Date(date)),
  migrationVersion: z.number(),
});

export type DatabaseData = z.infer<typeof DatabaseSchema>;

// =============================================================================
// 마이그레이션 스키마
// =============================================================================

/**
 * 데이터베이스 마이그레이션을 위한 스키마
 */
export interface MigrationScript {
  version: number;
  description: string;
  up: (data: any) => Promise<any>;
  down: (data: any) => Promise<any>;
}

/**
 * 마이그레이션 기록 스키마
 */
export const MigrationRecordSchema = z.object({
  version: z.number(),
  appliedAt: z.string().transform(date => new Date(date)),
  description: z.string(),
});

export type MigrationRecord = z.infer<typeof MigrationRecordSchema>;

// =============================================================================
// 백업/복원 스키마
// =============================================================================

/**
 * 데이터 백업을 위한 스키마
 */
export const BackupSchema = z.object({
  data: DatabaseSchema,
  metadata: z.object({
    exportedAt: z.string().transform(date => new Date(date)),
    appVersion: z.string(),
    deviceInfo: z.object({
      platform: z.string(),
      version: z.string(),
    }).optional(),
  }),
  checksum: z.string(),
});

export type BackupData = z.infer<typeof BackupSchema>;

// =============================================================================
// 스키마 검증 함수들
// =============================================================================

/**
 * 펫 데이터 검증
 */
export const validatePetData = (data: unknown): PetData => {
  return PetSchema.parse(data);
};

/**
 * 앱 설정 데이터 검증
 */
export const validateAppSettings = (data: unknown): AppSettingsData => {
  return AppSettingsSchema.parse(data);
};

/**
 * 전체 데이터베이스 데이터 검증
 */
export const validateDatabaseData = (data: unknown): DatabaseData => {
  return DatabaseSchema.parse(data);
};

/**
 * 백업 데이터 검증
 */
export const validateBackupData = (data: unknown): BackupData => {
  return BackupSchema.parse(data);
};

// =============================================================================
// 기본값 생성 함수들
// =============================================================================

/**
 * 기본 게임 통계 생성
 */
export const createDefaultGameStats = (): GameStatsData => ({
  totalPoints: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalPetsRaised: 0,
  totalPetDeaths: 0,
});

/**
 * 기본 앱 설정 생성
 */
export const createDefaultAppSettings = (): AppSettingsData => ({
  theme: 'light',
  notificationsEnabled: true,
  notificationType: 'all',
  soundEnabled: true,
  hapticFeedbackEnabled: true,
  reminderInterval: 60,
  language: 'ko',
});

/**
 * 기본 어항 설정 생성
 */
export const createDefaultAquariumConfig = (): AquariumConfigData => ({
  waterQuality: 100,
  temperature: 24,
  decorationPositions: [],
});

/**
 * 기본 데이터베이스 데이터 생성
 */
export const createDefaultDatabase = (): DatabaseData => ({
  currentPet: null,
  deadPets: [],
  usedNames: [],
  appRestrictions: [],
  currentUsage: [],
  gameStats: createDefaultGameStats(),
  decorations: [],
  aquariumConfig: createDefaultAquariumConfig(),
  appSettings: createDefaultAppSettings(),
  version: '1.0.0',
  lastUpdated: new Date(),
  migrationVersion: 1,
});

// =============================================================================
// 타입 가드 함수들
// =============================================================================

/**
 * 펫 데이터인지 확인
 */
export const isPetData = (data: unknown): data is PetData => {
  try {
    PetSchema.parse(data);
    return true;
  } catch {
    return false;
  }
};

/**
 * 데이터베이스 데이터인지 확인
 */
export const isDatabaseData = (data: unknown): data is DatabaseData => {
  try {
    DatabaseSchema.parse(data);
    return true;
  } catch {
    return false;
  }
};