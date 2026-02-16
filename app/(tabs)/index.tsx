import React, { useCallback, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { queryClient, apiRequest } from "@/lib/query-client";
import type { Shoot } from "@/shared/schema";

function ShootCard({
  shoot,
  onEdit,
  onDelete,
  onMoveToEdited,
}: {
  shoot: Shoot;
  onEdit: () => void;
  onDelete: () => void;
  onMoveToEdited: () => void;
}) {
  const formattedDate = new Date(shoot.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={18} color={Colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.modelName} numberOfLines={1}>
              {shoot.modelName}
            </Text>
            <Text style={styles.salonName} numberOfLines={1}>
              {shoot.salonName}
            </Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync();
              onMoveToEdited();
            }}
            hitSlop={8}
            style={styles.bookmarkBtn}
          >
            <Ionicons name="bookmark" size={26} color={Colors.warning} />
          </Pressable>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync();
              onEdit();
            }}
            hitSlop={8}
          >
            <Ionicons name="pencil" size={16} color={Colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync();
              onDelete();
            }}
            hitSlop={8}
          >
            <Ionicons name="trash-outline" size={16} color={Colors.danger} />
          </Pressable>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <View style={styles.cardDetail}>
          <Ionicons name="calendar-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.detailText}>{formattedDate}</Text>
        </View>
        <View style={styles.priceTag}>
          <Text style={styles.priceText}>${shoot.price.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
}

export default function ShootsScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: shoots = [], isLoading } = useQuery<Shoot[]>({
    queryKey: ["/api/shoots"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/shoots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shoots"] });
    },
  });

  const moveToEditedMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/shoots/${id}/move-to-edited`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shoots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/edited-shoots"] });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["/api/shoots"] });
    setRefreshing(false);
  }, []);

  const handleDelete = (shoot: Shoot) => {
    if (Platform.OS === "web") {
      if (confirm(`Delete shoot for ${shoot.modelName}?`)) {
        deleteMutation.mutate(shoot.id);
      }
    } else {
      Alert.alert(
        "Delete Shoot",
        `Are you sure you want to delete the shoot for ${shoot.modelName}?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteMutation.mutate(shoot.id),
          },
        ]
      );
    }
  };

  const handleEdit = (shoot: Shoot) => {
    router.push({
      pathname: "/shoot-form",
      params: {
        id: shoot.id,
        modelName: shoot.modelName,
        salonName: shoot.salonName,
        date: shoot.date,
        price: shoot.price.toString(),
      },
    });
  };

  const handleMoveToEdited = (shoot: Shoot) => {
    if (Platform.OS === "web") {
      if (confirm(`Move "${shoot.modelName}" to Edited tab?`)) {
        moveToEditedMutation.mutate(shoot.id);
      }
    } else {
      Alert.alert(
        "Move to Edited",
        `Move "${shoot.modelName}" to the Edited tab?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Move",
            onPress: () => moveToEditedMutation.mutate(shoot.id),
          },
        ]
      );
    }
  };

  const handleAdd = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/shoot-form");
  };

  const sortedShoots = [...shoots].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Text style={styles.headerTitle}>Shoots</Text>
        <Text style={styles.headerSubtitle}>{shoots.length} total</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : sortedShoots.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="camera-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No shoots yet</Text>
          <Text style={styles.emptyText}>
            Tap the + button to add your first shoot
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedShoots}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ShootCard
              shoot={item}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item)}
              onMoveToEdited={() => handleMoveToEdited(item)}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + (Platform.OS === "web" ? 50 : 90) },
          pressed && { transform: [{ scale: 0.92 }], opacity: 0.9 },
        ]}
        onPress={handleAdd}
      >
        <Ionicons name="add" size={28} color={Colors.white} />
      </Pressable>
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
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(233, 69, 96, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  modelName: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.text,
    flexShrink: 1,
  },
  salonName: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
    marginTop: 1,
  },
  cardActions: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  bookmarkBtn: {
    marginRight: 2,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  detailText: {
    fontSize: 13,
    fontFamily: "DMSans_400Regular",
    color: Colors.textMuted,
  },
  priceTag: {
    backgroundColor: "rgba(0, 214, 143, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 15,
    fontFamily: "DMSans_700Bold",
    color: Colors.success,
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
