import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Card, Chip, FAB, Searchbar, Text } from 'react-native-paper';
import { supabase } from '../config/supabase';
import { Site } from '../types';

interface SiteWithFinancials extends Site {
  total_expenses: number;
  profit: number;
}

const SitesScreen = ({ navigation }: any) => {
  const [sites, setSites] = useState<SiteWithFinancials[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSites = async () => {
    try {
      setLoading(true);
      const { data: sitesData, error: sitesError } = await supabase
        .from('sites')
        .select('*')
        .order('created_at', { ascending: false });

      if (sitesError) throw sitesError;

      // Fetch expenses for all sites
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('site_id, amount');

      if (expensesError) throw expensesError;

      // Calculate total expenses per site
      const expensesBySite = (expensesData || []).reduce((acc: any, expense: any) => {
        if (!acc[expense.site_id]) {
          acc[expense.site_id] = 0;
        }
        acc[expense.site_id] += expense.amount;
        return acc;
      }, {});

      // Combine sites with financial data
      const sitesWithFinancials = (sitesData || []).map(site => {
        const totalExpenses = expensesBySite[site.id] || 0;
        const estimatedCost = site.estimated_cost || 0;
        const profit = estimatedCost - totalExpenses;

        return {
          ...site,
          total_expenses: totalExpenses,
          profit: profit
        };
      });

      setSites(sitesWithFinancials);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSites();
    }, [])
  );

  const deleteSite = async (id: string) => {
    Alert.alert(
      'Delete Site',
      'Are you sure you want to delete this site? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('sites').delete().eq('id', id);
              if (error) throw error;
              fetchSites();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  const filteredSites = sites.filter((site) =>
    site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    site.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { color: '#10b981', ionicon: 'checkmark-circle-outline', label: 'Active' };
      case 'completed':
        return { color: '#3b82f6', ionicon: 'checkmark-done-outline', label: 'Completed' };
      case 'pending':
        return { color: '#f59e0b', ionicon: 'time-outline', label: 'Pending' };
      case 'on-hold':
        return { color: '#ef4444', ionicon: 'pause-circle-outline', label: 'On Hold' };
      default:
        return { color: '#6b7280', ionicon: 'ellipse-outline', label: status };
    }
  };

  const renderSite = ({ item }: { item: SiteWithFinancials }) => {
    const statusConfig = getStatusConfig(item.status);
    const profitMargin = item.estimated_cost ? ((item.profit / item.estimated_cost) * 100) : 0;
    const isProfitable = item.profit >= 0;
    
    return (
      <Card style={styles.card} mode="elevated" elevation={2}>
        <TouchableOpacity
          onPress={() => navigation.navigate('SiteDetails', { siteId: item.id })}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#ffffff', '#f8f9fa']}
            style={styles.gradientCard}
          >
            <Card.Content style={styles.cardContent}>
              <View style={styles.cardHeader}>
                <View style={styles.iconContainer}>
                  <Ionicons name="business" size={24} color="#4f46e5" />
                </View>
                <View style={styles.headerTextContainer}>
                  <Text variant="titleLarge" style={styles.siteName}>
                    {item.name}
                  </Text>
                  <Chip
                    icon={() => <Ionicons name={statusConfig.ionicon as any} size={16} color={statusConfig.color} />}
                    style={[styles.statusChip, { backgroundColor: statusConfig.color + '20' }]}
                    textStyle={[styles.statusChipText, { color: statusConfig.color }]}
                    compact
                  >
                    {statusConfig.label}
                  </Chip>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Financial Summary Section */}
              <View style={styles.financialSection}>
                <View style={styles.financialRow}>
                  <View style={styles.financialItem}>
                    <View style={styles.financialIconContainer}>
                      <Ionicons name="cash-outline" size={18} color="#8b5cf6" />
                    </View>
                    <View>
                      <Text variant="labelSmall" style={styles.financialLabel}>Estimated</Text>
                      <Text variant="bodyLarge" style={styles.financialValue}>
                        {formatCurrency(item.estimated_cost || 0)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.financialItem}>
                    <View style={[styles.financialIconContainer, { backgroundColor: '#fee2e2' }]}>
                      <Ionicons name="trending-down-outline" size={18} color="#ef4444" />
                    </View>
                    <View>
                      <Text variant="labelSmall" style={styles.financialLabel}>Expenses</Text>
                      <Text variant="bodyLarge" style={styles.financialValue}>
                        {formatCurrency(item.total_expenses)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.profitCard, isProfitable ? styles.profitCardPositive : styles.profitCardNegative]}>
                  <View style={styles.profitHeader}>
                    <Ionicons 
                      name={isProfitable ? "trending-up" : "trending-down"} 
                      size={20} 
                      color={isProfitable ? "#10b981" : "#ef4444"} 
                    />
                    <Text variant="labelMedium" style={[styles.profitLabel, { color: isProfitable ? "#10b981" : "#ef4444" }]}>
                      {isProfitable ? "Profit" : "Loss"}
                    </Text>
                  </View>
                  <Text variant="headlineSmall" style={[styles.profitAmount, { color: isProfitable ? "#10b981" : "#ef4444" }]}>
                    {formatCurrency(Math.abs(item.profit))}
                  </Text>
                  {item.estimated_cost && item.estimated_cost > 0 && (
                    <Text variant="bodySmall" style={styles.profitMargin}>
                      {profitMargin.toFixed(1)}% margin
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoContainer}>
                {item.client_name && (
                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name="person" size={18} color="#6366f1" />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text variant="labelSmall" style={styles.infoLabel}>Client</Text>
                      <Text variant="bodyMedium" style={styles.infoValue}>
                        {item.client_name}
                      </Text>
                    </View>
                  </View>
                )}

                {item.location && (
                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name="location" size={18} color="#ec4899" />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text variant="labelSmall" style={styles.infoLabel}>Location</Text>
                      <Text variant="bodyMedium" style={styles.infoValue}>
                        {item.location}
                      </Text>
                    </View>
                  </View>
                )}

                {item.start_date && (
                  <View style={styles.infoRow}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name="calendar" size={18} color="#10b981" />
                    </View>
                    <View style={styles.infoTextContainer}>
                      <Text variant="labelSmall" style={styles.infoLabel}>Start Date</Text>
                      <Text variant="bodyMedium" style={styles.infoValue}>
                        {new Date(item.start_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </Card.Content>

            <Card.Actions style={styles.cardActions}>
              <Button
                mode="text"
                onPress={() => navigation.navigate('AddSite', { siteId: item.id })}
                icon="pencil"
                textColor="#4f46e5"
                style={styles.actionButton}
              >
                Edit
              </Button>
              <Button
                mode="text"
                onPress={() => deleteSite(item.id)}
                icon="delete"
                textColor="#ef4444"
                style={styles.actionButton}
              >
                Delete
              </Button>
              <View style={styles.chevronContainer}>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </View>
            </Card.Actions>
          </LinearGradient>
        </TouchableOpacity>
      </Card>
    );
  };

  const totalEstimated = sites.reduce((sum, site) => sum + (site.estimated_cost || 0), 0);
  const totalExpenses = sites.reduce((sum, site) => sum + site.total_expenses, 0);
  const totalProfit = totalEstimated - totalExpenses;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Searchbar
          placeholder="Search sites, clients, locations..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          iconColor="#6366f1"
          inputStyle={styles.searchInput}
          elevation={1}
        />
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text variant="labelSmall" style={styles.statLabel}>Total Sites</Text>
            <Text variant="headlineSmall" style={styles.statValue}>{sites.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text variant="labelSmall" style={styles.statLabel}>Active</Text>
            <Text variant="headlineSmall" style={[styles.statValue, { color: '#10b981' }]}>
              {sites.filter(s => s.status === 'active').length}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text variant="labelSmall" style={styles.statLabel}>Net Profit</Text>
            <Text variant="titleMedium" style={[styles.statValue, { color: totalProfit >= 0 ? '#10b981' : '#ef4444' }]}>
              {formatCurrency(Math.abs(totalProfit))}
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={filteredSites}
        renderItem={renderSite}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={fetchSites}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="business-outline" size={80} color="#e5e7eb" />
            </View>
            <Text variant="headlineSmall" style={styles.emptyText}>
              No Sites Found
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubText}>
              {searchQuery ? 'Try adjusting your search' : 'Get started by adding your first site'}
            </Text>
            {!searchQuery && (
              <Button
                mode="contained"
                onPress={() => navigation.navigate('AddSite')}
                icon="plus"
                style={styles.emptyButton}
              >
                Add Your First Site
              </Button>
            )}
          </View>
        }
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('AddSite')}
        color="white"
        customSize={60}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchBar: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    elevation: 0,
  },
  searchInput: {
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statLabel: {
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontWeight: '700',
    color: '#1f2937',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  gradientCard: {
    borderRadius: 16,
  },
  cardContent: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTextContainer: {
    flex: 1,
    gap: 8,
  },
  siteName: {
    fontWeight: '700',
    color: '#1f2937',
    lineHeight: 28,
  },
  statusChip: {
    alignSelf: 'flex-start',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  financialSection: {
    marginVertical: 8,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  financialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  financialIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  financialLabel: {
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  financialValue: {
    color: '#1f2937',
    fontWeight: '700',
  },
  profitCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  profitCardPositive: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  profitCardNegative: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  profitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  profitLabel: {
    marginLeft: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profitAmount: {
    fontWeight: '800',
    marginVertical: 2,
  },
  profitMargin: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  infoContainer: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    color: '#9ca3af',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    color: '#374151',
    fontWeight: '500',
  },
  cardActions: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    justifyContent: 'flex-start',
  },
  actionButton: {
    marginHorizontal: 0,
  },
  chevronContainer: {
    marginLeft: 'auto',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyText: {
    color: '#374151',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubText: {
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    borderRadius: 12,
    paddingHorizontal: 8,
  },
  fab: {
    position: 'absolute',
    margin: 20,
    right: 0,
    bottom: 0,
    backgroundColor: '#4f46e5',
    borderRadius: 30,
  },
});

export default SitesScreen;