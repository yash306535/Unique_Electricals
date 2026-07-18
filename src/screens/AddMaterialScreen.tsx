import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  TouchableOpacity,
  TextInput as RNTextInput,
} from 'react-native';
import { Button, Text, Menu } from 'react-native-paper';
import { supabase } from '../config/supabase';
import { Ionicons } from '@expo/vector-icons';

const AddMaterialScreen = ({ navigation }: any) => {
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({ name: '', unit: '' });
  const [notification, setNotification] = useState({ visible: false, type: '', message: '' });
  const [menuVisible, setMenuVisible] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const unitOptions = [
    { label: 'Kilogram (kg)', value: 'kg', icon: 'speedometer-outline' },
    { label: 'Ton', value: 'ton', icon: 'fitness-outline' },
    { label: 'Bag', value: 'bag', icon: 'bag-handle-outline' },
    { label: 'Cubic Meter (m³)', value: 'm³', icon: 'cube-outline' },
    { label: 'Pieces (pcs)', value: 'pcs', icon: 'grid-outline' },
    { label: 'Liter (L)', value: 'L', icon: 'water-outline' },
    { label: 'Meter (m)', value: 'm', icon: 'resize-outline' },
    { label: 'Square Meter (m²)', value: 'm²', icon: 'square-outline' },
  ];

  const showNotification = (type: string, message: string) => {
    setNotification({ visible: true, type, message });
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2500),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setNotification({ visible: false, type: '', message: '' });
    });
  };

  const validateForm = () => {
    let valid = true;
    const newErrors = { name: '', unit: '' };

    if (!formData.name.trim()) {
      newErrors.name = 'Material name is required';
      valid = false;
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
      valid = false;
    }

    if (!formData.unit.trim()) {
      newErrors.unit = 'Unit is required';
      valid = false;
    } else if (formData.unit.trim().length < 1) {
      newErrors.unit = 'Please enter a valid unit';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      showNotification('error', 'Please fill all required fields correctly');
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from('materials').insert({
        name: formData.name.trim(),
        unit: formData.unit.trim().toLowerCase(),
        current_stock: 0,
      });

      if (error) throw error;

      showNotification('success', 'Material added successfully!');
      
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to add material');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="cube" size={48} color="#5B9BD5" />
          </View>
        </View>

        <View style={styles.header}>
          <Text style={styles.title}>Add New Material</Text>
          <Text style={styles.subtitle}>Fill in the details to add a new material to your inventory</Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Material Name *</Text>
            <View style={[styles.inputWrapper, errors.name && styles.inputWrapperError]}>
              <Ionicons name="cube-outline" size={20} color="#5B9BD5" style={styles.inputIcon} />
              <RNTextInput
                placeholder="e.g. Portland Cement, River Sand"
                placeholderTextColor="#94A3B8"
                value={formData.name}
                onChangeText={(text) => {
                  setFormData({ ...formData, name: text });
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                style={styles.input}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
            {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Unit of Measurement *</Text>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <TouchableOpacity 
                  onPress={() => setMenuVisible(true)}
                  style={[styles.inputWrapper, styles.pickerWrapper, errors.unit && styles.inputWrapperError]}
                >
                  <Ionicons name="analytics-outline" size={20} color="#5B9BD5" style={styles.inputIcon} />
                  <Text style={[styles.pickerText, !formData.unit && styles.placeholderText]}>
                    {formData.unit ? unitOptions.find(u => u.value === formData.unit)?.label : 'Select unit of measurement'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#64748B" />
                </TouchableOpacity>
              }
              contentStyle={styles.menuContent}
            >
              {unitOptions.map((option) => (
                <Menu.Item
                  key={option.value}
                  onPress={() => {
                    setFormData({ ...formData, unit: option.value });
                    if (errors.unit) setErrors({ ...errors, unit: '' });
                    setMenuVisible(false);
                  }}
                  title={option.label}
                  leadingIcon={option.icon}
                  titleStyle={styles.menuItemTitle}
                />
              ))}
            </Menu>
            {errors.unit ? <Text style={styles.errorText}>{errors.unit}</Text> : null}
          </View>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#5B9BD5" style={{ marginRight: 8 }} />
            <Text style={styles.infoText}>
              Initial stock will be set to 0. You can update it later from the inventory screen.
            </Text>
          </View>

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
            contentStyle={styles.submitButtonContent}
            labelStyle={styles.submitButtonLabel}
            buttonColor="#5B9BD5"
            icon="check-circle"
          >
            {loading ? 'Adding Material...' : 'Add Material'}
          </Button>
        </View>
      </ScrollView>

      {notification.visible && (
        <Animated.View 
          style={[
            styles.notificationContainer,
            { opacity: fadeAnim },
            notification.type === 'success' ? styles.successNotification : styles.errorNotification
          ]}
        >
          <Ionicons 
            name={notification.type === 'success' ? 'checkmark-circle' : 'alert-circle'} 
            size={24} 
            color="#FFFFFF" 
            style={{ marginRight: 12 }}
          />
          <Text style={styles.notificationText}>{notification.message}</Text>
        </Animated.View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EBF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5B9BD5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    minHeight: 56,
  },
  inputWrapperError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  pickerWrapper: {
    justifyContent: 'space-between',
    paddingRight: 12,
  },
  pickerText: {
    flex: 1,
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  menuContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
  },
  menuItemTitle: {
    fontSize: 14,
    color: '#1E293B',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 6,
    marginLeft: 4,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EBF5FF',
    borderLeftWidth: 3,
    borderLeftColor: '#5B9BD5',
    padding: 14,
    borderRadius: 10,
    marginBottom: 24,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  submitButton: {
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#5B9BD5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  submitButtonContent: {
    paddingVertical: 10,
  },
  submitButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  notificationContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  successNotification: {
    backgroundColor: '#10B981',
  },
  errorNotification: {
    backgroundColor: '#EF4444',
  },
  notificationText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AddMaterialScreen;