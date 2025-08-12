import React from 'react';
import { Switch as RNSwitch, View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, FONTS, SPACING } from '@/shared/constants';

// =============================================================================
// 타입 정의
// =============================================================================

interface SwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

// =============================================================================
// 스위치 컴포넌트
// =============================================================================

export const Switch: React.FC<SwitchProps> = ({
  value,
  onValueChange,
  label,
  description,
  disabled = false,
  style,
  testID,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.textContainer}>
        {label && (
          <Text style={[styles.label, disabled && styles.disabledText]}>
            {label}
          </Text>
        )}
        {description && (
          <Text style={[styles.description, disabled && styles.disabledText]}>
            {description}
          </Text>
        )}
      </View>
      
      <RNSwitch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: COLORS.TEXT_SECONDARY,
          true: COLORS.PRIMARY,
        }}
        thumbColor={value ? COLORS.BACKGROUND : COLORS.SURFACE}
        ios_backgroundColor={COLORS.TEXT_SECONDARY}
        testID={testID}
      />
    </View>
  );
};

// =============================================================================
// 스타일 정의
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.MD,
  },
  
  textContainer: {
    flex: 1,
    marginRight: SPACING.MD,
  },
  
  label: {
    fontSize: FONTS.SIZE.MEDIUM,
    fontFamily: FONTS.MEDIUM,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 2,
  },
  
  description: {
    fontSize: FONTS.SIZE.SMALL,
    fontFamily: FONTS.REGULAR,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 18,
  },
  
  disabledText: {
    opacity: 0.5,
  },
});