import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppStore, selectDeadPets, selectMemorialStats } from '@/application/store';
import { DeadPet } from '@/shared/types';
import { COLORS, FONTS, SPACING } from '@/shared/constants';
import { formatDuration, formatTimeAgo, sortBy } from '@/shared/utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOMBSTONE_WIDTH = (SCREEN_WIDTH - SPACING.XL * 2 - SPACING.MD) / 2;

// =============================================================================
// 묘비 컴포넌트
// =============================================================================

interface TombstoneProps {
  deadPet: DeadPet;
  onPress: () => void;
}

// 성격 이모지 매핑 (컴포넌트 외부에서 정의하여 리렌더링 시 재생성 방지)
const PERSONALITY_EMOJIS = {
  active: '⚡',
  calm: '🕊️',
  playful: '🎈',
  shy: '🌸',
  curious: '🔍',
} as const;

// 사망 원인 텍스트 매핑
const DEATH_REASON_TEXTS = {
  time_limit_exceeded: '시간 초과',
  neglect: '방치',
  app_overuse: '앱 과사용',
} as const;

const Tombstone: React.FC<TombstoneProps> = React.memo(({ deadPet, onPress }) => {
  const personalityEmoji = PERSONALITY_EMOJIS[deadPet.personality];
  const deathReasonText = DEATH_REASON_TEXTS[deadPet.deathReason];
  
  // 포맷된 값들을 메모이제이션
  const formattedLifespan = useMemo(() => formatDuration(deadPet.totalLifetime), [deadPet.totalLifetime]);
  const formattedDeathDate = useMemo(() => formatTimeAgo(deadPet.diedAt), [deadPet.diedAt]);
  
  return (
    <TouchableOpacity style={styles.tombstone} onPress={onPress}>
      <View style={styles.tombstoneHeader}>
        <Text style={styles.tombstoneEmoji}>🪦</Text>
        <Text style={styles.personalityEmoji}>{personalityEmoji}</Text>
      </View>
      
      <View style={styles.tombstoneInfo}>
        <Text style={styles.petName} numberOfLines={1}>
          {deadPet.name}
        </Text>
        
        <Text style={styles.lifespan}>
          {formattedLifespan}
        </Text>
        
        <Text style={styles.deathDate}>
          {formattedDeathDate}
        </Text>
        
        <Text style={styles.deathReason} numberOfLines={1}>
          {deathReasonText}
        </Text>
      </View>
      
      <View style={styles.tombstoneFooter}>
        <Text style={styles.restInPeace}>R.I.P</Text>
      </View>
    </TouchableOpacity>
  );
});

// Tombstone 컴포넌트에 displayName 설정 (디버깅 용이성)
Tombstone.displayName = 'Tombstone';

// =============================================================================
// 상세 정보 모달 컴포넌트
// =============================================================================

interface PetDetailModalProps {
  pet: DeadPet;
  onClose: () => void;
}

const PetDetailModal: React.FC<PetDetailModalProps> = ({ pet, onClose }) => {
  const personalityText = {
    active: '활발한',
    calm: '차분한',
    playful: '장난꾸러기',
    shy: '수줍은',
    curious: '호기심 많은',
  }[pet.personality];
  
  const deathReasonDetail = {
    time_limit_exceeded: '설정된 시간 제한을 초과하여 생을 마감했습니다.',
    neglect: '충분한 관심을 받지 못해 생을 마감했습니다.',
    app_overuse: '과도한 앱 사용으로 인해 생을 마감했습니다.',
  }[pet.deathReason];
  
  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        
        <View style={styles.modalHeader}>
          <Text style={styles.modalEmoji}>🐠</Text>
          <Text style={styles.modalPetName}>{pet.name}</Text>
          <Text style={styles.modalPersonality}>{personalityText}</Text>
        </View>
        
        <View style={styles.modalBody}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>태어난 날</Text>
            <Text style={styles.infoValue}>
              {pet.createdAt.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>떠난 날</Text>
            <Text style={styles.infoValue}>
              {pet.diedAt.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>함께한 시간</Text>
            <Text style={styles.infoValue}>
              {formatDuration(pet.totalLifetime)}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>원인</Text>
            <Text style={styles.infoValue}>{pet.causeOfDeath}</Text>
          </View>
        </View>
        
        <View style={styles.modalFooter}>
          <Text style={styles.farewell}>
            {deathReasonDetail}
          </Text>
          <Text style={styles.farewell}>
            {pet.name}와(과) 함께한 소중한 시간들을 기억해주세요.
          </Text>
        </View>
      </View>
    </View>
  );
};

// =============================================================================
// 통계 카드 컴포넌트
// =============================================================================

// 성능 최적화된 MemorialStats 컴포넌트
const MemorialStats: React.FC<{ deadPets: readonly DeadPet[] }> = React.memo(({ deadPets }) => {
  // 스토어에서 직접 계산된 통계 사용 (중복 계산 방지)
  const stats = useAppStore(selectMemorialStats);
  
  if (stats.totalPets === 0) {
    return null;
  }
  
  return (
    <View style={styles.statsContainer}>
      <Text style={styles.statsTitle}>추모 통계</Text>
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalPets}</Text>
          <Text style={styles.statLabel}>총 펫 수</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {formatDuration(stats.totalLifetime)}
          </Text>
          <Text style={styles.statLabel}>총 함께한 시간</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {formatDuration(stats.averageLifetime)}
          </Text>
          <Text style={styles.statLabel}>평균 생존 시간</Text>
        </View>
        
        {stats.longestLived && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.longestLived.name}</Text>
            <Text style={styles.statLabel}>가장 오래 산 펫</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// =============================================================================
// 메인 추모 공간 스크린
// =============================================================================

export const MemorialScreen: React.FC = () => {
  const deadPets = useAppStore(selectDeadPets);
  const [selectedPet, setSelectedPet] = React.useState<DeadPet | null>(null);
  
  // 죽은 날짜 순으로 정렬 (최신순) - 메모이제이션
  const sortedDeadPets = useMemo(() => 
    sortBy((pet: DeadPet) => -pet.diedAt.getTime())(deadPets),
    [deadPets]
  );
  
  // 콜백 함수들을 useCallback으로 메모이제이션
  const handlePetPress = useCallback((pet: DeadPet) => {
    setSelectedPet(pet);
  }, []);
  
  const handleCloseModal = useCallback(() => {
    setSelectedPet(null);
  }, []);
  
  // FlatList renderItem 콜백 메모이제이션
  const renderTombstone = useCallback(({ item }: { item: DeadPet }) => (
    <Tombstone 
      deadPet={item} 
      onPress={() => handlePetPress(item)} 
    />
  ), [handlePetPress]);
  
  // keyExtractor 메모이제이션
  const keyExtractor = useCallback((item: DeadPet) => item.id, []);
  
  if (sortedDeadPets.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>추모 공간</Text>
        </View>
        
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>🌸</Text>
          <Text style={styles.emptyStateTitle}>
            아직 떠나보낸 친구가 없어요
          </Text>
          <Text style={styles.emptyStateDescription}>
            펫을 잘 돌봐서 건강하게 키워보세요.{'\n'}
            이별한 친구들의 추억은 여기에 영원히 남아있을 거예요.
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>추모 공간</Text>
        <Text style={styles.headerSubtitle}>
          {sortedDeadPets.length}마리의 친구들을 기억하며
        </Text>
      </View>
      
      <MemorialStats deadPets={sortedDeadPets} />
      
      <FlatList
        data={sortedDeadPets}
        renderItem={renderTombstone}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        removeClippedSubviews={true}
        maxToRenderPerBatch={6}
        windowSize={10}
        initialNumToRender={6}
        updateCellsBatchingPeriod={50}
      />
      
      {selectedPet && (
        <PetDetailModal
          pet={selectedPet}
          onClose={handleCloseModal}
        />
      )}
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
    alignItems: 'center',
  },
  
  headerTitle: {
    fontSize: FONTS.SIZE.TITLE,
    fontFamily: FONTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  
  headerSubtitle: {
    fontSize: FONTS.SIZE.MEDIUM,
    fontFamily: FONTS.REGULAR,
    color: COLORS.TEXT_SECONDARY,
  },
  
  statsContainer: {
    margin: SPACING.LG,
    padding: SPACING.MD,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
  },
  
  statsTitle: {
    fontSize: FONTS.SIZE.LARGE,
    fontFamily: FONTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.MD,
    textAlign: 'center',
  },
  
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  
  statItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: SPACING.MD,
  },
  
  statValue: {
    fontSize: FONTS.SIZE.LARGE,
    fontFamily: FONTS.BOLD,
    color: COLORS.PRIMARY,
    marginBottom: 4,
    textAlign: 'center',
  },
  
  statLabel: {
    fontSize: FONTS.SIZE.SMALL,
    fontFamily: FONTS.REGULAR,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
  },
  
  listContainer: {
    paddingHorizontal: SPACING.LG,
    paddingBottom: SPACING.LG,
  },
  
  row: {
    justifyContent: 'space-between',
    marginBottom: SPACING.MD,
  },
  
  tombstone: {
    width: TOMBSTONE_WIDTH,
    backgroundColor: COLORS.SURFACE,
    borderRadius: 12,
    padding: SPACING.MD,
    alignItems: 'center',
    elevation: 2,
    shadowColor: COLORS.TEXT_PRIMARY,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  tombstoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  
  tombstoneEmoji: {
    fontSize: 32,
    marginRight: SPACING.XS,
  },
  
  personalityEmoji: {
    fontSize: 16,
  },
  
  tombstoneInfo: {
    alignItems: 'center',
    marginBottom: SPACING.SM,
  },
  
  petName: {
    fontSize: FONTS.SIZE.MEDIUM,
    fontFamily: FONTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 4,
  },
  
  lifespan: {
    fontSize: FONTS.SIZE.SMALL,
    fontFamily: FONTS.MEDIUM,
    color: COLORS.PRIMARY,
    marginBottom: 2,
  },
  
  deathDate: {
    fontSize: FONTS.SIZE.SMALL,
    fontFamily: FONTS.REGULAR,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 2,
  },
  
  deathReason: {
    fontSize: FONTS.SIZE.SMALL,
    fontFamily: FONTS.REGULAR,
    color: COLORS.ERROR,
  },
  
  tombstoneFooter: {
    paddingTop: SPACING.SM,
    borderTopWidth: 1,
    borderTopColor: COLORS.BACKGROUND,
    width: '100%',
    alignItems: 'center',
  },
  
  restInPeace: {
    fontSize: FONTS.SIZE.SMALL,
    fontFamily: FONTS.MEDIUM,
    color: COLORS.TEXT_SECONDARY,
    fontStyle: 'italic',
  },
  
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.XL,
  },
  
  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: SPACING.LG,
  },
  
  emptyStateTitle: {
    fontSize: FONTS.SIZE.LARGE,
    fontFamily: FONTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'center',
    marginBottom: SPACING.MD,
  },
  
  emptyStateDescription: {
    fontSize: FONTS.SIZE.MEDIUM,
    fontFamily: FONTS.REGULAR,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
  },
  
  // 모달 스타일
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.LG,
  },
  
  modalContent: {
    backgroundColor: COLORS.BACKGROUND,
    borderRadius: 16,
    padding: SPACING.LG,
    width: '100%',
    maxWidth: 400,
    position: 'relative',
  },
  
  closeButton: {
    position: 'absolute',
    top: SPACING.MD,
    right: SPACING.MD,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.SURFACE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  
  closeButtonText: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
  },
  
  modalHeader: {
    alignItems: 'center',
    marginBottom: SPACING.LG,
  },
  
  modalEmoji: {
    fontSize: 48,
    marginBottom: SPACING.SM,
  },
  
  modalPetName: {
    fontSize: FONTS.SIZE.XLARGE,
    fontFamily: FONTS.BOLD,
    color: COLORS.TEXT_PRIMARY,
    marginBottom: SPACING.XS,
  },
  
  modalPersonality: {
    fontSize: FONTS.SIZE.MEDIUM,
    fontFamily: FONTS.REGULAR,
    color: COLORS.PRIMARY,
  },
  
  modalBody: {
    marginBottom: SPACING.LG,
  },
  
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.SM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.SURFACE,
  },
  
  infoLabel: {
    fontSize: FONTS.SIZE.MEDIUM,
    fontFamily: FONTS.MEDIUM,
    color: COLORS.TEXT_SECONDARY,
  },
  
  infoValue: {
    fontSize: FONTS.SIZE.MEDIUM,
    fontFamily: FONTS.REGULAR,
    color: COLORS.TEXT_PRIMARY,
    textAlign: 'right',
    flex: 1,
    marginLeft: SPACING.MD,
  },
  
  modalFooter: {
    alignItems: 'center',
  },
  
  farewell: {
    fontSize: FONTS.SIZE.SMALL,
    fontFamily: FONTS.REGULAR,
    color: COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.SM,
  },
});