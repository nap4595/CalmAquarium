import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore, selectCurrentPet, selectPetHealth } from '@/application/store';
import { COLORS, SPACING, ANIMATIONS } from '@/shared/constants';
import { calculateWaterTurbidity, getPetBehaviorPattern } from '@/domain/calculations/petHealth';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const AQUARIUM_HEIGHT = SCREEN_HEIGHT * 0.7;
const AQUARIUM_WIDTH = SCREEN_WIDTH - SPACING.XL;

// =============================================================================
// 물고기 컴포넌트
// =============================================================================

interface FishProps {
  health: number;
  personality: string;
  onTouch?: (x: number, y: number) => void;
}

const Fish: React.FC<FishProps> = ({ health, personality, onTouch }) => {
  const positionX = useRef(new Animated.Value(AQUARIUM_WIDTH / 2)).current;
  const positionY = useRef(new Animated.Value(AQUARIUM_HEIGHT / 2)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const rotationAnim = useRef(new Animated.Value(0)).current;
  
  const [targetPosition, setTargetPosition] = useState({
    x: AQUARIUM_WIDTH / 2,
    y: AQUARIUM_HEIGHT / 2,
  });
  
  const behaviorPattern = getPetBehaviorPattern(health);
  
  // =================================================================
  // 물고기 자동 움직임 애니메이션
  // =================================================================
  
  useEffect(() => {
    const moveRandomly = () => {
      const newX = Math.random() * (AQUARIUM_WIDTH - 60) + 30;
      const newY = Math.random() * (AQUARIUM_HEIGHT - 60) + 30;
      
      setTargetPosition({ x: newX, y: newY });
      
      Animated.parallel([
        Animated.timing(positionX, {
          toValue: newX,
          duration: ANIMATIONS.PET_MOVEMENT.SWIM_PATTERN_DURATION * (1 / behaviorPattern.movementSpeed),
          useNativeDriver: false,
        }),
        Animated.timing(positionY, {
          toValue: newY,
          duration: ANIMATIONS.PET_MOVEMENT.SWIM_PATTERN_DURATION * (1 / behaviorPattern.movementSpeed),
          useNativeDriver: false,
        }),
        Animated.timing(rotationAnim, {
          toValue: newX > targetPosition.x ? 0 : 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    };
    
    const interval = setInterval(moveRandomly, ANIMATIONS.PET_MOVEMENT.SWIM_PATTERN_DURATION);
    return () => clearInterval(interval);
  }, [health, behaviorPattern]);
  
  // =================================================================
  // 건강 상태에 따른 시각적 효과
  // =================================================================
  
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: Math.max(0.3, health / 100),
        duration: ANIMATIONS.DURATION.MEDIUM,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: Math.max(0.7, 0.5 + (health / 100) * 0.5),
        duration: ANIMATIONS.DURATION.MEDIUM,
        useNativeDriver: true,
      }),
    ]).start();
  }, [health]);
  
  // =================================================================
  // 터치 처리
  // =================================================================
  
  const handleGesture = (event: PanGestureHandlerGestureEvent) => {
    if (behaviorPattern.responseToTouch > 0.5) {
      const { x, y } = event.nativeEvent;
      onTouch?.(x, y);
      
      // 물고기가 터치한 지점으로 이동
      Animated.parallel([
        Animated.spring(positionX, {
          toValue: Math.max(30, Math.min(AQUARIUM_WIDTH - 30, x)),
          tension: 100,
          friction: 8,
          useNativeDriver: false,
        }),
        Animated.spring(positionY, {
          toValue: Math.max(30, Math.min(AQUARIUM_HEIGHT - 30, y)),
          tension: 100,
          friction: 8,
          useNativeDriver: false,
        }),
      ]).start();
    }
  };
  
  const rotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });
  
  return (
    <PanGestureHandler onGestureEvent={handleGesture}>
      <Animated.View
        style={[
          styles.fish,
          {
            left: positionX,
            top: positionY,
            opacity: opacityAnim,
            transform: [
              { scale: scaleAnim },
              { rotateY: rotation },
            ],
          },
        ]}
      >
        <Animated.Text style={styles.fishEmoji}>🐠</Animated.Text>
      </Animated.View>
    </PanGestureHandler>
  );
};

// =============================================================================
// 물의 탁도 효과 컴포넌트
// =============================================================================

interface WaterEffectProps {
  turbidity: number;
}

const WaterEffect: React.FC<WaterEffectProps> = ({ turbidity }) => {
  const turbidityAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(turbidityAnim, {
      toValue: turbidity,
      duration: ANIMATIONS.DURATION.LONG,
      useNativeDriver: false,
    }).start();
  }, [turbidity]);
  
  const backgroundColor = turbidityAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [COLORS.WATER_CLEAN, COLORS.WATER_POLLUTED],
  });
  
  return (
    <Animated.View 
      style={[
        styles.waterEffect, 
        { backgroundColor }
      ]} 
    />
  );
};

// =============================================================================
// 거품 효과 컴포넌트
// =============================================================================

const BubbleEffect: React.FC = () => {
  const bubbles = useRef(
    Array.from({ length: 10 }, (_, i) => ({
      id: i,
      x: new Animated.Value(Math.random() * AQUARIUM_WIDTH),
      y: new Animated.Value(AQUARIUM_HEIGHT),
      opacity: new Animated.Value(0.6),
      scale: new Animated.Value(Math.random() * 0.5 + 0.5),
    }))
  ).current;
  
  useEffect(() => {
    const animateBubbles = () => {
      bubbles.forEach((bubble, index) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(bubble.y, {
              toValue: -50,
              duration: 8000 + Math.random() * 4000,
              useNativeDriver: false,
            }),
            Animated.timing(bubble.y, {
              toValue: AQUARIUM_HEIGHT,
              duration: 0,
              useNativeDriver: false,
            }),
          ]),
          { iterations: -1 }
        ).start();
        
        setTimeout(() => {
          Animated.loop(
            Animated.sequence([
              Animated.timing(bubble.opacity, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
              }),
              Animated.timing(bubble.opacity, {
                toValue: 0.6,
                duration: 1000,
                useNativeDriver: true,
              }),
            ]),
            { iterations: -1 }
          ).start();
        }, index * 1000);
      });
    };
    
    animateBubbles();
  }, []);
  
  return (
    <View style={StyleSheet.absoluteFillObject}>
      {bubbles.map((bubble) => (
        <Animated.View
          key={bubble.id}
          style={[
            styles.bubble,
            {
              left: bubble.x,
              top: bubble.y,
              opacity: bubble.opacity,
              transform: [{ scale: bubble.scale }],
            },
          ]}
        >
          <Animated.Text style={styles.bubbleEmoji}>💧</Animated.Text>
        </Animated.View>
      ))}
    </View>
  );
};

// =============================================================================
// 메인 어항 스크린 컴포넌트
// =============================================================================

export const AquariumScreen: React.FC = () => {
  const currentPet = useAppStore(selectCurrentPet);
  const petHealth = useAppStore(selectPetHealth);
  
  const waterTurbidity = calculateWaterTurbidity(petHealth);
  
  const handleFishTouch = (x: number, y: number) => {
    // 터치 이벤트에 대한 반응 (물결 효과, 소리 등)
    console.log(`물고기 터치: (${x}, ${y})`);
  };
  
  if (!currentPet) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Animated.Text style={styles.emptyStateText}>
            아직 펫이 없습니다.{'\n'}새로운 친구를 만들어보세요!
          </Animated.Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.aquariumContainer}>
        <View style={styles.aquarium}>
          {/* 물의 배경 효과 */}
          <WaterEffect turbidity={waterTurbidity} />
          
          {/* 거품 효과 */}
          <BubbleEffect />
          
          {/* 물고기 */}
          <Fish
            health={petHealth}
            personality={currentPet.personality}
            onTouch={handleFishTouch}
          />
          
          {/* 어항 테두리 */}
          <View style={styles.aquariumBorder} />
        </View>
        
        {/* 상태 표시 */}
        <View style={styles.statusContainer}>
          <Animated.Text style={styles.petName}>
            {currentPet.name}
          </Animated.Text>
          <View style={styles.healthBar}>
            <View 
              style={[
                styles.healthFill, 
                { width: `${petHealth}%` }
              ]} 
            />
          </View>
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
    backgroundColor: COLORS.BACKGROUND,
  },
  
  aquariumContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.LG,
  },
  
  aquarium: {
    width: AQUARIUM_WIDTH,
    height: AQUARIUM_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    elevation: 5,
    shadowColor: COLORS.TEXT_PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  
  waterEffect: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.WATER_CLEAN,
  },
  
  fish: {
    position: 'absolute',
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  fishEmoji: {
    fontSize: 40,
    textAlign: 'center',
  },
  
  bubble: {
    position: 'absolute',
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  bubbleEmoji: {
    fontSize: 12,
    opacity: 0.6,
  },
  
  aquariumBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
    borderColor: COLORS.AQUARIUM_GLASS,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  
  statusContainer: {
    marginTop: SPACING.LG,
    alignItems: 'center',
    minWidth: 200,
  },
  
  petName: {
    fontSize: 24,
    fontFamily: FONTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
    textAlign: 'center',
  },
  
  healthBar: {
    width: 200,
    height: 8,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 4,
    overflow: 'hidden',
  },
  
  healthFill: {
    height: '100%',
    backgroundColor: COLORS.SUCCESS,
    borderRadius: 4,
  },
  
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.XL,
  },
  
  emptyStateText: {
    fontSize: 18,
    fontFamily: FONTS.REGULAR,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 24,
  },
});