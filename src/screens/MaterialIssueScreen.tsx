import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '../components/DateTimePicker';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { Button, Card, FAB, Modal, Portal, Snackbar, Text, TextInput } from 'react-native-paper';
import { supabase } from '../config/supabase';
import { Material, MaterialIssue } from '../types';

interface MaterialCost {
  material_name: string;
  total_quantity: number;
  unit: string;
  average_rate: number;
  total_cost: number;
}

const MaterialIssueScreen = ({ route }: any) => {
  const { siteId, siteName } = route.params;
  const [issues, setIssues] = useState<MaterialIssue[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [totalGST, setTotalGST] = useState(0);
  const [materialCosts, setMaterialCosts] = useState<MaterialCost[]>([]);
  const [errors, setErrors] = useState({
    material_id: '',
    quantity: '',
  });
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', type: 'success' });
  
  const [formData, setFormData] = useState({
    material_id: '',
    quantity: '',
    date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchIssues();
    fetchMaterials();
    fetchSiteGSTAndCosts();
  }, [siteId]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('material_issues')
        .select(`
          *,
          material:materials(name, unit)
        `)
        .eq('site_id', siteId)
        .order('date', { ascending: false });

      if (error) throw error;
      setIssues(data || []);
    } catch (error: any) {
      showSnackbar(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .gt('current_stock', 0)
        .order('name');

      if (error) throw error;
      setMaterials(data || []);
    } catch (error: any) {
      showSnackbar(error.message, 'error');
    }
  };

  const fetchSiteGSTAndCosts = async () => {
    try {
      // Get all material issues for this site with material details
      const { data: issuesData, error: issuesError } = await supabase
        .from('material_issues')
        .select(`
          material_id,
          quantity,
          material:materials(name, unit)
        `)
        .eq('site_id', siteId);

      if (issuesError) throw issuesError;

      // Get all purchases to calculate costs and GST
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select('material_id, rate, gst_amount, quantity');

      if (purchasesError) throw purchasesError;

      // Calculate total GST for materials issued to this site
      let gstTotal = 0;
      const materialCostMap = new Map<string, MaterialCost>();

      issuesData?.forEach((issue: any) => {
        const materialId = issue.material_id;
        const quantity = issue.quantity;
        const materialName = issue.material?.name || 'Unknown';
        const unit = issue.material?.unit || '';

        // Find all purchases for this material
        const materialPurchases = purchasesData?.filter(p => p.material_id === materialId) || [];
        
        if (materialPurchases.length > 0) {
          // Calculate weighted average rate based on purchase quantities
          let totalPurchaseQty = 0;
          let totalPurchaseValue = 0;
          let totalGSTValue = 0;

          materialPurchases.forEach(p => {
            const purchaseQty = p.quantity || 1;
            totalPurchaseQty += purchaseQty;
            totalPurchaseValue += (p.rate * purchaseQty);
            totalGSTValue += (p.gst_amount || 0);
          });

          const avgRate = totalPurchaseValue / totalPurchaseQty;
          const totalCost = quantity * avgRate;

          // Calculate proportional GST based on the quantity issued
          // GST per unit = total GST / total purchased quantity
          const gstPerUnit = totalGSTValue / totalPurchaseQty;
          const proportionalGST = quantity * gstPerUnit;
          gstTotal += proportionalGST;

          // Aggregate material costs
          if (materialCostMap.has(materialId)) {
            const existing = materialCostMap.get(materialId)!;
            materialCostMap.set(materialId, {
              ...existing,
              total_quantity: existing.total_quantity + quantity,
              total_cost: existing.total_cost + totalCost,
              average_rate: (existing.total_cost + totalCost) / (existing.total_quantity + quantity)
            });
          } else {
            materialCostMap.set(materialId, {
              material_name: materialName,
              total_quantity: quantity,
              unit: unit,
              average_rate: avgRate,
              total_cost: totalCost
            });
          }
        }
      });

      setTotalGST(gstTotal);
      setMaterialCosts(Array.from(materialCostMap.values()));
    } catch (error: any) {
      showSnackbar(error.message, 'error');
    }
  };

  const showSnackbar = (message: string, type: 'success' | 'error') => {
    setSnackbar({ visible: true, message, type });
  };

  const validateForm = () => {
    const newErrors = { material_id: '', quantity: '' };
    let isValid = true;

    if (!formData.material_id) {
      newErrors.material_id = 'Please select a material';
      isValid = false;
    }

    const quantity = parseFloat(formData.quantity);
    if (!formData.quantity) {
      newErrors.quantity = 'Quantity is required';
      isValid = false;
    } else if (isNaN(quantity) || quantity <= 0) {
      newErrors.quantity = 'Enter a valid positive number';
      isValid = false;
    } else {
      const selectedMaterial = materials.find(m => m.id === formData.material_id);
      if (selectedMaterial && quantity > selectedMaterial.current_stock) {
        newErrors.quantity = `Maximum ${selectedMaterial.current_stock} ${selectedMaterial.unit} available`;
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const quantity = parseFloat(formData.quantity);
    const selectedMaterial = materials.find(m => m.id === formData.material_id);
    if (!selectedMaterial) {
      showSnackbar('Material not found', 'error');
      return;
    }

    try {
      const { error: issueError } = await supabase.from('material_issues').insert({
        site_id: siteId,
        material_id: formData.material_id,
        quantity: quantity,
        date: formData.date,
      });

      if (issueError) throw issueError;

      const { error: updateError } = await supabase
        .from('materials')
        .update({ current_stock: selectedMaterial.current_stock - quantity })
        .eq('id', formData.material_id);

      if (updateError) throw updateError;

      showSnackbar('Material issued successfully', 'success');
      setModalVisible(false);
      resetForm();
      fetchIssues();
      fetchMaterials();
      fetchSiteGSTAndCosts();
    } catch (error: any) {
      showSnackbar(error.message, 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      material_id: '',
      quantity: '',
      date: new Date().toISOString().split('T')[0],
    });
    setErrors({ material_id: '', quantity: '' });
    setSelectedDate(new Date());
  };

  const onDateChange = (event: any, selected?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selected) {
      setSelectedDate(selected);
      setFormData({ ...formData, date: selected.toISOString().split('T')[0] });
    }
  };

  const renderIssue = ({ item }: { item: MaterialIssue }) => (
    <Card style={styles.card} mode="elevated" elevation={2}>
      <Card.Content>
        <View style={styles.issueHeader}>
          <View style={styles.materialInfo}>
            <View style={styles.iconContainer}>
              <Ionicons name="cube" size={28} color="#27ae60" />
            </View>
            <View style={styles.materialDetails}>
              <Text variant="titleMedium" style={styles.materialName}>
                {item.material?.name || 'Unknown'}
              </Text>
              <View style={styles.dateContainer}>
                <Ionicons name="calendar-outline" size={14} color="#999" />
                <Text variant="bodySmall" style={styles.dateText}>
                  {new Date(item.date).toLocaleDateString('en-US', { 
                    day: 'numeric', 
                    month: 'short', 
                    year: 'numeric' 
                  })}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.quantityContainer}>
            <Text variant="headlineSmall" style={styles.quantity}>{item.quantity}</Text>
            <Text variant="bodySmall" style={styles.unit}>{item.material?.unit}</Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  const totalMaterialCost = materialCosts.reduce((sum, mc) => sum + mc.total_cost, 0);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Card style={styles.summaryCard} mode="elevated" elevation={4}>
          <Card.Content>
            <View style={styles.summaryHeader}>
              <View style={styles.summaryIconContainer}>
                <Ionicons name="document-text" size={32} color="white" />
              </View>
              <View style={styles.summaryInfo}>
                <Text variant="labelLarge" style={styles.summaryLabel}>Issue History</Text>
                <Text variant="headlineMedium" style={styles.summaryCount}>{issues.length} Issues</Text>
                <Text variant="bodySmall" style={styles.siteNameText}>{siteName}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* GST Summary Card */}
        <Card style={styles.gstCard} mode="elevated" elevation={3}>
          <Card.Content>
            <View style={styles.gstHeader}>
              <View style={styles.gstIconContainer}>
                <Ionicons name="receipt" size={24} color="#e67e22" />
              </View>
              <View style={styles.gstInfo}>
                <Text variant="labelMedium" style={styles.gstLabel}>Total GST (Input)</Text>
                <Text variant="headlineSmall" style={styles.gstAmount}>₹{totalGST.toFixed(2)}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Material Costs Summary */}
        {materialCosts.length > 0 && (
          <Card style={styles.costsCard} mode="elevated" elevation={3}>
            <Card.Content>
              <View style={styles.costsHeader}>
                <Ionicons name="analytics" size={24} color="#3498db" />
                <Text variant="titleMedium" style={styles.costsTitle}>Material Costs Breakdown</Text>
              </View>
              
              {materialCosts.map((mc, index) => (
                <View key={index} style={styles.costRow}>
                  <View style={styles.costLeftSection}>
                    <View style={styles.costIconWrapper}>
                      <Ionicons name="cube-outline" size={18} color="#3498db" />
                    </View>
                    <View style={styles.costDetails}>
                      <Text variant="bodyMedium" style={styles.costMaterialName}>
                        {mc.material_name}
                      </Text>
                      <Text variant="bodySmall" style={styles.costSubtext}>
                        {mc.total_quantity} {mc.unit} @ ₹{mc.average_rate.toFixed(2)}/{mc.unit}
                      </Text>
                    </View>
                  </View>
                  <Text variant="titleMedium" style={styles.costAmount}>
                    ₹{mc.total_cost.toFixed(2)}
                  </Text>
                </View>
              ))}

              <View style={styles.totalCostRow}>
                <Text variant="titleMedium" style={styles.totalCostLabel}>Total Cost</Text>
                <Text variant="headlineSmall" style={styles.totalCostAmount}>
                  ₹{totalMaterialCost.toFixed(2)}
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Issues List */}
        <View style={styles.issuesSection}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Issue History</Text>
          {issues.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="cube-outline" size={80} color="#e0e0e0" />
              </View>
              <Text variant="titleLarge" style={styles.emptyTitle}>No Issues Yet</Text>
              <Text variant="bodyMedium" style={styles.emptyText}>
                Start issuing materials by tapping the + button
              </Text>
            </View>
          ) : (
            issues.map((item) => (
              <View key={item.id}>
                {renderIssue({ item })}
              </View>
            ))
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        color="#fff"
        customSize={60}
        onPress={() => setModalVisible(true)}
      />

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => {
            setModalVisible(false);
            resetForm();
          }}
          contentContainerStyle={styles.modalContent}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Ionicons name="cube" size={28} color="#27ae60" />
                  <Text variant="headlineSmall" style={styles.modalTitle}>Issue Material</Text>
                </View>
                <TouchableOpacity onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}>
                  <Ionicons name="close" size={28} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.formSection}>
                <Text variant="bodyMedium" style={styles.fieldLabel}>
                  Material <Text style={styles.required}>*</Text>
                </Text>
                <View style={[
                  styles.pickerWrapper,
                  errors.material_id && styles.pickerError
                ]}>
                  <View style={styles.pickerIconContainer}>
                    <Ionicons name="layers" size={20} color="#27ae60" />
                  </View>
                  <Picker
                    selectedValue={formData.material_id}
                    onValueChange={(value) => {
                      setFormData({ ...formData, material_id: value });
                      setErrors({ ...errors, material_id: '' });
                    }}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select material..." value="" color="#999" />
                    {materials.map((material) => (
                      <Picker.Item
                        key={material.id}
                        label={`${material.name} (${material.current_stock} ${material.unit})`}
                        value={material.id}
                        color="#000"
                      />
                    ))}
                  </Picker>
                </View>
                {errors.material_id ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color="#e74c3c" />
                    <Text style={styles.errorText}>{errors.material_id}</Text>
                  </View>
                ) : null}
              </View>

              {!!formData.material_id && (
                <Card style={styles.stockCard} mode="outlined">
                  <Card.Content style={styles.stockCardContent}>
                    <View style={styles.stockIconContainer}>
                      <Ionicons name="archive" size={24} color="#27ae60" />
                    </View>
                    <View style={styles.stockInfo}>
                      <Text variant="labelMedium" style={styles.stockLabel}>Available Stock</Text>
                      <Text variant="headlineSmall" style={styles.stockValue}>
                        {materials.find(m => m.id === formData.material_id)?.current_stock}{' '}
                        <Text style={styles.stockUnit}>
                          {materials.find(m => m.id === formData.material_id)?.unit}
                        </Text>
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              )}

              <View style={styles.formSection}>
                <Text variant="bodyMedium" style={styles.fieldLabel}>
                  Quantity <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  mode="outlined"
                  placeholder="Enter quantity"
                  value={formData.quantity}
                  onChangeText={(text) => {
                    setFormData({ ...formData, quantity: text });
                    setErrors({ ...errors, quantity: '' });
                  }}
                  keyboardType="decimal-pad"
                  left={<TextInput.Icon icon="calculator" color="#27ae60" />}
                  style={[styles.input, styles.inputText]}
                  outlineColor="#ddd"
                  activeOutlineColor="#27ae60"
                  error={!!errors.quantity}
                  textColor="#000"
                  theme={{
                    colors: {
                      onSurfaceVariant: '#000',
                      placeholder: '#999',
                      text: '#000',
                    }
                  }}
                />
                {errors.quantity ? (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={16} color="#e74c3c" />
                    <Text style={styles.errorText}>{errors.quantity}</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.formSection}>
                <Text variant="bodyMedium" style={styles.fieldLabel}>
                  Issue Date
                </Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <View style={styles.dateButtonContent}>
                    <Ionicons name="calendar" size={20} color="#27ae60" />
                    <Text style={styles.dateButtonText}>
                      {new Date(formData.date).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDateChange}
                    maximumDate={new Date()}
                  />
                )}
              </View>

              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setModalVisible(false);
                    resetForm();
                  }}
                  style={styles.cancelButton}
                  labelStyle={styles.cancelButtonLabel}
                  contentStyle={styles.buttonContent}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSubmit}
                  style={styles.submitButton}
                  labelStyle={styles.submitButtonLabel}
                  contentStyle={styles.buttonContent}
                  buttonColor="#27ae60"
                  icon="check"
                >
                  Issue Material
                </Button>
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
          snackbar.type === 'error' ? styles.snackbarError : styles.snackbarSuccess
        ]}
        action={{
          label: 'OK',
          onPress: () => setSnackbar({ ...snackbar, visible: false }),
          textColor: '#fff',
        }}
      >
        <View style={styles.snackbarContent}>
          <Ionicons
            name={snackbar.type === 'error' ? 'alert-circle' : 'checkmark-circle'}
            size={20}
            color="#fff"
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
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    margin: 16,
    marginBottom: 12,
    backgroundColor: '#27ae60',
    borderRadius: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  summaryCount: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  siteNameText: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  gstCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#e67e22',
  },
  gstHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gstIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fef5e7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  gstInfo: {
    flex: 1,
  },
  gstLabel: {
    color: '#666',
    marginBottom: 4,
  },
  gstAmount: {
    color: '#e67e22',
    fontWeight: 'bold',
  },
  costsCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  costsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  costsTitle: {
    marginLeft: 12,
    fontWeight: '600',
    color: '#212121',
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  costLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  costIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e8f4fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  costDetails: {
    flex: 1,
  },
  costMaterialName: {
    fontWeight: '600',
    color: '#212121',
    marginBottom: 2,
  },
  costSubtext: {
    color: '#999',
  },
  costAmount: {
    fontWeight: '700',
    color: '#3498db',
  },
  totalCostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#3498db',
  },
  totalCostLabel: {
    fontWeight: '700',
    color: '#212121',
  },
  totalCostAmount: {
    fontWeight: 'bold',
    color: '#3498db',
  },
  issuesSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#212121',
    marginBottom: 12,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  issueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  materialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  materialDetails: {
    flex: 1,
  },
  materialName: {
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    color: '#999',
  },
  quantityContainer: {
    alignItems: 'flex-end',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quantity: {
    color: '#27ae60',
    fontWeight: 'bold',
  },
  unit: {
    color: '#27ae60',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#666',
    marginBottom: 8,
    fontWeight: '600',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 100,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#27ae60',
    borderRadius: 30,
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontWeight: 'bold',
    color: '#212121',
  },
  formSection: {
    marginBottom: 20,
  },
  fieldLabel: {
    color: '#000',
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: '#e74c3c',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
  },
  pickerError: {
    borderColor: '#e74c3c',
    borderWidth: 2,
  },
  pickerIconContainer: {
    marginRight: 8,
  },
  picker: {
    flex: 1,
    color: '#000',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
  },
  stockCard: {
    marginBottom: 20,
    backgroundColor: '#e8f5e9',
    borderColor: '#27ae60',
    borderRadius: 12,
  },
  stockCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stockIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stockInfo: {
    flex: 1,
  },
  stockLabel: {
    color: '#666',
    marginBottom: 4,
  },
  stockValue: {
    color: '#27ae60',
    fontWeight: 'bold',
  },
  stockUnit: {
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
  },
  inputText: {
    color: '#000',
    fontWeight: '500',
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    backgroundColor: '#fff',
  },
  dateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 8,
    borderColor: '#ddd',
  },
  cancelButtonLabel: {
    color: '#666',
  },
  submitButton: {
    flex: 2,
    borderRadius: 8,
  },
  submitButtonLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonContent: {
    paddingVertical: 6,
  },
  snackbar: {
    marginBottom: 20,
  },
  snackbarSuccess: {
    backgroundColor: '#27ae60',
  },
  snackbarError: {
    backgroundColor: '#e74c3c',
  },
  snackbarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  snackbarText: {
    color: '#fff',
    fontSize: 14,
  },
});

export default MaterialIssueScreen;