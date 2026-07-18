import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, Button, FAB } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { Material } from '../types';

const StockScreen = ({ navigation }: any) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('name');

      if (error) throw error;
      setMaterials(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMaterials();
    }, [])
  );

  const deleteMaterial = async (id: string) => {
    Alert.alert(
      'Delete Material',
      'Are you sure? This will delete all related purchases and issues.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('materials').delete().eq('id', id);
              if (error) throw error;
              fetchMaterials();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const getStockStatusColor = (stock: number) => {
    if (stock === 0) return '#e74c3c';
    if (stock < 10) return '#e67e22';
    return '#27ae60';
  };

  const renderMaterial = ({ item }: { item: Material }) => (
    <Card style={styles.card} mode="elevated">
      <Card.Content>
        <View style={styles.materialHeader}>
          <View style={styles.materialInfo}>
            <Ionicons name="cube" size={32} color={getStockStatusColor(item.current_stock)} />
            <View style={styles.materialDetails}>
              <Text variant="titleMedium" style={styles.materialName}>{item.name}</Text>
              <Text variant="bodySmall" style={styles.unit}>Unit: {item.unit}</Text>
            </View>
          </View>
          <View style={styles.stockContainer}>
            <Text
              variant="headlineSmall"
              style={[styles.stockValue, { color: getStockStatusColor(item.current_stock) }]}
            >
              {item.current_stock}
            </Text>
            <Text variant="bodySmall" style={styles.stockLabel}>{item.unit}</Text>
          </View>
        </View>
      </Card.Content>
      <Card.Actions>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('Purchase', { materialId: item.id })}
          icon="plus-circle"
        >
          Add Purchase
        </Button>
        <Button
          mode="outlined"
          onPress={() => deleteMaterial(item.id)}
          icon="delete"
          textColor="#e74c3c"
        >
          Delete
        </Button>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Card style={styles.summaryCard} mode="elevated">
        <Card.Content>
          <Text variant="labelLarge" style={styles.summaryLabel}>Total Materials</Text>
          <Text variant="displaySmall" style={styles.summaryCount}>{materials.length}</Text>
          <Text variant="bodySmall" style={styles.summarySubtext}>
            {materials.filter(m => m.current_stock > 0).length} in stock
          </Text>
        </Card.Content>
      </Card>

      <FlatList
        data={materials}
        renderItem={renderMaterial}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={fetchMaterials}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color="#ccc" />
            <Text variant="titleMedium" style={styles.emptyText}>No materials added yet</Text>
            <Text variant="bodyMedium" style={styles.emptySubText}>Tap + to add your first material</Text>
          </View>
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        color="#fff"
        onPress={() => navigation.navigate('AddMaterial')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  summaryCard: {
    margin: 10,
    backgroundColor: '#27ae60',
  },
  summaryLabel: {
    color: 'white',
  },
  summaryCount: {
    color: 'white',
    marginTop: 5,
    fontWeight: 'bold',
  },
  summarySubtext: {
    color: 'white',
    marginTop: 5,
    opacity: 0.8,
  },
  listContent: {
    padding: 10,
    paddingBottom: 80,
  },
  card: {
    marginBottom: 10,
  },
  materialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  materialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  materialDetails: {
    marginLeft: 12,
  },
  materialName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  unit: {
    color: '#666',
  },
  stockContainer: {
    alignItems: 'flex-end',
  },
  stockValue: {
    fontWeight: 'bold',
  },
  stockLabel: {
    color: '#666',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: '#999',
    marginTop: 10,
  },
  emptySubText: {
    color: '#ccc',
    marginTop: 5,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#27ae60',
  },
});

export default StockScreen;