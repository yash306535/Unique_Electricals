import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import {
    Button,
    Card,
    FAB,
    IconButton,
    List,
    Modal,
    Portal,
    Text,
    TextInput
} from 'react-native-paper';
import { supabase } from '../config/supabase';
import { WorkDocument, WorkProcessStep, WorkType } from '../types';

const WorkTypesScreen = ({ navigation }: any) => {
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [documentsModalVisible, setDocumentsModalVisible] = useState(false);
  const [processModalVisible, setProcessModalVisible] = useState(false);
  const [selectedWorkType, setSelectedWorkType] = useState<WorkType | null>(null);
  const [documents, setDocuments] = useState<WorkDocument[]>([]);
  const [processSteps, setProcessSteps] = useState<WorkProcessStep[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  const [documentForm, setDocumentForm] = useState({
    document_name: '',
    is_required: true,
  });

  const [processForm, setProcessForm] = useState({
    step_name: '',
    step_description: '',
  });

  useEffect(() => {
    fetchWorkTypes();
  }, []);

  const fetchWorkTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('work_types')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkTypes(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!selectedWorkType) return;

    Alert.alert(
      'Delete Document',
      'Are you sure you want to delete this document?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('work_documents')
                .delete()
                .eq('id', documentId);

              if (error) throw error;

              fetchDocuments(selectedWorkType.id);
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const fetchDocuments = async (workTypeId: string) => {
    try {
      const { data, error } = await supabase
        .from('work_documents')
        .select('*')
        .eq('work_type_id', workTypeId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
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
      Alert.alert('Error', error.message);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter work type name');
      return;
    }

    try {
      const { error } = await supabase.from('work_types').insert({
        name: formData.name,
        description: formData.description,
      });

      if (error) throw error;

      Alert.alert('Success', 'Work type added successfully');
      setModalVisible(false);
      resetForm();
      fetchWorkTypes();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleAddDocument = async () => {
    if (!documentForm.document_name.trim() || !selectedWorkType) {
      Alert.alert('Error', 'Please enter document name');
      return;
    }

    try {
      const { error } = await supabase.from('work_documents').insert({
        work_type_id: selectedWorkType.id,
        document_name: documentForm.document_name,
        is_required: documentForm.is_required,
        order_index: documents.length,
      });

      if (error) throw error;

      Alert.alert('Success', 'Document added successfully');
      setDocumentForm({ document_name: '', is_required: true });
      fetchDocuments(selectedWorkType.id);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleAddProcessStep = async () => {
    if (!processForm.step_name.trim() || !selectedWorkType) {
      Alert.alert('Error', 'Please enter step name');
      return;
    }

    try {
      const { error } = await supabase.from('work_process_steps').insert({
        work_type_id: selectedWorkType.id,
        step_name: processForm.step_name,
        step_description: processForm.step_description,
        order_index: processSteps.length,
      });

      if (error) throw error;

      Alert.alert('Success', 'Process step added successfully');
      setProcessForm({ step_name: '', step_description: '' });
      fetchProcessSteps(selectedWorkType.id);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '' });
  };

  const openDocumentsModal = (workType: WorkType) => {
    setSelectedWorkType(workType);
    fetchDocuments(workType.id);
    setDocumentsModalVisible(true);
  };

  const openProcessModal = (workType: WorkType) => {
    setSelectedWorkType(workType);
    fetchProcessSteps(workType.id);
    setProcessModalVisible(true);
  };

  const renderWorkType = ({ item }: { item: WorkType }) => (
    <Card style={styles.card} mode="elevated" elevation={2}>
      <Card.Content>
        <View style={styles.headerContainer}>
          <View style={styles.infoContainer}>
            <Text variant="titleMedium" style={styles.title}>
              {item.name}
            </Text>
            {item.description ? (
              <Text variant="bodyMedium" style={styles.description}>
                {item.description}
              </Text>
            ) : null}
          </View>
          <View style={styles.actionsContainer}>
            <IconButton
              icon="file-document"
              size={20}
              onPress={() => openDocumentsModal(item)}
            />
            <IconButton
              icon="cogs"
              size={20}
              onPress={() => openProcessModal(item)}
            />
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={workTypes}
        renderItem={renderWorkType}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={fetchWorkTypes}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="briefcase-outline" size={80} color="#e0e0e0" />
            <Text variant="titleLarge" style={styles.emptyTitle}>No Work Types</Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              Add work types to get started
            </Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      />

      {/* Add Work Type Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Add Work Type
          </Text>
          
          <TextInput
            label="Work Type Name"
            mode="outlined"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
            style={styles.input}
          />

          <TextInput
            label="Description"
            mode="outlined"
            value={formData.description}
            onChangeText={(text) => setFormData({ ...formData, description: text })}
            multiline
            numberOfLines={3}
            style={styles.input}
          />

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setModalVisible(false)}
              style={styles.cancelButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              style={styles.submitButton}
            >
              Add Work Type
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Documents Modal */}
      <Portal>
        <Modal
          visible={documentsModalVisible}
          onDismiss={() => setDocumentsModalVisible(false)}
          contentContainerStyle={styles.largeModal}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Documents - {selectedWorkType?.name}
          </Text>
          
          <ScrollView style={styles.scrollView}>
            <List.Section>
              {documents.map((doc, index) => (
                <List.Item
                  key={doc.id}
                  title={doc.document_name}
                  description={`Step ${index + 1} ${doc.is_required ? '(Required)' : '(Optional)'}`}
                  left={(props) => <List.Icon {...props} icon="file-document" />}
                  right={() => (
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => handleDeleteDocument(doc.id)}
                    />
                  )}
                />
              ))}
            </List.Section>
          </ScrollView>

          <View style={styles.addSection}>
            <TextInput
              label="Document Name"
              mode="outlined"
              value={documentForm.document_name}
              onChangeText={(text) => setDocumentForm({ ...documentForm, document_name: text })}
              style={styles.input}
            />
            
            <Button
              mode="contained"
              onPress={handleAddDocument}
              style={styles.addButton}
            >
              Add Document
            </Button>
          </View>

          <Button
            mode="outlined"
            onPress={() => setDocumentsModalVisible(false)}
            style={styles.closeButton}
          >
            Close
          </Button>
        </Modal>
      </Portal>

      {/* Process Steps Modal */}
      <Portal>
        <Modal
          visible={processModalVisible}
          onDismiss={() => setProcessModalVisible(false)}
          contentContainerStyle={styles.largeModal}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Process Steps - {selectedWorkType?.name}
          </Text>
          
          <ScrollView style={styles.scrollView}>
            <List.Section>
              {processSteps.map((step, index) => (
                <List.Item
                  key={step.id}
                  title={`${index + 1}. ${step.step_name}`}
                  description={step.step_description}
                  left={(props) => <List.Icon {...props} icon="cogs" />}
                />
              ))}
            </List.Section>
          </ScrollView>

          <View style={styles.addSection}>
            <TextInput
              label="Step Name"
              mode="outlined"
              value={processForm.step_name}
              onChangeText={(text) => setProcessForm({ ...processForm, step_name: text })}
              style={styles.input}
            />

            <TextInput
              label="Step Description"
              mode="outlined"
              value={processForm.step_description}
              onChangeText={(text) => setProcessForm({ ...processForm, step_description: text })}
              multiline
              numberOfLines={2}
              style={styles.input}
            />
            
            <Button
              mode="contained"
              onPress={handleAddProcessStep}
              style={styles.addButton}
            >
              Add Step
            </Button>
          </View>

          <Button
            mode="outlined"
            onPress={() => setProcessModalVisible(false)}
            style={styles.closeButton}
          >
            Close
          </Button>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    fontWeight: '600',
    color: '#1a1a1a',
  },
  description: {
    color: '#666',
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6200ee',
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 16,
  },
  largeModal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '600',
  },
  input: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  submitButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: '#6200ee',
  },
  scrollView: {
    maxHeight: 300,
    marginBottom: 16,
  },
  addSection: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 16,
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#6200ee',
  },
  closeButton: {
    marginTop: 8,
  },
});

export default WorkTypesScreen;
