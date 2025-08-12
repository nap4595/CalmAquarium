import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  ViewToken,
  Image,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/common/Button';
import { useAppStore } from '@/application/store';
import { COLORS, FONTS, SPACING, APP_CONFIG } from '@/shared/constants';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// =============================================================================
// 온보딩 데이터 정의
// =============================================================================

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  image: string; // 추후 실제 이미지로 교체
  backgroundColor: string;
}

const onboardingSlides: OnboardingSlide[] = [
  {
    id: '1',
    title: '작은 생명과의 연결',
    description: '당신의 시간은 이 작은 생명과\n연결되어 있어요.',
    image: '🐠', // 임시 이모지, 추후 Lottie 애니메이션으로 교체
    backgroundColor: COLORS.WATER_CLEAN,
  },
  {
    id: '2',
    title: '건강한 디지털 습관',
    description: '지정된 앱을 오래 사용하면,\n펫이 힘들어해요.',
    image: '📱',
    backgroundColor: COLORS.PRIMARY,
  },
  {
    id: '3',
    title: '소중한 추억',
    description: '이별한 펫의 이름은 다시 사용할 수\n없으니, 신중하게 돌봐주세요.',
    image: '💙',
    backgroundColor: COLORS.SECONDARY,
  },
  {
    id: '4',
    title: '당신만의 공간',
    description: '모든 기록은 당신의 폰 안에만\n저장됩니다. 앱을 삭제하면\n모든 추억이 사라져요.',
    image: '🔒',
    backgroundColor: COLORS.ACCENT,
  },
];

// =============================================================================
// 개별 슬라이드 컴포넌트
// =============================================================================

interface SlideProps {
  slide: OnboardingSlide;
  isActive: boolean;
}

const Slide: React.FC<SlideProps> = ({ slide, isActive }) => (
  <View style={[styles.slide, { backgroundColor: slide.backgroundColor }]}>
    <View style={styles.content}>
      <View style={styles.imageContainer}>
        <Text style={styles.emoji}>{slide.image}</Text>
      </View>
      
      <View style={styles.textContainer}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>
    </View>
  </View>
);

// =============================================================================
// 페이지네이션 인디케이터 컴포넌트
// =============================================================================

interface PaginationProps {
  currentIndex: number;
  totalSlides: number;
}

const Pagination: React.FC<PaginationProps> = ({ currentIndex, totalSlides }) => (
  <View style={styles.pagination}>
    {Array.from({ length: totalSlides }, (_, index) => (
      <View
        key={index}
        style={[
          styles.paginationDot,
          index === currentIndex && styles.paginationDotActive,
        ]}
      />
    ))}
  </View>
);

// =============================================================================
// 메인 온보딩 스크린 컴포넌트
// =============================================================================

export const OnboardingScreen: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  
  // =================================================================
  // 이벤트 핸들러들
  // =================================================================
  
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }).current;
  
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;
  
  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < onboardingSlides.length) {
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    } else {
      handleStart();
    }
  };
  
  const handleStart = () => {
    completeOnboarding();
  };
  
  // =================================================================
  // 렌더링 함수들
  // =================================================================
  
  const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => (
    <Slide slide={item} isActive={index === currentIndex} />
  );
  
  const isLastSlide = currentIndex === onboardingSlides.length - 1;
  const buttonTitle = isLastSlide ? '시작하기' : '다음';
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.appName}>{APP_CONFIG.NAME}</Text>
        <Text style={styles.subtitle}>당신의 집중으로 맑아지는</Text>
      </View>
      
      {/* 슬라이드 */}
      <FlatList
        ref={flatListRef}
        data={onboardingSlides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        bounces={false}
        style={styles.slideContainer}
      />
      
      {/* 하단 영역 */}
      <View style={styles.footer}>
        <Pagination 
          currentIndex={currentIndex} 
          totalSlides={onboardingSlides.length} 
        />
        
        <View style={styles.buttonContainer}>
          <PrimaryButton
            title={buttonTitle}
            onPress={handleNext}
            size="large"
            fullWidth
            testID="onboarding-next-button"
          />
        </View>
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
    backgroundColor: COLORS.PRIMARY,
  },
  
  header: {
    alignItems: 'center',
    paddingTop: SPACING.LG,
    paddingBottom: SPACING.MD,
  },
  
  appName: {
    fontSize: FONTS.SIZE.TITLE,
    fontFamily: FONTS.BOLD,
    color: COLORS.BACKGROUND,
    textAlign: 'center',
  },
  
  subtitle: {
    fontSize: FONTS.SIZE.MEDIUM,
    fontFamily: FONTS.REGULAR,
    color: COLORS.BACKGROUND,
    opacity: 0.8,
    marginTop: SPACING.XS,
    textAlign: 'center',
  },
  
  slideContainer: {
    flex: 1,
  },
  
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  content: {
    alignItems: 'center',
    paddingHorizontal: SPACING.XL,
  },
  
  imageContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.XXL,
  },
  
  emoji: {
    fontSize: 80,
    textAlign: 'center',
  },
  
  textContainer: {
    alignItems: 'center',
  },
  
  title: {
    fontSize: FONTS.SIZE.XLARGE,
    fontFamily: FONTS.BOLD,
    color: COLORS.BACKGROUND,
    textAlign: 'center',
    marginBottom: SPACING.MD,
  },
  
  description: {
    fontSize: FONTS.SIZE.MEDIUM,
    fontFamily: FONTS.REGULAR,
    color: COLORS.BACKGROUND,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
  },
  
  footer: {
    paddingHorizontal: SPACING.XL,
    paddingBottom: SPACING.LG,
    backgroundColor: COLORS.BACKGROUND,
  },
  
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.LG,
  },
  
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.TEXT_SECONDARY,
    marginHorizontal: 4,
    opacity: 0.3,
  },
  
  paginationDotActive: {
    backgroundColor: COLORS.PRIMARY,
    opacity: 1,
    transform: [{ scale: 1.2 }],
  },
  
  buttonContainer: {
    paddingTop: SPACING.MD,
  },
});