import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { queryClient } from "@/lib/query-client";
import type { Shoot, MonthlyStats } from "@/shared/schema";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function computeMonthlyStats(shoots: Shoot[]): MonthlyStats[] {
  const map = new Map<string, MonthlyStats>();

  shoots.forEach((shoot) => {
    const d = new Date(shoot.date);
    const year = d.getFullYear();
    const monthNumber = d.getMonth();
    const key = `${year}-${monthNumber}`;

    if (!map.has(key)) {
      map.set(key, {
        month: MONTHS[monthNumber],
        year,
        monthNumber,
        shootCount: 0,
        totalEarnings: 0,
      });
    }
    const stat = map.get(key)!;
    stat.shootCount += 1;
    stat.totalEarnings += shoot.price;
  });

  return Array.from(map.values()).sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.monthNumber - a.monthNumber;
  });
}

function StatCard({
  icon,
  iconColor,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: iconColor + "1A" }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MonthRow({ stat, maxEarnings }: { stat: MonthlyStats; maxEarnings: number }) {
  const barWidth = maxEarnings > 0 ? (stat.totalEarnings / maxEarnings) * 100 : 0;

  return (
    <View style={styles.monthRow}>
      <View style={styles.monthInfo}>
        <Text style={styles.monthName}>
          {stat.month.substring(0, 3)} {stat.year}
        </Text>
        <Text style={styles.monthShoots}>
          {stat.shootCount} shoot{stat.shootCount !== 1 ? "s" : ""}
        </Text>
      </View>
      <View style={styles.barContainer}>
        <View
          style={[
            styles.bar,
            { width: `${Math.max(barWidth, 4)}%` },
          ]}
        />
      </View>
      <Text style={styles.monthEarnings}>${stat.totalEarnings.toFixed(0)}</Text>
    </View>
  );
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: shoots = [], isLoading } = useQuery<Shoot[]>({
    queryKey: ["/api/shoots"],
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["/api/shoots"] });
    setRefreshing(false);
  }, []);

  const monthlyStats = computeMonthlyStats(shoots);
  const totalEarnings = shoots.reduce((sum, s) => sum + s.price, 0);
  const totalShoots = shoots.length;
  const avgPerShoot = totalShoots > 0 ? totalEarnings / totalShoots : 0;
  const maxEarnings = Math.max(...monthlyStats.map((s) => s.totalEarnings), 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Text style={styles.headerTitle}>Stats</Text>
        <Text style={styles.headerSubtitle}>Performance overview</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : shoots.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="analytics-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No data yet</Text>
          <Text style={styles.emptyText}>
            Add some shoots to see your stats here
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: insets.bottom + (Platform.OS === "web" ? 50 : 100),
            },
          ]}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
            />
          }
        >
          <View style={styles.overviewRow}>
            <StatCard
              icon="camera"
              iconColor={Colors.accent}
              label="Total Shoots"
              value={totalShoots.toString()}
            />
            <StatCard
              icon="cash-outline"
              iconColor={Colors.success}
              label="Total Earned"
              value={`$${totalEarnings.toFixed(0)}`}
            />
            <StatCard
              icon="trending-up"
              iconColor={Colors.warning}
              label="Avg/Shoot"
              value={`$${avgPerShoot.toFixed(0)}`}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
            <View style={styles.monthsList}>
              {monthlyStats.map((stat) => (
                <MonthRow
                  key={`${stat.year}-${stat.monthNumber}`}
                  stat={stat}
                  maxEarnings={maxEarnings}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: Colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
  },
  scrollContent: {
    padding: 16,
    gap: 20,
  },
  overviewRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: "center",
    gap: 8,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "DMSans_500Medium",
    color: Colors.textMuted,
    textAlign: "center",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  monthsList: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: "hidden",
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: 12,
  },
  monthInfo: {
    width: 70,
  },
  monthName: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
  },
  monthShoots: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: Colors.textMuted,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 4,
    overflow: "hidden",
  },
  bar: {
    height: "100%",
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },
  monthEarnings: {
    fontSize: 14,
    fontFamily: "DMSans_700Bold",
    color: Colors.success,
    width: 60,
    textAlign: "right",
  },
});
