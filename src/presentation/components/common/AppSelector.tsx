import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { AppRestriction } from '@/shared/types';
import { COLORS, FONTS, SPACING } from '@/shared/constants';
import { Switch } from './Switch';
import { MinuteSlider } from './Slider';

// =============================================================================
// 타입 정의
// =============================================================================

export interface InstalledApp {
  appId: string;
  appName: string;
  packageName: string;
  icon?: string;
  category?: string;
}

interface AppSelectorProps {
  apps: readonly InstalledApp[];
  restrictions: readonly AppRestriction[];
  onUpdateRestriction: (restriction: AppRestriction) => void;
  onToggleRestriction: (appId: string) => void;
}

interface AppItemProps {
  app: InstalledApp;
  restriction?: AppRestriction;
  onUpdateRestriction: (restriction: AppRestriction) => void;
  onToggleRestriction: (appId: string) => void;
}

// =============================================================================
// 개별 앱 아이템 컴포넌트
// =============================================================================

const AppItem: React.FC<AppItemProps> = ({
  app,
  restriction,
  onUpdateRestriction,
  onToggleRestriction,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isRestricted = restriction?.isActive ?? false;
  const dailyLimit = restriction?.dailyLimit ?? 30 * 60 * 1000; // 30분 기본값
  const weeklyLimit = restriction?.weeklyLimit ?? 3 * 60 * 60 * 1000; // 3시간 기본값
  
  const handleToggle = useCallback(() => {
    if (!restriction) {
      // 새로운 제한 생성
      const newRestriction: AppRestriction = {
        appId: app.appId,
        appName: app.appName,
        packageName: app.packageName,
        dailyLimit: 30 * 60 * 1000,
        weeklyLimit: 3 * 60 * 60 * 1000,
        isActive: true,
      };
      onUpdateRestriction(newRestriction);
    } else {
      onToggleRestriction(app.appId);
    }
  }, [app, restriction, onUpdateRestriction, onToggleRestriction]);
  
  const handleDailyLimitChange = useCallback((value: number) => {
    if (restriction) {
      onUpdateRestriction({
        ...restriction,
        dailyLimit: value,
      });
    }
  }, [restriction, onUpdateRestriction]);
  
  const handleWeeklyLimitChange = useCallback((value: number) => {
    if (restriction) {
      onUpdateRestriction({
        ...restriction,
        weeklyLimit: value,
      });
    }
  }, [restriction, onUpdateRestriction]);
  
  const handlePress = () => {
    if (isRestricted) {
      setIsExpanded(!isExpanded);
    } else {
      Alert.alert(
        '앱 제한 설정',
        `${app.appName}을(를) 제한 목록에 추가하시겠습니까?`,
        [
          { text: '취소', style: 'cancel' },
          { text: '추가', onPress: handleToggle },
        ]
      );
    }
  };
  
  return (
    <View style={styles.appItem}>
      <TouchableOpacity style={styles.appHeader} onPress={handlePress}>
        <View style={styles.appInfo}>
          <View style={styles.appIcon}>
            <Text style={styles.appIconText}>
              📱
            </Text>
          </View>
          <View style={styles.appDetails}>
            <Text style={styles.appName}>{app.appName}</Text>
            <Text style={styles.packageName}>{app.packageName}</Text>
          </View>
        </View>
        
        <Switch
          value={isRestricted}
          onValueChange={handleToggle}
          testID={`app-toggle-${app.appId}`}
        />
      </TouchableOpacity>
      
      {isExpanded && isRestricted && (
        <View style={styles.settingsContainer}>
          <MinuteSlider
            label="일일 제한 시간"
            value={dailyLimit}
            onValueChange={handleDailyLimitChange}
            minimumValue={15 * 60 * 1000} // 15분
            maximumValue={120 * 60 * 1000} // 2시간
            testID={`daily-limit-${app.appId}`}
          />
          
          <MinuteSlider
            label="주간 제한 시간"
            value={weeklyLimit}
            onValueChange={handleWeeklyLimitChange}
            minimumValue={1 * 60 * 60 * 1000} // 1시간
            maximumValue={20 * 60 * 60 * 1000} // 20시간
            testID={`weekly-limit-${app.appId}`}
          />
        </View>
      )}
    </View>
  );
};

// =============================================================================
// 메인 앱 셀렉터 컴포넌트
// =============================================================================

export const AppSelector: React.FC<AppSelectorProps> = ({
  apps,
  restrictions,
  onUpdateRestriction,
  onToggleRestriction,
}) => {
  // 제한된 앱을 상단에, 그 외는 하단에 표시
  const sortedApps = [...apps].sort((a, b) => {
    const aRestricted = restrictions.some(r => r.appId === a.appId && r.isActive);
    const bRestricted = restrictions.some(r => r.appId === b.appId && r.isActive);
    
    if (aRestricted && !bRestricted) return -1;
    if (!aRestricted && bRestricted) return 1;
    return a.appName.localeCompare(b.appName);
  });
  
  const renderApp = ({ item }: { item: InstalledApp }) => {
    const restriction = restrictions.find(r => r.appId === item.appId);
    
    return (
      <AppItem
        app={item}
        restriction={restriction}
        onUpdateRestriction={onUpdateRestriction}
        onToggleRestriction={onToggleRestriction}
      />
    );
  };
  
  if (apps.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>
          설치된 앱을 불러오는 중...
        </Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <FlatList
        data={sortedApps}
        renderItem={renderApp}
        keyExtractor={(item) => item.appId}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
};

// =============================================================================
// 스타일 정의
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  listContainer: {
    paddingBottom: SPACING.LG,
  },
  
  appItem: {
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    marginBottom: SPACING.SM,
    overflow: 'hidden',
  },
  
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.MD,
  },
  
  appInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.MD,
  },
  
  appIconText: {
    fontSize: 24,
  },
  
  appDetails: {
    flex: 1,
  },
  
  appName: {
    fontSize: FONTS.SIZE.MEDIUM,
    fontFamily: FONTS.MEDIUM,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  
  packageName: {
    fontSize: FONTS.SIZE.SMALL,
    fontFamily: FONTS.REGULAR,
    color: COLORS.TEXT_SECONDARY,
  },
  
  settingsContainer: {
    padding: SPACING.MD,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: COLORS.BACKGROUND,
  },
  
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.XL,
  },
  
  emptyStateText: {
    fontSize: FONTS.SIZE.MEDIUM,
    fontFamily: FONTS.REGULAR,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
});