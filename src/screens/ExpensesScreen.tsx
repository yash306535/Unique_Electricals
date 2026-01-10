import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { Button, Card, FAB, Modal, Portal, Snackbar, Text, TextInput } from 'react-native-paper';
import { supabase } from '../config/supabase';
import { Expense } from '../types';

const ExpensesScreen = ({ route }: any) => {
  const { siteId, siteName } = route.params;
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  
  // Snackbar states
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: '',
    type: 'success' as 'success' | 'error' | 'info',
  });

  // Animation
  const fadeAnim = useState(new Animated.Value(0))[0];
  
  const [formData, setFormData] = useState({
    category: 'labour' as string,
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchExpenses();
  }, [siteId]);

  useEffect(() => {
    if (expenses.length > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [expenses]);

  const showSnackbar = (message: string, type: 'success' | 'error' | 'info') => {
    setSnackbar({ visible: true, message, type });
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('site_id', siteId)
        .order('date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      showSnackbar(error.message || 'Failed to fetch expenses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalExpense = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);

  const openModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      const isCustomCategory = !['labour', 'transport', 'equipment', 'misc'].includes(expense.category);
      
      setFormData({
        category: isCustomCategory ? 'other' : expense.category,
        amount: expense.amount.toString(),
        description: expense.description || '',
        date: expense.date,
      });
      
      if (isCustomCategory) {
        setShowCustomCategory(true);
        setCustomCategory(expense.category);
      } else {
        setShowCustomCategory(false);
        setCustomCategory('');
      }
      
      setSelectedDate(new Date(expense.date));
    } else {
      setEditingExpense(null);
      setFormData({
        category: 'labour',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      setShowCustomCategory(false);
      setCustomCategory('');
      setSelectedDate(new Date());
    }
    setModalVisible(true);
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
      setFormData({ ...formData, date: date.toISOString().split('T')[0] });
    }
  };

  const handleCategoryChange = (value: string) => {
    setFormData({ ...formData, category: value });
    if (value === 'other') {
      setShowCustomCategory(true);
    } else {
      setShowCustomCategory(false);
      setCustomCategory('');
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showSnackbar('Please enter a valid amount', 'error');
      return;
    }

    if (formData.category === 'other' && !customCategory.trim()) {
      showSnackbar('Please enter a custom category name', 'error');
      return;
    }

    try {
      const finalCategory = formData.category === 'other' ? customCategory.trim().toLowerCase() : formData.category;
      
      const expenseData = {
        site_id: siteId,
        category: finalCategory,
        amount: parseFloat(formData.amount),
        description: formData.description || null,
        date: formData.date,
      };

      if (editingExpense) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingExpense.id);
        if (error) throw error;
        showSnackbar('Expense updated successfully! ✓', 'success');
      } else {
        const { error } = await supabase.from('expenses').insert(expenseData);
        if (error) throw error;
        showSnackbar('Expense added successfully! ✓', 'success');
      }

      setModalVisible(false);
      fetchExpenses();
    } catch (error: any) {
      showSnackbar(error.message || 'Failed to save expense', 'error');
    }
  };

  const deleteExpense = async (id: string, amount: number) => {
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      showSnackbar(`Expense of ₹${amount.toLocaleString()} deleted`, 'info');
      fetchExpenses();
    } catch (error: any) {
      showSnackbar(error.message || 'Failed to delete expense', 'error');
    }
  };

  const confirmDelete = (id: string, amount: number) => {
    // You can use a custom modal or keep Alert
    deleteExpense(id, amount);
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'labour': return 'people';
      case 'transport': return 'car';
      case 'equipment': return 'construct';
      case 'misc': return 'apps';
      default: return 'pricetag';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'labour': return '#FF6B6B';
      case 'transport': return '#4ECDC4';
      case 'equipment': return '#FFE66D';
      case 'misc': return '#95E1D3';
      default: return '#A8DADC';
    }
  };

  const renderExpense = ({ item, index }: { item: Expense; index: number }) => (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          opacity: fadeAnim,
          transform: [{
            translateY: fadeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [50, 0],
            }),
          }],
        },
      ]}
    >
      <Card style={styles.card} mode="elevated" elevation={2}>
        <Card.Content>
          <View style={styles.expenseHeader}>
            <View style={styles.categoryContainer}>
              <View
                style={[
                  styles.categoryIcon,
                  { backgroundColor: getCategoryColor(item.category) + '20' },
                ]}
              >
                <Ionicons
                  name={getCategoryIcon(item.category) as any}
                  size={24}
                  color={getCategoryColor(item.category)}
                />
              </View>
              <View>
                <Text variant="labelLarge" style={styles.categoryText}>
                  {item.category.toUpperCase()}
                </Text>
                <Text variant="bodySmall" style={styles.dateText}>
                  <Ionicons name="calendar-outline" size={12} /> {new Date(item.date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
            <View style={styles.amountContainer}>
              <Text variant="headlineSmall" style={styles.amount}>
                ₹{item.amount.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          {item.description && (
            <View style={styles.descriptionContainer}>
              <Text variant="bodyMedium" style={styles.description}>
                {item.description}
              </Text>
            </View>
          )}
        </Card.Content>
        <Card.Actions style={styles.cardActions}>
          <Button 
            onPress={() => openModal(item)} 
            icon="pencil"
            mode="text"
            textColor="#3498db"
          >
            Edit
          </Button>
          <Button 
            onPress={() => confirmDelete(item.id, item.amount)} 
            icon="delete"
            mode="text"
            textColor="#e74c3c"
          >
            Delete
          </Button>
        </Card.Actions>
      </Card>
    </Animated.View>
  );

  const LoadingOverlay = () => (
    <View style={styles.loadingOverlay}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2089dc" />
        <Text style={styles.loadingText}>Loading expenses...</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Card style={styles.summaryCard} mode="elevated" elevation={3}>
        <Card.Content>
          <View style={styles.summaryHeader}>
            <Ionicons name="wallet" size={28} color="white" />
            <Text variant="labelLarge" style={styles.summaryLabel}>Total Expenses</Text>
          </View>
          <Text variant="headlineLarge" style={styles.summaryAmount}>
            ₹{totalExpense.toLocaleString('en-IN')}
          </Text>
          <View style={styles.siteNameContainer}>
            <Ionicons name="business-outline" size={14} color="white" />
            <Text variant="bodySmall" style={styles.siteNameText}> {siteName}</Text>
          </View>
        </Card.Content>
      </Card>

      {loading && expenses.length === 0 ? (
        <LoadingOverlay />
      ) : (
        <FlatList
          data={expenses}
          renderItem={renderExpense}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={loading && expenses.length > 0}
          onRefresh={fetchExpenses}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="wallet-outline" size={80} color="#ddd" />
              </View>
              <Text variant="titleLarge" style={styles.emptyTitle}>No Expenses Yet</Text>
              <Text variant="bodyMedium" style={styles.emptyText}>
                Start tracking your site expenses by tapping the + button below
              </Text>
            </View>
          }
        />
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => openModal()}
        color="white"
      />

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContent}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text variant="headlineSmall" style={styles.modalTitle}>
                  {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                </Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close-circle" size={28} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.pickerContainer}>
                  <Text variant="bodyMedium" style={styles.pickerLabel}>
                    <Ionicons name="layers-outline" size={16} /> Category *
                  </Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={formData.category}
                      onValueChange={handleCategoryChange}
                      style={styles.picker}
                    >
                      <Picker.Item label="Labour" value="labour" />
                      <Picker.Item label="Transport" value="transport" />
                      <Picker.Item label="Equipment Rent" value="equipment" />
                      <Picker.Item label="Miscellaneous" value="misc" />
                      <Picker.Item label="Other (Custom)" value="other" />
                    </Picker>
                  </View>
                </View>

                {showCustomCategory && (
                  <TextInput
                    label="Custom Category *"
                    mode="outlined"
                    placeholder="e.g., Materials, Food, etc."
                    value={customCategory}
                    onChangeText={setCustomCategory}
                    left={<TextInput.Icon icon="tag" />}
                    style={styles.input}
                    outlineColor="#ddd"
                    activeOutlineColor="#2089dc"
                    textColor="#000000"
                  />
                )}

                <TextInput
                  label="Amount *"
                  mode="outlined"
                  placeholder="Enter amount"
                  value={formData.amount}
                  onChangeText={(text) => setFormData({ ...formData, amount: text })}
                  keyboardType="numeric"
                  left={<TextInput.Icon icon="currency-inr" />}
                  style={styles.input}
                  outlineColor="#ddd"
                  activeOutlineColor="#2089dc"
                  textColor="#000000"
                />

                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <View style={styles.datePickerContent}>
                    <Ionicons name="calendar" size={20} color="#2089dc" />
                    <Text style={styles.datePickerText}>
                      {selectedDate.toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color="#2089dc" />
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                  />
                )}

                <TextInput
                  label="Description"
                  mode="outlined"
                  placeholder="Add notes about this expense..."
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  multiline
                  numberOfLines={3}
                  style={styles.input}
                  outlineColor="#ddd"
                  activeOutlineColor="#2089dc"
                  textColor="#000000"
                />

                <View style={styles.modalActions}>
                  <Button
                    mode="outlined"
                    onPress={() => setModalVisible(false)}
                    style={styles.cancelButton}
                    labelStyle={styles.cancelButtonLabel}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleSubmit}
                    style={styles.submitButton}
                    buttonColor="#2089dc"
                    icon={editingExpense ? 'check-circle' : 'plus-circle'}
                  >
                    {editingExpense ? 'Update' : 'Add Expense'}
                  </Button>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
        style={[
          styles.snackbar,
          snackbar.type === 'success' && styles.snackbarSuccess,
          snackbar.type === 'error' && styles.snackbarError,
          snackbar.type === 'info' && styles.snackbarInfo,
        ]}
        action={{
          label: '✕',
          onPress: () => setSnackbar({ ...snackbar, visible: false }),
        }}
      >
        <View style={styles.snackbarContent}>
          <Ionicons
            name={
              snackbar.type === 'success'
                ? 'checkmark-circle'
                : snackbar.type === 'error'
                ? 'alert-circle'
                : 'information-circle'
            }
            size={20}
            color="white"
          />
          <Text style={styles.snackbarText}>{snackbar.message}</Text>
        </View>
      </Snackbar>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  summaryCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#667eea',
    borderRadius: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryLabel: {
    color: 'white',
    fontWeight: '600',
  },
  summaryAmount: {
    color: 'white',
    marginTop: 8,
    fontWeight: 'bold',
    fontSize: 36,
  },
  siteNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  siteNameText: {
    color: 'white',
    opacity: 0.9,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  cardWrapper: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    backgroundColor: 'white',
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryText: {
    color: '#2c3e50',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dateText: {
    color: '#7f8c8d',
    marginTop: 4,
    fontSize: 12,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    color: '#27ae60',
    fontWeight: 'bold',
    fontSize: 24,
  },
  descriptionContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  description: {
    color: '#555',
    lineHeight: 20,
  },
  cardActions: {
    paddingHorizontal: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#2c3e50',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    margin: 20,
    right: 0,
    bottom: 0,
    backgroundColor: '#2089dc',
    borderRadius: 16,
  },
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    padding: 0,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  modalTitle: {
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  formContainer: {
    padding: 20,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    marginBottom: 8,
    color: '#555',
    fontWeight: '600',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  picker: {
    height: 50,
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: 'white',
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  datePickerText: {
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderColor: '#ddd',
  },
  cancelButtonLabel: {
    color: '#666',
  },
  submitButton: {
    flex: 1,
  },
  snackbar: {
    marginBottom: 10,
  },
  snackbarSuccess: {
    backgroundColor: '#27ae60',
  },
  snackbarError: {
    backgroundColor: '#e74c3c',
  },
  snackbarInfo: {
    backgroundColor: '#3498db',
  },
  snackbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  snackbarText: {
    color: 'white',
    fontSize: 15,
  },
});

export default ExpensesScreen;