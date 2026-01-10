import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card, Divider, Text } from 'react-native-paper';

type RootStackParamList = {
  WorkTypes: undefined;
  // Add other screen types as needed
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SettingsScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  const handleDataBackup = () => {
    Alert.alert(
      'Data Backup',
      'Your data is automatically backed up to Supabase cloud. All your information is safe.',
      [{ text: 'OK' }]
    );
  };

  const handleAbout = () => {
    Alert.alert(
      'About',
      'Construction Manager v1.0.0\n\nBuilt for contractors to manage sites, stock, and finances.\n\nDeveloped with ❤️',
      [{ text: 'OK' }]
    );
  };

  const settingsOptions = [
    {
      id: '1',
      title: 'Work Types Management',
      description: 'Add and manage work types and processes',
      icon: 'briefcase',
      color: '#6200ee',
      onPress: () => navigation.navigate('WorkTypes'),
    },
    {
      id: '2',
      title: 'Company Information',
      description: 'Update your company details',
      icon: 'business',
      color: '#2089dc',
      onPress: () => Alert.alert('Coming Soon', 'This feature will be available soon'),
    },
    {
      id: '3',
      title: 'GST Registration',
      description: 'Manage GST settings',
      icon: 'receipt',
      color: '#e67e22',
      onPress: () => Alert.alert('Coming Soon', 'This feature will be available soon'),
    },
    {
      id: '4',
      title: 'Data Backup',
      description: 'Your data is automatically backed up',
      icon: 'cloud',
      color: '#27ae60',
      onPress: handleDataBackup,
    },
    {
      id: '5',
      title: 'Language',
      description: 'English (Marathi coming soon)',
      icon: 'language',
      color: '#9b59b6',
      onPress: () => Alert.alert('Coming Soon', 'Marathi language support coming soon'),
    },
    {
      id: '6',
      title: 'About',
      description: 'App version and information',
      icon: 'information-circle',
      color: '#3498db',
      onPress: handleAbout,
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard} mode="elevated">
        <Card.Content style={styles.headerContent}>
          <Ionicons name="settings" size={48} color="white" />
          <Text variant="headlineMedium" style={styles.headerTitle}>Settings</Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>
            Manage your app preferences
          </Text>
        </Card.Content>
      </Card>

      <View style={styles.optionsContainer}>
        {settingsOptions.map((option, index) => (
          <View key={option.id}>
            <TouchableOpacity onPress={option.onPress}>
              <Card style={styles.optionCard} mode="elevated">
                <Card.Content style={styles.optionContent}>
                  <View style={[styles.iconContainer, { backgroundColor: option.color + '20' }]}>
                    <Ionicons name={option.icon as any} size={24} color={option.color} />
                  </View>
                  <View style={styles.optionText}>
                    <Text variant="titleMedium" style={styles.optionTitle}>{option.title}</Text>
                    <Text variant="bodySmall" style={styles.optionDescription}>
                      {option.description}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#999" />
                </Card.Content>
              </Card>
            </TouchableOpacity>
            {index < settingsOptions.length - 1 && <Divider style={styles.divider} />}
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text variant="titleLarge" style={styles.footerText}>Construction Manager</Text>
        <Text variant="bodyMedium" style={styles.footerVersion}>Version 1.0.0</Text>
        <Text variant="bodySmall" style={styles.footerCopyright}>© 2024 All rights reserved</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerCard: {
    margin: 10,
    backgroundColor: '#2089dc',
  },
  headerContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  headerTitle: {
    color: 'white',
    fontWeight: 'bold',
    marginTop: 10,
  },
  headerSubtitle: {
    color: 'white',
    opacity: 0.9,
    marginTop: 5,
  },
  optionsContainer: {
    padding: 10,
  },
  optionCard: {
    marginBottom: 5,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  optionDescription: {
    color: '#666',
  },
  divider: {
    marginVertical: 5,
  },
  footer: {
    alignItems: 'center',
    padding: 30,
    marginTop: 20,
  },
  footerText: {
    fontWeight: 'bold',
    color: '#333',
  },
  footerVersion: {
    color: '#666',
    marginTop: 5,
  },
  footerCopyright: {
    color: '#999',
    marginTop: 5,
  },
});

export default SettingsScreen;