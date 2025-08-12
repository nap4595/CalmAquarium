import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextStyle,
  ActivityIndicator 
} from 'react-native';
import { COLORS, FONTS, SPACING } from '@/shared/constants';

// =============================================================================
// 타입 정의
// =============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

// =============================================================================
// 스타일 계산 함수들 (순수 함수)
// =============================================================================

const getButtonStyle = (
  variant: ButtonVariant, 
  size: ButtonSize, 
  disabled: boolean,
  fullWidth: boolean
): ViewStyle => {
  const baseStyle: ViewStyle = {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  };

  // 크기별 스타일
  const sizeStyles: Record<ButtonSize, ViewStyle> = {
    small: {
      paddingHorizontal: SPACING.MD,
      paddingVertical: SPACING.SM,
      minHeight: 36,
    },
    medium: {
      paddingHorizontal: SPACING.LG,
      paddingVertical: SPACING.MD,
      minHeight: 48,
    },
    large: {
      paddingHorizontal: SPACING.XL,
      paddingVertical: SPACING.LG,
      minHeight: 56,
    },
  };

  // 변형별 스타일
  const variantStyles: Record<ButtonVariant, ViewStyle> = {
    primary: {
      backgroundColor: disabled ? COLORS.TEXT_SECONDARY : COLORS.PRIMARY,
      borderWidth: 0,
    },
    secondary: {
      backgroundColor: disabled ? COLORS.SURFACE : COLORS.SECONDARY,
      borderWidth: 0,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: disabled ? COLORS.TEXT_SECONDARY : COLORS.PRIMARY,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
  };

  return {
    ...baseStyle,
    ...sizeStyles[size],
    ...variantStyles[variant],
    width: fullWidth ? '100%' : 'auto',
    opacity: disabled ? 0.6 : 1,
  };
};

const getTextStyle = (
  variant: ButtonVariant, 
  size: ButtonSize, 
  disabled: boolean
): TextStyle => {
  // 크기별 텍스트 스타일
  const sizeTextStyles: Record<ButtonSize, TextStyle> = {
    small: {
      fontSize: FONTS.SIZE.SMALL,
      fontFamily: FONTS.MEDIUM,
    },
    medium: {
      fontSize: FONTS.SIZE.MEDIUM,
      fontFamily: FONTS.MEDIUM,
    },
    large: {
      fontSize: FONTS.SIZE.LARGE,
      fontFamily: FONTS.BOLD,
    },
  };

  // 변형별 텍스트 색상
  const variantTextColors: Record<ButtonVariant, string> = {
    primary: COLORS.BACKGROUND,
    secondary: COLORS.BACKGROUND,
    outline: disabled ? COLORS.TEXT_SECONDARY : COLORS.PRIMARY,
    ghost: disabled ? COLORS.TEXT_SECONDARY : COLORS.PRIMARY,
  };

  return {
    ...sizeTextStyles[size],
    color: variantTextColors[variant],
    textAlign: 'center',
  };
};

// =============================================================================
// 버튼 컴포넌트
// =============================================================================

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  testID,
}) => {
  const isDisabled = disabled || loading;
  
  const buttonStyle = getButtonStyle(variant, size, isDisabled, fullWidth);
  const titleStyle = getTextStyle(variant, size, isDisabled);

  const handlePress = () => {
    if (!isDisabled) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[buttonStyle, style]}
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.7}
      testID={testID}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={titleStyle.color}
          style={{ marginRight: SPACING.SM }}
        />
      )}
      <Text style={[titleStyle, textStyle]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

// =============================================================================
// 미리 정의된 버튼 변형들
// =============================================================================

export const PrimaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button {...props} variant="primary" />
);

export const SecondaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button {...props} variant="secondary" />
);

export const OutlineButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button {...props} variant="outline" />
);

export const GhostButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button {...props} variant="ghost" />
);

// =============================================================================
// 스타일 정의
// =============================================================================

const styles = StyleSheet.create({
  // 필요시 추가 스타일 정의
});