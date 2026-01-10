import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { TextInput, Button, Checkbox, Text, Card, Portal, Modal, ActivityIndicator } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../config/supabase';
import { Material } from '../types';

const PurchaseScreen = ({ navigation, route }: any) => {
  const { materialId } = route.params || {};
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [date, setDate] = useState(new Date());
  const [typing, setTyping] = useState<{ [key: string]: boolean }>({});
  const [successVisible, setSuccessVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorVisible, setErrorVisible] = useState(false);
  const successScale = new Animated.Value(0);

  const [formData, setFormData] = useState({
    material_id: materialId || '',
    vendor_name: '',
    quantity: '',
    rate: '',
    total_amount: '',
    gst_amount: '',
    has_bill: false,
  });

  useEffect(() => {
    fetchMaterials();
  }, []);

  useEffect(() => {
    calculateTotal();
  }, [formData.quantity, formData.rate, formData.gst_amount]);

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('name');

      if (error) throw error;
      setMaterials(data || []);
    } catch (error: any) {
      showError(error.message);
    }
  };

  const calculateTotal = () => {
    const qty = parseFloat(formData.quantity) || 0;
    const rate = parseFloat(formData.rate) || 0;
    const gst = parseFloat(formData.gst_amount) || 0;
    const total = (qty * rate) + gst;
    setFormData(prev => ({ ...prev, total_amount: total.toString() }));
  };

  const handleTextChange = (field: string, text: string) => {
    setTyping({ ...typing, [field]: true });
    setFormData({ ...formData, [field]: text });
    
    setTimeout(() => {
      setTyping({ ...typing, [field]: false });
    }, 1000);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const showSuccess = () => {
    setSuccessVisible(true);
    Animated.spring(successScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();

    setTimeout(() => {
      Animated.timing(successScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setSuccessVisible(false);
        navigation.goBack();
      });
    }, 2000);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setErrorVisible(true);
    setTimeout(() => setErrorVisible(false), 3000);
  };

  const handleSubmit = async () => {
    if (!formData.material_id) {
      showError('Please select a material');
      return;
    }

    const quantity = parseFloat(formData.quantity);
    const rate = parseFloat(formData.rate);

    if (!quantity || quantity <= 0) {
      showError('Please enter a valid quantity');
      return;
    }

    if (!rate || rate <= 0) {
      showError('Please enter a valid rate');
      return;
    }

    try {
      setLoading(true);

      const purchaseData = {
        material_id: formData.material_id,
        vendor_name: formData.vendor_name || null,
        quantity: quantity,
        rate: rate,
        total_amount: parseFloat(formData.total_amount),
        gst_amount: parseFloat(formData.gst_amount) || 0,
        has_bill: formData.has_bill,
        bill_photo_url: selectedImage || null,
        date: date.toISOString().split('T')[0],
      };

      const { error: purchaseError } = await supabase
        .from('purchases')
        .insert(purchaseData);

      if (purchaseError) throw purchaseError;

      const material = materials.find(m => m.id === formData.material_id);
      if (material) {
        const { error: updateError } = await supabase
          .from('materials')
          .update({ current_stock: material.current_stock + quantity })
          .eq('id', formData.material_id);

        if (updateError) throw updateError;
      }

      showSuccess();
    } catch (error: any) {
      showError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        <Card style={styles.headerCard} elevation={2}>
          <Card.Content>
            <View style={styles.headerContent}>
              <Ionicons name="cart" size={32} color="#27ae60" />
              <View style={styles.headerText}>
                <Text variant="headlineSmall" style={styles.headerTitle}>New Purchase</Text>
                <Text variant="bodySmall" style={styles.headerSubtitle}>Add material purchase details</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.formCard} elevation={1}>
          <Card.Content>
            <View style={styles.pickerContainer}>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                <Ionicons name="cube" size={16} /> Material Information
              </Text>
              <Text variant="bodyMedium" style={styles.pickerLabel}>Select Material *</Text>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={formData.material_id}
                  onValueChange={(value) => setFormData({ ...formData, material_id: value })}
                  enabled={!materialId}
                  style={styles.picker}
                >
                  <Picker.Item label="-- Select Material --" value="" />
                  {materials.map((material) => (
                    <Picker.Item
                      key={material.id}
                      label={`${material.name} (${material.unit})`}
                      value={material.id}
                    />
                  ))}
                </Picker>
              </View>
            </View>

            <TextInput
              label="Vendor Name"
              mode="outlined"
              placeholder="Enter vendor name (optional)"
              placeholderTextColor="#95a5a6"
              value={formData.vendor_name}
              onChangeText={(text) => handleTextChange('vendor_name', text)}
              left={<TextInput.Icon icon="account" color="#3498db" />}
              right={typing.vendor_name ? <TextInput.Icon icon={() => <ActivityIndicator size={20} color="#27ae60" />} /> : null}
              style={styles.input}
              outlineColor="#e0e0e0"
              activeOutlineColor="#27ae60"
              textColor="#2c3e50"
            />

            <View style={styles.row}>
              <TextInput
                label="Quantity *"
                mode="outlined"
                placeholder="0"
                placeholderTextColor="#95a5a6"
                value={formData.quantity}
                onChangeText={(text) => handleTextChange('quantity', text)}
                keyboardType="numeric"
                left={<TextInput.Icon icon="calculator" color="#9b59b6" />}
                right={typing.quantity ? <TextInput.Icon icon={() => <ActivityIndicator size={20} color="#27ae60" />} /> : null}
                style={[styles.input, styles.halfInput]}
                outlineColor="#e0e0e0"
                activeOutlineColor="#27ae60"
                textColor="#2c3e50"
              />

              <TextInput
                label="Rate per Unit *"
                mode="outlined"
                placeholder="₹0"
                placeholderTextColor="#95a5a6"
                value={formData.rate}
                onChangeText={(text) => handleTextChange('rate', text)}
                keyboardType="numeric"
                left={<TextInput.Icon icon="currency-inr" color="#f39c12" />}
                right={typing.rate ? <TextInput.Icon icon={() => <ActivityIndicator size={20} color="#27ae60" />} /> : null}
                style={[styles.input, styles.halfInput]}
                outlineColor="#e0e0e0"
                activeOutlineColor="#27ae60"
                textColor="#2c3e50"
              />
            </View>

            <TextInput
              label="GST Amount"
              mode="outlined"
              placeholder="₹0 (optional)"
              placeholderTextColor="#95a5a6"
              value={formData.gst_amount}
              onChangeText={(text) => handleTextChange('gst_amount', text)}
              keyboardType="numeric"
              left={<TextInput.Icon icon="receipt" color="#e74c3c" />}
              right={typing.gst_amount ? <TextInput.Icon icon={() => <ActivityIndicator size={20} color="#27ae60" />} /> : null}
              style={styles.input}
              outlineColor="#e0e0e0"
              activeOutlineColor="#27ae60"
              textColor="#2c3e50"
            />

            <Card style={styles.totalCard} mode="elevated" elevation={3}>
              <Card.Content style={styles.totalContent}>
                <View style={styles.totalRow}>
                  <Text variant="bodyLarge" style={styles.totalLabel}>Total Amount</Text>
                  <Text variant="headlineMedium" style={styles.totalAmount}>
                    ₹{parseFloat(formData.total_amount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
              </Card.Content>
            </Card>

            <Text variant="titleSmall" style={styles.sectionTitle}>
              <Ionicons name="calendar" size={16} /> Purchase Date
            </Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <TextInput
                label="Date"
                mode="outlined"
                value={date.toLocaleDateString('en-GB')}
                editable={false}
                left={<TextInput.Icon icon="calendar" color="#e67e22" />}
                right={<TextInput.Icon icon="chevron-down" color="#95a5a6" />}
                style={styles.input}
                outlineColor="#e0e0e0"
                activeOutlineColor="#27ae60"
                textColor="#2c3e50"
              />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()}
              />
            )}

            <Text variant="titleSmall" style={styles.sectionTitle}>
              <Ionicons name="document-text" size={16} /> Bill Information
            </Text>
            <Card style={styles.checkboxCard} mode="outlined">
              <Card.Content style={styles.checkboxContent}>
                <Checkbox.Item
                  label="Purchase with Bill"
                  status={formData.has_bill ? 'checked' : 'unchecked'}
                  onPress={() => setFormData({ ...formData, has_bill: !formData.has_bill })}
                  style={styles.checkbox}
                  color="#27ae60"
                  labelStyle={styles.checkboxLabel}
                />
              </Card.Content>
            </Card>

            {formData.has_bill && (
              <View style={styles.imageSection}>
                <TouchableOpacity 
                  style={styles.imageButton} 
                  onPress={pickImage}
                  activeOpacity={0.7}
                >
                  <Ionicons name="camera" size={28} color="#27ae60" />
                  <Text variant="titleMedium" style={styles.imageButtonText}>
                    {selectedImage ? 'Change Bill Photo' : 'Add Bill Photo'}
                  </Text>
                </TouchableOpacity>

                {selectedImage && (
                  <Card style={styles.imageCard} elevation={2}>
                    <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                    <TouchableOpacity 
                      style={styles.removeImageButton}
                      onPress={() => setSelectedImage(null)}
                    >
                      <Ionicons name="close-circle" size={32} color="#e74c3c" />
                    </TouchableOpacity>
                  </Card>
                )}
              </View>
            )}
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          style={styles.submitButton}
          buttonColor="#27ae60"
          icon="check-circle"
          contentStyle={styles.submitButtonContent}
          labelStyle={styles.submitButtonLabel}
          disabled={loading}
        >
          {loading ? 'Adding Purchase...' : 'Add Purchase'}
        </Button>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Success Modal */}
      <Portal>
        <Modal visible={successVisible} dismissable={false} contentContainerStyle={styles.modalContainer}>
          <Animated.View style={[styles.successModal, { transform: [{ scale: successScale }] }]}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#27ae60" />
            </View>
            <Text variant="headlineSmall" style={styles.successTitle}>Success!</Text>
            <Text variant="bodyLarge" style={styles.successMessage}>
              Purchase added successfully
            </Text>
          </Animated.View>
        </Modal>
      </Portal>

      {/* Error Toast */}
      {errorVisible && (
        <Animated.View style={styles.errorToast}>
          <Card style={styles.errorCard} elevation={4}>
            <Card.Content style={styles.errorContent}>
              <Ionicons name="alert-circle" size={24} color="#fff" />
              <Text variant="bodyMedium" style={styles.errorText}>{errorMessage}</Text>
            </Card.Content>
          </Card>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  headerCard: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  headerSubtitle: {
    color: '#7f8c8d',
    marginTop: 4,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
    color: '#2c3e50',
  },
  pickerContainer: {
    marginBottom: 8,
  },
  pickerLabel: {
    marginBottom: 8,
    color: '#666',
    fontWeight: '500',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  totalCard: {
    marginVertical: 16,
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
  },
  totalContent: {
    paddingVertical: 8,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    color: '#2c3e50',
    fontWeight: '600',
  },
  totalAmount: {
    fontWeight: 'bold',
    color: '#27ae60',
  },
  checkboxCard: {
    borderRadius: 8,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  checkboxContent: {
    paddingVertical: 0,
  },
  checkbox: {
    paddingLeft: 0,
  },
  checkboxLabel: {
    color: '#2c3e50',
  },
  imageSection: {
    marginTop: 16,
  },
  imageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderWidth: 2,
    borderColor: '#27ae60',
    borderRadius: 12,
    borderStyle: 'dashed',
    backgroundColor: '#f0f8f0',
  },
  imageButtonText: {
    marginLeft: 12,
    color: '#27ae60',
    fontWeight: '600',
  },
  imageCard: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  submitButton: {
    borderRadius: 12,
    elevation: 4,
  },
  submitButtonContent: {
    paddingVertical: 8,
  },
  submitButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomPadding: {
    height: 20,
  },
  modalContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    minWidth: 280,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 12,
  },
  successMessage: {
    color: '#7f8c8d',
    textAlign: 'center',
  },
  errorToast: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  errorCard: {
    backgroundColor: '#e74c3c',
    borderRadius: 12,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  errorText: {
    color: '#fff',
    marginLeft: 12,
    flex: 1,
    fontWeight: '600',
  },
});

export default PurchaseScreen;