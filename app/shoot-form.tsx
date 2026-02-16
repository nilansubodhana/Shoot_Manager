import React, { useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { queryClient, apiRequest } from "@/lib/query-client";

function parseInitialDate(dateStr?: string): Date {
  if (!dateStr) return new Date();
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d;
  } catch {}
  return new Date();
}

export default function ShootFormScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    modelName?: string;
    salonName?: string;
    date?: string;
    price?: string;
    source?: string;
  }>();

  const isEditing = !!params.id;
  const isFromEdited = params.source === "edited";

  const [modelName, setModelName] = useState(params.modelName || "");
  const [salonName, setSalonName] = useState(params.salonName || "");
  const [selectedDate, setSelectedDate] = useState<Date>(parseInitialDate(params.date));
  const [hasPickedDate, setHasPickedDate] = useState(!!params.date);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [price, setPrice] = useState(params.price || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formattedDate = selectedDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      modelName: string;
      salonName: string;
      date: string;
      price: number;
    }) => {
      await apiRequest("POST", "/api/shoots", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shoots"] });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: {
      modelName: string;
      salonName: string;
      date: string;
      price: number;
    }) => {
      const endpoint = isFromEdited
        ? `/api/edited-shoots/${params.id}`
        : `/api/shoots/${params.id}`;
      await apiRequest("PUT", endpoint, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shoots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/edited-shoots"] });
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!modelName.trim()) newErrors.modelName = "Model name is required";
    if (!salonName.trim()) newErrors.salonName = "Salon name is required";
    if (!hasPickedDate) newErrors.date = "Please select a date";
    if (!price.trim()) {
      newErrors.price = "Price is required";
    } else if (isNaN(Number(price)) || Number(price) < 0) {
      newErrors.price = "Enter a valid price";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    const formData = {
      modelName: modelName.trim(),
      salonName: salonName.trim(),
      date: selectedDate.toISOString(),
      price: Number(price),
    };

    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDateChange = (_event: any, date?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      setHasPickedDate(true);
      if (errors.date) setErrors((e) => ({ ...e, date: "" }));
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const insets = useSafeAreaInsets();

  const renderDatePicker = () => {
    if (Platform.OS === "web") {
      return (
        <View style={styles.field}>
          <Text style={styles.label}>Date</Text>
          <View style={[styles.inputRow, errors.date ? styles.inputError : null]}>
            <Ionicons name="calendar-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              value={hasPickedDate ? selectedDate.toISOString().split("T")[0] : ""}
              onChangeText={(t) => {
                try {
                  const d = new Date(t);
                  if (!isNaN(d.getTime())) {
                    setSelectedDate(d);
                    setHasPickedDate(true);
                  }
                } catch {}
                if (errors.date) setErrors((e) => ({ ...e, date: "" }));
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
          {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : null}
        </View>
      );
    }

    if (Platform.OS === "ios") {
      return (
        <View style={styles.field}>
          <Text style={styles.label}>Date</Text>
          <View style={[styles.datePickerContainer, errors.date ? styles.inputError : null]}>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="inline"
              onChange={handleDateChange}
              themeVariant="dark"
              accentColor={Colors.accent}
              style={styles.iosDatePicker}
            />
          </View>
          {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : null}
        </View>
      );
    }

    return (
      <View style={styles.field}>
        <Text style={styles.label}>Date</Text>
        <Pressable
          style={[styles.inputRow, styles.dateButton, errors.date ? styles.inputError : null]}
          onPress={() => {
            if (Platform.OS !== "web") Haptics.selectionAsync();
            setShowDatePicker(true);
          }}
        >
          <Ionicons name="calendar" size={18} color={Colors.accent} />
          <Text style={[styles.dateText, !hasPickedDate && styles.datePlaceholder]}>
            {hasPickedDate ? formattedDate : "Select a date"}
          </Text>
        </Pressable>
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}
        {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : null}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.formTitle}>
          {isEditing ? "Edit Shoot" : "New Shoot"}
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close-circle" size={28} color={Colors.textSecondary} />
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
        onScrollBeginDrag={Keyboard.dismiss}
      >
        <View style={styles.formHeader}>
          <Text style={styles.formSubtitle}>
            {isEditing
              ? "Update the shoot details below"
              : "Fill in the details for your new shoot"}
          </Text>
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.field}>
            <Text style={styles.label}>Model Name</Text>
            <View style={[styles.inputRow, errors.modelName ? styles.inputError : null]}>
              <Ionicons name="person-outline" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={modelName}
                onChangeText={(t) => {
                  setModelName(t);
                  if (errors.modelName) setErrors((e) => ({ ...e, modelName: "" }));
                }}
                placeholder="Enter model name"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>
            {errors.modelName ? (
              <Text style={styles.errorText}>{errors.modelName}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Salon Name</Text>
            <View style={[styles.inputRow, errors.salonName ? styles.inputError : null]}>
              <Ionicons name="business-outline" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={salonName}
                onChangeText={(t) => {
                  setSalonName(t);
                  if (errors.salonName) setErrors((e) => ({ ...e, salonName: "" }));
                }}
                placeholder="Enter salon name"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>
            {errors.salonName ? (
              <Text style={styles.errorText}>{errors.salonName}</Text>
            ) : null}
          </View>

          {renderDatePicker()}

          <View style={styles.field}>
            <Text style={styles.label}>Price ($)</Text>
            <View style={[styles.inputRow, errors.price ? styles.inputError : null]}>
              <Ionicons name="cash-outline" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={(t) => {
                  setPrice(t);
                  if (errors.price) setErrors((e) => ({ ...e, price: "" }));
                }}
                placeholder="0.00"
                placeholderTextColor={Colors.textMuted}
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>
            {errors.price ? (
              <Text style={styles.errorText}>{errors.price}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.submitButton,
              pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              isSubmitting && { opacity: 0.6 },
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons
                  name={isEditing ? "checkmark" : "add"}
                  size={20}
                  color={Colors.white}
                />
                <Text style={styles.submitButtonText}>
                  {isEditing ? "Save Changes" : "Add Shoot"}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 16,
    gap: 24,
    paddingBottom: 40,
  },
  formHeader: {
    gap: 4,
  },
  formTitle: {
    fontSize: 22,
    fontFamily: "DMSans_700Bold",
    color: Colors.text,
  },
  formSubtitle: {
    fontSize: 14,
    fontFamily: "DMSans_400Regular",
    color: Colors.textSecondary,
  },
  fieldGroup: {
    gap: 18,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 14,
    gap: 10,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    fontFamily: "DMSans_400Regular",
    color: Colors.text,
  },
  datePickerContainer: {
    backgroundColor: Colors.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    overflow: "hidden",
    alignItems: "center",
    paddingVertical: 8,
  },
  iosDatePicker: {
    height: 320,
  },
  dateButton: {
    height: 48,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "DMSans_400Regular",
    color: Colors.text,
  },
  datePlaceholder: {
    color: Colors.textMuted,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "DMSans_400Regular",
    color: Colors.danger,
    marginLeft: 4,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.textSecondary,
  },
  submitButton: {
    flex: 2,
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: "DMSans_600SemiBold",
    color: Colors.white,
  },
});
