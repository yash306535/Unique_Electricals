import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, FlatList, TouchableOpacity } from 'react-native';
import { Text, Card, Banner } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { Purchase } from '../types';

interface MonthlyGST {
  month: string;
  total_gst: number;
  purchase_count: number;
  year: string;
}

const GSTScreen = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyGST[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          *,
          material:materials(name, unit)
        `)
        .not('gst_amount', 'is', null)
        .order('date', { ascending: false });

      if (error) throw error;
      setPurchases(data || []);
      processMonthlyData(data || []);
    } catch (error: any) {
      console.error('Error fetching purchases:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const processMonthlyData = (data: Purchase[]) => {
    const monthlyMap = new Map<string, MonthlyGST>();

    data.forEach((purchase) => {
      const date = new Date(purchase.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (monthlyMap.has(monthKey)) {
        const existing = monthlyMap.get(monthKey)!;
        existing.total_gst += purchase.gst_amount || 0;
        existing.purchase_count += 1;
      } else {
        monthlyMap.set(monthKey, {
          month: monthName,
          total_gst: purchase.gst_amount || 0,
          purchase_count: 1,
          year: date.getFullYear().toString(),
        });
      }
    });

    const sortedData = Array.from(monthlyMap.values()).sort((a, b) => {
      return b.year.localeCompare(a.year) || b.month.localeCompare(a.month);
    });

    setMonthlyData(sortedData);
  };

  const totalGST = purchases.reduce((sum, p) => sum + (p.gst_amount || 0), 0);

  const filteredPurchases = selectedMonth
    ? purchases.filter((p) => {
        const date = new Date(p.date);
        const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        return monthName === selectedMonth;
      })
    : [];

  const renderMonthCard = ({ item }: { item: MonthlyGST }) => (
    <TouchableOpacity
      onPress={() => setSelectedMonth(selectedMonth === item.month ? null : item.month)}
    >
      <Card
        style={[
          styles.monthCard,
          selectedMonth === item.month && styles.selectedCard,
        ]}
        mode="elevated"
      >
        <Card.Content>
          <View style={styles.monthHeader}>
            <View>
              <Text variant="titleMedium" style={styles.monthName}>{item.month}</Text>
              <Text variant="bodySmall" style={styles.purchaseCount}>
                {item.purchase_count} purchases
              </Text>
            </View>
            <View style={styles.gstAmount}>
              <Text variant="labelSmall" style={styles.gstLabel}>GST</Text>
              <Text variant="headlineSmall" style={styles.gstValue}>
                ₹{item.total_gst.toLocaleString()}
              </Text>
            </View>
          </View>

          {selectedMonth === item.month && (
            <View style={styles.purchasesList}>
              <Text variant="titleSmall" style={styles.purchasesTitle}>
                Purchases in {item.month}:
              </Text>
              {filteredPurchases.map((purchase) => (
                <View key={purchase.id} style={styles.purchaseItem}>
                  <View style={styles.purchaseInfo}>
                    <Ionicons name="cube" size={16} color="#27ae60" />
                    <Text variant="bodyMedium" style={styles.purchaseMaterial}>
                      {purchase.material?.name || 'Unknown'}
                    </Text>
                  </View>
                  <Text variant="bodyMedium" style={styles.purchaseGST}>
                    ₹{purchase.gst_amount?.toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Card style={styles.summaryCard} mode="elevated">
        <Card.Content style={styles.summaryContent}>
          <Ionicons name="receipt" size={48} color="white" />
          <Text variant="labelLarge" style={styles.summaryLabel}>Total Input GST</Text>
          <Text variant="displaySmall" style={styles.summaryAmount}>
            ₹{totalGST.toLocaleString()}
          </Text>
          <Text variant="bodySmall" style={styles.summarySubtext}>
            From {purchases.length} purchases with GST
          </Text>
        </Card.Content>
      </Card>

      <Banner
        visible={true}
        icon="information"
        style={styles.infoBanner}
      >
        This shows your input GST from purchases. For GST filing, consult your CA.
      </Banner>

      <FlatList
        data={monthlyData}
        renderItem={renderMonthCard}
        keyExtractor={(item) => item.month}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={fetchPurchases}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#ccc" />
            <Text variant="titleMedium" style={styles.emptyText}>No GST purchases found</Text>
          </View>
        }
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
    backgroundColor: '#e67e22',
  },
  summaryContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  summaryLabel: {
    color: 'white',
    marginTop: 10,
  },
  summaryAmount: {
    color: 'white',
    marginTop: 10,
    fontWeight: 'bold',
  },
  summarySubtext: {
    color: 'white',
    marginTop: 5,
    opacity: 0.8,
  },
  infoBanner: {
    margin: 10,
    backgroundColor: '#e3f2fd',
  },
  listContent: {
    padding: 10,
  },
  monthCard: {
    marginBottom: 10,
  },
  selectedCard: {
    borderWidth: 2,
    borderColor: '#2089dc',
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthName: {
    fontWeight: 'bold',
  },
  purchaseCount: {
    color: '#666',
    marginTop: 4,
  },
  gstAmount: {
    alignItems: 'flex-end',
  },
  gstLabel: {
    color: '#666',
  },
  gstValue: {
    color: '#e67e22',
    marginTop: 4,
    fontWeight: 'bold',
  },
  purchasesList: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  purchasesTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#666',
  },
  purchaseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  purchaseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  purchaseMaterial: {
    marginLeft: 8,
  },
  purchaseGST: {
    fontWeight: 'bold',
    color: '#e67e22',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: {
    color: '#999',
    marginTop: 10,
  },
});

export default GSTScreen;