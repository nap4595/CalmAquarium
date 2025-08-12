// =============================================================================
// 성능 최적화 유틸리티 함수들
// =============================================================================

/**
 * 간단한 메모이제이션 함수
 * @param fn 메모이제이션할 함수
 * @param keyFn 캐시 키 생성 함수
 */
export const memoize = <TArgs extends readonly unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  keyFn?: (...args: TArgs) => string
): ((...args: TArgs) => TReturn) => {
  const cache = new Map<string, TReturn>();
  
  return (...args: TArgs): TReturn => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

/**
 * 시간 제한이 있는 메모이제이션 함수
 * @param fn 메모이제이션할 함수
 * @param ttlMs 캐시 수명 (밀리초)
 * @param keyFn 캐시 키 생성 함수
 */
export const memoizeWithTTL = <TArgs extends readonly unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  ttlMs: number,
  keyFn?: (...args: TArgs) => string
): ((...args: TArgs) => TReturn) => {
  const cache = new Map<string, { value: TReturn; timestamp: number }>();
  
  return (...args: TArgs): TReturn => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    const now = Date.now();
    
    const cached = cache.get(key);
    if (cached && now - cached.timestamp < ttlMs) {
      return cached.value;
    }
    
    const result = fn(...args);
    cache.set(key, { value: result, timestamp: now });
    return result;
  };
};

/**
 * 비동기 함수를 위한 메모이제이션
 * @param fn 메모이제이션할 비동기 함수
 * @param ttlMs 캐시 수명 (밀리초)
 * @param keyFn 캐시 키 생성 함수
 */
export const memoizeAsync = <TArgs extends readonly unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  ttlMs: number = 60000, // 기본 1분
  keyFn?: (...args: TArgs) => string
): ((...args: TArgs) => Promise<TReturn>) => {
  const cache = new Map<string, { promise: Promise<TReturn>; timestamp: number }>();
  
  return async (...args: TArgs): Promise<TReturn> => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args);
    const now = Date.now();
    
    const cached = cache.get(key);
    if (cached && now - cached.timestamp < ttlMs) {
      return cached.promise;
    }
    
    const promise = fn(...args).catch(error => {
      // 실패한 요청은 캐시에서 제거
      cache.delete(key);
      throw error;
    });
    
    cache.set(key, { promise, timestamp: now });
    return promise;
  };
};

/**
 * 깊은 비교 함수 (React.memo용)
 * @param prev 이전 props
 * @param next 다음 props
 */
export const deepEqual = (prev: any, next: any): boolean => {
  if (prev === next) return true;
  
  if (typeof prev !== 'object' || prev === null || 
      typeof next !== 'object' || next === null) {
    return false;
  }
  
  const keysA = Object.keys(prev);
  const keysB = Object.keys(next);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key) || !deepEqual(prev[key], next[key])) {
      return false;
    }
  }
  
  return true;
};

/**
 * 얕은 비교 함수 (React.memo용)
 * @param prev 이전 props
 * @param next 다음 props
 */
export const shallowEqual = (prev: any, next: any): boolean => {
  if (prev === next) return true;
  
  if (typeof prev !== 'object' || prev === null || 
      typeof next !== 'object' || next === null) {
    return false;
  }
  
  const keysA = Object.keys(prev);
  const keysB = Object.keys(next);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key) || prev[key] !== next[key]) {
      return false;
    }
  }
  
  return true;
};

/**
 * 스로틀링 함수
 * @param fn 스로틀링할 함수
 * @param limitMs 제한 시간 (밀리초)
 */
export const throttle = <TArgs extends readonly unknown[]>(
  fn: (...args: TArgs) => void,
  limitMs: number
): ((...args: TArgs) => void) => {
  let inThrottle: boolean;
  
  return (...args: TArgs): void => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limitMs);
    }
  };
};

/**
 * 함수 실행 시간 측정
 * @param fn 측정할 함수
 * @param name 함수 이름
 */
export const measurePerformance = <TArgs extends readonly unknown[], TReturn>(
  fn: (...args: TArgs) => TReturn,
  name?: string
) => {
  return (...args: TArgs): TReturn => {
    const start = performance.now();
    const result = fn(...args);
    const end = performance.now();
    
    console.log(`⏱️ ${name || 'Function'} took ${(end - start).toFixed(2)}ms`);
    return result;
  };
};

/**
 * 비동기 함수 실행 시간 측정
 * @param fn 측정할 비동기 함수
 * @param name 함수 이름
 */
export const measureAsyncPerformance = <TArgs extends readonly unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  name?: string
) => {
  return async (...args: TArgs): Promise<TReturn> => {
    const start = performance.now();
    const result = await fn(...args);
    const end = performance.now();
    
    console.log(`⏱️ ${name || 'Async Function'} took ${(end - start).toFixed(2)}ms`);
    return result;
  };
};

/**
 * 배열을 청크로 나누기 (대용량 데이터 처리용)
 * @param array 나눌 배열
 * @param chunkSize 청크 크기
 */
export const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

/**
 * 배치 처리 함수
 * @param items 처리할 아이템들
 * @param processor 처리 함수
 * @param batchSize 배치 크기
 * @param delayMs 배치 간 지연 시간
 */
export const processBatch = async <T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  batchSize: number = 10,
  delayMs: number = 0
): Promise<R[]> => {
  const results: R[] = [];
  const batches = chunkArray(items, batchSize);
  
  for (const batch of batches) {
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
    
    if (delayMs > 0 && batch !== batches[batches.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
};

/**
 * 리스트 가상화를 위한 표시 범위 계산
 * @param scrollTop 현재 스크롤 위치
 * @param itemHeight 아이템 높이
 * @param containerHeight 컨테이너 높이
 * @param totalItems 전체 아이템 수
 * @param overscan 추가로 렌더링할 아이템 수
 */
export const calculateVisibleRange = (
  scrollTop: number,
  itemHeight: number,
  containerHeight: number,
  totalItems: number,
  overscan: number = 5
) => {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    totalItems - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  
  return { startIndex, endIndex };
};

/**
 * 객체의 속성이 실제로 변경되었는지 확인
 * @param prev 이전 객체
 * @param next 다음 객체
 * @param keys 비교할 키들 (없으면 모든 키 비교)
 */
export const hasChanged = <T extends Record<string, any>>(
  prev: T,
  next: T,
  keys?: (keyof T)[]
): boolean => {
  const keysToCheck = keys || Object.keys(prev) as (keyof T)[];
  
  return keysToCheck.some(key => prev[key] !== next[key]);
};

/**
 * 안전한 JSON 파싱 (에러 시 기본값 반환)
 * @param jsonString JSON 문자열
 * @param defaultValue 기본값
 */
export const safeJsonParse = <T>(jsonString: string, defaultValue: T): T => {
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return defaultValue;
  }
};

/**
 * 성능 모니터링을 위한 FPS 측정
 */
export class FPSMonitor {
  private frames: number[] = [];
  private lastTime = performance.now();
  
  tick(): number {
    const now = performance.now();
    this.frames.push(now);
    
    // 1초 이상 된 프레임 제거
    while (this.frames.length > 0 && this.frames[0] <= now - 1000) {
      this.frames.shift();
    }
    
    return this.frames.length;
  }
  
  getAverageFPS(): number {
    if (this.frames.length < 2) return 0;
    
    const duration = this.frames[this.frames.length - 1] - this.frames[0];
    return (this.frames.length - 1) * 1000 / duration;
  }
  
  reset(): void {
    this.frames = [];
    this.lastTime = performance.now();
  }
}