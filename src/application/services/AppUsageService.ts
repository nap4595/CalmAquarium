import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { AppRestriction, AppUsageData } from '@/shared/types';
import { createLogger, Result, createResult } from '@/shared/utils';
import { USAGE_LIMITS } from '@/shared/constants';

const logger = createLogger('AppUsageService');

// =============================================================================
// 네이티브 모듈 인터페이스 정의
// =============================================================================

interface AppUsageModule {
  getUsageStats(timeRange: number): Promise<Array<{
    packageName: string;
    totalTimeInForeground: number;
    lastTimeUsed: number;
  }>>;
  hasUsageStatsPermission(): Promise<boolean>;
  requestUsageStatsPermission(): Promise<boolean>;
  getInstalledApps(): Promise<Array<{
    packageName: string;
    appName: string;
    icon: string; // base64 encoded
  }>>;
}

// 네이티브 모듈 접근 (Android만 지원)
const AppUsageNative = Platform.OS === 'android' ? NativeModules.AppUsageModule as AppUsageModule : null;

// =============================================================================
// 앱 사용량 추적 서비스
// =============================================================================

export class AppUsageService {
  private static instance: AppUsageService;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private onUsageUpdate: ((data: AppUsageData[]) => void) | null = null;
  private restrictedApps: AppRestriction[] = [];
  
  // 캐시 및 성능 최적화
  private permissionCache: { hasPermission: boolean; lastCheck: number } | null = null;
  private installedAppsCache: { 
    data: Array<{packageName: string; appName: string; icon: string}>; 
    timestamp: number; 
  } | null = null;
  private usageStatsCache: { 
    data: AppUsageData[]; 
    timestamp: number; 
    timeRange: number; 
  } | null = null;
  
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5분
  private readonly PERMISSION_CHECK_INTERVAL = 30 * 1000; // 30초
  
  private constructor() {}
  
  static getInstance(): AppUsageService {
    if (!AppUsageService.instance) {
      AppUsageService.instance = new AppUsageService();
    }
    return AppUsageService.instance;
  }
  
  // =================================================================
  // 권한 관리
  // =================================================================
  
  /**
   * PACKAGE_USAGE_STATS 권한 확인 (캐시 적용)
   */
  async hasPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || !AppUsageNative) {
      logger.warn('Android 플랫폼만 지원됩니다');
      return false;
    }
    
    const now = Date.now();
    
    // 캐시된 결과가 있고 유효한 경우 반환
    if (this.permissionCache && 
        now - this.permissionCache.lastCheck < this.PERMISSION_CHECK_INTERVAL) {
      return this.permissionCache.hasPermission;
    }
    
    try {
      const hasPermission = await AppUsageNative.hasUsageStatsPermission();
      
      // 결과 캐시
      this.permissionCache = {
        hasPermission,
        lastCheck: now,
      };
      
      logger.info(`사용량 통계 권한 상태: ${hasPermission}`);
      return hasPermission;
    } catch (error) {
      logger.error('권한 확인 실패:', error);
      // 오류 시 캐시 무효화
      this.permissionCache = null;
      return false;
    }
  }
  
  /**
   * PACKAGE_USAGE_STATS 권한 요청
   */
  async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'android' || !AppUsageNative) {
      logger.warn('Android 플랫폼만 지원됩니다');
      return false;
    }
    
    try {
      logger.info('사용량 통계 권한 요청');
      const granted = await AppUsageNative.requestUsageStatsPermission();
      
      if (granted) {
        logger.info('사용량 통계 권한 허용됨');
      } else {
        logger.warn('사용량 통계 권한 거부됨');
      }
      
      return granted;
    } catch (error) {
      logger.error('권한 요청 실패:', error);
      return false;
    }
  }
  
  // =================================================================
  // 앱 정보 조회
  // =================================================================
  
  /**
   * 설치된 앱 목록 조회 (캐시 적용)
   */
  async getInstalledApps(): Promise<Result<Array<{
    packageName: string;
    appName: string;
    icon: string;
  }>>> {
    if (Platform.OS !== 'android' || !AppUsageNative) {
      return createResult(false, [], '지원되지 않는 플랫폼');
    }
    
    const now = Date.now();
    
    // 캐시된 데이터가 유효한 경우 반환
    if (this.installedAppsCache && 
        now - this.installedAppsCache.timestamp < this.CACHE_TTL) {
      logger.info('캐시된 설치 앱 목록 사용');
      return createResult(true, this.installedAppsCache.data);
    }
    
    try {
      const apps = await AppUsageNative.getInstalledApps();
      
      // 시스템 앱 필터링 (사용자 앱만 반환)
      const userApps = apps.filter(app => 
        !app.packageName.startsWith('com.android.') &&
        !app.packageName.startsWith('com.google.android.') &&
        !app.packageName.startsWith('com.samsung.') &&
        app.packageName !== 'com.calmaquarium' // 자기 자신 제외
      );
      
      // 결과 캐시
      this.installedAppsCache = {
        data: userApps,
        timestamp: now,
      };
      
      logger.info(`설치된 사용자 앱 ${userApps.length}개 조회 완료`);
      return createResult(true, userApps);
    } catch (error) {
      logger.error('설치된 앱 목록 조회 실패:', error);
      return createResult(false, [], error instanceof Error ? error.message : '알 수 없는 오류');
    }
  }
  
  // =================================================================
  // 사용량 통계 조회
  // =================================================================
  
  /**
   * 앱 사용량 통계 조회 (캐시 및 중복 요청 방지)
   * @param timeRangeMs 조회할 시간 범위 (밀리초)
   */
  async getUsageStats(timeRangeMs: number = 24 * 60 * 60 * 1000): Promise<Result<AppUsageData[]>> {
    if (Platform.OS !== 'android' || !AppUsageNative) {
      return createResult(false, [], '지원되지 않는 플랫폼');
    }
    
    const now = Date.now();
    
    // 캐시된 데이터가 유효하고 동일한 시간 범위인 경우 반환
    if (this.usageStatsCache && 
        this.usageStatsCache.timeRange === timeRangeMs &&
        now - this.usageStatsCache.timestamp < 30000) { // 30초마다 갱신
      return createResult(true, this.usageStatsCache.data);
    }
    
    const hasPermission = await this.hasPermission();
    if (!hasPermission) {
      return createResult(false, [], '사용량 통계 권한이 필요합니다');
    }
    
    try {
      const rawStats = await AppUsageNative.getUsageStats(timeRangeMs);
      
      const usageData: AppUsageData[] = rawStats
        .filter(stat => stat.totalTimeInForeground > 0) // 사용 시간이 0보다 큰 앱만
        .map(stat => ({
          packageName: stat.packageName,
          totalTime: stat.totalTimeInForeground,
          lastUsed: new Date(stat.lastTimeUsed),
          todayUsage: stat.totalTimeInForeground, // 일일 사용량 (현재는 total과 동일)
        }))
        .sort((a, b) => b.totalTime - a.totalTime); // 사용 시간 순 정렬
      
      // 결과 캐시
      this.usageStatsCache = {
        data: usageData,
        timestamp: now,
        timeRange: timeRangeMs,
      };
      
      logger.info(`앱 사용량 통계 ${usageData.length}개 조회 완료`);
      return createResult(true, usageData);
    } catch (error) {
      logger.error('사용량 통계 조회 실패:', error);
      // 오류 시 캐시 무효화
      this.usageStatsCache = null;
      return createResult(false, [], error instanceof Error ? error.message : '알 수 없는 오류');
    }
  }
  
  /**
   * 특정 앱들의 사용량만 조회 (성능 최적화)
   */
  async getRestrictedAppUsage(): Promise<Result<AppUsageData[]>> {
    if (this.restrictedApps.length === 0) {
      return createResult(true, []);
    }
    
    const allUsageResult = await this.getUsageStats();
    if (!allUsageResult.success) {
      return allUsageResult;
    }
    
    // Set을 사용하여 훨씬 빠른 조회
    const restrictedPackagesSet = new Set(this.restrictedApps.map(app => app.packageName));
    const restrictedUsage = allUsageResult.data.filter(usage => 
      restrictedPackagesSet.has(usage.packageName)
    );
    
    return createResult(true, restrictedUsage);
  }
  
  // =================================================================
  // 모니터링 관리
  // =================================================================
  
  /**
   * 앱 사용량 모니터링 시작
   */
  startMonitoring(
    restrictions: AppRestriction[], 
    onUpdate: (data: AppUsageData[]) => void
  ): void {
    if (this.isMonitoring) {
      this.stopMonitoring();
    }
    
    this.restrictedApps = [...restrictions];
    this.onUsageUpdate = onUpdate;
    this.isMonitoring = true;
    
    logger.info(`${restrictions.length}개 앱 사용량 모니터링 시작`);
    
    // 즉시 한 번 업데이트
    this.updateUsageStats();
    
    // 주기적 업데이트 시작
    this.monitoringInterval = setInterval(() => {
      this.updateUsageStats();
    }, USAGE_LIMITS.MONITORING_INTERVAL);
  }
  
  /**
   * 앱 사용량 모니터링 중단
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    this.isMonitoring = false;
    this.onUsageUpdate = null;
    this.restrictedApps = [];
    
    logger.info('앱 사용량 모니터링 중단');
  }
  
  /**
   * 사용량 통계 업데이트 및 콜백 호출
   */
  private async updateUsageStats(): Promise<void> {
    if (!this.onUsageUpdate) {
      return;
    }
    
    try {
      const result = await this.getRestrictedAppUsage();
      if (result.success) {
        this.onUsageUpdate(result.data);
      } else {
        logger.error('사용량 업데이트 실패:', result.error);
      }
    } catch (error) {
      logger.error('사용량 업데이트 중 오류:', error);
    }
  }
  
  // =================================================================
  // 제한 시간 검사
  // =================================================================
  
  /**
   * 제한 시간 초과 앱 검사
   */
  checkTimeLimit(usageData: AppUsageData[]): {
    exceeded: AppUsageData[];
    approaching: AppUsageData[];
  } {
    const exceeded: AppUsageData[] = [];
    const approaching: AppUsageData[] = [];
    
    for (const usage of usageData) {
      const restriction = this.restrictedApps.find(app => 
        app.packageName === usage.packageName
      );
      
      if (!restriction) continue;
      
      const dailyLimit = restriction.dailyLimit;
      const usageRatio = usage.todayUsage / dailyLimit;
      
      if (usageRatio >= 1.0) {
        exceeded.push(usage);
      } else if (usageRatio >= 0.8) { // 80% 이상 사용시 경고
        approaching.push(usage);
      }
    }
    
    return { exceeded, approaching };
  }
  
  /**
   * 총 제한 시간 대비 사용률 계산
   */
  calculateUsageRatio(usageData: AppUsageData[]): number {
    if (this.restrictedApps.length === 0) {
      return 0;
    }
    
    const totalUsed = usageData.reduce((sum, usage) => sum + usage.todayUsage, 0);
    const totalLimit = this.restrictedApps.reduce((sum, app) => sum + app.dailyLimit, 0);
    
    return totalLimit > 0 ? totalUsed / totalLimit : 0;
  }
  
  // =================================================================
  // 상태 조회
  // =================================================================
  
  /**
   * 모니터링 상태 확인
   */
  isCurrentlyMonitoring(): boolean {
    return this.isMonitoring;
  }
  
  /**
   * 제한 설정된 앱 목록 조회
   */
  getRestrictedApps(): readonly AppRestriction[] {
    return this.restrictedApps;
  }
}

// =============================================================================
// 싱글톤 인스턴스 및 편의 함수들
// =============================================================================

export const appUsageService = AppUsageService.getInstance();

/**
 * 앱 사용량 권한 확인 및 요청
 */
export const ensureUsagePermission = async (): Promise<boolean> => {
  const hasPermission = await appUsageService.hasPermission();
  if (hasPermission) {
    return true;
  }
  
  return await appUsageService.requestPermission();
};

/**
 * 설치된 앱 목록 조회 (권한 확인 포함)
 */
export const getSelectableApps = async () => {
  const hasPermission = await ensureUsagePermission();
  if (!hasPermission) {
    return createResult(false, [], '사용량 통계 권한이 필요합니다');
  }
  
  return await appUsageService.getInstalledApps();
};