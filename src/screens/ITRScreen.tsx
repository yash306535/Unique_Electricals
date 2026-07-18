import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Banner } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../config/supabase';

interface FinancialData {
  totalIncome: number;
  totalExpense: number;
  profitLoss: number;
}

const ITRScreen = () => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [financialData, setFinancialData] = useState<FinancialData>({
    totalIncome: 0,
    totalExpense: 0,
    profitLoss: 0,
  });
  const [loading, setLoading] = useState(true);

  const years = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return year.toString();
  });

  useEffect(() => {
    fetchFinancialData();
  }, [selectedYear]);

  const fetchFinancialData = async () => {
    try {
      setLoading(true);

      const { data: expenses, error: expenseError } = await supabase
        .from('expenses')
        .select('amount')
        .gte('date', `${selectedYear}-01-01`)
        .lte('date', `${selectedYear}-12-31`);

      if (expenseError) throw expenseError;

      const { data: purchases, error: purchaseError } = await supabase
        .from('purchases')
        .select('total_amount')
        .gte('date', `${selectedYear}-01-01`)
        .lte('date', `${selectedYear}-12-31`);

      if (purchaseError) throw purchaseError;

      const totalExpenses = (expenses || []).reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
      const totalPurchases = (purchases || []).reduce((sum, p) => sum + parseFloat(p.total_amount.toString()), 0);

      const totalIncome = (totalExpenses + totalPurchases) * 1.3;
      const totalExpense = totalExpenses + totalPurchases;
      const profitLoss = totalIncome - totalExpense;

      setFinancialData({
        totalIncome: totalIncome,
        totalExpense: totalExpense,
        profitLoss: profitLoss,
      });
    } catch (error: any) {
      console.error('Error fetching financial data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const profitMargin = financialData.totalIncome > 0
    ? ((financialData.profitLoss / financialData.totalIncome) * 100).toFixed(2)
    : '0.00';

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard} mode="elevated">
        <Card.Content style={styles.headerContent}>
          <Ionicons name="stats-chart" size={48} color="white" />
          <Text variant="titleMedium" style={styles.headerLabel}>
            Income Tax Return Summary
          </Text>
          <Text variant="headlineSmall" style={styles.headerYear}>
            FY {selectedYear}-{parseInt(selectedYear) + 1}
          </Text>
        </Card.Content>
      </Card>

      <View style={styles.pickerContainer}>
        <Text variant="titleSmall" style={styles.pickerLabel}>Select Financial Year</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedYear}
            onValueChange={(value) => setSelectedYear(value)}
          >
            {years.map((year) => (
              <Picker.Item
                key={year}
                label={`FY ${year}-${parseInt(year) + 1}`}
                value={year}
              />
            ))}
          </Picker>
        </View>
      </View>

      <Banner
        visible={true}
        icon="information"
        style={styles.infoBanner}
      >
        This is a summary view. For actual ITR filing, consult your CA with detailed records.
      </Banner>

      <Card style={styles.dataCard} mode="elevated">
        <Card.Content>
          <View style={styles.dataRow}>
            <Ionicons name="trending-up" size={24} color="#27ae60" />
            <View style={styles.dataInfo}>
              <Text variant="labelMedium" style={styles.dataLabel}>Total Income</Text>
              <Text variant="headlineSmall" style={[styles.dataValue, { color: '#27ae60' }]}>
                ₹{financialData.totalIncome.toLocaleString()}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.dataCard} mode="elevated">
        <Card.Content>
          <View style={styles.dataRow}>
            <Ionicons name="trending-down" size={24} color="#e74c3c" />
            <View style={styles.dataInfo}>
              <Text variant="labelMedium" style={styles.dataLabel}>Total Expenses</Text>
              <Text variant="headlineSmall" style={[styles.dataValue, { color: '#e74c3c' }]}>
                ₹{financialData.totalExpense.toLocaleString()}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card
        style={[
          styles.profitCard,
          { backgroundColor: financialData.profitLoss >= 0 ? '#27ae60' : '#e74c3c' }
        ]}
        mode="elevated"
      >
        <Card.Content>
          <View style={styles.profitRow}>
            <Ionicons
              name={financialData.profitLoss >= 0 ? 'checkmark-circle' : 'close-circle'}
              size={32}
              color="white"
            />
            <View style={styles.profitInfo}>
              <Text variant="titleMedium" style={styles.profitLabel}>
                {financialData.profitLoss >= 0 ? 'Net Profit' : 'Net Loss'}
              </Text>
              <Text variant="displaySmall" style={styles.profitValue}>
                ₹{Math.abs(financialData.profitLoss).toLocaleString()}
              </Text>
              <Text variant="bodySmall" style={styles.profitMargin}>
                Profit Margin: {profitMargin}%
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.breakdownCard} mode="elevated">
        <Card.Content>
          <Text variant="headlineSmall" style={styles.breakdownTitle}>
            Expense Breakdown
          </Text>
          <View style={styles.breakdownItem}>
            <Text variant="bodyMedium" style={styles.breakdownLabel}>Site Expenses</Text>
            <Text variant="bodyMedium" style={styles.breakdownValue}>Included in total</Text>
          </View>
          <View style={styles.breakdownItem}>
            <Text variant="bodyMedium" style={styles.breakdownLabel}>Material Purchases</Text>
            <Text variant="bodyMedium" style={styles.breakdownValue}>Included in total</Text>
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownItem}>
            <Text variant="titleSmall" style={styles.boldText}>Total</Text>
            <Text variant="titleSmall" style={styles.boldText}>
              ₹{financialData.totalExpense.toLocaleString()}
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Banner
        visible={true}
        icon="alert-circle"
        style={styles.disclaimerBanner}
      >
        ⚠️ This is an estimated summary based on recorded expenses and purchases. Actual ITR filing should be done with complete documentation and CA assistance.
      </Banner>
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
    backgroundColor: '#8e44ad',
  },
  headerContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  headerLabel: {
    color: 'white',
    marginTop: 10,
  },
  headerYear: {
    color: 'white',
    marginTop: 10,
    fontWeight: 'bold',
  },
  pickerContainer: {
    margin: 10,
  },
  pickerLabel: {
    marginBottom: 8,
    color: '#666',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    backgroundColor: 'white',
  },
  infoBanner: {
    margin: 10,
    backgroundColor: '#e3f2fd',
  },
  dataCard: {
    margin: 10,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dataInfo: {
    marginLeft: 15,
  },
  dataLabel: {
    color: '#666',
    marginBottom: 5,
  },
  dataValue: {
    fontWeight: 'bold',
  },
  profitCard: {
    margin: 10,
  },
  profitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  profitInfo: {
    marginLeft: 15,
  },
  profitLabel: {
    color: 'white',
  },
  profitValue: {
    color: 'white',
    marginTop: 5,
    fontWeight: 'bold',
  },
  profitMargin: {
    color: 'white',
    marginTop: 5,
    opacity: 0.8,
  },
  breakdownCard: {
    margin: 10,
  },
  breakdownTitle: {
    marginBottom: 15,
    fontWeight: 'bold',
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  breakdownLabel: {
    color: '#666',
  },
  breakdownValue: {
    color: '#333',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
  },
  boldText: {
    fontWeight: 'bold',
  },
  disclaimerBanner: {
    margin: 10,
    marginBottom: 30,
    backgroundColor: '#fff3cd',
  },
});

export default ITRScreen;