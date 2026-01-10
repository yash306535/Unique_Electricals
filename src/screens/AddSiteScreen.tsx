import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { Button, Card, Chip, Text, TextInput } from 'react-native-paper';
import { supabase } from '../config/supabase';
import { WorkType } from '../types';

const AddSiteScreen = ({ navigation, route }: any) => {
  const { siteId } = route.params || {};
  const isEditMode = !!siteId;

  const scrollViewRef = useRef<ScrollView>(null);
  const inputPositions = useRef<{ [key: string]: number }>({});

  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    location: '',
    start_date: '',
    estimated_cost: '',
    status: 'active' as 'active' | 'completed' | 'on-hold',
  });
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [selectedWorkTypes, setSelectedWorkTypes] = useState<string[]>([]);

  useEffect(() => {
    if (isEditMode) {
      fetchSiteData();
    }
    fetchWorkTypes();
  }, [siteId]);

  const fetchWorkTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('work_types')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setWorkTypes(data || []);
    } catch (error: any) {
      console.error('Error fetching work types:', error.message);
    }
  };

  const fetchSiteData = async () => {
    try {
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('id', siteId)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          name: data.name || '',
          client_name: data.client_name || '',
          location: data.location || '',
          start_date: data.start_date || '',
          estimated_cost: data.estimated_cost?.toString() || '',
          status: data.status || 'active',
        });
        
        if (data.start_date) {
          setSelectedDate(new Date(data.start_date));
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const scrollToInput = (inputKey: string) => {
    const yPosition = inputPositions.current[inputKey];
    if (yPosition !== undefined && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          y: yPosition - 20,
          animated: true,
        });
      }, 100);
    }
  };

  const handleLayout = (event: any, inputKey: string) => {
    const { y } = event.nativeEvent.layout;
    inputPositions.current[inputKey] = y;
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    
    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toISOString().split('T')[0];
      setFormData({ ...formData, start_date: formattedDate });
    }
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter site name');
      return;
    }

    try {
      setLoading(true);

      let siteIdToUse: string;

      if (isEditMode) {
        const { error } = await supabase
          .from('sites')
          .update({
            name: formData.name,
            client_name: formData.client_name || null,
            location: formData.location || null,
            start_date: formData.start_date || null,
            estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
            status: formData.status,
          })
          .eq('id', siteId);

        if (error) throw error;
        siteIdToUse = siteId;
        Alert.alert('Success', 'Site updated successfully');
      } else {
        const { data: siteData, error } = await supabase.from('sites').insert({
          name: formData.name,
          client_name: formData.client_name || null,
          location: formData.location || null,
          start_date: formData.start_date || null,
          estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
          status: formData.status,
        }).select('id').single();

        if (error) throw error;
        siteIdToUse = siteData.id;
        Alert.alert('Success', 'Site added successfully');
      }

      // Save work types for the site
      if (selectedWorkTypes.length > 0) {
        const siteWorkTypesData = selectedWorkTypes.map(workTypeId => ({
          site_id: siteIdToUse,
          work_type_id: workTypeId,
        }));

        const { error: workTypesError } = await supabase
          .from('site_work_types')
          .insert(siteWorkTypesData);

        if (workTypesError) throw workTypesError;

        // Initialize documentation tracking for each work type
        for (const workTypeId of selectedWorkTypes) {
          // Get documents for this work type
          const { data: documents, error: docsError } = await supabase
            .from('work_documents')
            .select('id')
            .eq('work_type_id', workTypeId);

          if (docsError) throw docsError;

          if (documents && documents.length > 0) {
            const siteDocsData = documents.map(doc => ({
              site_id: siteIdToUse,
              work_type_id: workTypeId,
              document_id: doc.id,
              is_completed: false,
            }));

            await supabase.from('site_documentation').insert(siteDocsData);
          }
        }
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return '#4CAF50';
      case 'completed':
        return '#2196F3';
      case 'on-hold':
        return '#FF9800';
      default:
        return '#6200ee';
    }
  };

  return (
    <View style={styles.mainContainer}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView 
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          bounces={true}
        >
          <Card style={styles.headerCard} elevation={2}>
            <Card.Content>
              <View style={styles.headerContent}>
                <View>
                  <Text variant="headlineSmall" style={styles.headerTitle}>
                    {isEditMode ? 'Edit Site' : 'New Site'}
                  </Text>
                  <Text variant="bodyMedium" style={styles.headerSubtitle}>
                    {isEditMode ? 'Update site information' : 'Add a new construction site'}
                  </Text>
                </View>
                <View style={[styles.iconContainer, { backgroundColor: getStatusColor(formData.status) }]}>
                  <Text style={styles.iconText}>🏗️</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.formCard} elevation={1}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIndicator} />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Basic Information
                </Text>
              </View>

              <View 
                onLayout={(e) => handleLayout(e, 'name')}
              >
                <TextInput
                  label="Site Name"
                  mode="outlined"
                  placeholder="e.g., Downtown Plaza Construction"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  onFocus={() => scrollToInput('name')}
                  left={<TextInput.Icon icon="office-building" color="#6200ee" />}
                  style={styles.input}
                  outlineColor="#E0E0E0"
                  activeOutlineColor="#6200ee"
                  textColor="#1a1a1a"
                  theme={{
                    colors: {
                      text: '#1a1a1a',
                      placeholder: '#757575',
                      background: '#FFFFFF',
                    },
                  }}
                  right={<TextInput.Affix text="*" textStyle={styles.requiredIndicator} />}
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
              </View>

              <View 
                onLayout={(e) => handleLayout(e, 'client_name')}
              >
                <TextInput
                  label="Client Name"
                  mode="outlined"
                  placeholder="e.g., ABC Corporation"
                  value={formData.client_name}
                  onChangeText={(text) => setFormData({ ...formData, client_name: text })}
                  onFocus={() => scrollToInput('client_name')}
                  left={<TextInput.Icon icon="account" color="#6200ee" />}
                  style={styles.input}
                  outlineColor="#E0E0E0"
                  activeOutlineColor="#6200ee"
                  textColor="#1a1a1a"
                  theme={{
                    colors: {
                      text: '#1a1a1a',
                      placeholder: '#757575',
                      background: '#FFFFFF',
                    },
                  }}
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
              </View>

              <View 
                onLayout={(e) => handleLayout(e, 'location')}
              >
                <TextInput
                  label="Location"
                  mode="outlined"
                  placeholder="e.g., Mumbai, Maharashtra"
                  value={formData.location}
                  onChangeText={(text) => setFormData({ ...formData, location: text })}
                  onFocus={() => scrollToInput('location')}
                  left={<TextInput.Icon icon="map-marker" color="#6200ee" />}
                  style={styles.input}
                  outlineColor="#E0E0E0"
                  activeOutlineColor="#6200ee"
                  textColor="#1a1a1a"
                  theme={{
                    colors: {
                      text: '#1a1a1a',
                      placeholder: '#757575',
                      background: '#FFFFFF',
                    },
                  }}
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
              </View>

              <View style={styles.sectionHeader}>
                <View style={styles.sectionIndicator} />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Project Details
                </Text>
              </View>

              <Text variant="bodyMedium" style={styles.fieldLabel}>
                Start Date
              </Text>
              <View 
                onLayout={(e) => handleLayout(e, 'date')}
              >
                <TouchableOpacity
                  onPress={() => {
                    Keyboard.dismiss();
                    scrollToInput('date');
                    setTimeout(() => setShowDatePicker(true), 300);
                  }}
                  style={styles.datePickerButton}
                  activeOpacity={0.7}
                >
                  <View style={styles.datePickerContent}>
                    <View style={styles.dateIconContainer}>
                      <Text style={styles.datePickerIcon}>📅</Text>
                    </View>
                    <Text style={styles.datePickerText}>
                      {formData.start_date || 'Select start date'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                />
              )}

              <View 
                onLayout={(e) => handleLayout(e, 'cost')}
              >
                <TextInput
                  label="Estimated Project Cost"
                  mode="outlined"
                  placeholder="e.g., 5000000"
                  value={formData.estimated_cost}
                  onChangeText={(text) => {
                    const sanitized = text.replace(/[^0-9.]/g, '');
                    setFormData({ ...formData, estimated_cost: sanitized });
                  }}
                  onFocus={() => scrollToInput('cost')}
                  keyboardType="decimal-pad"
                  left={<TextInput.Icon icon="currency-inr" color="#6200ee" />}
                  style={styles.input}
                  outlineColor="#E0E0E0"
                  activeOutlineColor="#6200ee"
                  textColor="#1a1a1a"
                  theme={{
                    colors: {
                      text: '#1a1a1a',
                      placeholder: '#757575',
                      background: '#FFFFFF',
                    },
                  }}
                  returnKeyType="done"
                />
              </View>

              <View 
                onLayout={(e) => handleLayout(e, 'status')}
                style={styles.pickerContainer}
              >
                <Text variant="bodyMedium" style={styles.fieldLabel}>
                  Project Status
                </Text>
                <TouchableOpacity 
                  onPress={() => {
                    Keyboard.dismiss();
                    scrollToInput('status');
                  }}
                  activeOpacity={1}
                >
                  <View style={[styles.pickerWrapper, { borderColor: getStatusColor(formData.status) }]}>
                    <View style={[styles.statusDot, { backgroundColor: getStatusColor(formData.status) }]} />
                    <Picker
                      selectedValue={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                      style={styles.picker}
                    >
                      <Picker.Item label="🟢 Active" value="active" />
                      <Picker.Item label="🔵 Completed" value="completed" />
                      <Picker.Item label="🟡 On Hold" value="on-hold" />
                    </Picker>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Work Types Selection */}
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIndicator} />
                <Text variant="titleMedium" style={styles.sectionTitle}>
                  Work Types
                </Text>
              </View>

              <Text variant="bodyMedium" style={styles.fieldLabel}>
                Select Work Types for this Site
              </Text>
              
              <View style={styles.workTypesContainer}>
                {workTypes.map((workType) => (
                  <Chip
                    key={workType.id}
                    selected={selectedWorkTypes.includes(workType.id)}
                    onPress={() => {
                      if (selectedWorkTypes.includes(workType.id)) {
                        setSelectedWorkTypes(selectedWorkTypes.filter(id => id !== workType.id));
                      } else {
                        setSelectedWorkTypes([...selectedWorkTypes, workType.id]);
                      }
                    }}
                    style={styles.workTypeChip}
                    textStyle={styles.workTypeChipText}
                  >
                    {workType.name}
                  </Chip>
                ))}
              </View>

              {workTypes.length === 0 && (
                <View style={styles.noWorkTypesContainer}>
                  <Text variant="bodyMedium" style={styles.noWorkTypesText}>
                    No work types available. Add work types first.
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.submitButton}
          labelStyle={styles.submitButtonLabel}
          contentStyle={styles.submitButtonContent}
          icon={isEditMode ? "check-circle" : "plus-circle"}
        >
          {isEditMode ? 'Update Site' : 'Add Site'}
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  headerCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#666666',
    marginTop: 4,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconText: {
    fontSize: 28,
  },
  formCard: {
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionIndicator: {
    width: 4,
    height: 20,
    backgroundColor: '#6200ee',
    borderRadius: 2,
    marginRight: 12,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#1a1a1a',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    fontSize: 16,
  },
  fieldLabel: {
    marginBottom: 8,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  requiredIndicator: {
    color: '#d32f2f',
    fontWeight: 'bold',
    fontSize: 16,
  },
  datePickerButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F3E5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  datePickerIcon: {
    fontSize: 20,
  },
  datePickerText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  pickerContainer: {
    marginBottom: 8,
    marginTop: 8,
  },
  pickerWrapper: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  picker: {
    flex: 1,
    height: 56,
    color: '#1a1a1a',
  },
  bottomSpacing: {
    height: 20,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  submitButton: {
    backgroundColor: '#6200ee',
    borderRadius: 12,
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonContent: {
    height: 52,
  },
  submitButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  workTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  workTypeChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  workTypeChipText: {
    fontSize: 14,
  },
  noWorkTypesContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 16,
  },
  noWorkTypesText: {
    color: '#666',
    textAlign: 'center',
  },
});

export default AddSiteScreen;