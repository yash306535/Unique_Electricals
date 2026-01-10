import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Card, Text } from 'react-native-paper';
import { supabase } from '../config/supabase';
import { Site } from '../types';

interface SiteFinancials {
  total_expenses: number;
  expense_breakdown: {
    labour: number;
    transport: number;
    equipment: number;
    misc: number;
  };
}

const SiteDetailsScreen = ({ navigation, route }: any) => {
  const { siteId } = route.params;
  const [site, setSite] = useState<Site | null>(null);
  const [financials, setFinancials] = useState<SiteFinancials>({
    total_expenses: 0,
    expense_breakdown: { labour: 0, transport: 0, equipment: 0, misc: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSiteDetails();
    fetchFinancials();
  }, [siteId]);

  const fetchSiteDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sites')
        .select('*')
        .eq('id', siteId)
        .single();

      if (error) throw error;
      setSite(data);
    } catch (error: any) {
      console.error('Error fetching site:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancials = async () => {
    try {
      const { data: expensesData, error } = await supabase
        .from('expenses')
        .select('amount, category')
        .eq('site_id', siteId);

      if (error) throw error;

      const breakdown = {
        labour: 0,
        transport: 0,
        equipment: 0,
        misc: 0
      };

      let total = 0;
      (expensesData || []).forEach((expense: any) => {
        total += expense.amount;
        if (breakdown.hasOwnProperty(expense.category)) {
          breakdown[expense.category as keyof typeof breakdown] += expense.amount;
        }
      });

      setFinancials({
        total_expenses: total,
        expense_breakdown: breakdown
      });
    } catch (error: any) {
      console.error('Error fetching financials:', error.message);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  const tabs = [
    {
      id: '1',
      title: 'Expenses',
      icon: 'wallet',
      color: '#e74c3c',
      gradientColors: ['#e74c3c', '#c0392b'] as const,
      screen: 'Expenses',
      description: 'Track all site expenses',
    },
    {
      id: '2',
      title: 'Material Issue',
      icon: 'cube',
      color: '#27ae60',
      gradientColors: ['#27ae60', '#229954'] as const,
      screen: 'MaterialIssue',
      description: 'Issue materials to site',
    },
    {
      id: '3',
      title: 'Site Tasks',
      icon: 'checkbox',
      color: '#3498db',
      gradientColors: ['#3498db', '#2980b9'] as const,
      screen: 'SiteTasks',
      description: 'Approvals & pending work',
    },
    {
      id: '4',
      title: 'Documentation',
      icon: 'document-text',
      color: '#6200ee',
      gradientColors: ['#6200ee', '#3700b3'] as const,
      screen: 'SiteDocumentation',
      description: 'Track documents & file desk',
    },
  ];

  if (loading || !site) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
      </View>
    );
  }

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return { colors: ['#27ae60', '#229954'] as const, icon: 'checkmark-circle' };
      case 'completed':
        return { colors: ['#3498db', '#2980b9'] as const, icon: 'flag' };
      case 'on-hold':
        return { colors: ['#e74c3c', '#c0392b'] as const, icon: 'pause-circle' };
      default:
        return { colors: ['#e67e22', '#d35400'] as const, icon: 'time' };
    }
  };

  const statusConfig = getStatusConfig(site.status);
  const estimatedCost = site.estimated_cost || 0;
  const profit = estimatedCost - financials.total_expenses;
  const profitMargin = estimatedCost > 0 ? ((profit / estimatedCost) * 100) : 0;
  const isProfitable = profit >= 0;

  const expenseCategories = [
    { key: 'labour', label: 'Labour', icon: 'people', color: '#3498db' },
    { key: 'transport', label: 'Transport', icon: 'car', color: '#e67e22' },
    { key: 'equipment', label: 'Equipment', icon: 'construct', color: '#9b59b6' },
    { key: 'misc', label: 'Miscellaneous', icon: 'ellipsis-horizontal', color: '#95a5a6' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Enhanced Site Card with Gradient */}
      <Card style={styles.siteCard} mode="elevated" elevation={4}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.siteHeader}>
            <View style={styles.siteIconContainer}>
              <Ionicons name="business" size={28} color="#667eea" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text variant="headlineMedium" style={styles.siteName}>
                {site.name}
              </Text>
              <View style={styles.statusBadge}>
                <LinearGradient
                  colors={statusConfig.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.statusGradient}
                >
                  <Ionicons name={statusConfig.icon as any} size={14} color="white" />
                  <Text style={styles.statusText}>{site.status.toUpperCase()}</Text>
                </LinearGradient>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {site.client_name && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#667eea15' }]}>
                <Ionicons name="person" size={20} color="#667eea" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text variant="bodySmall" style={styles.infoLabel}>
                  Client Name
                </Text>
                <Text variant="bodyLarge" style={styles.infoValue}>
                  {site.client_name}
                </Text>
              </View>
            </View>
          )}

          {site.location && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#27ae6015' }]}>
                <Ionicons name="location" size={20} color="#27ae60" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text variant="bodySmall" style={styles.infoLabel}>
                  Location
                </Text>
                <Text variant="bodyLarge" style={styles.infoValue}>
                  {site.location}
                </Text>
              </View>
            </View>
          )}

          {site.start_date && (
            <View style={styles.infoRow}>
              <View style={[styles.infoIcon, { backgroundColor: '#3498db15' }]}>
                <Ionicons name="calendar" size={20} color="#3498db" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text variant="bodySmall" style={styles.infoLabel}>
                  Start Date
                </Text>
                <Text variant="bodyLarge" style={styles.infoValue}>
                  {new Date(site.start_date).toLocaleDateString('en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Financial Summary Card */}
      <Card style={styles.financialCard} mode="elevated" elevation={3}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.financialGradient}
        >
          <Card.Content style={styles.financialContent}>
            <View style={styles.financialHeader}>
              <Ionicons name="bar-chart" size={24} color="white" />
              <Text variant="titleLarge" style={styles.financialTitle}>
                Financial Overview
              </Text>
            </View>

            {/* Main Financial Stats */}
            <View style={styles.mainStats}>
              <View style={styles.statBox}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="cash-outline" size={20} color="#fff" />
                </View>
                <Text variant="labelSmall" style={styles.statLabel}>
                  Estimated Amount
                </Text>
                <Text variant="headlineSmall" style={styles.statAmount}>
                  {formatCurrency(estimatedCost)}
                </Text>
              </View>

              <View style={styles.statBox}>
                <View style={[styles.statIconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.3)' }]}>
                  <Ionicons name="trending-down-outline" size={20} color="#fff" />
                </View>
                <Text variant="labelSmall" style={styles.statLabel}>
                  Total Expenses
                </Text>
                <Text variant="headlineSmall" style={styles.statAmount}>
                  {formatCurrency(financials.total_expenses)}
                </Text>
              </View>
            </View>

            {/* Profit Card */}
            <View style={[styles.profitBox, isProfitable ? styles.profitPositive : styles.profitNegative]}>
              <View style={styles.profitHeader}>
                <Ionicons 
                  name={isProfitable ? "trending-up" : "trending-down"} 
                  size={24} 
                  color={isProfitable ? "#10b981" : "#ef4444"} 
                />
                <Text variant="titleMedium" style={[styles.profitLabel, { color: isProfitable ? "#10b981" : "#ef4444" }]}>
                  {isProfitable ? "Profit" : "Loss"}
                </Text>
              </View>
              <Text variant="headlineLarge" style={[styles.profitAmount, { color: isProfitable ? "#10b981" : "#ef4444" }]}>
                {formatCurrency(Math.abs(profit))}
              </Text>
              {estimatedCost > 0 && (
                <Text variant="bodyMedium" style={styles.profitMargin}>
                  {profitMargin.toFixed(1)}% margin
                </Text>
              )}
            </View>
          </Card.Content>
        </LinearGradient>
      </Card>

      {/* Expense Breakdown Card */}
      {financials.total_expenses > 0 && (
        <Card style={styles.breakdownCard} mode="elevated" elevation={2}>
          <Card.Content style={styles.breakdownContent}>
            <View style={styles.breakdownHeader}>
              <Ionicons name="pie-chart" size={22} color="#667eea" />
              <Text variant="titleMedium" style={styles.breakdownTitle}>
                Expense Breakdown
              </Text>
            </View>

            {expenseCategories.map((category) => {
              const amount = financials.expense_breakdown[category.key as keyof typeof financials.expense_breakdown];
              const percentage = financials.total_expenses > 0 
                ? ((amount / financials.total_expenses) * 100).toFixed(1)
                : '0';

              if (amount === 0) return null;

              return (
                <View key={category.key} style={styles.categoryRow}>
                  <View style={styles.categoryLeft}>
                    <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                      <Ionicons name={category.icon as any} size={18} color={category.color} />
                    </View>
                    <View style={styles.categoryInfo}>
                      <Text variant="bodyMedium" style={styles.categoryLabel}>
                        {category.label}
                      </Text>
                      <View style={styles.progressBar}>
                        <View 
                          style={[
                            styles.progressFill, 
                            { width: parseFloat(percentage), backgroundColor: category.color }
                          ]} 
                        />
                      </View>
                    </View>
                  </View>
                  <View style={styles.categoryRight}>
                    <Text variant="bodyLarge" style={styles.categoryAmount}>
                      {formatCurrency(amount)}
                    </Text>
                    <Text variant="bodySmall" style={styles.categoryPercentage}>
                      {percentage}%
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card.Content>
        </Card>
      )}

      {/* Enhanced Tabs Section */}
      <View style={styles.tabsContainer}>
        <View style={styles.sectionHeader}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            Manage Site
          </Text>
          <View style={styles.sectionUnderline} />
        </View>

        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab.id}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(tab.screen, { siteId, siteName: site.name })}
          >
            <Card style={styles.tabCard} mode="elevated" elevation={2}>
              <LinearGradient
                colors={['#ffffff', '#f8f9fa']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.tabGradient}
              >
                <Card.Content style={styles.tabContent}>
                  <View style={styles.tabLeft}>
                    <LinearGradient
                      colors={tab.gradientColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.iconContainer}
                    >
                      <Ionicons name={tab.icon as any} size={28} color="white" />
                    </LinearGradient>
                    <View style={styles.tabTextContainer}>
                      <Text variant="titleMedium" style={styles.tabTitle}>
                        {tab.title}
                      </Text>
                      <Text variant="bodyMedium" style={styles.tabDescription}>
                        {tab.description}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.chevronContainer}>
                    <Ionicons name="chevron-forward" size={24} color="#667eea" />
                  </View>
                </Card.Content>
              </LinearGradient>
            </Card>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
  },
  siteCard: {
    margin: 16,
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  cardContent: {
    paddingTop: 20,
    paddingBottom: 16,
  },
  siteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  siteIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#667eea15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  siteName: {
    color: '#2c3e50',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    overflow: 'hidden',
  },
  statusGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    color: '#95a5a6',
    marginBottom: 2,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    color: '#2c3e50',
    fontWeight: '600',
  },
  financialCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  financialGradient: {
    borderRadius: 16,
  },
  financialContent: {
    paddingVertical: 20,
  },
  financialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  financialTitle: {
    color: 'white',
    fontWeight: 'bold',
  },
  mainStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statAmount: {
    color: 'white',
    fontWeight: 'bold',
  },
  profitBox: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
  },
  profitPositive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  profitNegative: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  profitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  profitLabel: {
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profitAmount: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profitMargin: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  breakdownCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  breakdownContent: {
    paddingVertical: 16,
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  breakdownTitle: {
    color: '#2c3e50',
    fontWeight: 'bold',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryLabel: {
    color: '#2c3e50',
    fontWeight: '600',
    marginBottom: 6,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    color: '#2c3e50',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  categoryPercentage: {
    color: '#7f8c8d',
    fontSize: 12,
  },
  tabsContainer: {
    padding: 16,
    paddingTop: 8,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#2c3e50',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionUnderline: {
    width: 50,
    height: 4,
    backgroundColor: '#667eea',
    borderRadius: 2,
  },
  tabCard: {
    marginBottom: 12,
    borderRadius: 14,
    overflow: 'hidden',
  },
  tabGradient: {
    borderRadius: 14,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  tabLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tabTextContainer: {
    flex: 1,
  },
  tabTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#2c3e50',
  },
  tabDescription: {
    color: '#7f8c8d',
    fontSize: 13,
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#667eea15',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SiteDetailsScreen;