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
import type { EditedShoot } from "@/shared/schema";

function EditedShootCard({
  item,
  onEdit,
  onMoveBack,
  onDelete,
}: {
  item: EditedShoot;
  onEdit: () => void;
  onMoveBack: () => void;
  onDelete: () => void;
}) {
  const formattedDate = new Date(item.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const editedDate = new Date(item.editedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={18} color={Colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.modelName} numberOfLines={1}>
              {item.modelName}
            </Text>
            <Text style={styles.salonName} numberOfLines={1}>
              {item.salonName}
            </Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.selectionAsync();
              onMoveBack();
            }}
            hitSlop={8}
            style={styles.moveBackBtn}
          >
            <Ionicons name="arrow-undo" size={24} color={Colors.accent} />
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
          <Text style={styles.priceText}>${item.price.toFixed(2)}</Text>
        </View>
      </View>
      <View style={styles.movedAtRow}>
        <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
        <Text style={styles.movedAtText}>Moved {editedDate}</Text>
      </View>
    </View>
  );
}

export default function EditedScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const { data: editedShoots = [], isLoading } = useQuery<EditedShoot[]>({
    queryKey: ["/api/edited-shoots"],
  });

  const moveBackMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/edited-shoots/${id}/move-back`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/edited-shoots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shoots"] });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/edited-shoots/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/edited-shoots"] });
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ["/api/edited-shoots"] });
    setRefreshing(false);
  }, []);

  const handleEdit = (item: EditedShoot) => {
    router.push({
      pathname: "/shoot-form",
      params: {
        id: item.id,
        modelName: item.modelName,
        salonName: item.salonName,
        date: item.date,
        price: item.price.toString(),
        source: "edited",
      },
    });
  };

  const handleMoveBack = (item: EditedShoot) => {
    if (Platform.OS === "web") {
      if (confirm(`Move "${item.modelName}" back to Shoots?`)) {
        moveBackMutation.mutate(item.id);
      }
    } else {
      Alert.alert(
        "Move to Shoots",
        `Move "${item.modelName}" back to the Shoots tab?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Move",
            onPress: () => moveBackMutation.mutate(item.id),
          },
        ]
      );
    }
  };

  const handleDelete = (item: EditedShoot) => {
    if (Platform.OS === "web") {
      if (confirm(`Delete "${item.modelName}"?`)) {
        deleteMutation.mutate(item.id);
      }
    } else {
      Alert.alert(
        "Delete Shoot",
        `Are you sure you want to delete "${item.modelName}"?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteMutation.mutate(item.id),
          },
        ]
      );
    }
  };

  const sortedEdits = [...editedShoots].sort(
    (a, b) => new Date(b.editedAt).getTime() - new Date(a.editedAt).getTime()
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Text style={styles.headerTitle}>Edited</Text>
        <Text style={styles.headerSubtitle}>{editedShoots.length} shoots</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : sortedEdits.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="bookmark-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No edited shoots</Text>
          <Text style={styles.emptyText}>
            Tap the bookmark icon on a shoot to move it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedEdits}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EditedShootCard
              item={item}
              onEdit={() => handleEdit(item)}
              onMoveBack={() => handleMoveBack(item)}
              onDelete={() => handleDelete(item)}
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
    backgroundColor: "rgba(255, 179, 71, 0.15)",
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
  moveBackBtn: {
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
  movedAtRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  movedAtText: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    color: Colors.textMuted,
  },
});
