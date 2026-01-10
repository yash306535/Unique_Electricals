import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  Animated,
  TouchableOpacity
} from 'react-native';
import {
  Button,
  Card,
  Checkbox,
  Chip,
  IconButton,
  Modal,
  Portal,
  Text,
  TextInput
} from 'react-native-paper';
import { supabase } from '../config/supabase';
import {
  FileDeskTracking,
  Site,
  SiteDocumentation,
  WorkProcessStep,
  WorkType
} from '../types';

const SiteDocumentationScreen = ({ route }: any) => {
  const { siteId, siteName } = route.params;
  const [site, setSite] = useState<Site | null>(null);
  const [siteWorkTypes, setSiteWorkTypes] = useState<WorkType[]>([]);
  const [documentation, setDocumentation] = useState<SiteDocumentation[]>([]);
  const [deskTracking, setDeskTracking] = useState<FileDeskTracking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [deskModalVisible, setDeskModalVisible] = useState(false);
  const [selectedWorkType, setSelectedWorkType] = useState<WorkType | null>(null);
  const [editingDesk, setEditingDesk] = useState<FileDeskTracking | null>(null);
  
  const [deskForm, setDeskForm] = useState<{
    current_desk: string;
    status: 'pending' | 'in_progress' | 'approved' | 'rejected';
    notes: string;
    assigned_to: string;
  }>({
    current_desk: '',
    status: 'pending',
    notes: '',
    assigned_to: '',
  });
  const [showProcess, setShowProcess] = useState(false);
  const [processSteps, setProcessSteps] = useState<WorkProcessStep[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSiteData();
  }, [siteId]);

  const fetchSiteData = async () => {
    try {
      // Fetch site details
      const { data: siteData, error: siteError } = await supabase
        .from('sites')
        .select('*')
        .eq('id', siteId)
        .single();

      if (siteError) throw siteError;
      setSite(siteData);

      // Fetch site work types
      const { data: workTypesData, error: workTypesError } = await supabase
        .from('site_work_types')
        .select(`
          work_type_id,
          work_types(id, name, description)
        `)
        .eq('site_id', siteId);

      if (workTypesError) throw workTypesError;
      
      const workTypes = (workTypesData?.map(item => item.work_types).filter(Boolean) || []) as unknown as WorkType[];
      setSiteWorkTypes(workTypes);

      // Fetch documentation for all work types
      if (workTypes.length > 0) {
        const { data: docData, error: docError } = await supabase
          .from('site_documentation')
          .select(`
            *,
            work_documents!inner(id, document_name, is_required, order_index, work_type_id)
          `)
          .eq('site_id', siteId);

        if (docError) throw docError;
        setDocumentation(docData || []);
      }

      // Fetch desk tracking
      const { data: deskData, error: deskError } = await supabase
        .from('file_desk_tracking')
        .select('*')
        .eq('site_id', siteId)
        .order('created_at', { ascending: false });

      if (deskError) throw deskError;
      setDeskTracking(deskData || []);

    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchSiteData();
    setRefreshing(false);
  };

  const updateDocumentationStatus = async (docId: string, isCompleted: boolean) => {
    try {
      const { error } = await supabase
        .from('site_documentation')
        .update({ 
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null
        })
        .eq('id', docId);

      if (error) throw error;
      
      // Update local state
      setDocumentation(prev => 
        prev.map(doc => 
          doc.id === docId 
            ? { ...doc, is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null }
            : doc
        )
      );

      Alert.alert('Success', 'Document status updated');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const updateDeskTracking = async () => {
    if (!selectedWorkType || !deskForm.current_desk.trim()) {
      Alert.alert('Error', 'Please select work type and enter current desk');
      return;
    }

    try {
      const trackingData = {
        site_id: siteId,
        work_type_id: selectedWorkType.id,
        current_desk: deskForm.current_desk,
        status: deskForm.status,
        notes: deskForm.notes,
        assigned_to: deskForm.assigned_to,
      };

      if (editingDesk) {
        // Update existing tracking
        const { error } = await supabase
          .from('file_desk_tracking')
          .update(trackingData)
          .eq('id', editingDesk.id);

        if (error) throw error;
      } else {
        // Create new tracking
        const { error } = await supabase
          .from('file_desk_tracking')
          .insert(trackingData);

        if (error) throw error;
      }

      Alert.alert('Success', 'Desk tracking updated');
      setDeskModalVisible(false);
      resetDeskForm();
      fetchSiteData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const deleteDesk = async (deskId: string) => {
    try {
      const { error } = await supabase
        .from('file_desk_tracking')
        .delete()
        .eq('id', deskId);

      if (error) throw error;

      Alert.alert('Success', 'Desk tracking deleted');
      fetchSiteData();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const editDesk = (desk: FileDeskTracking) => {
    setEditingDesk(desk);
    setSelectedWorkType(siteWorkTypes.find(wt => wt.id === desk.work_type_id) || null);
    setDeskForm({
      current_desk: desk.current_desk,
      status: desk.status,
      notes: desk.notes || '',
      assigned_to: desk.assigned_to || '',
    });
    setDeskModalVisible(true);
  };

  const resetDeskForm = () => {
    setDeskForm({
      current_desk: '',
      status: 'pending',
      notes: '',
      assigned_to: '',
    });
    setSelectedWorkType(null);
    setEditingDesk(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
      case 'in_progress': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return 'checkmark-circle';
      case 'rejected': return 'close-circle';
      case 'in_progress': return 'time';
      default: return 'help-circle';
    }
  };

  const calculateProgress = (docs: SiteDocumentation[]) => {
    if (docs.length === 0) return 0;
    const completed = docs.filter(doc => doc.is_completed).length;
    return (completed / docs.length) * 100;
  };

  const isFileReady = () => {
    if (documentation.length === 0) return false;
    return documentation.every(doc => doc.is_completed);
  };

  const fetchProcessSteps = async (workTypeId: string) => {
    try {
      const { data, error } = await supabase
        .from('work_process_steps')
        .select('*')
        .eq('work_type_id', workTypeId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setProcessSteps(data || []);
    } catch (error: any) {
      console.error('Error fetching process steps:', error.message);
    }
  };

  const toggleStepExpansion = (stepId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const renderWorkTypeSection = (workType: WorkType) => {
    const workTypeDocs = documentation.filter(doc => 
      doc.work_documents?.work_type_id === workType.id
    );
    const progress = calculateProgress(workTypeDocs);
    
    return (
      <Card key={workType.id} style={styles.workTypeCard} mode="elevated" elevation={3}>
        <Card.Content>
          <View style={styles.workTypeHeader}>
            <View style={styles.workTypeTitleContainer}>
              <View style={styles.workTypeIcon}>
                <Ionicons name="briefcase" size={20} color="#6200ee" />
              </View>
              <Text variant="titleMedium" style={styles.workTypeTitle}>
                {workType.name}
              </Text>
            </View>
            <View style={styles.progressContainer}>
              <Text variant="bodySmall" style={styles.progressText}>
                {Math.round(progress)}%
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${progress}%`,
                      backgroundColor: progress === 100 ? '#10b981' : '#6200ee'
                    }
                  ]} 
                />
              </View>
            </View>
          </View>

          <View style={styles.documentList}>
            {workTypeDocs.map((doc) => (
              <View 
                key={doc.id} 
                style={[
                  styles.documentItem,
                  doc.is_completed && styles.documentItemCompleted
                ]}
              >
                <Checkbox.Android
                  status={doc.is_completed ? 'checked' : 'unchecked'}
                  onPress={() => updateDocumentationStatus(doc.id, !doc.is_completed)}
                  color="#10b981"
                  uncheckedColor="#9ca3af"
                />
                <View style={styles.documentInfo}>
                  <Text 
                    variant="bodyLarge" 
                    style={styles.documentName}
                  >
                    {doc.work_documents?.document_name || 'Unnamed Document'}
                  </Text>
                  {doc.is_completed && (
                    <Text variant="bodySmall" style={styles.completedStatus}>
                      ✓ Completed
                    </Text>
                  )}
                  {doc.completed_at && (
                    <View style={styles.completedBadge}>
                      <Ionicons name="calendar" size={12} color="#10b981" />
                      <Text variant="bodySmall" style={styles.completedDate}>
                        {new Date(doc.completed_at).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                </View>
                {doc.is_completed && (
                  <View style={styles.completedIconContainer}>
                    <Ionicons name="checkmark-done-circle" size={24} color="#10b981" />
                  </View>
                )}
              </View>
            ))}
          </View>
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={styles.scrollView}
      >
        {/* Site Info Card */}
        <Card style={styles.siteCard} mode="elevated" elevation={4}>
          <Card.Content>
            <View style={styles.siteHeader}>
              <Ionicons name="business" size={32} color="white" />
              <Text variant="headlineSmall" style={styles.siteName}>
                {siteName}
              </Text>
            </View>
            {site?.location && (
              <View style={styles.locationContainer}>
                <Ionicons name="location" size={18} color="rgba(255, 255, 255, 0.9)" />
                <Text variant="bodyMedium" style={styles.siteLocation}>
                  {site.location}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Desk Tracking Card */}
        <Card style={styles.deskCard} mode="elevated" elevation={3}>
          <Card.Content>
            <View style={styles.deskHeader}>
              <View style={styles.deskHeaderLeft}>
                <View style={styles.deskIconContainer}>
                  <Ionicons name="folder-open" size={24} color="#6200ee" />
                </View>
                <Text variant="titleMedium" style={styles.deskTitle}>
                  File Desk Tracking
                </Text>
              </View>
              <IconButton
                icon="plus-circle"
                size={28}
                iconColor="#6200ee"
                onPress={() => {
                  resetDeskForm();
                  setDeskModalVisible(true);
                }}
              />
            </View>

            {deskTracking.length > 0 ? (
              <View style={styles.deskList}>
                {deskTracking.map((desk) => (
                  <View key={desk.id} style={styles.deskItem}>
                    <View style={styles.deskItemHeader}>
                      <View style={styles.deskItemTop}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(desk.status) }]}>
                          <Ionicons name={getStatusIcon(desk.status)} size={14} color="white" />
                          <Text style={styles.statusBadgeText}>
                            {desk.status.replace('_', ' ').toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.deskActions}>
                          <IconButton
                            icon="pencil"
                            size={20}
                            iconColor="#6200ee"
                            onPress={() => editDesk(desk)}
                          />
                          <IconButton
                            icon="delete"
                            size={20}
                            iconColor="#ef4444"
                            onPress={() => {
                              Alert.alert(
                                'Delete Tracking',
                                'Are you sure you want to delete this desk tracking?',
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  { text: 'Delete', onPress: () => deleteDesk(desk.id), style: 'destructive' }
                                ]
                              );
                            }}
                          />
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.deskInfo}>
                      <View style={styles.deskRow}>
                        <View style={styles.deskIconBg}>
                          <Ionicons name="business" size={20} color="#6200ee" />
                        </View>
                        <View style={styles.deskTextContainer}>
                          <Text variant="bodySmall" style={styles.deskLabel}>Current Desk</Text>
                          <Text variant="bodyLarge" style={styles.deskValue}>{desk.current_desk}</Text>
                        </View>
                      </View>

                      {desk.assigned_to && (
                        <View style={styles.deskRow}>
                          <View style={styles.deskIconBg}>
                            <Ionicons name="person" size={20} color="#6200ee" />
                          </View>
                          <View style={styles.deskTextContainer}>
                            <Text variant="bodySmall" style={styles.deskLabel}>Assigned To</Text>
                            <Text variant="bodyLarge" style={styles.deskValue}>{desk.assigned_to}</Text>
                          </View>
                        </View>
                      )}

                      {desk.notes && (
                        <View style={styles.notesContainer}>
                          <View style={styles.notesHeader}>
                            <Ionicons name="document-text" size={16} color="#6200ee" />
                            <Text variant="bodySmall" style={styles.notesLabel}>Notes</Text>
                          </View>
                          <Text variant="bodyMedium" style={styles.notesText}>{desk.notes}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noTrackingContainer}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="folder-open-outline" size={48} color="#9ca3af" />
                </View>
                <Text variant="titleMedium" style={styles.noTrackingTitle}>
                  No Desk Tracking Yet
                </Text>
                <Text variant="bodyMedium" style={styles.noTrackingText}>
                  Start tracking file movement across desks
                </Text>
                <Button
                  mode="contained"
                  icon="plus"
                  onPress={() => {
                    resetDeskForm();
                    setDeskModalVisible(true);
                  }}
                  style={styles.addTrackingButton}
                  buttonColor="#6200ee"
                >
                  Add Tracking
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Documentation Section Title */}
        <View style={styles.sectionTitleContainer}>
          <Ionicons name="document-text" size={24} color="#6200ee" />
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Documentation Progress
          </Text>
        </View>
        
        {siteWorkTypes.length > 0 ? (
          siteWorkTypes.map(renderWorkTypeSection)
        ) : (
          <Card style={styles.emptyCard} mode="elevated" elevation={2}>
            <Card.Content style={styles.emptyContent}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="document-text-outline" size={60} color="#9ca3af" />
              </View>
              <Text variant="titleMedium" style={styles.emptyTitle}>
                No Work Types Assigned
              </Text>
              <Text variant="bodyMedium" style={styles.emptyText}>
                Assign work types to this site to track documentation progress
              </Text>
            </Card.Content>
          </Card>
        )}

        {/* File Ready Message */}
        {isFileReady() && (
          <Card style={styles.fileReadyCard} mode="elevated" elevation={4}>
            <Card.Content style={styles.fileReadyContent}>
              <View style={styles.fileReadyHeader}>
                <View style={styles.fileReadyIconContainer}>
                  <Ionicons name="checkmark-circle" size={48} color="white" />
                </View>
                <Text variant="headlineSmall" style={styles.fileReadyTitle}>
                  File Ready for Processing!
                </Text>
              </View>
              <Text variant="bodyLarge" style={styles.fileReadyText}>
                All documents have been completed. The file is now ready for the next process steps.
              </Text>
              <Button
                mode="contained"
                onPress={() => {
                  setShowProcess(!showProcess);
                  if (!showProcess && siteWorkTypes.length > 0) {
                    fetchProcessSteps(siteWorkTypes[0].id);
                  }
                }}
                style={styles.viewProcessButton}
                buttonColor="white"
                textColor="#10b981"
                icon={showProcess ? "eye-off" : "eye"}
              >
                {showProcess ? 'Hide' : 'View'} Process Steps
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Process Steps Display - Enhanced */}
        {showProcess && processSteps.length > 0 && (
          <Card style={styles.processCard} mode="elevated" elevation={3}>
            <Card.Content>
              <View style={styles.processHeader}>
                <View style={styles.processIconContainer}>
                  <Ionicons name="git-network" size={24} color="#6200ee" />
                </View>
                <Text variant="titleMedium" style={styles.processTitle}>
                  Process Workflow
                </Text>
              </View>
              
              {processSteps.map((step, index) => {
                const isExpanded = expandedSteps.has(step.id);
                const isLastStep = index === processSteps.length - 1;
                
                return (
                  <TouchableOpacity
                    key={step.id}
                    onPress={() => toggleStepExpansion(step.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.processItem}>
                      <View style={styles.stepNumberContainer}>
                        <View style={[
                          styles.stepNumber,
                          isExpanded && styles.stepNumberActive
                        ]}>
                          <Text variant="bodyMedium" style={styles.stepNumberText}>
                            {index + 1}
                          </Text>
                        </View>
                        {!isLastStep && (
                          <View style={styles.stepConnector} />
                        )}
                      </View>
                      
                      <View style={[
                        styles.stepContent,
                        isExpanded && styles.stepContentExpanded
                      ]}>
                        <View style={styles.stepHeader}>
                          <View style={styles.stepTitleRow}>
                            <Text variant="bodyLarge" style={styles.stepName}>
                              {step.step_name}
                            </Text>
                            <Ionicons 
                              name={isExpanded ? "chevron-up" : "chevron-down"} 
                              size={20} 
                              color="#6200ee" 
                            />
                          </View>
                          
                          {isExpanded && step.step_description && (
                            <View style={styles.stepDescriptionContainer}>
                              <View style={styles.descriptionDivider} />
                              <Text variant="bodyMedium" style={styles.stepDescription}>
                                {step.step_description}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
              
              <View style={styles.processFooter}>
                <Ionicons name="information-circle" size={20} color="#6b7280" />
                <Text variant="bodySmall" style={styles.processFooterText}>
                  Tap on any step to view details
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Desk Tracking Modal */}
      <Portal>
        <Modal
          visible={deskModalVisible}
          onDismiss={() => {
            setDeskModalVisible(false);
            resetDeskForm();
          }}
          contentContainerStyle={styles.modal}
        >
          <View style={styles.modalHeader}>
            <Ionicons name="create" size={28} color="#6200ee" />
            <Text variant="headlineSmall" style={styles.modalTitle}>
              {editingDesk ? 'Update' : 'Add'} Desk Tracking
            </Text>
          </View>

          <View style={styles.workTypeSelector}>
            <Text variant="bodyMedium" style={styles.label}>Work Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
              {siteWorkTypes.map((wt) => (
                <Chip
                  key={wt.id}
                  selected={selectedWorkType?.id === wt.id}
                  onPress={() => setSelectedWorkType(wt)}
                  style={[
                    styles.chip,
                    selectedWorkType?.id === wt.id && styles.chipSelected
                  ]}
                  textStyle={selectedWorkType?.id === wt.id ? styles.chipTextSelected : styles.chipText}
                >
                  {wt.name}
                </Chip>
              ))}
            </ScrollView>
          </View>

          <TextInput
            label="Current Desk"
            mode="outlined"
            value={deskForm.current_desk}
            onChangeText={(text) => setDeskForm({ ...deskForm, current_desk: text })}
            style={styles.input}
            outlineColor="#e5e7eb"
            activeOutlineColor="#6200ee"
            left={<TextInput.Icon icon="business" />}
          />

          <View style={styles.statusSelector}>
            <Text variant="bodyMedium" style={styles.label}>Status</Text>
            <View style={styles.statusButtons}>
              {['pending', 'in_progress', 'approved', 'rejected'].map((status) => (
                <Chip
                  key={status}
                  selected={deskForm.status === status}
                  onPress={() => setDeskForm({ ...deskForm, status: status as any })}
                  style={[
                    styles.statusChip,
                    deskForm.status === status && { backgroundColor: getStatusColor(status) }
                  ]}
                  textStyle={deskForm.status === status ? styles.statusChipTextSelected : styles.statusChipText}
                >
                  {status.replace('_', ' ').toUpperCase()}
                </Chip>
              ))}
            </View>
          </View>

          <TextInput
            label="Assigned To"
            mode="outlined"
            value={deskForm.assigned_to}
            onChangeText={(text) => setDeskForm({ ...deskForm, assigned_to: text })}
            style={styles.input}
            outlineColor="#e5e7eb"
            activeOutlineColor="#6200ee"
            left={<TextInput.Icon icon="account" />}
          />

          <TextInput
            label="Notes"
            mode="outlined"
            value={deskForm.notes}
            onChangeText={(text) => setDeskForm({ ...deskForm, notes: text })}
            multiline
            numberOfLines={3}
            style={styles.input}
            outlineColor="#e5e7eb"
            activeOutlineColor="#6200ee"
            left={<TextInput.Icon icon="note-text" />}
          />

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => {
                setDeskModalVisible(false);
                resetDeskForm();
              }}
              style={styles.cancelButton}
              textColor="#6b7280"
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={updateDeskTracking}
              style={styles.submitButton}
              buttonColor="#6200ee"
            >
              {editingDesk ? 'Update' : 'Save'}
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollView: {
    flex: 1,
  },
  siteCard: {
    margin: 16,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#6200ee',
  },
  siteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  siteName: {
    color: 'white',
    fontWeight: '700',
    flex: 1,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  siteLocation: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
  },
  deskCard: {
    margin: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  deskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  deskHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deskIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ede7f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deskTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  deskInfo: {
    gap: 16,
  },
  deskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
  },
  deskIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ede7f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deskTextContainer: {
    flex: 1,
  },
  deskLabel: {
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  deskText: {
    color: '#111827',
    fontWeight: '600',
  },
  deskValue: {
    color: '#111827',
    fontWeight: '700',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  notesContainer: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6200ee',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  notesLabel: {
    color: '#111827',
    fontWeight: '700',
  },
  notesText: {
    color: '#374151',
    lineHeight: 20,
  },
  noTrackingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  noTrackingTitle: {
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
    fontWeight: '600',
  },
  noTrackingText: {
    color: '#6b7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  addTrackingButton: {
    paddingHorizontal: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  workTypeCard: {
    margin: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  workTypeHeader: {
    marginBottom: 20,
  },
  workTypeTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  workTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ede7f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  workTypeTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  progressContainer: {
    flex: 1,
  },
  progressText: {
    color: '#6200ee',
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  documentList: {
    gap: 12,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  documentItemCompleted: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  documentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  documentName: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 22,
  },
  completedStatus: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: 13,
    marginTop: 4,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  completedDate: {
    color: '#10b981',
    fontWeight: '600',
    fontSize: 12,
  },
  completedIconContainer: {
    marginLeft: 8,
  },
  emptyCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 48,
  },
  emptyTitle: {
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '600',
  },
  emptyText: {
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 22,
  },
  deskList: {
    gap: 12,
  },
  deskItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6200ee',
  },
  deskItemHeader: {
    marginBottom: 16,
  },
  deskItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deskActions: {
    flexDirection: 'row',
    gap: 4,
  },
  fileReadyCard: {
    margin: 16,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#10b981',
  },
  fileReadyContent: {
    padding: 8,
  },
  fileReadyHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  fileReadyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  fileReadyTitle: {
    color: 'white',
    fontWeight: '700',
    textAlign: 'center',
  },
  fileReadyText: {
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
    fontWeight: '500',
  },
  viewProcessButton: {
    borderColor: 'white',
    borderWidth: 2,
  },
  processCard: {
    margin: 16,
    marginTop: 0,
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  processHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#f3f4f6',
  },
  processIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ede7f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  processItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  stepNumberContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6200ee',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6200ee',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  stepNumberActive: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
  },
  stepNumberText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  stepConnector: {
    width: 2,
    flex: 1,
    backgroundColor: '#e5e7eb',
    marginTop: 8,
  },
  stepContent: {
    flex: 1,
    paddingTop: 4,
    paddingBottom: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  stepContentExpanded: {
    backgroundColor: '#f0f9ff',
    borderColor: '#6200ee',
    borderWidth: 2,
  },
  stepHeader: {
    flex: 1,
  },
  stepTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepName: {
    color: '#111827',
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  stepDescriptionContainer: {
    marginTop: 12,
  },
  descriptionDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 12,
  },
  stepDescription: {
    color: '#6b7280',
    lineHeight: 22,
  },
  processFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  processFooterText: {
    color: '#6b7280',
    fontStyle: 'italic',
  },
  modal: {
    backgroundColor: 'white',
    padding: 24,
    margin: 20,
    borderRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#f3f4f6',
  },
  modalTitle: {
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  workTypeSelector: {
    marginBottom: 20,
  },
  label: {
    color: '#374151',
    marginBottom: 12,
    fontWeight: '600',
  },
  chipContainer: {
    flexDirection: 'row',
  },
  chip: {
    marginRight: 8,
    backgroundColor: '#f3f4f6',
  },
  chipSelected: {
    backgroundColor: '#6200ee',
  },
  chipText: {
    color: '#6b7280',
  },
  chipTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  statusSelector: {
    marginBottom: 20,
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusChip: {
    backgroundColor: '#f3f4f6',
  },
  statusChipText: {
    color: '#6b7280',
  },
  statusChipTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  input: {
    marginBottom: 16,
    backgroundColor: 'white',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    borderColor: '#e5e7eb',
  },
  submitButton: {
    flex: 1,
  },
});

export default SiteDocumentationScreen;