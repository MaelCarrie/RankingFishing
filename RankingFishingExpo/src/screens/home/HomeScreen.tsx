import React, { useEffect, useCallback } from 'react';
import {
  View, FlatList, RefreshControl, StyleSheet, Text, ActivityIndicator,
} from 'react-native';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchFeed, fetchMoreFeed, toggleLike } from '../../store/slices/capturesSlice';
import { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { Capture } from '../../store/types';
import { colors, spacing, typography } from '../../theme';
import CaptureCard from '../../components/captures/CaptureCard';
import CaptureCardSkeleton from '../../components/captures/CaptureCardSkeleton';
import EmptyState from '../../components/ui/EmptyState';
import ErrorState from '../../components/ui/ErrorState';
import Button from '../../components/ui/Button';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const {
    feed, isLoading, isRefreshing, isLoadingMore, feedLoaded, feedHasMore, feedError, loadMoreError,
  } = useAppSelector((s) => s.captures);
  const user = useAppSelector((s) => s.auth.user);

  useEffect(() => {
    dispatch(fetchFeed());
  }, [dispatch]);

  const handleRefresh = useCallback(() => {
    dispatch(fetchFeed({ refresh: true }));
  }, [dispatch]);

  const handleEndReached = useCallback(() => {
    // Le thunk ignore l'appel si une page est déjà en cours ou s'il n'y a plus rien
    if (!loadMoreError) dispatch(fetchMoreFeed());
  }, [dispatch, loadMoreError]);

  const handleLike = useCallback((captureId: string) => {
    if (!user) return;
    dispatch(toggleLike({ captureId, userId: user.id }));
  }, [dispatch, user]);

  const handlePress = useCallback((capture: Capture) => {
    navigation.navigate('CaptureDetail', { capture });
  }, [navigation]);

  const renderItem = useCallback(({ item }: { item: Capture }) => (
    <CaptureCard
      capture={item}
      currentUserId={user?.id}
      onLike={handleLike}
      onPress={handlePress}
      isPremium={user?.isPremium ?? false}
    />
  ), [user?.id, user?.isPremium, handleLike, handlePress]);

  // Premier chargement : silhouettes de cartes
  const showSkeletons = !feedLoaded && feed.length === 0 && !feedError;

  function renderFooter() {
    if (feed.length === 0) return null;
    if (isLoadingMore) {
      return (
        <View style={styles.footer} accessibilityLabel="Chargement de captures plus anciennes">
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }
    if (loadMoreError) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerError}>{loadMoreError}</Text>
          <Button
            title="Réessayer le chargement"
            icon="refresh-outline"
            variant="text"
            size="sm"
            onPress={() => dispatch(fetchMoreFeed())}
            style={styles.footerRetry}
          />
        </View>
      );
    }
    if (!feedHasMore) {
      return (
        <View style={styles.footer}>
          <Text style={styles.footerEnd}>Tu as vu toutes les captures.</Text>
        </View>
      );
    }
    return <View style={styles.footer} />;
  }

  return (
    <View style={styles.container}>
      {showSkeletons ? (
        <View style={styles.list} testID="feed-skeleton">
          <CaptureCardSkeleton />
          <CaptureCardSkeleton />
        </View>
      ) : (
        <FlatList
          data={feed}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.6}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListFooterComponent={renderFooter() ?? undefined}
          ListEmptyComponent={
            feedError ? (
              <ErrorState
                title="Le fil n'a pas pu se charger"
                message="Vérifie ta connexion, puis réessaie."
                retryLabel="Recharger le fil"
                onRetry={() => dispatch(fetchFeed())}
              />
            ) : isLoading ? undefined : (
              <EmptyState
                icon="fish-outline"
                title="Aucune capture pour l'instant"
                message="Publie ta première prise pour lancer le fil de la communauté."
                actionLabel="Publier une prise"
                onAction={() => navigation.navigate('NewCapture')}
              />
            )
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          windowSize={7}
          testID="feed-list"
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  list: { paddingTop: spacing.ms, paddingBottom: spacing.lg },

  footer: { minHeight: 64, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  footerEnd: { ...typography.footnote, color: colors.inkSecondary },
  footerError: { ...typography.footnote, color: colors.error, textAlign: 'center' },
  footerRetry: { alignSelf: 'center', marginTop: spacing.xs },
});
