import { pipe, curry, compose } from 'ramda';
import { Result, Optional } from '@/shared/types';

// 성능 최적화 함수들 가져오기
export * from './performance';

// =============================================================================
// 함수형 프로그래밍 유틸리티
// =============================================================================

export const safeExecute = <T, E = Error>(
  fn: () => T,
  errorHandler?: (error: unknown) => E
): Result<T, E> => {
  try {
    const result = fn();
    return { success: true, data: result };
  } catch (error) {
    const processedError = errorHandler ? errorHandler(error) : error as E;
    return { success: false, error: processedError };
  }
};

export const asyncSafeExecute = async <T, E = Error>(
  fn: () => Promise<T>,
  errorHandler?: (error: unknown) => E
): Promise<Result<T, E>> => {
  try {
    const result = await fn();
    return { success: true, data: result };
  } catch (error) {
    const processedError = errorHandler ? errorHandler(error) : error as E;
    return { success: false, error: processedError };
  }
};

// Result 타입을 위한 함수형 연산자들
export const mapResult = <T, U, E>(
  fn: (value: T) => U
) => (
  result: Result<T, E>
): Result<U, E> => {
  return result.success 
    ? { success: true, data: fn(result.data) }
    : result;
};

export const flatMapResult = <T, U, E>(
  fn: (value: T) => Result<U, E>
) => (
  result: Result<T, E>
): Result<U, E> => {
  return result.success ? fn(result.data) : result;
};

export const foldResult = <T, U, E>(
  onSuccess: (data: T) => U,
  onError: (error: E) => U
) => (
  result: Result<T, E>
): U => {
  return result.success ? onSuccess(result.data) : onError(result.error);
};

// =============================================================================
// 시간 관련 유틸리티
// =============================================================================

export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}일 ${hours % 24}시간`;
  if (hours > 0) return `${hours}시간 ${minutes % 60}분`;
  if (minutes > 0) return `${minutes}분 ${seconds % 60}초`;
  return `${seconds}초`;
};

export const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (minutes > 0) return `${minutes}분 전`;
  return '방금 전';
};

export const isWithinTimeRange = curry((
  startTime: number,
  endTime: number,
  currentTime: number
): boolean => {
  return currentTime >= startTime && currentTime <= endTime;
});

export const addTimeToDate = curry((
  milliseconds: number,
  date: Date
): Date => {
  return new Date(date.getTime() + milliseconds);
});

// =============================================================================
// 검증 및 유효성 검사
// =============================================================================

export const isValidPetName = (name: string): boolean => {
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 12 && /^[가-힣a-zA-Z0-9\s]*$/.test(trimmed);
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidAppPackageName = (packageName: string): boolean => {
  const packageRegex = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$/i;
  return packageRegex.test(packageName);
};

// =============================================================================
// 수학 및 계산 유틸리티
// =============================================================================

export const clamp = curry((min: number, max: number, value: number): number => {
  return Math.min(Math.max(value, min), max);
});

export const lerp = curry((start: number, end: number, progress: number): number => {
  return start + (end - start) * clamp(0, 1, progress);
});

export const normalize = curry((min: number, max: number, value: number): number => {
  return (value - min) / (max - min);
});

export const roundToDecimal = curry((decimals: number, value: number): number => {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
});

export const percentage = curry((total: number, value: number): number => {
  return total === 0 ? 0 : (value / total) * 100;
});

// =============================================================================
// 배열 및 객체 유틸리티
// =============================================================================

export const groupBy = <T, K extends string | number>(
  keySelector: (item: T) => K
) => (
  array: readonly T[]
): Record<K, T[]> => {
  return array.reduce((groups, item) => {
    const key = keySelector(item);
    return {
      ...groups,
      [key]: [...(groups[key] || []), item],
    };
  }, {} as Record<K, T[]>);
};

export const uniqueBy = <T>(
  keySelector: (item: T) => string | number
) => (
  array: readonly T[]
): T[] => {
  const seen = new Set();
  return array.filter(item => {
    const key = keySelector(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const sortBy = <T>(
  keySelector: (item: T) => number | string
) => (
  array: readonly T[]
): T[] => {
  return [...array].sort((a, b) => {
    const aKey = keySelector(a);
    const bKey = keySelector(b);
    return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
  });
};

export const updateAt = <T>(
  index: number,
  updater: (item: T) => T
) => (
  array: readonly T[]
): T[] => {
  return array.map((item, i) => i === index ? updater(item) : item);
};

export const removeAt = curry((index: number, array: readonly unknown[]): unknown[] => {
  return array.filter((_, i) => i !== index);
});

// =============================================================================
// Optional/Nullable 유틸리티
// =============================================================================

export const isSome = <T>(value: Optional<T>): value is T => {
  return value !== undefined;
};

export const isNone = <T>(value: Optional<T>): value is undefined => {
  return value === undefined;
};

export const mapOptional = <T, U>(
  fn: (value: T) => U
) => (
  optional: Optional<T>
): Optional<U> => {
  return isSome(optional) ? fn(optional) : undefined;
};

export const getOrElse = <T>(
  defaultValue: T
) => (
  optional: Optional<T>
): T => {
  return isSome(optional) ? optional : defaultValue;
};

// =============================================================================
// 랜덤 및 ID 생성
// =============================================================================

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const randomElement = <T>(array: readonly T[]): Optional<T> => {
  return array.length > 0 ? array[Math.floor(Math.random() * array.length)] : undefined;
};

export const randomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const randomBoolean = (probability = 0.5): boolean => {
  return Math.random() < probability;
};

export const randomBetween = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

export const randomIntBetween = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// =============================================================================
// 디바운싱 및 쓰로틀링 (기존 내장 버전, performance.ts에 개선된 버전 존재)
// =============================================================================

export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

// throttle는 performance.ts에서 개선된 버전을 사용
// 이 버전은 호환성을 위해 유지
export const legacyThrottle = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let lastCallTime = 0;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCallTime >= delay) {
      lastCallTime = now;
      fn(...args);
    }
  };
};

// =============================================================================
// 로그 유틸리티
// =============================================================================

export const createLogger = (prefix: string) => ({
  info: (message: string, data?: any) => {
    if (__DEV__) {
      console.log(`[${prefix}] ${message}`, data || '');
    }
  },
  warn: (message: string, data?: any) => {
    if (__DEV__) {
      console.warn(`[${prefix}] ${message}`, data || '');
    }
  },
  error: (message: string, error?: any) => {
    if (__DEV__) {
      console.error(`[${prefix}] ${message}`, error || '');
    }
  },
});

// =============================================================================
// Result 타입 생성 헬퍼
// =============================================================================

export const createResult = <T, E = string>(
  success: boolean,
  data?: T,
  error?: E
): Result<T, E> => {
  if (success && data !== undefined) {
    return { success: true, data };
  } else if (!success && error !== undefined) {
    return { success: false, error };
  } else {
    throw new Error('Invalid result parameters');
  }
};

// =============================================================================
// 익스포트된 파이프라인 함수들
// =============================================================================

export { pipe, curry, compose };