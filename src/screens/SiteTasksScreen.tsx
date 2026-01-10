import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    View,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { Button, Card, Checkbox, Chip, FAB, Modal, Portal, Text, TextInput, ActivityIndicator, Snackbar } from 'react-native-paper';
import { supabase } from '../config/supabase';
import { SiteTask } from '../types';
import { LinearGradient } from 'expo-linear-gradient';

const SiteTasksScreen = ({ route }: any) => {
  const { siteId, siteName } = route.params;
  const [tasks, setTasks] = useState<SiteTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'success' | 'error'>('success');
  
  const [formData, setFormData] = useState({
    task_name: '',
    task_type: 'approval' as 'approval' | 'work' | 'follow-up',
    description: '',
    expected_date: new Date(),
  });

  useEffect(() => {
    fetchTasks();
  }, [siteId]);

  const showMessage = (message: string, type: 'success' | 'error') => {
    setSnackbarMessage(message);
    setSnackbarType(type);
    setSnackbarVisible(true);
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('site_tasks')
        .select('*')
        .eq('site_id', siteId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      showMessage(error.message || 'Failed to fetch tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleSubmit = async () => {
    if (!formData.task_name.trim()) {
      showMessage('Please enter task name', 'error');
      return;
    }

    try {
      setSubmitting(true);
      const { error } = await supabase.from('site_tasks').insert({
        site_id: siteId,
        task_name: formData.task_name,
        task_type: formData.task_type,
        description: formData.description || null,
        expected_date: formData.expected_date.toISOString().split('T')[0],
        status: 'pending',
      });

      if (error) throw error;

      showMessage('Task added successfully!', 'success');
      setModalVisible(false);
      setFormData({
        task_name: '',
        task_type: 'approval',
        description: '',
        expected_date: new Date(),
      });
      fetchTasks();
    } catch (error: any) {
      showMessage(error.message || 'Failed to add task', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTaskStatus = async (task: SiteTask) => {
    try {
      const newStatus = task.status === 'pending' ? 'completed' : 'pending';
      const updateData: any = {
        status: newStatus,
      };

      if (newStatus === 'completed') {
        updateData.completed_date = new Date().toISOString().split('T')[0];
      } else {
        updateData.completed_date = null;
      }

      const { error } = await supabase
        .from('site_tasks')
        .update(updateData)
        .eq('id', task.id);

      if (error) throw error;
      showMessage(
        newStatus === 'completed' ? 'Task completed! 🎉' : 'Task reopened',
        'success'
      );
      fetchTasks();
    } catch (error: any) {
      showMessage(error.message || 'Failed to update task', 'error');
    }
  };

  const deleteTask = async (id: string) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('site_tasks').delete().eq('id', id);
              if (error) throw error;
              showMessage('Task deleted successfully', 'success');
              fetchTasks();
            } catch (error: any) {
              showMessage(error.message || 'Failed to delete task', 'error');
            }
          },
        },
      ]
    );
  };

  const getTaskTypeColor = (type?: string) => {
    switch (type) {
      case 'approval': return '#2563eb';
      case 'work': return '#059669';
      case 'follow-up': return '#d97706';
      default: return '#64748b';
    }
  };

  const isOverdue = (task: SiteTask) => {
    if (task.status === 'completed' || !task.expected_date) return false;
    return new Date(task.expected_date) < new Date();
  };

  const filteredTasks = tasks.filter(task => {
    if (filterStatus === 'all') return true;
    return task.status === filterStatus;
  });

  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const overdueCount = tasks.filter(t => isOverdue(t)).length;

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setFormData({ ...formData, expected_date: selectedDate });
    }
  };

  const renderTask = ({ item }: { item: SiteTask }) => {
    const overdue = isOverdue(item);
    
    return (
      <Card 
        style={[
          styles.card,
          item.status === 'completed' && styles.completedCard,
          overdue && styles.overdueCard,
        ]} 
        mode="elevated"
        elevation={3}
      >
        <Card.Content>
          <View style={styles.taskHeader}>
            <Checkbox
              status={item.status === 'completed' ? 'checked' : 'unchecked'}
              onPress={() => toggleTaskStatus(item)}
              color="#059669"
            />
            <View style={styles.taskInfo}>
              <Text 
                variant="titleMedium"
                style={[
                  styles.taskName,
                  item.status === 'completed' && styles.completedText,
                ]}
              >
                {item.task_name}
              </Text>
              <View style={styles.chipRow}>
                {item.task_type && (
                  <Chip
                    mode="flat"
                    style={[
                      styles.typeChip,
                      { backgroundColor: getTaskTypeColor(item.task_type) }
                    ]}
                    textStyle={styles.chipText}
                  >
                    {item.task_type.toUpperCase()}
                  </Chip>
                )}
                {overdue && (
                  <Chip
                    mode="flat"
                    icon="alert-circle"
                    style={styles.overdueChip}
                    textStyle={styles.overdueChipText}
                  >
                    OVERDUE
                  </Chip>
                )}
              </View>
            </View>
          </View>

          {item.description && (
            <View style={styles.descriptionContainer}>
              <Ionicons name="document-text-outline" size={18} color="#475569" />
              <Text variant="bodyMedium" style={styles.description}>
                {item.description}
              </Text>
            </View>
          )}

          <View style={styles.taskFooter}>
            {item.expected_date && (
              <View style={[styles.dateContainer, overdue && styles.overdueDateContainer]}>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={overdue ? '#dc2626' : '#2563eb'}
                />
                <Text 
                  variant="bodyMedium"
                  style={[
                    styles.dateText,
                    overdue && styles.overdueText,
                  ]}
                >
                  <Text style={styles.dateLabel}>Deadline: </Text>
                  {formatDate(item.expected_date)}
                </Text>
              </View>
            )}

            {item.completed_date && (
              <View style={styles.completedDateContainer}>
                <Ionicons name="checkmark-circle" size={18} color="#059669" />
                <Text variant="bodyMedium" style={styles.completedDateText}>
                  <Text style={styles.dateLabel}>Completed: </Text>
                  {formatDate(item.completed_date)}
                </Text>
              </View>
            )}
          </View>
        </Card.Content>
        <Card.Actions style={styles.cardActions}>
          <Button 
            onPress={() => deleteTask(item.id)} 
            icon="trash-can-outline"
            textColor="#dc2626"
            mode="text"
            compact
          >
            Delete
          </Button>
        </Card.Actions>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#3b82f6', '#2563eb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.summaryCard}
      >
        <Text variant="titleLarge" style={styles.summaryLabel}>{siteName}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text variant="displaySmall" style={styles.summaryCount}>{pendingCount}</Text>
            <Text variant="bodyMedium" style={styles.summaryText}>Pending</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text variant="displaySmall" style={styles.summaryCount}>{completedCount}</Text>
            <Text variant="bodyMedium" style={styles.summaryText}>Completed</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text variant="displaySmall" style={styles.summaryCount}>{overdueCount}</Text>
            <Text variant="bodyMedium" style={styles.summaryText}>Overdue</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.filterContainer}>
        <Chip
          selected={filterStatus === 'all'}
          onPress={() => setFilterStatus('all')}
          style={[styles.filterChip, filterStatus === 'all' && styles.filterChipSelected]}
          textStyle={[styles.filterChipText, filterStatus === 'all' && styles.filterChipTextSelected]}
          showSelectedCheck={false}
        >
          All ({tasks.length})
        </Chip>
        <Chip
          selected={filterStatus === 'pending'}
          onPress={() => setFilterStatus('pending')}
          style={[styles.filterChip, filterStatus === 'pending' && styles.filterChipSelected]}
          textStyle={[styles.filterChipText, filterStatus === 'pending' && styles.filterChipTextSelected]}
          showSelectedCheck={false}
        >
          Pending ({pendingCount})
        </Chip>
        <Chip
          selected={filterStatus === 'completed'}
          onPress={() => setFilterStatus('completed')}
          style={[styles.filterChip, filterStatus === 'completed' && styles.filterChipSelected]}
          textStyle={[styles.filterChipText, filterStatus === 'completed' && styles.filterChipTextSelected]}
          showSelectedCheck={false}
        >
          Done ({completedCount})
        </Chip>
      </View>

      <FlatList
        data={filteredTasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={fetchTasks}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="checkbox-outline" size={80} color="#cbd5e1" />
            <Text variant="titleLarge" style={styles.emptyText}>No tasks found</Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              {filterStatus === 'all' 
                ? 'Create your first task to get started'
                : `No ${filterStatus} tasks`}
            </Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        color="#fff"
        onPress={() => setModalVisible(true)}
        label="Add Task"
      />

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => !submitting && setModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text variant="headlineSmall" style={styles.modalTitle}>
                  Add New Task
                </Text>
                <Text variant="bodyMedium" style={styles.modalSubtitle}>
                  Create a task to track your progress
                </Text>
              </View>

              <TextInput
                label="Task Name *"
                mode="outlined"
                placeholder="e.g., MSEB Approval Pending"
                value={formData.task_name}
                onChangeText={(text) => setFormData({ ...formData, task_name: text })}
                left={<TextInput.Icon icon="checkbox-marked-circle-outline" />}
                style={styles.input}
                outlineColor="#cbd5e1"
                activeOutlineColor="#3b82f6"
                textColor="#0f172a"
                placeholderTextColor="#94a3b8"
                disabled={submitting}
              />

              <View style={styles.pickerContainer}>
                <Text variant="bodyMedium" style={styles.pickerLabel}>
                  <Ionicons name="layers-outline" size={16} color="#1e293b" /> Task Type *
                </Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={formData.task_type}
                    onValueChange={(value) => setFormData({ ...formData, task_type: value })}
                    style={styles.picker}
                    enabled={!submitting}
                  >
                    <Picker.Item label="📋 Approval" value="approval" />
                    <Picker.Item label="🔨 Work" value="work" />
                    <Picker.Item label="📞 Follow-up" value="follow-up" />
                  </Picker>
                </View>
              </View>

              <TextInput
                label="Description (Optional)"
                mode="outlined"
                placeholder="Add additional notes or details..."
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={4}
                style={styles.input}
                outlineColor="#cbd5e1"
                activeOutlineColor="#3b82f6"
                textColor="#0f172a"
                placeholderTextColor="#94a3b8"
                disabled={submitting}
              />

              <TouchableOpacity
                onPress={() => !submitting && setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <TextInput
                  label="Deadline *"
                  mode="outlined"
                  value={formatDate(formData.expected_date.toISOString().split('T')[0])}
                  left={<TextInput.Icon icon="calendar" />}
                  right={<TextInput.Icon icon="chevron-down" />}
                  style={styles.input}
                  outlineColor="#cbd5e1"
                  activeOutlineColor="#3b82f6"
                  textColor="#0f172a"
                  editable={false}
                  pointerEvents="none"
                />
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={formData.expected_date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  minimumDate={new Date()}
                />
              )}

              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    if (!submitting) {
                      setModalVisible(false);
                      setFormData({
                        task_name: '',
                        task_type: 'approval',
                        description: '',
                        expected_date: new Date(),
                      });
                    }
                  }}
                  style={styles.cancelButton}
                  textColor="#475569"
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  style={styles.submitButton}
                  buttonColor="#3b82f6"
                  loading={submitting}
                  disabled={submitting}
                >
                  {submitting ? 'Adding...' : 'Add Task'}
                </Button>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        style={[
          styles.snackbar,
          snackbarType === 'success' ? styles.snackbarSuccess : styles.snackbarError
        ]}
        action={{
          label: 'OK',
          onPress: () => setSnackbarVisible(false),
          textColor: '#fff'
        }}
      >
        <View style={styles.snackbarContent}>
          <Ionicons
            name={snackbarType === 'success' ? 'checkmark-circle' : 'alert-circle'}
            size={20}
            color="#fff"
          />
          <Text style={styles.snackbarText}>{snackbarMessage}</Text>
        </View>
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  summaryCard: {
    margin: 16,
    borderRadius: 16,
    padding: 24,
    elevation: 4,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  summaryLabel: {
    color: '#ffffff',
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryCount: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 32,
  },
  summaryText: {
    color: '#ffffff',
    marginTop: 4,
    fontWeight: '600',
    fontSize: 14,
  },
  summaryDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  filterChip: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  filterChipText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 13,
  },
  filterChipTextSelected: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 14,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  completedCard: {
    opacity: 0.7,
    backgroundColor: '#f8fafc',
  },
  overdueCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#dc2626',
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskInfo: {
    flex: 1,
    marginLeft: 4,
  },
  taskName: {
    fontWeight: '700',
    marginBottom: 8,
    color: '#1e293b',
    fontSize: 17,
    lineHeight: 24,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#64748b',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  typeChip: {
    height: 28,
  },
  chipText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  overdueChip: {
    height: 28,
    backgroundColor: '#dc2626',
  },
  overdueChipText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  descriptionContainer: {
    flexDirection: 'row',
    marginLeft: 48,
    marginBottom: 12,
    gap: 8,
    alignItems: 'flex-start',
  },
  description: {
    flex: 1,
    color: '#475569',
    lineHeight: 22,
    fontSize: 14,
  },
  taskFooter: {
    marginLeft: 48,
    gap: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  overdueDateContainer: {
    backgroundColor: '#fee2e2',
  },
  dateText: {
    marginLeft: 8,
    color: '#1e40af',
    fontSize: 14,
    fontWeight: '600',
  },
  dateLabel: {
    fontWeight: '700',
    color: '#1e293b',
  },
  overdueText: {
    color: '#991b1b',
  },
  completedDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  completedDateText: {
    marginLeft: 8,
    color: '#065f46',
    fontSize: 14,
    fontWeight: '600',
  },
  cardActions: {
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    color: '#475569',
    marginTop: 16,
    fontWeight: '700',
    fontSize: 18,
  },
  emptySubtext: {
    color: '#94a3b8',
    marginTop: 8,
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#3b82f6',
    borderRadius: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    margin: 20,
    borderRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    marginBottom: 24,
  },
  modalTitle: {
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 6,
    fontSize: 22,
  },
  modalSubtitle: {
    color: '#64748b',
    fontSize: 14,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    marginBottom: 10,
    color: '#1e293b',
    fontWeight: '700',
    fontSize: 15,
  },
  pickerWrapper: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  picker: {
    color: '#0f172a',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  cancelButton: {
    flex: 1,
    borderColor: '#cbd5e1',
    borderWidth: 1.5,
  },
  submitButton: {
    flex: 1,
  },
  snackbar: {
    marginBottom: 20,
    marginHorizontal: 16,
  },
  snackbarSuccess: {
    backgroundColor: '#059669',
  },
  snackbarError: {
    backgroundColor: '#dc2626',
  },
  snackbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  snackbarText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default SiteTasksScreen;