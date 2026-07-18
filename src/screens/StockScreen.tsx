import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, ScrollView, Alert } from 'react-native';
import { Text, Card, Button, FAB, Modal, Portal, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../config/supabase';
import { Material } from '../types';
import { materialLabel } from '../utils/material';

type LedgerRow = {
  type: 'in' | 'out';
  quantity: number;
  date: string;
  label: string;
};

const StockScreen = ({ navigation }: any) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyMaterial, setHistoryMaterial] = useState<Material | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);

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

  const openHistory = async (material: Material) => {
    setHistoryMaterial(material);
    setHistoryVisible(true);
    setHistoryLoading(true);
    setLedger([]);
    try {
      // OUT: material issued to sites
      const { data: issues, error: issuesErr } = await supabase
        .from('material_issues')
        .select('quantity, date, sites(name)')
        .eq('material_id', material.id);
      if (issuesErr) throw issuesErr;

      // IN: purchases of this material
      const { data: purchases, error: purchasesErr } = await supabase
        .from('purchases')
        .select('quantity, date, vendor_name')
        .eq('material_id', material.id);
      if (purchasesErr) throw purchasesErr;

      const outRows: LedgerRow[] = (issues || []).map((r: any) => ({
        type: 'out',
        quantity: Number(r.quantity),
        date: r.date,
        label: r.sites?.name ? `Issued to ${r.sites.name}` : 'Issued',
      }));
      const inRows: LedgerRow[] = (purchases || []).map((r: any) => ({
        type: 'in',
        quantity: Number(r.quantity),
        date: r.date,
        label: r.vendor_name ? `Purchased from ${r.vendor_name}` : 'Purchased',
      }));

      const combined = [...inRows, ...outRows].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setLedger(combined);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

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
              <Text variant="titleMedium" style={styles.materialName}>{materialLabel(item)}</Text>
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
          mode="text"
          onPress={() => openHistory(item)}
          icon="history"
        >
          History
        </Button>
        <Button
          mode="outlined"
          onPress={() => navigation.navigate('Purchase', { materialId: item.id })}
          icon="plus-circle"
        >
          Purchase
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

      <Portal>
        <Modal
          visible={historyVisible}
          onDismiss={() => setHistoryVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={styles.modalTitle}>
                {materialLabel(historyMaterial)}
              </Text>
              <Text variant="bodySmall" style={styles.modalSubtitle}>
                In / Out history · Current stock: {historyMaterial?.current_stock} {historyMaterial?.unit}
              </Text>
            </View>
            <Ionicons name="close" size={24} color="#666" onPress={() => setHistoryVisible(false)} />
          </View>

          {historyLoading ? (
            <ActivityIndicator style={{ marginVertical: 30 }} color="#27ae60" />
          ) : ledger.length === 0 ? (
            <Text style={styles.emptyHistory}>No purchase or issue records yet.</Text>
          ) : (
            <ScrollView style={{ maxHeight: 420 }}>
              {ledger.map((row, i) => (
                <View key={i} style={styles.ledgerRow}>
                  <View
                    style={[
                      styles.ledgerBadge,
                      { backgroundColor: row.type === 'in' ? '#e8f8f0' : '#fdecea' },
                    ]}
                  >
                    <Ionicons
                      name={row.type === 'in' ? 'arrow-down' : 'arrow-up'}
                      size={16}
                      color={row.type === 'in' ? '#27ae60' : '#e74c3c'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ledgerLabel}>{row.label}</Text>
                    <Text style={styles.ledgerDate}>{formatDate(row.date)}</Text>
                  </View>
                  <Text
                    style={[
                      styles.ledgerQty,
                      { color: row.type === 'in' ? '#27ae60' : '#e74c3c' },
                    ]}
                  >
                    {row.type === 'in' ? '+' : '−'}
                    {row.quantity} {historyMaterial?.unit}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </Modal>
      </Portal>
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
  modal: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  modalSubtitle: {
    color: '#7f8c8d',
    marginTop: 2,
  },
  emptyHistory: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 30,
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  ledgerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ledgerLabel: {
    color: '#2c3e50',
    fontWeight: '600',
    fontSize: 14,
  },
  ledgerDate: {
    color: '#95a5a6',
    fontSize: 12,
    marginTop: 2,
  },
  ledgerQty: {
    fontWeight: 'bold',
    fontSize: 15,
  },
});

export default StockScreen;