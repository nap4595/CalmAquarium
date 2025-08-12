import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native';

import { useAppStore, selectIsOnboarded, selectCurrentScreen } from '@/application/store';
import { OnboardingScreen } from '@/screens/onboarding/OnboardingScreen';
import { AquariumScreen } from '@/screens/main/AquariumScreen';
import { SettingsScreen } from '@/screens/settings/SettingsScreen';
import { MemorialScreen } from '@/screens/memorial/MemorialScreen';
import { COLORS, FONTS } from '@/shared/constants';

// =============================================================================
// 네비게이션 타입 정의
// =============================================================================

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  PetCreation: undefined;
};

export type MainTabParamList = {
  Aquarium: undefined;
  Settings: undefined;
  Memorial: undefined;
  Decorations: undefined;
};

// =============================================================================
// 네비게이터 생성
// =============================================================================

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// =============================================================================
// 임시 스크린 컴포넌트들 (추후 실제 구현으로 교체)
// =============================================================================

const DecorationsScreen = () => (
  <Text style={{ flex: 1, textAlign: 'center', marginTop: 50 }}>꾸미기</Text>
);

const PetCreationScreen = () => (
  <Text style={{ flex: 1, textAlign: 'center', marginTop: 50 }}>펫 생성</Text>
);

// =============================================================================
// 탭 네비게이터 구성
// =============================================================================

const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.PRIMARY,
        tabBarInactiveTintColor: COLORS.TEXT_SECONDARY,
        tabBarStyle: {
          backgroundColor: COLORS.BACKGROUND,
          borderTopWidth: 1,
          borderTopColor: COLORS.SURFACE,
          paddingTop: 5,
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontFamily: FONTS.MEDIUM,
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
      }}
    >
      <Tab.Screen
        name="Aquarium"
        component={AquariumScreen}
        options={{
          title: '어항',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>🐠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: '설정',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>⚙️</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Memorial"
        component={MemorialScreen}
        options={{
          title: '추모 공간',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>💙</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Decorations"
        component={DecorationsScreen}
        options={{
          title: '꾸미기',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}>🎨</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// =============================================================================
// 루트 네비게이터
// =============================================================================

const RootNavigator: React.FC = () => {
  const isOnboarded = useAppStore(selectIsOnboarded);
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {!isOnboarded ? (
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ gestureEnabled: false }}
        />
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
          />
          <Stack.Screen
            name="PetCreation"
            component={PetCreationScreen}
            options={{
              presentation: 'modal',
              gestureEnabled: true,
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

// =============================================================================
// 메인 앱 네비게이터
// =============================================================================

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
};