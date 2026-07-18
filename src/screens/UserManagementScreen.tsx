import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, DataTable, Dialog, IconButton, Portal, Surface, Text, TextInput } from 'react-native-paper';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';

interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  created_at: string;
}

const UserManagementScreen = ({ navigation }: any) => {
  const { isRoot } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);

  // Hide the default navigation header
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: 'User Management',
    });
  }, [navigation]);

  useEffect(() => {
    if (!isRoot) {
      // Redirect non-root users
      Alert.alert('Access Denied', 'You do not have permission to access this page');
      navigation.goBack();
    } else {
      fetchUsers();
    }
  }, [isRoot, navigation]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddUser = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      // Check if email already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        Alert.alert('Error', 'A user with this email already exists');
        return;
      }

      // Add new user
      const { data, error } = await supabase
        .from('users')
        .insert([{ name, email, password }])
        .select();

      if (error) throw error;

      Alert.alert('Success', 'User added successfully');
      setName('');
      setEmail('');
      setPassword('');
      fetchUsers();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword(''); // Don't show the password for security
    setDialogVisible(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    if (!name || !email) {
      Alert.alert('Error', 'Name and email are required');
      return;
    }

    setLoading(true);
    try {
      const updates: any = { name, email };
      if (password) {
        updates.password = password;
      }

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', editingUser.id);

      if (error) throw error;

      Alert.alert('Success', 'User updated successfully');
      setDialogVisible(false);
      setEditingUser(null);
      setName('');
      setEmail('');
      setPassword('');
      fetchUsers();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', userId);

              if (error) throw error;

              Alert.alert('Success', 'User deleted successfully');
              fetchUsers();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const hideDialog = () => {
    setDialogVisible(false);
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        <Surface style={styles.formContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.sectionTitle}>User Management</Text>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('AddUser')}
              style={styles.addButton}
              icon="plus"
            >
              Add User
            </Button>
          </View>
        </Surface>

        <Surface style={styles.tableContainer}>
          <Text style={styles.sectionTitle}>User List</Text>
          <DataTable>
            <DataTable.Header>
              <DataTable.Title>Name</DataTable.Title>
              <DataTable.Title>Email</DataTable.Title>
              <DataTable.Title>Actions</DataTable.Title>
            </DataTable.Header>

            {users.map((user) => (
              <DataTable.Row key={user.id}>
                <DataTable.Cell>{user.name}</DataTable.Cell>
                <DataTable.Cell>{user.email}</DataTable.Cell>
                <DataTable.Cell>
                  <View style={styles.actionButtons}>
                    <IconButton
                      icon="pencil"
                      size={20}
                      onPress={() => handleEditUser(user)}
                    />
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => handleDeleteUser(user.id)}
                    />
                  </View>
                </DataTable.Cell>
              </DataTable.Row>
            ))}

            {users.length === 0 && (
              <DataTable.Row>
                <DataTable.Cell>No users found</DataTable.Cell>
                <DataTable.Cell>-</DataTable.Cell>
                <DataTable.Cell>-</DataTable.Cell>
              </DataTable.Row>
            )}
          </DataTable>
        </Surface>
      </ScrollView>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={hideDialog}>
          <Dialog.Title>Edit User</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Name"
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={[styles.input, styles.dialogInput]}
            />
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={[styles.input, styles.dialogInput]}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              label="Password (leave blank to keep current)"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              style={[styles.input, styles.dialogInput]}
              secureTextEntry
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideDialog}>Cancel</Button>
            <Button onPress={handleUpdateUser} loading={loading}>
              Update
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  formContainer: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
  },
  tableContainer: {
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  dialogInput: {
    marginBottom: 8,
  },
  button: {
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addButton: {
    marginLeft: 10,
  },
});

export default UserManagementScreen;
