// app/history/index.tsx — Verification History Screen
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { storage } from '../../services/storage';
import { VerificationResult } from '../../types';
import {
  Colors, Typography, Spacing, BorderRadius, TRUST_SCORE_CONFIG,
} from '../../constants/theme';

type HistoryFilter = 'all' | 'high_risk' | 'false_claims' | 'low_confidence' | 'recent';

export default function HistoryScreen() {
  const [history, setHistory] = useState<VerificationResult[]>([]);
  const [filtered, setFiltered] = useState<VerificationResult[]>([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(async () => {
    const h = await storage.getHistory();
    setHistory(h);
    applyFilter(h, activeFilter, search);
  }, [activeFilter, search]);

  useEffect(() => { loadHistory(); }, []);

  const applyFilter = (items: VerificationResult[], filter: HistoryFilter, q: string) => {
    let result = [...items];

    if (q.trim()) {
      // Search is not available without claim text in stored object; filter by date
      result = result.filter((i) => new Date(i.created_at).toLocaleDateString().includes(q));
    }

    switch (filter) {
      case 'high_risk':
        result = result.filter((i) => (i.trust_score ?? 100) < 50);
        break;
      case 'false_claims':
        result = result.filter((i) => (i.false || 0) > 0);
        break;
      case 'low_confidence':
        result = result.filter((i) => (i.unverifiable || 0) > 0);
        break;
      case 'recent':
        result = result.slice(0, 10);
        break;
    }

    setFiltered(result);
  };

  const handleFilterChange = (f: HistoryFilter) => {
    setActiveFilter(f);
    applyFilter(history, f, search);
  };

  const handleSearch = (q: string) => {
    setSearch(q);
    applyFilter(history, activeFilter, q);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Remove this verification from history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await storage.deleteVerification(id);
          loadHistory();
        },
      },
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const FILTERS: { key: HistoryFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'recent', label: 'Recent' },
    { key: 'false_claims', label: 'False Claims' },
    { key: 'high_risk', label: 'High Risk' },
    { key: 'low_confidence', label: 'Unverifiable' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search history..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={handleSearch}
        />
      </View>

      {/* Filters */}
      <FlatList
        data={FILTERS}
        horizontal
        keyExtractor={(i) => i.key}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        style={styles.filterRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterTab, activeFilter === item.key && styles.filterTabActive]}
            onPress={() => handleFilterChange(item.key)}
          >
            <Text style={[styles.filterText, activeFilter === item.key && styles.filterTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.verification_id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No verifications yet</Text>
            <Text style={styles.emptyDesc}>Your verification history will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <HistoryCard
            item={item}
            onPress={() => router.push({ pathname: '/history/[id]', params: { id: item.verification_id, data: JSON.stringify(item) } })}
            onDelete={() => handleDelete(item.verification_id)}
          />
        )}
      />
    </SafeAreaView>
  );
}

function HistoryCard({
  item,
  onPress,
  onDelete,
}: {
  item: VerificationResult;
  onPress: () => void;
  onDelete: () => void;
}) {
  const score = item.trust_score;
  const scoreConfig = score !== undefined ? TRUST_SCORE_CONFIG(score) : null;
  const date = new Date(item.created_at);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardLeft}>
        {score !== undefined && scoreConfig ? (
          <View style={[styles.scoreBadge, { borderColor: `${scoreConfig.color}40` }]}>
            <Text style={[styles.scoreText, { color: scoreConfig.color }]}>{score}</Text>
          </View>
        ) : (
          <View style={[styles.scoreBadge, { borderColor: Colors.surfaceBorder }]}>
            <Text style={[styles.scoreText, { color: Colors.textMuted }]}>—</Text>
          </View>
        )}
      </View>
      <View style={styles.cardCenter}>
        <Text style={styles.cardDate}>
          {date.toLocaleDateString()} · {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
        <Text style={styles.cardStats}>
          {item.total_claims} claims
          {item.verified > 0 ? ` · ✅ ${item.verified}` : ''}
          {item.false > 0 ? ` · ❌ ${item.false}` : ''}
          {item.unverifiable > 0 ? ` · ❓ ${item.unverifiable}` : ''}
        </Text>
      </View>
      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.deleteBtnText}>🗑</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchRow: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md },
  searchInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.base,
    fontFamily: 'Inter_400Regular',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  filterRow: { marginBottom: Spacing.md, maxHeight: 44 },
  filterList: { paddingHorizontal: Spacing.xl, gap: Spacing.sm },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  filterTabActive: {
    backgroundColor: `${Colors.primary}15`,
    borderColor: Colors.primary,
  },
  filterText: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontFamily: 'Inter_500Medium' },
  filterTextActive: { color: Colors.primary },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.md,
  },
  cardLeft: {},
  scoreBadge: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  scoreText: { fontSize: Typography.fontSize.base, fontFamily: 'Inter_700Bold' },
  cardCenter: { flex: 1 },
  cardDate: { color: Colors.textMuted, fontSize: Typography.fontSize.xs, fontFamily: 'Inter_500Medium', marginBottom: 4 },
  cardStats: { color: Colors.textSecondary, fontSize: Typography.fontSize.sm, fontFamily: 'Inter_400Regular' },
  deleteBtn: { padding: Spacing.xs },
  deleteBtnText: { fontSize: 18 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.base },
  emptyTitle: { color: Colors.textPrimary, fontSize: Typography.fontSize.lg, fontFamily: 'Inter_600SemiBold', marginBottom: Spacing.sm },
  emptyDesc: { color: Colors.textSecondary, fontSize: Typography.fontSize.base, fontFamily: 'Inter_400Regular', textAlign: 'center' },
});
