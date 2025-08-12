import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppStore, selectSettings, selectAppRestrictions } from '@/application/store';
import { AppSelector, InstalledApp } from '@/components/common/AppSelector';
import { Switch } from '@/components/common/Switch';
import { PrimaryButton, OutlineButton } from '@/components/common/Button';
import { AppRestriction, AppSettings } from '@/shared/types';
import { COLORS, FONTS, SPACING } from '@/shared/constants';

// =============================================================================
// 임시 앱 데이터 (추후 실제 API로 교체)
// =============================================================================

const MOCK_APPS: InstalledApp[] = [
  {
    appId: 'com.instagram.android',
    appName: 'Instagram',
    packageName: 'com.instagram.android',
    category: 'social',
  },
  {
    appId: 'com.google.android.youtube',
    appName: 'YouTube',
    packageName: 'com.google.android.youtube',
    category: 'video',
  },
  {
    appId: 'com.zhiliaoapp.musically',
    appName: 'TikTok',
    packageName: 'com.zhiliaoapp.musically',
    category: 'social',
  },
  {
    appId: 'com.facebook.katana',
    appName: 'Facebook',
    packageName: 'com.facebook.katana',
    category: 'social',
  },
  {
    appId: 'com.twitter.android',
    appName: 'Twitter',
    packageName: 'com.twitter.android',
    category: 'social',
  },
  {
    appId: 'com.netflix.mediaclient',
    appName: 'Netflix',
    packageName: 'com.netflix.mediaclient',
    category: 'video',
  },
];

// =============================================================================
// 설정 섹션 컴포넌트
// =============================================================================

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
}

const SettingSection: React.FC<SettingSectionProps> = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionContent}>
      {children}
    </View>
  </View>
);

// =============================================================================
// 메인 설정 스크린 컴포넌트
// =============================================================================

export const SettingsScreen: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'general' | 'apps'>('general');
  
  // 스토어 데이터
  const settings = useAppStore(selectSettings);
  const restrictions = useAppStore(selectAppRestrictions);
  
  // 스토어 액션
  const updateSettings = useAppStore((state) => state.updateSettings);
  const setAppRestrictions = useAppStore((state) => state.setAppRestrictions);
  const updateAppLimit = useAppStore((state) => state.updateAppLimit);
  const toggleAppRestriction = useAppStore((state) => state.toggleAppRestriction);
  
  // =================================================================
  // 이벤트 핸들러들
  // =================================================================
  
  const handleSettingUpdate = useCallback((updates: Partial<AppSettings>) => {
    updateSettings(updates);
  }, [updateSettings]);
  
  const handleUpdateRestriction = useCallback((restriction: AppRestriction) => {
    const existingIndex = restrictions.findIndex(r => r.appId === restriction.appId);
    
    if (existingIndex >= 0) {
      const newRestrictions = [...restrictions];
      newRestrictions[existingIndex] = restriction;
      setAppRestrictions(newRestrictions);
    } else {
      setAppRestrictions([...restrictions, restriction]);
    }
  }, [restrictions, setAppRestrictions]);
  
  const handleResetSettings = useCallback(() => {
    Alert.alert(
      '설정 초기화',
      '모든 설정을 초기값으로 되돌리시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: () => {
            handleSettingUpdate({
              theme: 'light',
              notificationsEnabled: true,
              notificationType: 'all',
              soundEnabled: true,
              hapticFeedbackEnabled: true,
              reminderInterval: 60,
              language: 'ko',
            });
            setAppRestrictions([]);
          },
        },
      ]
    );
  }, [handleSettingUpdate, setAppRestrictions]);
  
  const handleExportData = useCallback(() => {
    Alert.alert(
      '데이터 내보내기',
      '현재 설정과 데이터를 내보내시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        { text: '내보내기', onPress: () => {
          // TODO: 실제 데이터 내보내기 구현
          Alert.alert('알림', '데이터 내보내기 기능은 추후 업데이트됩니다.');
        }},
      ]
    );
  }, []);
  
  // =================================================================
  // 탭 렌더링
  // =================================================================
  
  const renderGeneralSettings = () => (
    <ScrollView showsVerticalScrollIndicator={false}>
      <SettingSection title="알림 설정">
        <Switch
          label="알림 사용"
          description="펫의 상태 변화나 위험 상황을 알려드립니다"
          value={settings.notificationsEnabled}
          onValueChange={(value) => handleSettingUpdate({ notificationsEnabled: value })}
        />
        
        <Switch
          label="소리 사용"
          description="앱 사용 시 효과음을 재생합니다"
          value={settings.soundEnabled}
          onValueChange={(value) => handleSettingUpdate({ soundEnabled: value })}
          disabled={!settings.notificationsEnabled}
        />
        
        <Switch
          label="햅틱 피드백"
          description="터치 시 진동 피드백을 제공합니다"
          value={settings.hapticFeedbackEnabled}
          onValueChange={(value) => handleSettingUpdate({ hapticFeedbackEnabled: value })}
        />
      </SettingSection>
      
      <SettingSection title="테마 설정">
        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingLabel}>테마</Text>
          <Text style={styles.settingValue}>
            {settings.theme === 'light' ? '라이트' : settings.theme === 'dark' ? '다크' : '자동'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingLabel}>언어</Text>
          <Text style={styles.settingValue}>한국어</Text>
        </TouchableOpacity>
      </SettingSection>
      
      <SettingSection title="데이터 관리">
        <View style={styles.buttonGroup}>
          <OutlineButton
            title="데이터 내보내기"
            onPress={handleExportData}
            style={styles.actionButton}
          />
          
          <OutlineButton
            title="설정 초기화"
            onPress={handleResetSettings}
            style={[styles.actionButton, styles.destructiveButton]}
          />
        </View>
      </SettingSection>
      
      <SettingSection title="앱 정보">
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>고요의 어항 v1.0.0</Text>
          <Text style={styles.appInfoText}>모든 데이터는 로컬에 저장됩니다</Text>
        </View>
      </SettingSection>
    </ScrollView>
  );
  
  const renderAppSettings = () => (
    <View style={styles.tabContent}>
      <View style={styles.appSettingsHeader}>
        <Text style={styles.appSettingsTitle}>제한할 앱 선택</Text>
        <Text style={styles.appSettingsDescription}>
          시간 제한을 적용할 앱을 선택하고 제한 시간을 설정하세요
        </Text>
      </View>
      
      <AppSelector
        apps={MOCK_APPS}
        restrictions={restrictions}
        onUpdateRestriction={handleUpdateRestriction}
        onToggleRestriction={toggleAppRestriction}
      />
    </View>
  );
  
  // =================================================================
  // 메인 렌더링
  // =================================================================
  
  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>설정</Text>
      </View>
      
      {/* 탭 바 */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, currentTab === 'general' && styles.activeTab]}
          onPress={() => setCurrentTab('general')}
        >
          <Text style={[styles.tabText, currentTab === 'general' && styles.activeTabText]}>
            일반 설정
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, currentTab === 'apps' && styles.activeTab]}
          onPress={() => setCurrentTab('apps')}
        >
          <Text style={[styles.tabText, currentTab === 'apps' && styles.activeTabText]}>
            앱 제한 설정
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* 탭 콘텐츠 */}
      <View style={styles.content}>
        {currentTab === 'general' ? renderGeneralSettings() : renderAppSettings()}
      </View>
    </SafeAreaView>
  );
};

// =============================================================================
// 스타일 정의
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BACKGROUND,
  },
  
  header: {
    paddingHorizontal: SPACING.LG,
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.SURFACE,
  },
  
  headerTitle: {
    fontSize: FONTS.SIZE.TITLE,
    fontFamily: FONTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
  },
  
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.SURFACE,
    marginHorizontal: SPACING.LG,
    marginTop: SPACING.MD,
    borderRadius: 12,
    padding: 4,
  },
  
  tab: {
    flex: 1,
    paddingVertical: SPACING.SM,
    paddingHorizontal: SPACING.MD,
    borderRadius: 8,
    alignItems: 'center',
  },
  
  activeTab: {
    backgroundColor: COLORS.PRIMARY,
  },
  
  tabText: {
    fontSize: FONTS.SIZE.MEDIUM,
    fontFamily: FONTS.MEDIUM,
    color: COLORS.TEXT_SECONDARY,
  },
  
  activeTabText: {
    color: COLORS.BACKGROUND,
  },
  
  content: {
    flex: 1,
    paddingHorizontal: SPACING.LG,
    paddingTop: SPACING.LG,
  },
  
  tabContent: {
    flex: 1,
  },
  
  section: {
    marginBottom: SPACING.XL,
  },
  
  sectionTitle: {
    fontSize: FONTS.SIZE.LARGE,
    fontFamily: FONTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
  },
  
  sectionContent: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    paddingHorizontal: SPACING.MD,
  },
  
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BACKGROUND,
  },
  
  settingLabel: {
    fontSize: FONTS.SIZE.MEDIUM,
    fontFamily: FONTS.MEDIUM,
    color: COLORS.TEXT_PRIMARY,
  },
  
  settingValue: {
    fontSize: FONTS.SIZE.MEDIUM,
    fontFamily: FONTS.REGULAR,
    color: COLORS.TEXT_SECONDARY,
  },
  
  buttonGroup: {
    padding: SPACING.MD,
    gap: SPACING.MD,
  },
  
  actionButton: {
    marginBottom: SPACING.SM,
  },
  
  destructiveButton: {
    borderColor: COLORS.ERROR,
  },
  
  appInfo: {
    padding: SPACING.MD,
    alignItems: 'center',
  },
  
  appInfoText: {
    fontSize: FONTS.SIZE.SMALL,
    fontFamily: FONTS.REGULAR,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 4,
  },
  
  appSettingsHeader: {
    marginBottom: SPACING.LG,
  },
  
  appSettingsTitle: {
    fontSize: FONTS.SIZE.LARGE,
    fontFamily: FONTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.SM,
  },
  
  appSettingsDescription: {
    fontSize: FONTS.SIZE.MEDIUM,
    fontFamily: FONTS.REGULAR,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 20,
  },
});