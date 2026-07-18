import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Checkbox,
  Chip,
  Modal,
  Portal,
  Text,
  TextInput,
  ActivityIndicator,
  Snackbar,
} from "react-native-paper";
import { supabase } from "../config/supabase";
import { useAuth } from "../context/AuthContext";
import { SiteTask, SiteSubtask } from "../types";
import DateTimePicker from '../components/DateTimePicker';
import { TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const MyTasksScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<SiteTask[]>([]);
  const [subtasks, setSubtasks] = useState<{ [key: string]: SiteSubtask[] }>({});
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<any>("all");
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [subtaskModalVisible, setSubtaskModalVisible] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [subtaskFormData, setSubtaskFormData] = useState({
    subtask_name: "",
    description: "",
    expected_date: new Date(),
  });

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchMyTasks();
    }, [user?.id])
  );

  const showMessage = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  const fetchMyTasks = async () => {
    try {
      setLoading(true);
      
      // Fetch sites
      const { data: sitesData, error: sitesError } = await supabase
        .from("sites")
        .select("id, name")
        .eq("status", "active");
      if (sitesError) throw sitesError;
      setSites(sitesData || []);

      // Fetch tasks assigned to current user
      const { data: tasksData, error: tasksError } = await supabase
        .from("site_tasks")
        .select("*")
        .eq("assigned_to", user?.id)
        .order("created_at", { ascending: false });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // Fetch subtasks for all tasks
      if (tasksData && tasksData.length > 0) {
        const taskIds = tasksData.map((t) => t.id);
        const { data: subtasksData, error: subtaskError } = await supabase
          .from("site_subtasks")
          .select("*")
          .in("parent_task_id", taskIds)
          .order("order_index", { ascending: true });

        if (subtaskError) throw subtaskError;

        const subtasksByParent: { [key: string]: SiteSubtask[] } = {};
        (subtasksData || []).forEach((st) => {
          if (!subtasksByParent[st.parent_task_id]) {
            subtasksByParent[st.parent_task_id] = [];
          }
          subtasksByParent[st.parent_task_id].push(st);
        });
        setSubtasks(subtasksByParent);
      }
    } catch (error: any) {
      showMessage(error.message || "Failed to load tasks");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const calculateTaskStatus = (task: SiteTask): "pending" | "in_progress" | "completed" => {
    const taskSubtasks = subtasks[task.id] || [];
    if (taskSubtasks.length === 0) return task.status;

    const completedCount = taskSubtasks.filter((s) => s.status === "completed").length;
    const allCount = taskSubtasks.length;

    if (completedCount === allCount) return "completed";
    if (completedCount > 0) return "in_progress";
    return "pending";
  };

  const toggleTaskStatus = async (task: SiteTask) => {
    try {
      const taskSubtasks = subtasks[task.id] || [];
      if (taskSubtasks.length > 0) {
        showMessage("Complete all subtasks first");
        return;
      }

      const statusMap: any = {
        pending: "in_progress",
        in_progress: "completed",
        completed: "pending",
      };

      const newStatus = statusMap[task.status] || "pending";
      const updateData: any = { status: newStatus };

      if (newStatus === "completed")
        updateData.completed_date = new Date().toISOString().split("T")[0];
      else updateData.completed_date = null;

      const { error } = await supabase
        .from("site_tasks")
        .update(updateData)
        .eq("id", task.id);

      if (error) throw error;
      showMessage(`Task: ${newStatus}`);
      await fetchMyTasks();
    } catch (error: any) {
      showMessage(error.message || "Failed");
    }
  };

  const toggleSubtaskStatus = async (subtask: SiteSubtask) => {
    try {
      const statusMap: any = {
        pending: "in_progress",
        in_progress: "completed",
        completed: "pending",
      };

      const newStatus = statusMap[subtask.status] || "pending";
      const updateData: any = { status: newStatus };

      if (newStatus === "completed")
        updateData.completed_date = new Date().toISOString().split("T")[0];
      else updateData.completed_date = null;

      const { error } = await supabase
        .from("site_subtasks")
        .update(updateData)
        .eq("id", subtask.id);

      if (error) throw error;
      showMessage(`Subtask: ${newStatus}`);
      await fetchMyTasks();
    } catch (error: any) {
      showMessage(error.message || "Failed");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#f59e0b";
      case "in_progress":
        return "#3b82f6";
      case "completed":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  const filteredTasks = tasks.filter((task) =>
    filterStatus === "all" ? true : calculateTaskStatus(task) === filterStatus
  );

  const pendingCount = tasks.filter((t) => calculateTaskStatus(t) === "pending").length;
  const inProgressCount = tasks.filter((t) => calculateTaskStatus(t) === "in_progress").length;
  const completedCount = tasks.filter((t) => calculateTaskStatus(t) === "completed").length;

  const renderSubtask = ({ item }: { item: SiteSubtask }) => (
    <Card style={styles.subtaskCard}>
      <Card.Content>
        <View style={styles.subtaskRow}>
          <Checkbox
            status={item.status === "completed" ? "checked" : "unchecked"}
            onPress={() => toggleSubtaskStatus(item)}
            color="#059669"
          />
          <View style={styles.subtaskContent}>
            <View style={styles.subtaskHeader}>
              <Text
                variant="bodyMedium"
                style={[
                  styles.subtaskName,
                  item.status === "completed" && styles.strikethrough,
                ]}
              >
                {item.subtask_name}
              </Text>
              <Chip
                compact
                style={{ backgroundColor: getStatusColor(item.status) }}
                textStyle={{ color: "#fff", fontSize: 10 }}
              >
                {item.status}
              </Chip>
            </View>
            {!!item.description && (
              <Text variant="labelSmall" style={styles.subtaskDescription}>
                {item.description}
              </Text>
            )}
            {!!item.expected_date && (
              <Text variant="labelSmall" style={styles.subtaskDate}>
                📅 {formatDate(item.expected_date)}
              </Text>
            )}
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const renderTask = ({ item }: { item: SiteTask }) => {
    const taskSubtasks = subtasks[item.id] || [];
    const displayStatus = calculateTaskStatus(item);
    const siteName = sites.find((s) => s.id === item.site_id)?.name || "Unknown Site";

    return (
      <View style={styles.taskCardContainer}>
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <View style={styles.siteNameRow}>
              <Ionicons name="business-outline" size={16} color="#3b82f6" />
              <Text variant="labelSmall" style={styles.siteName}>
                {siteName}
              </Text>
            </View>

            <View style={styles.taskMainRow}>
              <Checkbox
                status={displayStatus === "completed" ? "checked" : "unchecked"}
                onPress={() => toggleTaskStatus(item)}
                color="#059669"
              />
              <View style={styles.taskMainContent}>
                <View style={styles.taskTitleRow}>
                  <Text
                    variant="titleSmall"
                    style={[
                      styles.taskTitle,
                      displayStatus === "completed" && styles.strikethrough,
                    ]}
                  >
                    {item.task_name}
                  </Text>
                  <Chip
                    compact
                    style={{ backgroundColor: getStatusColor(displayStatus) }}
                    textStyle={{ color: "#fff", fontSize: 10 }}
                  >
                    {displayStatus}
                  </Chip>
                </View>

                {!!item.description && (
                  <Text variant="bodySmall" style={styles.taskDescription}>
                    {item.description}
                  </Text>
                )}

                {!!item.expected_date && (
                  <View style={styles.taskMetaRow}>
                    <Ionicons name="calendar-outline" size={14} color="#64748b" />
                    <Text variant="labelSmall" style={styles.metaText}>
                      {formatDate(item.expected_date)}
                    </Text>
                  </View>
                )}

                {taskSubtasks.length > 0 && (
                  <View style={styles.progressSection}>
                    <Text variant="labelSmall" style={styles.progressLabel}>
                      Subtasks ({taskSubtasks.filter((s) => s.status === "completed").length}/{taskSubtasks.length})
                    </Text>
                    <View style={styles.progressBarContainer}>
                      <View
                        style={[
                          styles.progressBar,
                          {
                            width: `${
                              (taskSubtasks.filter((s) => s.status === "completed").length /
                                taskSubtasks.length) *
                              100
                            }%`,
                            backgroundColor: getStatusColor(displayStatus),
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}
              </View>
            </View>

            {expandedTaskId === item.id && taskSubtasks.length > 0 && (
              <View style={styles.subtasksListContainer}>
                <View style={{ height: 1, backgroundColor: "#e2e8f0", marginVertical: 12 }} />
                <FlatList
                  data={taskSubtasks}
                  renderItem={renderSubtask}
                  keyExtractor={(st) => st.id}
                  scrollEnabled={false}
                />
              </View>
            )}
          </Card.Content>

          <Card.Actions style={styles.cardActions}>
            {taskSubtasks.length > 0 && (
              <Button
                icon={expandedTaskId === item.id ? "chevron-up" : "chevron-down"}
                onPress={() =>
                  setExpandedTaskId(expandedTaskId === item.id ? null : item.id)
                }
                compact
                textColor="#7c3aed"
              >
                {expandedTaskId === item.id ? "Hide" : "Show"}
              </Button>
            )}
            <Button
              icon="folder-multiple-outline"
              onPress={() => {
                navigation.navigate("SiteDetails", { siteId: item.site_id, siteName });
              }}
              compact
              textColor="#3b82f6"
            >
              View Site
            </Button>
          </Card.Actions>
        </Card>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#3b82f6", "#2563eb"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Tasks</Text>
          <Text style={styles.headerSubtitle}>Your assigned tasks</Text>
        </View>
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{inProgressCount}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.filterContainer}>
        {["all", "pending", "in_progress", "completed"].map((status: any) => (
          <Chip
            key={status}
            selected={filterStatus === status}
            onPress={() => setFilterStatus(status)}
            style={[
              styles.filterChip,
              filterStatus === status && styles.filterChipActive,
            ]}
            textStyle={
              filterStatus === status ? { color: "#fff" } : { color: "#475569" }
            }
          >
            {status === "all"
              ? `All (${tasks.length})`
              : status === "pending"
              ? `Pending (${pendingCount})`
              : status === "in_progress"
              ? `In Progress (${inProgressCount})`
              : `Completed (${completedCount})`}
          </Chip>
        ))}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          renderItem={renderTask}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => {
              setRefreshing(true);
              fetchMyTasks();
            }} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="square-outline" size={64} color="#cbd5e1" />
              <Text variant="titleMedium" style={styles.emptyText}>
                No tasks assigned
              </Text>
              <Text variant="bodySmall" style={styles.emptySubtext}>
                Tasks assigned to you will appear here
              </Text>
            </View>
          }
        />
      )}

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={2000}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  headerContent: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#e0e7ff",
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    padding: 12,
  },
  stat: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  statLabel: {
    fontSize: 11,
    color: "#e0e7ff",
    marginTop: 2,
  },
  filterContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    backgroundColor: "#e2e8f0",
  },
  filterChipActive: {
    backgroundColor: "#3b82f6",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 12,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyText: {
    color: "#64748b",
    marginTop: 16,
  },
  emptySubtext: {
    color: "#94a3b8",
    marginTop: 8,
  },
  taskCardContainer: {
    marginHorizontal: 0,
    marginVertical: 6,
  },
  card: {
    marginBottom: 0,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
  },
  cardActions: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: "flex-start",
  },
  siteNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  siteName: {
    color: "#3b82f6",
    fontWeight: "600",
  },
  taskMainRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  taskMainContent: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
    gap: 8,
  },
  taskTitle: {
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
    fontSize: 14,
  },
  strikethrough: {
    textDecorationLine: "line-through",
    color: "#94a3b8",
  },
  taskDescription: {
    color: "#64748b",
    marginBottom: 6,
    lineHeight: 18,
  },
  taskMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  metaText: {
    color: "#475569",
    fontWeight: "500",
  },
  progressSection: {
    marginTop: 8,
  },
  progressLabel: {
    color: "#64748b",
    marginBottom: 4,
    fontWeight: "500",
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "#e2e8f0",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 3,
  },
  subtasksListContainer: {
    marginTop: 8,
  },
  subtaskCard: {
    marginBottom: 8,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderLeftWidth: 4,
    borderLeftColor: "#3b82f6",
  },
  subtaskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  subtaskContent: {
    flex: 1,
    marginLeft: 8,
  },
  subtaskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  subtaskName: {
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
  },
  subtaskDescription: {
    color: "#64748b",
    marginVertical: 4,
    fontStyle: "italic",
  },
  subtaskDate: {
    color: "#64748b",
    marginTop: 2,
  },
});

export default MyTasksScreen;
