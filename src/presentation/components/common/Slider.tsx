import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Slider as RNSlider } from '@react-native-community/slider';
import { COLORS, FONTS, SPACING } from '@/shared/constants';
import { formatDuration } from '@/shared/utils';

// =============================================================================
// 타입 정의
// =============================================================================

interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  label?: string;
  showValue?: boolean;
  formatValue?: (value: number) => string;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

// =============================================================================
// 슬라이더 컴포넌트
// =============================================================================

export const Slider: React.FC<SliderProps> = ({
  value,
  onValueChange,
  minimumValue,
  maximumValue,
  step = 1,
  label,
  showValue = true,
  formatValue,
  disabled = false,
  style,
  testID,
}) => {
  const displayValue = formatValue ? formatValue(value) : value.toString();
  
  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        {label && (
          <Text style={[styles.label, disabled && styles.disabledText]}>
            {label}
          </Text>
        )}
        {showValue && (
          <Text style={[styles.value, disabled && styles.disabledText]}>
            {displayValue}
          </Text>
        )}
      </View>
      
      <RNSlider
        value={value}
        onValueChange={onValueChange}
        minimumValue={minimumValue}
        maximumValue={maximumValue}
        step={step}
        disabled={disabled}
        minimumTrackTintColor={disabled ? COLORS.TEXT_SECONDARY : COLORS.PRIMARY}
        maximumTrackTintColor={COLORS.SURFACE}
        thumbStyle={[styles.thumb, disabled && styles.disabledThumb]}
        trackStyle={styles.track}
        testID={testID}
      />
      
      <View style={styles.rangeContainer}>
        <Text style={styles.rangeText}>
          {formatValue ? formatValue(minimumValue) : minimumValue}
        </Text>
        <Text style={styles.rangeText}>
          {formatValue ? formatValue(maximumValue) : maximumValue}
        </Text>
      </View>
    </View>
  );
};

// =============================================================================
// 미리 정의된 슬라이더 변형들
// =============================================================================

export const TimeSlider: React.FC<Omit<SliderProps, 'formatValue'>> = (props) => (
  <Slider
    {...props}
    formatValue={(value) => formatDuration(value)}
  />
);

export const MinuteSlider: React.FC<Omit<SliderProps, 'formatValue' | 'step'>> = (props) => (
  <Slider
    {...props}
    step={60000} // 1분 단위
    formatValue={(value) => `${Math.round(value / 60000)}분`}
  />
);

// =============================================================================
// 스타일 정의
// =============================================================================

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.MD,
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  
  label: {
    fontSize: FONTS.SIZE.MEDIUM,
    fontFamily: FONTS.MEDIUM,
    color: COLORS.TEXT_PRIMARY,
  },
  
  value: {
    fontSize: FONTS.SIZE.MEDIUM,
    fontFamily: FONTS.BOLD,
    color: COLORS.PRIMARY,
  },
  
  track: {
    height: 4,
    borderRadius: 2,
  },
  
  thumb: {
    backgroundColor: COLORS.PRIMARY,
    width: 20,
    height: 20,
  },
  
  disabledThumb: {
    backgroundColor: COLORS.TEXT_SECONDARY,
  },
  
  rangeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.XS,
  },
  
  rangeText: {
    fontSize: FONTS.SIZE.SMALL,
    fontFamily: FONTS.REGULAR,
    color: COLORS.TEXT_SECONDARY,
  },
  
  disabledText: {
    opacity: 0.5,
  },
});