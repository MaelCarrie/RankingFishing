import React, { useEffect, useCallback } from 'react';
import {
  View, FlatList, RefreshControl, StyleSheet, Text,
  ActivityIndicator, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchFeed, toggleLike } from '../../store/slices/capturesSlice';
import { MainTabParamList, RootStackParamList } from '../../navigation/types';
import { Capture } from '../../store/types';
import { colors, spacing, typography } from '../../theme';
import CaptureCard from '../../components/captures/CaptureCard';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function HomeScreen() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const { feed, isLoading } = useAppSelector((s) => s.captures);
  const { user } = useAppSelector((s) => s.auth);

  useEffect(() => {
    dispatch(fetchFeed());
  }, [dispatch]);

  const handleRefresh = useCallback(() => {
    dispatch(fetchFeed());
  }, [dispatch]);

  const handleLike = useCallback((captureId: string) => {
    if (!user) return;
    dispatch(toggleLike({ captureId, userId: user.id }));
  }, [dispatch, user]);

  const handlePress = useCallback((capture: Capture) => {
    navigation.navigate('CaptureDetail', { capture });
  }, [navigation]);

  if (isLoading && feed.length === 0) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CaptureCard
            capture={item}
            currentUserId={user?.id}
            onLike={handleLike}
            onPress={handlePress}
            isPremium={user?.isPremium ?? false}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          <View style={styles.feedHeader}>
            <Text style={styles.feedTitle}>Fil d'actualité</Text>
            <Text style={styles.feedSubtitle}>Dernières captures de la communauté</Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎣</Text>
            <Text style={styles.emptyTitle}>Aucune capture pour l'instant</Text>
            <Text style={styles.emptyText}>Sois le premier à partager ta prise !</Text>
          </View>
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB nouvelle capture */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewCapture')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },

  list: { paddingBottom: 80 },

  feedHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    paddingTop: spacing.lg,
  },
  feedTitle: { ...typography.h3, color: colors.textPrimary },
  feedSubtitle: { ...typography.bodySmall, color: colors.textSecondary, marginTop: 2 },

  empty: { alignItems: 'center', paddingTop: spacing.xxl },
  emptyIcon: { fontSize: 56, marginBottom: spacing.md },
  emptyTitle: { ...typography.h3, color: colors.textPrimary, marginBottom: spacing.sm },
  emptyText: { ...typography.body, color: colors.textSecondary },

  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});
