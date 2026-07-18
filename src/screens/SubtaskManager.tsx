/**
 * SubtaskManagerScreen.tsx
 * Dedicated screen for viewing and managing all subtasks of a parent task.
 *
 * Navigation usage:
 *   navigation.navigate("SubtaskManager", {
 *     task,          // SiteTask
 *     siteId,        // string
 *     subtasks,      // SiteSubtask[]  (initial list)
 *     users,         // { id, name }[]
 *     onBack,        // () => void  – called on goBack to refresh parent
 *   });
 */

import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from '../components/DateTimePicker';
import React, { useEffect, useState, useRef } from "react";
import {
  Alert,
  Animated,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Modal,
  Portal,
  Snackbar,
  Surface,
  Text,
  TextInput,
} from "react-native-paper";
import { supabase } from "../config/supabase";
import { SiteSubtask, SiteTask } from "../types";
import { LinearGradient } from "expo-linear-gradient";
import PhotoPicker from "../components/PhotoPicker";
import PhotoGallery from "../components/PhotoGallery";

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg: "#F7F8FC",
  white: "#FFFFFF",
  border: "#E8EDF5",
  textPrimary: "#0F1F3D",
  textSecondary: "#5C6E8A",
  textMuted: "#94A3B8",
  pending: "#F59E0B",
  pendingBg: "#FFF8EC",
  progress: "#3B82F6",
  progressBg: "#EEF4FF",
  done: "#10B981",
  doneBg: "#EDFAF4",
  danger: "#EF4444",
  dangerBg: "#FEF2F2",
  purple: "#7C3AED",
  purpleBg: "#F3F0FF",
  gradStart: "#1D4ED8",
  gradEnd: "#3B82F6",
};

const STATUS: Record<string, { color: string; bg: string; icon: string; label: string; next: string }> = {
  pending:     { color: C.pending,  bg: C.pendingBg,  icon: "time-outline",             label: "Pending",     next: "in_progress" },
  in_progress: { color: C.progress, bg: C.progressBg, icon: "sync-outline",             label: "In Progress", next: "completed"   },
  completed:   { color: C.done,     bg: C.doneBg,     icon: "checkmark-circle-outline", label: "Completed",   next: "pending"     },
};

const fmtDate = (d: string) => {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
};

const isOverdue = (dateStr: string, status: string) =>
  status !== "completed" && new Date(dateStr) < new Date();

// ─── Mini Components ─────────────────────────────────────────────────────────
const StatusPill = ({ status }: { status: string }) => {
  const cfg = STATUS[status] || STATUS.pending;
  return (
    <View style={[pill.wrap, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
      <Text style={[pill.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
};
const pill = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20 },
  text: { fontSize: 11, fontWeight: "700" },
});

// ─── Animated Subtask Card ───────────────────────────────────────────────────
const SubtaskCard = ({
  item, index, onToggle, onEdit, onDelete, photos, onAddPhoto, onDeletePhoto,
}: {
  item: SiteSubtask;
  index: number;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  photos?: any[];
  onAddPhoto?: (uri: string, cloudinaryUrl: string, cloudinaryId: string) => void;
  onDeletePhoto?: (photoId: string, cloudinaryId: string) => Promise<void>;
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, delay: index * 50, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 280, delay: index * 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const cfg = STATUS[item.status] || STATUS.pending;
  const overdue = item.expected_date ? isOverdue(item.expected_date, item.status) : false;
  const isComplete = item.status === "completed";

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <Surface style={[styles.subCard, isComplete && styles.subCardDone]} elevation={1}>
        {/* Status accent stripe */}
        <View style={[styles.subCardStripe, { backgroundColor: cfg.color }]} />

        <View style={styles.subCardInner}>
          {/* Checkbox & name */}
          <View style={styles.subCardTop}>
            <Pressable onPress={onToggle} hitSlop={10} style={styles.checkHit}>
              <View style={[styles.checkCircle,
                { borderColor: cfg.color, backgroundColor: isComplete ? cfg.color : "transparent" }]}>
                {isComplete && <Ionicons name="checkmark" size={13} color="#fff" />}
                {item.status === "in_progress" && !isComplete && (
                  <View style={[styles.checkDot, { backgroundColor: cfg.color }]} />
                )}
              </View>
            </Pressable>

            <View style={styles.subCardContent}>
              <Text numberOfLines={2}
                style={[styles.subName, isComplete && styles.subNameDone]}>
                {item.subtask_name}
              </Text>

              {item.description ? (
                <Text numberOfLines={2} style={styles.subDesc}>{item.description}</Text>
              ) : null}

              {/* Tags row */}
              <View style={styles.subTagsRow}>
                <StatusPill status={item.status} />
              </View>

              {/* Meta row */}
              <View style={styles.subMetaRow}>
                {!!item.assigned_user_name && (
                  <View style={styles.metaChip}>
                    <Ionicons name="person-outline" size={12} color={C.progress} />
                    <Text style={[styles.metaChipText, { color: C.progress }]}>{item.assigned_user_name}</Text>
                  </View>
                )}
                {!!item.expected_date && (
                  <View style={[styles.metaChip, overdue && { backgroundColor: C.dangerBg }]}>
                    <Ionicons name="calendar-outline" size={12} color={overdue ? C.danger : C.textSecondary} />
                    <Text style={[styles.metaChipText, overdue && { color: C.danger, fontWeight: "700" }]}>
                      {fmtDate(item.expected_date)}
                    </Text>
                    {overdue && <Ionicons name="warning-outline" size={11} color={C.danger} />}
                  </View>
                )}
                {!!item.completed_date && (
                  <View style={[styles.metaChip, { backgroundColor: C.doneBg }]}>
                    <Ionicons name="checkmark-done-outline" size={12} color={C.done} />
                    <Text style={[styles.metaChipText, { color: C.done }]}>
                      Done {fmtDate(item.completed_date)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Photos section */}
              {photos && photos.length > 0 && (
                <PhotoGallery 
                  photos={photos.map(p => ({
                    id: p.id,
                    url: p.photo_url,
                    cloudinaryId: p.cloudinary_id,
                    description: p.description,
                    createdAt: p.created_at,
                  }))}
                  onDelete={onDeletePhoto}
                  disabled={false}
                />
              )}

              {/* Add photo button */}
              {onAddPhoto && (
                <View style={styles.photoPickerWrap}>
                  <PhotoPicker
                    onPhotoSelected={(uri, cloudinaryUrl, cloudinaryId) => 
                      onAddPhoto(uri, cloudinaryUrl, cloudinaryId)
                    }
                    folder={`subtask-${item.id}`}
                  />
                </View>
              )}
            </View>
          </View>

          {/* Action row */}
          <View style={styles.subActions}>
            <TouchableOpacity style={styles.subActionBtn} onPress={onToggle}>
              <Ionicons name="refresh-outline" size={14} color={C.textSecondary} />
              <Text style={[styles.subActionText, { color: C.textSecondary }]}>
                → {STATUS[STATUS[item.status]?.next || "pending"]?.label}
              </Text>
            </TouchableOpacity>
            <View style={styles.subActionSep} />
            <TouchableOpacity style={styles.subActionBtn} onPress={onEdit}>
              <Ionicons name="pencil-outline" size={14} color={C.progress} />
              <Text style={[styles.subActionText, { color: C.progress }]}>Edit</Text>
            </TouchableOpacity>
            <View style={styles.subActionSep} />
            <TouchableOpacity style={styles.subActionBtn} onPress={onDelete}>
              <Ionicons name="trash-outline" size={14} color={C.danger} />
              <Text style={[styles.subActionText, { color: C.danger }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Surface>
    </Animated.View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
const SubtaskManagerScreen = ({ route, navigation }: any) => {
  const { task, siteId, users: initUsers = [], onBack }: {
    task: SiteTask; siteId: string; users: any[]; onBack?: () => void;
  } = route.params;

  const [subtasks, setSubtasks] = useState<SiteSubtask[]>([]);
  const [users, setUsers] = useState<any[]>(initUsers);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [subtaskPhotos, setSubtaskPhotos] = useState<{ [key: string]: any[] }>({});
  const [formData, setFormData] = useState({
    subtask_name: "", description: "", expected_date: new Date(), assigned_to: "",
  });

  useEffect(() => {
    fetchSubtasks();
    if (!initUsers.length) fetchUsers();
    navigation.setOptions({
      headerShown: false,
    });
  }, []);

  const showMsg = (m: string) => { setSnackbarMessage(m); setSnackbarVisible(true); };

  const fetchSubtasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("site_subtasks")
        .select("*")
        .eq("parent_task_id", task.id)
        .order("order_index", { ascending: true });
      if (error) throw error;
      setSubtasks(data || []);
      
      // Load photos for all subtasks
      if (data && data.length > 0) {
        const subtaskIds = data.map((s) => s.id);
        await fetchPhotosForSubtasks(subtaskIds);
      }
    } catch (e: any) { showMsg(e.message || "Failed"); }
    finally { setLoading(false); }
  };

  const fetchPhotosForSubtasks = async (subtaskIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from("subtask_photos")
        .select("*")
        .in("subtask_id", subtaskIds)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      const photosBySubtask: { [key: string]: any[] } = {};
      (data || []).forEach((photo) => {
        if (!photosBySubtask[photo.subtask_id]) {
          photosBySubtask[photo.subtask_id] = [];
        }
        photosBySubtask[photo.subtask_id].push(photo);
      });
      
      setSubtaskPhotos(photosBySubtask);
    } catch (e) {
      console.error("Error fetching subtask photos:", e);
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("users").select("id, name").eq("is_active", true);
    if (!error && data) setUsers(data);
  };

  const openAdd = () => {
    setEditingId(null);
    setFormData({ subtask_name: "", description: "", expected_date: new Date(), assigned_to: "" });
    setModalVisible(true);
  };

  const openEdit = (st: SiteSubtask) => {
    setEditingId(st.id);
    setFormData({
      subtask_name: st.subtask_name, description: st.description || "",
      expected_date: new Date(st.expected_date || new Date()),
      assigned_to: st.assigned_to || "",
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.subtask_name.trim()) { showMsg("Enter subtask name"); return; }
    try {
      setSubmitting(true);
      const userData = users.find((u) => u.id === formData.assigned_to);
      const payload = {
        subtask_name: formData.subtask_name,
        description: formData.description || null,
        expected_date: formData.expected_date.toISOString().split("T")[0],
        assigned_to: formData.assigned_to || null,
        assigned_user_name: userData?.name || null,
      };
      if (editingId) {
        const { error } = await supabase.from("site_subtasks").update(payload).eq("id", editingId);
        if (error) throw error;
        showMsg("Subtask updated ✓");
      } else {
        const maxIdx = subtasks.length ? Math.max(...subtasks.map((s) => s.order_index)) + 1 : 0;
        const { error } = await supabase.from("site_subtasks").insert({
          ...payload, parent_task_id: task.id, site_id: siteId, status: "pending", order_index: maxIdx,
        });
        if (error) throw error;
        showMsg("Subtask added ✓");
      }
      setModalVisible(false);
      await fetchSubtasks();
    } catch (e: any) { showMsg(e.message || "Failed"); }
    finally { setSubmitting(false); }
  };

  const toggleStatus = async (st: SiteSubtask) => {
    const next = STATUS[st.status]?.next || "pending";
    const upd: any = { status: next, completed_date: next === "completed" ? new Date().toISOString().split("T")[0] : null };
    const { error } = await supabase.from("site_subtasks").update(upd).eq("id", st.id);
    if (error) { showMsg(error.message); return; }
    showMsg(`Marked ${STATUS[next]?.label}`);
    await fetchSubtasks();
  };

  const deleteSubtask = (id: string) => Alert.alert("Delete Subtask", "Are you sure?", [
    { text: "Cancel", style: "cancel" },
    { text: "Delete", style: "destructive", onPress: async () => {
      const { error } = await supabase.from("site_subtasks").delete().eq("id", id);
      if (error) { showMsg(error.message); return; }
      showMsg("Deleted"); await fetchSubtasks();
    }},
  ]);

  const handleAddSubtaskPhoto = async (subtaskId: string, localUri: string, cloudinaryUrl: string, cloudinaryId: string) => {
    try {
      const { error } = await supabase.from("subtask_photos").insert({
        subtask_id: subtaskId,
        parent_task_id: task.id,
        site_id: siteId,
        photo_url: cloudinaryUrl,
        cloudinary_id: cloudinaryId,
        uploaded_by: route.params.users ? route.params.users[0]?.id : null,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
      
      showMsg("Photo added ✓");
      
      // Refresh photos
      if (subtasks.length > 0) {
        const ids = subtasks.map((s) => s.id);
        await fetchPhotosForSubtasks(ids);
      }
    } catch (e: any) {
      showMsg(e.message || "Failed to add photo");
    }
  };

  const handleDeleteSubtaskPhoto = async (photoId: string, cloudinaryId: string) => {
    try {
      const { error } = await supabase.from("subtask_photos").delete().eq("id", photoId);

      if (error) throw error;
      
      showMsg("Photo deleted ✓");
      
      // Refresh photos
      if (subtasks.length > 0) {
        const ids = subtasks.map((s) => s.id);
        await fetchPhotosForSubtasks(ids);
      }
    } catch (e: any) {
      showMsg(e.message || "Failed to delete photo");
    }
  };

  const handleBack = () => {
    onBack?.();
    navigation.goBack();
  };

  // Stats
  const counts = { pending: 0, in_progress: 0, completed: 0 };
  subtasks.forEach((s) => { counts[s.status as keyof typeof counts]++; });
  const progressPct = subtasks.length ? counts.completed / subtasks.length : 0;

  // Filtered
  const filtered = subtasks.filter((s) => filterStatus === "all" || s.status === filterStatus);

  return (
    <View style={styles.root}>
      {/* ── Custom Header ── */}
      <LinearGradient colors={[C.gradStart, C.gradEnd]} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>Subtasks</Text>
            <Text numberOfLines={1} style={styles.headerTask}>{task.task_name}</Text>
          </View>
          <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
            <Ionicons name="add" size={22} color={C.gradStart} />
          </TouchableOpacity>
        </View>

        {/* Overall progress */}
        <View style={styles.overallProgress}>
          <View style={styles.overallProgressBarBg}>
            <Animated.View style={[styles.overallProgressBarFill, { width: `${progressPct * 100}%` }]} />
          </View>
          <Text style={styles.overallProgressLabel}>
            {counts.completed} of {subtasks.length} complete · {Math.round(progressPct * 100)}%
          </Text>
        </View>

        {/* Stat pills */}
        <View style={styles.statsRow}>
          {([
            { key: "pending", icon: "time-outline", color: C.pending },
            { key: "in_progress", icon: "sync-outline", color: "#93C5FD" },
            { key: "completed", icon: "checkmark-circle-outline", color: C.done },
          ] as const).map(({ key, icon, color }) => (
            <View key={key} style={styles.statPill}>
              <Ionicons name={icon} size={14} color={color} />
              <Text style={[styles.statPillNum, { color }]}>{counts[key]}</Text>
              <Text style={styles.statPillLabel}>{STATUS[key].label}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>

      {/* ── Filter Tabs ── */}
      <View style={styles.filterRow}>
        {(["all", "pending", "in_progress", "completed"] as const).map((key) => {
          const active = filterStatus === key;
          const cfg = key !== "all" ? STATUS[key] : null;
          return (
            <TouchableOpacity key={key} onPress={() => setFilterStatus(key)}
              style={[styles.filterTab, active && { borderBottomColor: cfg?.color || C.gradStart, borderBottomWidth: 2 }]}>
              {cfg && <View style={[styles.filterDot, { backgroundColor: active ? cfg.color : C.border }]} />}
              <Text style={[styles.filterTabText, active && { color: cfg?.color || C.gradStart, fontWeight: "700" }]}>
                {key === "all" ? `All (${subtasks.length})` : `${STATUS[key].label} (${counts[key]})`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={C.progress} /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <SubtaskCard
              item={item} index={index}
              onToggle={() => toggleStatus(item)}
              onEdit={() => openEdit(item)}
              onDelete={() => deleteSubtask(item.id)}
              photos={subtaskPhotos[item.id] || []}
              onAddPhoto={(uri, cloudinaryUrl, cloudinaryId) => handleAddSubtaskPhoto(item.id, uri, cloudinaryUrl, cloudinaryId)}
              onDeletePhoto={(photoId, cloudinaryId) => handleDeleteSubtaskPhoto(photoId, cloudinaryId)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons name="list-outline" size={40} color={C.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>
                {filterStatus === "all" ? "No subtasks yet" : `No ${STATUS[filterStatus]?.label} subtasks`}
              </Text>
              {filterStatus === "all" && (
                <Text style={styles.emptySubTitle}>Break this task into smaller steps</Text>
              )}
              {filterStatus === "all" && (
                <TouchableOpacity onPress={openAdd} style={styles.emptyAddBtn}>
                  <Ionicons name="add-circle-outline" size={18} color={C.white} />
                  <Text style={styles.emptyAddBtnText}>Add First Subtask</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* ── FAB ── */}
      <TouchableOpacity onPress={openAdd} style={styles.fab}>
        <LinearGradient colors={[C.gradStart, C.gradEnd]} style={styles.fabGrad}>
          <Ionicons name="add" size={26} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* ── Modal ── */}
      <Portal>
        <Modal visible={modalVisible} onDismiss={() => !submitting && setModalVisible(false)}
          contentContainerStyle={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.modalHandle} />

            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>{editingId ? "Edit Subtask" : "New Subtask"}</Text>
                <Text style={styles.modalSubTitle} numberOfLines={1}>{task.task_name}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={C.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              label="Subtask Name *" mode="outlined" value={formData.subtask_name}
              onChangeText={(t) => setFormData({ ...formData, subtask_name: t })}
              style={styles.input} outlineStyle={{ borderRadius: 10 }}
              autoFocus={!editingId}
            />

            <TextInput
              label="Description (optional)" mode="outlined" value={formData.description}
              onChangeText={(t) => setFormData({ ...formData, description: t })}
              multiline numberOfLines={3} style={styles.input} outlineStyle={{ borderRadius: 10 }}
            />

            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <TextInput
                label="Deadline" mode="outlined" editable={false} pointerEvents="none"
                value={fmtDate(formData.expected_date.toISOString().split("T")[0])}
                style={styles.input} outlineStyle={{ borderRadius: 10 }}
                right={<TextInput.Icon icon="calendar-month-outline" />}
              />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker value={formData.expected_date} mode="date"
                onChange={(_, d) => { setShowDatePicker(false); if (d) setFormData({ ...formData, expected_date: d }); }} />
            )}

            <Text style={styles.fieldLabel}>Assign To</Text>
            <View style={styles.pickerBox}>
              <Picker selectedValue={formData.assigned_to}
                onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}>
                <Picker.Item label="Unassigned" value="" />
                {users.map((u) => <Picker.Item key={u.id} label={u.name} value={u.id} />)}
              </Picker>
            </View>

            {/* Quick assign chips */}
            {users.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity onPress={() => setFormData({ ...formData, assigned_to: "" })}
                    style={[styles.quickChip, !formData.assigned_to && styles.quickChipActive]}>
                    <Ionicons name="person-remove-outline" size={13} color={!formData.assigned_to ? "#fff" : C.textSecondary} />
                    <Text style={[styles.quickChipText, !formData.assigned_to && { color: "#fff" }]}>None</Text>
                  </TouchableOpacity>
                  {users.map((u) => (
                    <TouchableOpacity key={u.id} onPress={() => setFormData({ ...formData, assigned_to: u.id })}
                      style={[styles.quickChip, formData.assigned_to === u.id && styles.quickChipActive]}>
                      <Ionicons name="person-outline" size={13} color={formData.assigned_to === u.id ? "#fff" : C.textSecondary} />
                      <Text style={[styles.quickChipText, formData.assigned_to === u.id && { color: "#fff" }]}>{u.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}

            <View style={styles.modalBtnRow}>
              <Button mode="outlined" onPress={() => setModalVisible(false)} style={styles.modalBtnHalf}
                contentStyle={{ paddingVertical: 4 }} labelStyle={{ fontWeight: "700" }}>
                Cancel
              </Button>
              <Button mode="contained" onPress={handleSubmit} loading={submitting}
                style={[styles.modalBtnHalf, { backgroundColor: C.gradStart }]}
                contentStyle={{ paddingVertical: 4 }} labelStyle={{ fontWeight: "700" }}>
                {editingId ? "Update" : "Add Subtask"}
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={2500}
        style={{ borderRadius: 10, marginBottom: 90 }}>
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  // Header
  header: { paddingTop: Platform.OS === "ios" ? 52 : 32, paddingBottom: 20, paddingHorizontal: 20 },
  headerTop: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.18)", justifyContent: "center", alignItems: "center" },
  headerCenter: { flex: 1, marginHorizontal: 12 },
  headerLabel: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.7)", letterSpacing: 1.2, textTransform: "uppercase" },
  headerTask: { fontSize: 17, fontWeight: "800", color: "#fff", marginTop: 2 },
  addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" },

  // Progress bar in header
  overallProgress: { marginBottom: 16 },
  overallProgressBarBg: { height: 6, backgroundColor: "rgba(255,255,255,0.25)", borderRadius: 10, overflow: "hidden", marginBottom: 6 },
  overallProgressBarFill: { height: "100%", backgroundColor: C.done, borderRadius: 10 },
  overallProgressLabel: { fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: "600" },

  // Stats pills in header
  statsRow: { flexDirection: "row", gap: 8 },
  statPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  statPillNum: { fontSize: 13, fontWeight: "800" },
  statPillLabel: { fontSize: 11, color: "rgba(255,255,255,0.75)", fontWeight: "600" },

  // Filter tabs
  filterRow: { flexDirection: "row", backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  filterTab: { flex: 1, alignItems: "center", paddingVertical: 12, flexDirection: "row", justifyContent: "center", gap: 5, borderBottomWidth: 2, borderBottomColor: "transparent" },
  filterDot: { width: 7, height: 7, borderRadius: 4 },
  filterTabText: { fontSize: 11, fontWeight: "600", color: C.textSecondary },

  // List
  list: { padding: 16, paddingBottom: 110 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Subtask card
  subCard: { borderRadius: 14, marginBottom: 12, backgroundColor: C.white, overflow: "hidden", flexDirection: "row" },
  subCardDone: { opacity: 0.7 },
  subCardStripe: { width: 4 },
  subCardInner: { flex: 1, paddingTop: 14, paddingBottom: 6, paddingRight: 14, paddingLeft: 10 },
  subCardTop: { flexDirection: "row", gap: 10 },
  checkHit: { paddingTop: 2 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  checkDot: { width: 8, height: 8, borderRadius: 4 },
  subCardContent: { flex: 1 },
  subName: { fontSize: 15, fontWeight: "700", color: C.textPrimary, lineHeight: 21, marginBottom: 3 },
  subNameDone: { textDecorationLine: "line-through", color: C.textMuted },
  subDesc: { fontSize: 13, color: C.textSecondary, lineHeight: 18, marginBottom: 8, fontStyle: "italic" },
  subTagsRow: { flexDirection: "row", gap: 6, marginBottom: 8, flexWrap: "wrap" },
  subMetaRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 8 },
  metaChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: C.bg, borderRadius: 20 },
  metaChipText: { fontSize: 11, fontWeight: "600", color: C.textSecondary },
  subActions: { flexDirection: "row", alignItems: "center", marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border, gap: 2 },
  subActionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  subActionText: { fontSize: 12, fontWeight: "600" },
  subActionSep: { width: 1, height: 14, backgroundColor: C.border, marginHorizontal: 2 },

  photoPickerWrap: { marginTop: 12, marginBottom: 8 },

  // Empty
  emptyWrap: { alignItems: "center", paddingVertical: 80 },
  emptyIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: C.bg, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: C.textSecondary, marginBottom: 6 },
  emptySubTitle: { fontSize: 13, color: C.textMuted, marginBottom: 24 },
  emptyAddBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.gradStart, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24 },
  emptyAddBtnText: { fontSize: 14, fontWeight: "700", color: C.white },

  // FAB
  fab: { position: "absolute", bottom: 28, right: 24 },
  fabGrad: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", shadowColor: C.gradStart, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },

  // Modal
  modal: { backgroundColor: C.white, marginHorizontal: 12, borderRadius: 20, padding: 20, maxHeight: "90%" },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 20 },
  modalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  modalClose: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.bg, justifyContent: "center", alignItems: "center" },
  modalTitle: { fontSize: 20, fontWeight: "800", color: C.textPrimary },
  modalSubTitle: { fontSize: 13, color: C.textSecondary, marginTop: 3, maxWidth: 240 },
  input: { marginBottom: 12, backgroundColor: C.white },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: C.textPrimary, marginBottom: 6, marginTop: 4 },
  pickerBox: { borderWidth: 1, borderColor: C.border, borderRadius: 10, marginBottom: 14, overflow: "hidden", backgroundColor: C.white },
  quickChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  quickChipActive: { backgroundColor: C.gradStart, borderColor: C.gradStart },
  quickChipText: { fontSize: 12, fontWeight: "600", color: C.textSecondary },
  modalBtnRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalBtnHalf: { flex: 1, borderRadius: 10 },
});

export default SubtaskManagerScreen;