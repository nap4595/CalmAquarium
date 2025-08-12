import AsyncStorage from '@react-native-async-storage/async-storage';
import { Result, Optional } from '@/shared/types';
import { STORAGE_KEYS } from '@/shared/constants';
import { createLogger, asyncSafeExecute, pipe } from '@/shared/utils';
import {
  DatabaseData,
  validateDatabaseData,
  createDefaultDatabase,
  isDatabaseData,
  MigrationScript,
  MigrationRecord,
} from './schema';

const logger = createLogger('AsyncStorageDB');

// =============================================================================
// AsyncStorage 기반 데이터베이스 클래스
// =============================================================================

export class AsyncStorageDB {
  private static instance: AsyncStorageDB;
  private isInitialized = false;
  private currentVersion = 1;
  
  private constructor() {}
  
  static getInstance(): AsyncStorageDB {
    if (!AsyncStorageDB.instance) {
      AsyncStorageDB.instance = new AsyncStorageDB();
    }
    return AsyncStorageDB.instance;
  }
  
  // =================================================================
  // 초기화 및 마이그레이션
  // =================================================================
  
  /**
   * 데이터베이스 초기화
   */
  async initialize(): Promise<Result<void, string>> {
    if (this.isInitialized) {
      return { success: true, data: undefined };
    }
    
    return asyncSafeExecute(async () => {
      logger.info('데이터베이스 초기화 시작');
      
      // 기존 데이터 확인
      const existingData = await this.getRawData();
      
      if (!existingData.success) {
        // 데이터가 없으면 기본값으로 초기화
        const defaultData = createDefaultDatabase();
        await this.saveRawData(defaultData);
        logger.info('기본 데이터베이스 생성 완료');
      } else {
        // 마이그레이션 필요성 확인
        await this.runMigrations(existingData.data);
      }
      
      this.isInitialized = true;
      logger.info('데이터베이스 초기화 완료');
      
    }, (error) => `데이터베이스 초기화 실패: ${error}`);
  }
  
  /**
   * 마이그레이션 실행
   */
  private async runMigrations(data: DatabaseData): Promise<void> {
    const currentDataVersion = data.migrationVersion || 0;
    
    if (currentDataVersion < this.currentVersion) {
      logger.info(`마이그레이션 필요: ${currentDataVersion} → ${this.currentVersion}`);
      
      const migrations = this.getMigrations();
      let migratedData = { ...data };
      
      for (const migration of migrations) {
        if (migration.version > currentDataVersion) {
          logger.info(`마이그레이션 ${migration.version} 실행: ${migration.description}`);
          migratedData = await migration.up(migratedData);
        }
      }
      
      migratedData.migrationVersion = this.currentVersion;
      migratedData.lastUpdated = new Date();
      
      await this.saveRawData(migratedData);
      logger.info('마이그레이션 완료');
    }
  }
  
  /**
   * 마이그레이션 스크립트 정의
   */
  private getMigrations(): MigrationScript[] {
    return [
      {
        version: 1,
        description: '초기 데이터베이스 구조',
        up: async (data: any) => {
          // v1에서는 별도 변경 없음
          return data;
        },
        down: async (data: any) => {
          return data;
        },
      },
      // 향후 마이그레이션 스크립트 추가
    ];
  }
  
  // =================================================================
  // 기본 CRUD 연산
  // =================================================================
  
  /**
   * 원시 데이터 읽기
   */
  private async getRawData(): Promise<Result<DatabaseData, string>> {
    return asyncSafeExecute(async () => {
      const rawData = await AsyncStorage.getItem(STORAGE_KEYS.APP_STATE);
      
      if (!rawData) {
        throw new Error('저장된 데이터가 없습니다');
      }
      
      const parsedData = JSON.parse(rawData);
      return validateDatabaseData(parsedData);
      
    }, (error) => `데이터 읽기 실패: ${error}`);
  }
  
  /**
   * 원시 데이터 저장
   */
  private async saveRawData(data: DatabaseData): Promise<Result<void, string>> {
    return asyncSafeExecute(async () => {
      const serializedData = JSON.stringify(data, null, 2);
      await AsyncStorage.setItem(STORAGE_KEYS.APP_STATE, serializedData);
      
      logger.info('데이터 저장 완료');
      
    }, (error) => `데이터 저장 실패: ${error}`);
  }
  
  /**
   * 전체 데이터 읽기
   */
  async loadData(): Promise<Result<DatabaseData, string>> {
    if (!this.isInitialized) {
      const initResult = await this.initialize();
      if (!initResult.success) {
        return { success: false, error: initResult.error };
      }
    }
    
    return this.getRawData();
  }
  
  /**
   * 전체 데이터 저장
   */
  async saveData(data: Partial<DatabaseData>): Promise<Result<void, string>> {
    return asyncSafeExecute(async () => {
      const currentData = await this.getRawData();
      
      if (!currentData.success) {
        throw new Error(currentData.error);
      }
      
      const updatedData: DatabaseData = {
        ...currentData.data,
        ...data,
        lastUpdated: new Date(),
      };
      
      const saveResult = await this.saveRawData(updatedData);
      if (!saveResult.success) {
        throw new Error(saveResult.error);
      }
      
      logger.info('부분 데이터 업데이트 완료');
      
    }, (error) => `데이터 업데이트 실패: ${error}`);
  }
  
  // =================================================================
  // 특화된 데이터 접근 메서드들
  // =================================================================
  
  /**
   * 현재 펫 데이터 읽기
   */
  async getCurrentPet(): Promise<Result<Optional<DatabaseData['currentPet']>, string>> {
    return pipe(
      () => this.loadData(),
      async (dataResult) => {
        if (!dataResult.success) {
          return { success: false, error: dataResult.error };
        }
        return { success: true, data: dataResult.data.currentPet };
      }
    )();
  }
  
  /**
   * 펫 데이터 저장
   */
  async savePet(pet: DatabaseData['currentPet']): Promise<Result<void, string>> {
    return this.saveData({ currentPet: pet });
  }
  
  /**
   * 죽은 펫 추가
   */
  async addDeadPet(deadPet: DatabaseData['deadPets'][0]): Promise<Result<void, string>> {
    return asyncSafeExecute(async () => {
      const currentData = await this.loadData();
      if (!currentData.success) {
        throw new Error(currentData.error);
      }
      
      const updatedDeadPets = [...currentData.data.deadPets, deadPet];
      const updatedUsedNames = [...currentData.data.usedNames];
      
      // 이름이 이미 등록되어 있지 않다면 추가
      if (!updatedUsedNames.includes(deadPet.name)) {
        updatedUsedNames.push(deadPet.name);
      }
      
      const saveResult = await this.saveData({
        deadPets: updatedDeadPets,
        usedNames: updatedUsedNames,
        currentPet: null, // 현재 펫 제거
      });
      
      if (!saveResult.success) {
        throw new Error(saveResult.error);
      }
      
      logger.info(`죽은 펫 추가: ${deadPet.name}`);
      
    }, (error) => `죽은 펫 추가 실패: ${error}`);
  }
  
  /**
   * 앱 제한 설정 저장
   */
  async saveAppRestrictions(restrictions: DatabaseData['appRestrictions']): Promise<Result<void, string>> {
    return this.saveData({ appRestrictions: restrictions });
  }
  
  /**
   * 게임 통계 업데이트
   */
  async updateGameStats(stats: Partial<DatabaseData['gameStats']>): Promise<Result<void, string>> {
    return asyncSafeExecute(async () => {
      const currentData = await this.loadData();
      if (!currentData.success) {
        throw new Error(currentData.error);
      }
      
      const updatedStats = {
        ...currentData.data.gameStats,
        ...stats,
      };
      
      const saveResult = await this.saveData({ gameStats: updatedStats });
      if (!saveResult.success) {
        throw new Error(saveResult.error);
      }
      
    }, (error) => `게임 통계 업데이트 실패: ${error}`);
  }
  
  /**
   * 설정 저장
   */
  async saveSettings(settings: Partial<DatabaseData['appSettings']>): Promise<Result<void, string>> {
    return asyncSafeExecute(async () => {
      const currentData = await this.loadData();
      if (!currentData.success) {
        throw new Error(currentData.error);
      }
      
      const updatedSettings = {
        ...currentData.data.appSettings,
        ...settings,
      };
      
      const saveResult = await this.saveData({ appSettings: updatedSettings });
      if (!saveResult.success) {
        throw new Error(saveResult.error);
      }
      
      logger.info('설정 저장 완료');
      
    }, (error) => `설정 저장 실패: ${error}`);
  }
  
  // =================================================================
  // 유틸리티 메서드들
  // =================================================================
  
  /**
   * 데이터베이스 초기화 (모든 데이터 삭제)
   */
  async reset(): Promise<Result<void, string>> {
    return asyncSafeExecute(async () => {
      const defaultData = createDefaultDatabase();
      const saveResult = await this.saveRawData(defaultData);
      
      if (!saveResult.success) {
        throw new Error(saveResult.error);
      }
      
      logger.info('데이터베이스 리셋 완료');
      
    }, (error) => `데이터베이스 리셋 실패: ${error}`);
  }
  
  /**
   * 데이터 내보내기
   */
  async exportData(): Promise<Result<string, string>> {
    return asyncSafeExecute(async () => {
      const dataResult = await this.loadData();
      if (!dataResult.success) {
        throw new Error(dataResult.error);
      }
      
      const exportData = {
        data: dataResult.data,
        metadata: {
          exportedAt: new Date(),
          appVersion: '1.0.0',
        },
      };
      
      return JSON.stringify(exportData, null, 2);
      
    }, (error) => `데이터 내보내기 실패: ${error}`);
  }
  
  /**
   * 데이터 가져오기
   */
  async importData(jsonData: string): Promise<Result<void, string>> {
    return asyncSafeExecute(async () => {
      const importedData = JSON.parse(jsonData);
      
      if (!isDatabaseData(importedData.data)) {
        throw new Error('유효하지 않은 데이터 형식입니다');
      }
      
      const saveResult = await this.saveRawData(importedData.data);
      if (!saveResult.success) {
        throw new Error(saveResult.error);
      }
      
      logger.info('데이터 가져오기 완료');
      
    }, (error) => `데이터 가져오기 실패: ${error}`);
  }
  
  /**
   * 저장 공간 사용량 확인
   */
  async getStorageInfo(): Promise<Result<{
    totalSize: number;
    keys: string[];
  }, string>> {
    return asyncSafeExecute(async () => {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      
      for (const key of keys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          totalSize += new Blob([data]).size;
        }
      }
      
      return {
        totalSize,
        keys: keys.filter(key => key.startsWith('calm_aquarium_')),
      };
      
    }, (error) => `저장 공간 정보 조회 실패: ${error}`);
  }
}

// =============================================================================
// 싱글톤 인스턴스 내보내기
// =============================================================================

export const database = AsyncStorageDB.getInstance();