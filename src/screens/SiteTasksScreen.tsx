import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from '../components/DateTimePicker';
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
  Pressable,
  Platform,
} from "react-native";
import {
  Button,
  Card,
  Checkbox,
  Chip,
  FAB,
  Modal,
  Portal,
  Text,
  TextInput,
  ActivityIndicator,
  Snackbar,
  Surface,
} from "react-native-paper";
import { supabase } from "../config/supabase";
import { useAuth } from "../context/AuthContext";
import { SiteTask, SiteSubtask } from "../types";
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
  purple: "#7C3AED",
  purpleBg: "#F3F0FF",
  gradStart: "#1D4ED8",
  gradEnd: "#3B82F6",
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  pending:     { color: C.pending,  bg: C.pendingBg,  icon: "time-outline",       label: "Pending"     },
  in_progress: { color: C.progress, bg: C.progressBg, icon: "sync-outline",       label: "In Progress" },
  completed:   { color: C.done,     bg: C.doneBg,     icon: "checkmark-circle-outline", label: "Done"  },
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtDate = (d: string) => {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}/${dt.getFullYear()}`;
};

const isOverdue = (dateStr: string, status: string) => {
  if (status === "completed") return false;
  return new Date(dateStr) < new Date();
};

// ─── StatusBadge ────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <View style={[badgeStyle.wrap, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
      <Text style={[badgeStyle.text, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
};
const badgeStyle = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  text: { fontSize: 11, fontWeight: "700", letterSpacing: 0.2 },
});

// ─── StatCard ────────────────────────────────────────────────────────────────
const StatCard = ({ count, label, color }: { count: number; label: string; color: string }) => (
  <View style={statStyle.card}>
    <Text style={[statStyle.num, { color }]}>{count}</Text>
    <Text style={statStyle.label}>{label}</Text>
  </View>
);
const statStyle = StyleSheet.create({
  card: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, minWidth: 72 },
  num: { fontSize: 26, fontWeight: "800", color: "#fff" },
  label: { fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 2, fontWeight: "600" },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
const SiteTasksScreen = ({ route, navigation }: any) => {
  const { siteId, siteName } = route.params;
  const { user, isRoot } = useAuth();
  const [tasks, setTasks] = useState<SiteTask[]>([]);
  const [subtasks, setSubtasks] = useState<{ [key: string]: SiteSubtask[] }>({});
  const [users, setUsers] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [copyTaskModalVisible, setCopyTaskModalVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [copyTaskId, setCopyTaskId] = useState<string | null>(null);
  const [taskPhotos, setTaskPhotos] = useState<{ [key: string]: any[] }>({});
  const [photoLoadingTaskId, setPhotoLoadingTaskId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    task_name: "", task_type: "approval", description: "",
    expected_date: new Date(), assigned_to: "",
  });
  const [copyFormData, setCopyFormData] = useState({ target_site_id: "", include_subtasks: true });

  useEffect(() => { fetchInitialData(); }, [siteId]);

  const showMessage = (msg: string) => { setSnackbarMessage(msg); setSnackbarVisible(true); };

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchTasks(), fetchUsers(), fetchSites()]);
    } catch (e: any) { showMessage(e.message || "Failed to load"); }
    finally { setLoading(false); }
  };

  const fetchTasks = async () => {
    let query = supabase.from("site_tasks").select("*").eq("site_id", siteId);
    
    // Only show tasks assigned to current user or if user is root
    if (!isRoot && user?.id) {
      query = query.eq("assigned_to", user.id);
    }
    
    const { data: tasksData, error } = await query.order("created_at", { ascending: false });
    if (error) throw error;
    setTasks(tasksData || []);
    if (tasksData?.length) {
      const ids = tasksData.map((t) => t.id);
      const { data: stData, error: stErr } = await supabase
        .from("site_subtasks").select("*").in("parent_task_id", ids).order("order_index", { ascending: true });
      if (stErr) throw stErr;
      const byParent: Record<string, SiteSubtask[]> = {};
      (stData || []).forEach((st) => { (byParent[st.parent_task_id] = byParent[st.parent_task_id] || []).push(st); });
      setSubtasks(byParent);
      // Load photos for all tasks
      await fetchPhotosForTasks(ids);
    }
  };

  const fetchPhotosForTasks = async (taskIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from("task_photos")
        .select("*")
        .in("task_id", taskIds)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      const photosByTask: { [key: string]: any[] } = {};
      (data || []).forEach((photo) => {
        if (!photosByTask[photo.task_id]) {
          photosByTask[photo.task_id] = [];
        }
        photosByTask[photo.task_id].push(photo);
      });
      
      setTaskPhotos(photosByTask);
    } catch (e) {
      console.error("Error fetching photos:", e);
    }
  };

  const handleAddPhoto = async (taskId: string, localUri: string, cloudinaryUrl: string, cloudinaryId: string) => {
    try {
      const { error } = await supabase.from("task_photos").insert({
        task_id: taskId,
        site_id: siteId,
        photo_url: cloudinaryUrl,
        cloudinary_id: cloudinaryId,
        uploaded_by: user?.id,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;
      
      showMessage("Photo added ✓");
      
      // Refresh photos
      if (tasks.length > 0) {
        const ids = tasks.map((t) => t.id);
        await fetchPhotosForTasks(ids);
      }
    } catch (e: any) {
      showMessage(e.message || "Failed to add photo");
    }
  };

  const handleDeletePhoto = async (photoId: string, cloudinaryId: string) => {
    try {
      const { error } = await supabase.from("task_photos").delete().eq("id", photoId);

      if (error) throw error;
      
      showMessage("Photo deleted ✓");
      
      // Refresh photos
      if (tasks.length > 0) {
        const ids = tasks.map((t) => t.id);
        await fetchPhotosForTasks(ids);
      }
    } catch (e: any) {
      showMessage(e.message || "Failed to delete photo");
    }
  };

  const fetchUsers = async () => {
    const { data, error } = await supabase.from("users").select("id, name").eq("is_active", true);
    if (error) throw error;
    setUsers(data || []);
  };

  const fetchSites = async () => {
    const { data, error } = await supabase.from("sites").select("id, name").eq("status", "active");
    if (error) throw error;
    setSites(data || []);
  };

  const calcStatus = (task: SiteTask): "pending" | "in_progress" | "completed" => {
    const ts = subtasks[task.id] || [];
    if (!ts.length) return task.status;
    const done = ts.filter((s) => s.status === "completed").length;
    if (done === ts.length) return "completed";
    if (done > 0) return "in_progress";
    return "pending";
  };

  const handleSubmit = async () => {
    // Only root users can create or edit tasks
    if (!isRoot) {
      showMessage("Only administrators can manage tasks");
      setModalVisible(false);
      return;
    }
    
    if (!formData.task_name.trim()) { showMessage("Enter task name"); return; }
    try {
      setSubmitting(true);
      const userData = users.find((u) => u.id === formData.assigned_to);
      const payload = {
        task_name: formData.task_name, task_type: formData.task_type,
        description: formData.description || null,
        expected_date: formData.expected_date.toISOString().split("T")[0],
        assigned_to: formData.assigned_to || null,
        assigned_user_name: userData?.name || null,
      };
      if (editingTaskId) {
        const { error } = await supabase.from("site_tasks").update(payload).eq("id", editingTaskId);
        if (error) throw error;
        showMessage("Task updated ✓");
      } else {
        const { error } = await supabase.from("site_tasks").insert({ ...payload, site_id: siteId, status: "pending" });
        if (error) throw error;
        showMessage("Task created ✓");
      }
      setModalVisible(false);
      setEditingTaskId(null);
      setFormData({ task_name: "", task_type: "approval", description: "", expected_date: new Date(), assigned_to: "" });
      await fetchTasks();
    } catch (e: any) { showMessage(e.message || "Failed"); }
    finally { setSubmitting(false); }
  };

  const toggleTaskStatus = async (task: SiteTask) => {
    const ts = subtasks[task.id] || [];
    if (ts.length > 0) { showMessage("Manage status via subtasks"); return; }
    const map: any = { pending: "in_progress", in_progress: "completed", completed: "pending" };
    const newStatus = map[task.status];
    const upd: any = { status: newStatus, completed_date: newStatus === "completed" ? new Date().toISOString().split("T")[0] : null };
    const { error } = await supabase.from("site_tasks").update(upd).eq("id", task.id);
    if (error) { showMessage(error.message); return; }
    showMessage(`Marked ${newStatus}`);
    await fetchTasks();
  };

  const deleteTask = (id: string) => {
    if (!isRoot) {
      showMessage("Only administrators can delete tasks");
      return;
    }
    Alert.alert("Delete Task", "Also removes all subtasks.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        const { error } = await supabase.from("site_tasks").delete().eq("id", id);
        if (error) { showMessage(error.message); return; }
        showMessage("Deleted"); await fetchTasks();
      }},
    ]);
  };

  const editTask = (task: SiteTask) => {
    if (!isRoot) {
      showMessage("Only administrators can edit tasks");
      return;
    }
    setEditingTaskId(task.id);
    setFormData({
      task_name: task.task_name, task_type: task.task_type || "approval",
      description: task.description || "",
      expected_date: new Date(task.expected_date || new Date()),
      assigned_to: task.assigned_to || "",
    });
    setModalVisible(true);
  };

  const handleCopyTask = async () => {
    if (!isRoot) {
      showMessage("Only administrators can copy tasks");
      setCopyTaskModalVisible(false);
      return;
    }
    if (!copyTaskId || !copyFormData.target_site_id) { showMessage("Select a target site"); return; }
    try {
      setSubmitting(true);
      const src = tasks.find((t) => t.id === copyTaskId);
      if (!src) throw new Error("Task not found");
      const { data: newTask, error: te } = await supabase
        .from("site_tasks")
        .insert({ site_id: copyFormData.target_site_id, task_name: src.task_name, task_type: src.task_type,
          description: src.description, expected_date: src.expected_date, status: "pending",
          assigned_to: null, assigned_user_name: null })
        .select().single();
      if (te) throw te;
      if (copyFormData.include_subtasks) {
        const sts = subtasks[copyTaskId] || [];
        if (sts.length) {
          const { error: se } = await supabase.from("site_subtasks").insert(
            sts.map((s) => ({ parent_task_id: newTask.id, site_id: copyFormData.target_site_id,
              subtask_name: s.subtask_name, description: s.description, expected_date: s.expected_date,
              status: "pending", assigned_to: null, assigned_user_name: null, order_index: s.order_index }))
          );
          if (se) throw se;
        }
      }
      showMessage("Task copied ✓");
      setCopyTaskModalVisible(false); setCopyTaskId(null);
      setCopyFormData({ target_site_id: "", include_subtasks: true });
    } catch (e: any) { showMessage(e.message || "Failed"); }
    finally { setSubmitting(false); }
  };

  const filteredTasks = tasks.filter((t) => filterStatus === "all" || calcStatus(t) === filterStatus);
  const counts = { pending: 0, in_progress: 0, completed: 0 };
  tasks.forEach((t) => { const s = calcStatus(t); counts[s]++; });

  // ── Task Card ──────────────────────────────────────────────────────────────
  const renderTask = ({ item }: { item: SiteTask }) => {
    const ts = subtasks[item.id] || [];
    const status = calcStatus(item);
    const done = ts.filter((s) => s.status === "completed").length;
    const progress = ts.length ? done / ts.length : 0;
    const overdue = item.expected_date && isOverdue(item.expected_date, status);
    const cfg = STATUS_CONFIG[status];
    const photos = taskPhotos[item.id] || [];

    return (
      <Surface style={styles.taskCard} elevation={1}>
        {/* Left accent bar */}
        <View style={[styles.taskAccent, { backgroundColor: cfg.color }]} />

        <View style={styles.taskBody}>
          {/* Top row */}
          <View style={styles.taskTopRow}>
            <Pressable onPress={() => toggleTaskStatus(item)} style={styles.checkWrap}>
              <View style={[styles.checkCircle, { borderColor: cfg.color, backgroundColor: status === "completed" ? cfg.color : "transparent" }]}>
                {status === "completed" && <Ionicons name="checkmark" size={13} color="#fff" />}
              </View>
            </Pressable>

            <View style={styles.taskMeta}>
              <Text numberOfLines={2} style={[styles.taskTitle, status === "completed" && styles.strikethrough]}>
                {item.task_name}
              </Text>
              {item.description ? (
                <Text numberOfLines={2} style={styles.taskDesc}>{item.description}</Text>
              ) : null}

              <View style={styles.tagsRow}>
                <StatusBadge status={status} />
                <View style={styles.typeChip}>
                  <Text style={styles.typeChipText}>{item.task_type}</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                {!!item.assigned_user_name && (
                  <View style={styles.metaItem}>
                    <Ionicons name="person-outline" size={12} color={C.textSecondary} />
                    <Text style={styles.metaText}>{item.assigned_user_name}</Text>
                  </View>
                )}
                {!!item.expected_date && (
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={12} color={overdue ? C.danger : C.textSecondary} />
                    <Text style={[styles.metaText, overdue && { color: C.danger, fontWeight: "700" }]}>
                      {fmtDate(item.expected_date)}
                      {overdue ? "  ⚠️" : ""}
                    </Text>
                  </View>
                )}
              </View>

              {/* Subtask progress */}
              {ts.length > 0 && (
                <View style={styles.progressWrap}>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: cfg.color }]} />
                  </View>
                  <Text style={styles.progressLabel}>{done}/{ts.length} subtasks</Text>
                </View>
              )}

              {/* Photos section */}
              {photos.length > 0 && (
                <PhotoGallery 
                  photos={photos.map(p => ({
                    id: p.id,
                    url: p.photo_url,
                    cloudinaryId: p.cloudinary_id,
                    description: p.description,
                    createdAt: p.created_at,
                  }))}
                  onDelete={isRoot ? (photoId, cloudinaryId) => handleDeletePhoto(photoId, cloudinaryId) : undefined}
                  disabled={!isRoot}
                />
              )}

              {/* Add photo button - only for root users */}
              {isRoot && (
                <View style={styles.photoPickerWrap}>
                  <PhotoPicker
                    onPhotoSelected={(uri, cloudinaryUrl, cloudinaryId) => 
                      handleAddPhoto(item.id, uri, cloudinaryUrl, cloudinaryId)
                    }
                    folder={`task-${item.id}`}
                  />
                </View>
              )}
            </View>
          </View>

          {/* Action bar */}
          <View style={styles.actionBar}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate("SubtaskManager", { task: item, siteId, subtasks: ts, users, onBack: fetchTasks })}
            >
              <Ionicons name="list-outline" size={15} color={C.purple} />
              <Text style={[styles.actionBtnText, { color: C.purple }]}>
                Subtasks{ts.length > 0 ? ` (${ts.length})` : ""}
              </Text>
            </TouchableOpacity>

            {isRoot && (
              <>
                <View style={styles.actionDivider} />

                <TouchableOpacity style={styles.actionBtn} onPress={() => editTask(item)}>
                  <Ionicons name="pencil-outline" size={15} color={C.progress} />
                  <Text style={[styles.actionBtnText, { color: C.progress }]}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => { setCopyTaskId(item.id); setCopyTaskModalVisible(true); }}>
                  <Ionicons name="copy-outline" size={15} color={C.textSecondary} />
                  <Text style={[styles.actionBtnText, { color: C.textSecondary }]}>Copy</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionBtn} onPress={() => deleteTask(item.id)}>
                  <Ionicons name="trash-outline" size={15} color={C.danger} />
                  <Text style={[styles.actionBtnText, { color: C.danger }]}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Surface>
    );
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <LinearGradient colors={[C.gradStart, C.gradEnd]} style={styles.header}>
        <Text style={styles.siteName}>{siteName}</Text>
        <Text style={styles.siteSubLabel}>Task Overview</Text>
        <View style={styles.statsRow}>
          <StatCard count={counts.pending} label="Pending" color={C.pending} />
          <StatCard count={counts.in_progress} label="In Progress" color="#93C5FD" />
          <StatCard count={counts.completed} label="Done" color={C.done} />
        </View>
      </LinearGradient>

      {/* Filter Chips */}
      <View style={styles.filterBar}>
        {([
          { key: "all", label: `All  ${tasks.length}` },
          { key: "pending", label: `Pending  ${counts.pending}` },
          { key: "in_progress", label: `Progress  ${counts.in_progress}` },
          { key: "completed", label: `Done  ${counts.completed}` },
        ] as const).map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            onPress={() => setFilterStatus(key)}
            style={[styles.filterChip, filterStatus === key && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filterStatus === key && styles.filterChipTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={C.progress} /></View>
      ) : (
        <FlatList
          data={filteredTasks}
          renderItem={renderTask}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="clipboard-outline" size={52} color={C.textMuted} />
              <Text style={styles.emptyText}>No tasks yet</Text>
              <Text style={styles.emptySubText}>
                {isRoot ? "Tap + to create your first task" : "No tasks assigned to you"}
              </Text>
            </View>
          }
        />
      )}

      {/* FAB - Only for root users */}
      {isRoot && (
        <FAB
          icon="plus"
          style={styles.fab}
          color="#fff"
          onPress={() => {
            setEditingTaskId(null);
            setFormData({ task_name: "", task_type: "approval", description: "", expected_date: new Date(), assigned_to: "" });
            setModalVisible(true);
          }}
        />
      )}

      <Portal>
        {/* ── Task Modal ── */}
        <Modal visible={modalVisible} onDismiss={() => !submitting && setModalVisible(false)} contentContainerStyle={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{editingTaskId ? "Edit Task" : "New Task"}</Text>

            <TextInput label="Task Name *" mode="outlined" value={formData.task_name}
              onChangeText={(t) => setFormData({ ...formData, task_name: t })}
              style={styles.input} outlineStyle={{ borderRadius: 10 }} />

            <Text style={styles.fieldLabel}>Task Type</Text>
            <View style={styles.pickerBox}>
              <Picker selectedValue={formData.task_type}
                onValueChange={(v) => setFormData({ ...formData, task_type: v })}>
                <Picker.Item label="Approval" value="approval" />
                <Picker.Item label="Work" value="work" />
                <Picker.Item label="Follow-up" value="follow-up" />
              </Picker>
            </View>

            <TextInput label="Description (optional)" mode="outlined" value={formData.description}
              onChangeText={(t) => setFormData({ ...formData, description: t })}
              multiline numberOfLines={3} style={styles.input} outlineStyle={{ borderRadius: 10 }} />

            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <TextInput label="Deadline" mode="outlined" editable={false} pointerEvents="none"
                value={fmtDate(formData.expected_date.toISOString().split("T")[0])}
                style={styles.input} outlineStyle={{ borderRadius: 10 }}
                right={<TextInput.Icon icon="calendar" />} />
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

            <View style={styles.modalBtnRow}>
              <Button mode="outlined" onPress={() => setModalVisible(false)} style={styles.modalBtnHalf}
                contentStyle={{ paddingVertical: 4 }} labelStyle={{ fontWeight: "700" }}>
                Cancel
              </Button>
              <Button mode="contained" onPress={handleSubmit} loading={submitting}
                style={[styles.modalBtnHalf, { backgroundColor: C.gradStart }]}
                contentStyle={{ paddingVertical: 4 }} labelStyle={{ fontWeight: "700" }}>
                {editingTaskId ? "Update" : "Create"}
              </Button>
            </View>
          </ScrollView>
        </Modal>

        {/* ── Copy Modal ── */}
        <Modal visible={copyTaskModalVisible} onDismiss={() => !submitting && setCopyTaskModalVisible(false)} contentContainerStyle={styles.modal}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Copy Task</Text>
            <Text style={styles.modalSubTitle}>Duplicate this task to another site</Text>

            <Text style={styles.fieldLabel}>Target Site</Text>
            <View style={styles.pickerBox}>
              <Picker selectedValue={copyFormData.target_site_id}
                onValueChange={(v) => setCopyFormData({ ...copyFormData, target_site_id: v })}>
                <Picker.Item label="— Select Site —" value="" />
                {sites.filter((s) => s.id !== siteId).map((s) => <Picker.Item key={s.id} label={s.name} value={s.id} />)}
              </Picker>
            </View>

            <Pressable onPress={() => setCopyFormData({ ...copyFormData, include_subtasks: !copyFormData.include_subtasks })}
              style={styles.checkRow}>
              <View style={[styles.checkboxSquare, copyFormData.include_subtasks && { backgroundColor: C.gradStart, borderColor: C.gradStart }]}>
                {copyFormData.include_subtasks && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.checkLabel}>Include all subtasks</Text>
                <Text style={styles.checkSubLabel}>Subtasks will be copied without assignments</Text>
              </View>
            </Pressable>

            <View style={styles.modalBtnRow}>
              <Button mode="outlined" onPress={() => setCopyTaskModalVisible(false)} style={styles.modalBtnHalf}
                contentStyle={{ paddingVertical: 4 }}>Cancel</Button>
              <Button mode="contained" onPress={handleCopyTask} loading={submitting}
                style={[styles.modalBtnHalf, { backgroundColor: C.gradStart }]}
                contentStyle={{ paddingVertical: 4 }} labelStyle={{ fontWeight: "700" }}>Copy Task</Button>
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
  header: { paddingTop: Platform.OS === "ios" ? 52 : 32, paddingBottom: 24, paddingHorizontal: 20 },
  siteName: { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: 0.3 },
  siteSubLabel: { fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 2, marginBottom: 18 },
  statsRow: { flexDirection: "row", gap: 10 },

  // Filter
  filterBar: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 14, gap: 8, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  filterChipActive: { backgroundColor: C.gradStart, borderColor: C.gradStart },
  filterChipText: { fontSize: 12, fontWeight: "600", color: C.textSecondary },
  filterChipTextActive: { color: "#fff" },

  // List
  list: { padding: 16, paddingBottom: 110 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },

  // Task Card
  taskCard: { flexDirection: "row", borderRadius: 14, marginBottom: 12, backgroundColor: C.white, overflow: "hidden" },
  taskAccent: { width: 4 },
  taskBody: { flex: 1, paddingTop: 14, paddingBottom: 6, paddingRight: 14, paddingLeft: 10 },
  taskTopRow: { flexDirection: "row", gap: 10 },
  checkWrap: { paddingTop: 2 },
  checkCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, justifyContent: "center", alignItems: "center" },
  taskMeta: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: "700", color: C.textPrimary, lineHeight: 21, marginBottom: 3 },
  strikethrough: { textDecorationLine: "line-through", color: C.textMuted },
  taskDesc: { fontSize: 13, color: C.textSecondary, lineHeight: 18, marginBottom: 8 },
  tagsRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 8 },
  typeChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  typeChipText: { fontSize: 11, fontWeight: "600", color: C.textSecondary, textTransform: "capitalize" },
  metaRow: { flexDirection: "row", gap: 14, flexWrap: "wrap", marginBottom: 8 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: C.textSecondary, fontWeight: "500" },
  progressWrap: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  progressBarBg: { flex: 1, height: 5, backgroundColor: C.border, borderRadius: 10, overflow: "hidden" },
  progressBarFill: { height: "100%", borderRadius: 10 },
  progressLabel: { fontSize: 11, color: C.textMuted, fontWeight: "600", minWidth: 70 },

  photoPickerWrap: { marginTop: 12, marginBottom: 8 },

  // Action bar
  actionBar: { flexDirection: "row", alignItems: "center", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border, gap: 2 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 6 },
  actionBtnText: { fontSize: 12, fontWeight: "600" },
  actionDivider: { width: 1, height: 14, backgroundColor: C.border, marginHorizontal: 2 },

  // Empty
  emptyWrap: { alignItems: "center", paddingVertical: 80 },
  emptyText: { fontSize: 17, fontWeight: "700", color: C.textSecondary, marginTop: 16 },
  emptySubText: { fontSize: 13, color: C.textMuted, marginTop: 4 },

  // FAB
  fab: { position: "absolute", bottom: 28, right: 24, backgroundColor: C.gradStart },

  // Modal
  modal: { backgroundColor: C.white, marginHorizontal: 12, borderRadius: 20, padding: 20, maxHeight: "85%" },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "800", color: C.textPrimary, marginBottom: 4 },
  modalSubTitle: { fontSize: 13, color: C.textSecondary, marginBottom: 18 },
  input: { marginBottom: 12, backgroundColor: C.white },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: C.textPrimary, marginBottom: 6, marginTop: 4 },
  pickerBox: { borderWidth: 1, borderColor: C.border, borderRadius: 10, marginBottom: 14, overflow: "hidden", backgroundColor: C.white },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: C.bg, borderRadius: 12, marginBottom: 20 },
  checkboxSquare: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.border, justifyContent: "center", alignItems: "center" },
  checkLabel: { fontSize: 14, fontWeight: "700", color: C.textPrimary },
  checkSubLabel: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  modalBtnRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalBtnHalf: { flex: 1, borderRadius: 10 },
});

export default SiteTasksScreen;