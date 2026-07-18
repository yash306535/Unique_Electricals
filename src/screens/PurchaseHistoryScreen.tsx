import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useState } from 'react';
import { Alert, Dimensions, FlatList, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Chip, Divider, FAB, Searchbar, Text } from 'react-native-paper';
import { supabase } from '../config/supabase';
import { Material, Purchase } from '../types';

const { width } = Dimensions.get('window');

interface PurchaseWithMaterial extends Purchase {
  material: Material;
}

const PurchaseHistoryScreen = ({ navigation }: any) => {
  const [purchases, setPurchases] = useState<PurchaseWithMaterial[]>([]);
  const [filteredPurchases, setFilteredPurchases] = useState<PurchaseWithMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'with_bill' | 'without_bill'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          *,
          material:materials(*)
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      setPurchases(data || []);
      setFilteredPurchases(data || []);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchPurchases();
    }, [])
  );

  const filterPurchases = (query: string, type: 'all' | 'with_bill' | 'without_bill') => {
    let filtered = purchases;

    if (type === 'with_bill') {
      filtered = filtered.filter(p => p.has_bill);
    } else if (type === 'without_bill') {
      filtered = filtered.filter(p => !p.has_bill);
    }

    if (query.trim()) {
      filtered = filtered.filter(p =>
        p.material?.name.toLowerCase().includes(query.toLowerCase()) ||
        p.vendor_name?.toLowerCase().includes(query.toLowerCase())
      );
    }

    setFilteredPurchases(filtered);
  };

  const onSearchChange = (query: string) => {
    setSearchQuery(query);
    filterPurchases(query, filterType);
  };

  const onFilterChange = (type: 'all' | 'with_bill' | 'without_bill') => {
    setFilterType(type);
    filterPurchases(searchQuery, type);
  };

  const exportToCSV = async () => {
    try {
      let csv = 'Date,Material,Vendor,Quantity,Rate,Subtotal,GST Amount,Grand Total,Has Bill\n';
      
      filteredPurchases.forEach(purchase => {
        const subtotal = purchase.total_amount - (purchase.gst_amount || 0);
        csv += `"${purchase.date}","${purchase.material?.name}","${purchase.vendor_name || 'N/A'}",${purchase.quantity},${purchase.rate},${subtotal.toFixed(2)},${purchase.gst_amount || 0},${purchase.total_amount},"${purchase.has_bill ? 'Yes' : 'No'}"\n`;
      });

      const fileName = `purchases_${new Date().getTime()}.csv`;
      const fileUri = `file:///data/user/0/host.exp.exponent/cache/${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, csv);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Success', 'File saved to: ' + fileUri);
      }
    } catch (error: any) {
      Alert.alert('Export Error', error.message);
    }
  };

  const exportToPDF = async () => {
    try {
      let html = `
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #27ae60; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #27ae60; color: white; padding: 10px; text-align: left; }
            td { border: 1px solid #ddd; padding: 8px; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .summary { background-color: #e8f5e9; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
            .total { font-weight: bold; color: #27ae60; }
          </style>
        </head>
        <body>
          <h1>Purchase History Report</h1>
          <div class="summary">
            <p><strong>Total Purchases:</strong> ${filteredPurchases.length}</p>
            <p><strong>Total Amount:</strong> ₹${filteredPurchases.reduce((sum, p) => sum + p.total_amount, 0).toFixed(2)}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Material</th>
                <th>Vendor</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
                <th>GST</th>
                <th>Total</th>
                <th>Bill</th>
              </tr>
            </thead>
            <tbody>
      `;

      filteredPurchases.forEach(purchase => {
        const subtotal = purchase.total_amount - (purchase.gst_amount || 0);
        html += `
          <tr>
            <td>${new Date(purchase.date).toLocaleDateString()}</td>
            <td>${purchase.material?.name}</td>
            <td>${purchase.vendor_name || 'N/A'}</td>
            <td>${purchase.quantity} ${purchase.material?.unit}</td>
            <td>₹${purchase.rate}</td>
            <td>₹${subtotal.toFixed(2)}</td>
            <td>₹${(purchase.gst_amount || 0).toFixed(2)}</td>
            <td class="total">₹${purchase.total_amount.toFixed(2)}</td>
            <td>${purchase.has_bill ? '✓' : '✗'}</td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
        </body>
        </html>
      `;

      const fileName = `purchases_${new Date().getTime()}.html`;
      const fileUri = `file:///data/user/0/host.exp.exponent/cache/${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, html);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Success', 'File saved to: ' + fileUri);
      }
    } catch (error: any) {
      Alert.alert('Export Error', error.message);
    }
  };

  const showExportOptions = () => {
    Alert.alert(
      'Export Purchases',
      'Choose export format',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'CSV', onPress: exportToCSV },
        { text: 'PDF/HTML', onPress: exportToPDF },
      ]
    );
  };

  const deletePurchase = async (id: string) => {
    Alert.alert(
      'Delete Purchase',
      'Are you sure you want to delete this purchase? Stock will be adjusted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('purchases').delete().eq('id', id);
              if (error) throw error;
              fetchPurchases();
              Alert.alert('Success', 'Purchase deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Helper function to get dynamic font size based on amount
  const getDynamicFontSize = (amount: number) => {
    const amountStr = amount.toFixed(2);
    if (amountStr.length > 12) return 14;
    if (amountStr.length > 10) return 16;
    if (amountStr.length > 8) return 18;
    return 20;
  };

  const renderPurchase = ({ item }: { item: PurchaseWithMaterial }) => {
    const isExpanded = expandedId === item.id;
    const subtotal = item.total_amount - (item.gst_amount || 0);
    const dynamicFontSize = getDynamicFontSize(item.total_amount);

    return (
      <Card style={styles.card} mode="elevated">
        <Card.Content style={styles.cardContent}>
          <TouchableOpacity 
            style={styles.cardHeader} 
            onPress={() => toggleExpand(item.id)}
            activeOpacity={0.7}
          >
            <View style={styles.headerLeft}>
              <View style={styles.iconWrapper}>
                <Ionicons name="cube" size={26} color="#27ae60" />
                {!!item.has_bill && (
                  <View style={styles.billBadge}>
                    <Ionicons name="receipt" size={11} color="#27ae60" />
                  </View>
                )}
              </View>
              <View style={styles.headerInfo}>
                <Text variant="titleMedium" style={styles.materialName} numberOfLines={1} ellipsizeMode="tail">
                  {item.material?.name}
                </Text>
                <Text variant="bodySmall" style={styles.vendorName} numberOfLines={1} ellipsizeMode="tail">
                  {item.vendor_name || 'No vendor'}
                </Text>
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={11} color="#999" />
                  <Text variant="bodySmall" style={styles.dateText}>
                    {new Date(item.date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.headerRight}>
              <Text style={[styles.amount, { fontSize: dynamicFontSize }]} numberOfLines={1} adjustsFontSizeToFit>
                ₹{item.total_amount.toFixed(2)}
              </Text>
              <View style={styles.quantityBadge}>
                <Text style={styles.quantityText} numberOfLines={1}>
                  {item.quantity} {item.material?.unit}
                </Text>
              </View>
              <Ionicons 
                name={isExpanded ? "chevron-up" : "chevron-down"} 
                size={22} 
                color="#999" 
                style={styles.chevron}
              />
            </View>
          </TouchableOpacity>

          {isExpanded && (
            <View style={styles.expandedSection}>
              <Divider style={styles.divider} />
              
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Rate per unit</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>₹{item.rate}</Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Subtotal</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>₹{subtotal.toFixed(2)}</Text>
                </View>

                {item.gst_amount && item.gst_amount > 0 && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>GST Amount</Text>
                    <Text style={styles.detailValue} numberOfLines={1}>₹{item.gst_amount.toFixed(2)}</Text>
                  </View>
                )}

                <View style={[styles.detailItem, styles.totalItem]}>
                  <Text style={styles.totalLabel}>Grand Total</Text>
                  <Text style={styles.totalValue} numberOfLines={1} adjustsFontSizeToFit>₹{item.total_amount.toFixed(2)}</Text>
                </View>
              </View>

              {!!item.bill_photo_url && (
                <View style={styles.billSection}>
                  <Text style={styles.sectionTitle}>Bill Photo</Text>
                  <TouchableOpacity>
                    <Image 
                      source={{ uri: item.bill_photo_url }} 
                      style={styles.billImage}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.actionRow}>
                <Button
                  mode="contained"
                  onPress={() => deletePurchase(item.id)}
                  buttonColor="#e74c3c"
                  textColor="#fff"
                  style={styles.deleteButton}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                >
                  <Ionicons name="trash-outline" size={16} color="#fff" /> Delete Purchase
                </Button>
              </View>
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  const totalAmount = filteredPurchases.reduce((sum, p) => sum + p.total_amount, 0);
  const totalGST = filteredPurchases.reduce((sum, p) => sum + (p.gst_amount || 0), 0);
  const totalSubtotal = totalAmount - totalGST;

  // Dynamic font sizes for summary
  const amountFontSize = getDynamicFontSize(totalAmount);
  const gstFontSize = getDynamicFontSize(totalGST);

  return (
    <View style={styles.container}>
      <Card style={styles.summaryCard} mode="elevated">
        <Card.Content>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryBox}>
              <Ionicons name="receipt-outline" size={22} color="#27ae60" />
              <Text variant="headlineMedium" style={styles.summaryNumber}>
                {filteredPurchases.length}
              </Text>
              <Text variant="labelSmall" style={styles.summaryLabel} numberOfLines={2}>
                Total Purchases
              </Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryBox}>
              <Ionicons name="cash-outline" size={22} color="#27ae60" />
              <Text 
                style={[styles.summaryNumber, { fontSize: amountFontSize }]} 
                numberOfLines={1} 
                adjustsFontSizeToFit
              >
                ₹{totalAmount.toFixed(2)}
              </Text>
              <Text variant="labelSmall" style={styles.summaryLabel} numberOfLines={2}>
                Total Amount
              </Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryBox}>
              <Ionicons name="calculator-outline" size={22} color="#27ae60" />
              <Text 
                style={[styles.summaryNumber, { fontSize: gstFontSize }]} 
                numberOfLines={1} 
                adjustsFontSizeToFit
              >
                ₹{totalGST.toFixed(2)}
              </Text>
              <Text variant="labelSmall" style={styles.summaryLabel} numberOfLines={2}>
                Total GST
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.searchSection}>
        <Searchbar
          placeholder="Search by material or vendor"
          onChangeText={onSearchChange}
          value={searchQuery}
          style={styles.searchBar}
          iconColor="#27ae60"
        />
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filterSection}
        contentContainerStyle={styles.filterContent}
      >
        <Chip
          selected={filterType === 'all'}
          onPress={() => onFilterChange('all')}
          style={styles.filterChip}
          selectedColor="#27ae60"
          showSelectedCheck={true}
        >
          All ({purchases.length})
        </Chip>
        <Chip
          selected={filterType === 'with_bill'}
          onPress={() => onFilterChange('with_bill')}
          style={styles.filterChip}
          selectedColor="#27ae60"
          showSelectedCheck={true}
        >
          <Ionicons name="receipt" size={14} color="#27ae60" /> With Bill ({purchases.filter(p => p.has_bill).length})
        </Chip>
        <Chip
          selected={filterType === 'without_bill'}
          onPress={() => onFilterChange('without_bill')}
          style={styles.filterChip}
          selectedColor="#27ae60"
          showSelectedCheck={true}
        >
          <Ionicons name="receipt-outline" size={14} color="#666" /> Without Bill ({purchases.filter(p => !p.has_bill).length})
        </Chip>
      </ScrollView>

      <FlatList
        data={filteredPurchases}
        renderItem={renderPurchase}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={fetchPurchases}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="file-tray-outline" size={80} color="#e0e0e0" />
            </View>
            <Text variant="titleLarge" style={styles.emptyTitle}>
              No purchases found
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtitle}>
              {searchQuery || filterType !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'Add purchases to see them here'}
            </Text>
          </View>
        }
      />

      <FAB
        icon="download"
        style={styles.fab}
        color="#fff"
        onPress={showExportOptions}
        label="Export"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  summaryCard: {
    margin: 12,
    marginTop: 8,
    backgroundColor: '#fff',
    elevation: 3,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryBox: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  summaryNumber: {
    color: '#27ae60',
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 6,
    textAlign: 'center',
  },
  summaryLabel: {
    color: '#666',
    textAlign: 'center',
    fontSize: 11,
  },
  summaryDivider: {
    width: 1,
    height: 65,
    backgroundColor: '#e0e0e0',
  },
  searchSection: {
    paddingHorizontal: 12,
    paddingBottom: 8,
    paddingTop: 4,
  },
  searchBar: {
    backgroundColor: '#fff',
    elevation: 2,
  },
  filterSection: {
    maxHeight: 60,
  },
  filterContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  listContent: {
    padding: 12,
    paddingBottom: 90,
  },
  card: {
    marginBottom: 12,
    backgroundColor: '#fff',
    elevation: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    minHeight: 90,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    minWidth: 0,
  },
  iconWrapper: {
    position: 'relative',
    marginRight: 12,
    width: 42,
    height: 42,
    minWidth: 42,
    borderRadius: 21,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  billBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    borderWidth: 1,
    borderColor: '#27ae60',
  },
  headerInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  materialName: {
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 3,
  },
  vendorName: {
    color: '#7f8c8d',
    marginBottom: 5,
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    color: '#999',
    fontSize: 11,
  },
  headerRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 90,
    maxWidth: 110,
  },
  amount: {
    fontWeight: '700',
    color: '#27ae60',
    marginBottom: 5,
    textAlign: 'right',
  },
  quantityBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 5,
    maxWidth: 100,
  },
  quantityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#27ae60',
    textAlign: 'center',
  },
  chevron: {
    marginTop: 2,
  },
  expandedSection: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  divider: {
    marginBottom: 16,
    backgroundColor: '#e0e0e0',
  },
  detailsGrid: {
    gap: 10,
  },
  detailItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#7f8c8d',
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  totalItem: {
    backgroundColor: '#e8f5e9',
    marginTop: 6,
    paddingVertical: 12,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#27ae60',
    flex: 1,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#27ae60',
    textAlign: 'right',
    flex: 1,
  },
  billSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  billImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  actionRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  deleteButton: {
    borderRadius: 8,
    flex: 1,
    elevation: 0,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyIconWrapper: {
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#95a5a6',
    marginBottom: 8,
    fontWeight: '600',
  },
  emptySubtitle: {
    color: '#bdc3c7',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#27ae60',
  },
});

export default PurchaseHistoryScreen;