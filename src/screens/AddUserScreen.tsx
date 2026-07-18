import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { TextInput, Button, Text, Surface, Card, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

interface AddUserScreenProps {
  navigation: any;
}

const AddUserScreen = ({ navigation }: AddUserScreenProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    role: 'user'
  });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter user name');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter email address');
      return false;
    }
    if (!formData.password.trim()) {
      Alert.alert('Error', 'Please enter password');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          phone: formData.phone.trim(),
          role: formData.role,
          created_by: user?.id || null
        }]);

      if (error) {
        if (error.message.includes('duplicate key value violates unique constraint')) {
          Alert.alert('Error', 'A user with this email already exists');
        } else {
          Alert.alert('Error', error.message);
        }
        return;
      }

      Alert.alert('Success', 'User created successfully', [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]);

      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        role: 'user'
      });

    } catch (error: any) {
      Alert.alert('Error', 'Failed to create user: ' + error.message);
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
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Surface style={[styles.formContainer, isWeb && styles.webFormContainer]}>
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="person-add" size={32} color="#1E40AF" />
            </View>
            <Text variant="headlineSmall" style={styles.headerText}>
              Add New User
            </Text>
            <Text variant="bodyMedium" style={styles.headerSubtext}>
              Create a new user account for the system
            </Text>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.formSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              User Information
            </Text>

            <TextInput
              label="Full Name *"
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
              mode="outlined"
              style={styles.input}
              left={<TextInput.Icon icon="account" />}
              autoCapitalize="words"
            />

            <TextInput
              label="Email Address *"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              mode="outlined"
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              left={<TextInput.Icon icon="email" />}
            />

            <TextInput
              label="Phone Number"
              value={formData.phone}
              onChangeText={(value) => handleInputChange('phone', value)}
              mode="outlined"
              style={styles.input}
              keyboardType="phone-pad"
              left={<TextInput.Icon icon="phone" />}
            />
          </View>

          <View style={styles.formSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Security
            </Text>

            <TextInput
              label="Password *"
              value={formData.password}
              onChangeText={(value) => handleInputChange('password', value)}
              mode="outlined"
              style={styles.input}
              secureTextEntry
              left={<TextInput.Icon icon="lock" />}
            />

            <TextInput
              label="Confirm Password *"
              value={formData.confirmPassword}
              onChangeText={(value) => handleInputChange('confirmPassword', value)}
              mode="outlined"
              style={styles.input}
              secureTextEntry
              left={<TextInput.Icon icon="lock-check" />}
            />
          </View>

          <View style={styles.buttonContainer}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={[styles.button, styles.cancelButton]}
              contentStyle={styles.buttonContent}
            >
              Cancel
            </Button>

            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={loading}
              style={[styles.button, styles.submitButton]}
              contentStyle={styles.buttonContent}
            >
              Create User
            </Button>
          </View>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  formContainer: {
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    backgroundColor: '#FFFFFF',
    maxWidth: isWeb ? 600 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  webFormContainer: {
    marginTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EBF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerText: {
    color: '#1C1C1E',
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtext: {
    color: '#8E8E93',
    textAlign: 'center',
  },
  divider: {
    marginBottom: 24,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#1C1C1E',
    fontWeight: '600',
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  buttonContainer: {
    flexDirection: isWeb ? 'row' : 'column',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: isWeb ? 1 : undefined,
    borderRadius: 8,
  },
  buttonContent: {
    height: 48,
  },
  cancelButton: {
    borderColor: '#8E8E93',
  },
  submitButton: {
    backgroundColor: '#1E40AF',
  },
});

export default AddUserScreen;
