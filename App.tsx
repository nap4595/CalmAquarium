import React, { useEffect } from 'react';
import { StatusBar, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppNavigator } from '@/presentation/navigation/AppNavigator';
import { useAppStore } from '@/application/store';
import { initializeDataPersistence } from '@/application/services/DataPersistenceService';
import { COLORS } from '@/shared/constants';
import { createLogger } from '@/shared/utils';

// 개발 환경에서 특정 경고 무시
if (__DEV__) {
  LogBox.ignoreLogs([
    'Non-serializable values were found in the navigation state',
    'VirtualizedLists should never be nested inside plain ScrollViews',
  ]);
}

const logger = createLogger('App');

// =============================================================================
// 앱 초기화 및 설정
// =============================================================================

const App: React.FC = () => {
  const hydrate = useAppStore((state) => state.hydrate);
  const setError = useAppStore((state) => state.setError);
  
  // =================================================================
  // 앱 초기화
  // =================================================================
  
  useEffect(() => {
    const initializeApp = async () => {
      try {
        logger.info('앱 초기화 시작');
        
        // 데이터 영속화 서비스 초기화
        await initializeDataPersistence();
        
        // TODO: 권한 확인 및 요청
        // await requestNecessaryPermissions();
        
        // TODO: 앱 사용량 모니터링 서비스 시작
        // await initializeAppUsageMonitoring();
        
        logger.info('앱 초기화 완료');
        
      } catch (error) {
        logger.error('앱 초기화 실패:', error);
        setError('앱을 초기화하는 중 오류가 발생했습니다.');
      }
    };
    
    initializeApp();
  }, [setError]);
  
  // =================================================================
  // 앱 상태 변화 감지
  // =================================================================
  
  useEffect(() => {
    // TODO: 앱이 백그라운드로 이동할 때의 처리
    // const subscription = AppState.addEventListener('change', handleAppStateChange);
    // return () => subscription?.remove();
  }, []);
  
  // =================================================================
  // 전역 에러 핸들링
  // =================================================================
  
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      if (__DEV__) {
        originalError(...args);
      }
      
      // 프로덕션에서는 에러 추적 서비스로 전송
      // crashlytics().log(args.join(' '));
    };
    
    return () => {
      console.error = originalError;
    };
  }, []);
  
  // =================================================================
  // 렌더링
  // =================================================================
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar
          backgroundColor={COLORS.PRIMARY}
          barStyle="light-content"
          translucent={false}
        />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;