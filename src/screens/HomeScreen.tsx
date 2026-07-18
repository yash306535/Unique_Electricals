import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Alert, Platform, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Badge, Card, Text } from 'react-native-paper';
import { supabase } from '../config/supabase';
import { useAuth } from '../context/AuthContext';
import { Material, Site, SiteTask } from '../types';

const HomeScreen = ({ navigation }: any) => {
  const { isRoot, user } = useAuth();
  const [activeSites, setActiveSites] = useState<Site[]>([]);
  const [lowStockMaterials, setLowStockMaterials] = useState<Material[]>([]);
  const [pendingTasks, setPendingTasks] = useState<SiteTask[]>([]);
  const [myTasks, setMyTasks] = useState<SiteTask[]>([]);
  const [stats, setStats] = useState({
    totalSites: 0,
    activeSites: 0,
    totalMaterials: 0,
    pendingTasks: 0,
    myTasksCount: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  // Hide the default navigation header
  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const fetchDashboardData = async () => {
    try {
      // Fetch all sites
      const { data: sitesData, error: sitesError } = await supabase
        .from('sites')
        .select('*')
        .order('created_at', { ascending: false });

      if (sitesError) throw sitesError;

      const allSites = sitesData || [];
      const active = allSites.filter(s => s.status === 'active');
      setActiveSites(active.slice(0, 3));

      // Fetch materials with low stock
      const { data: materialsData, error: materialsError } = await supabase
        .from('materials')
        .select('*')
        .lt('current_stock', 10)
        .order('current_stock');

      if (materialsError) throw materialsError;
      setLowStockMaterials(materialsData || []);

      // Fetch pending tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('site_tasks')
        .select(`
          *,
          site:sites(name)
        `)
        .eq('status', 'pending')
        .order('expected_date')
        .limit(5);

      if (tasksError) throw tasksError;
      setPendingTasks(tasksData || []);

      // Fetch My Tasks (tasks assigned to current user, not completed)
      let myTasksData = [];
      if (user?.id) {
        const { data, error } = await supabase
          .from('site_tasks')
          .select(`
            *,
            site:sites(name)
          `)
          .eq('assigned_to', user.id)
          .neq('status', 'completed')
          .order('expected_date');

        if (error) throw error;
        myTasksData = data || [];
      }
      setMyTasks(myTasksData.slice(0, 5));

      // Update stats
      setStats({
        totalSites: allSites.length,
        activeSites: active.length,
        totalMaterials: materialsData?.length || 0,
        pendingTasks: tasksData?.length || 0,
        myTasksCount: myTasksData.length,
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const getAllModules = () => [
    {
      id: '1',
      title: 'Project Sites',
      icon: 'flash',
      color: '#FF6B35',
      screen: 'Sites',
      description: 'Manage electrical projects',
      badge: stats.activeSites,
      roleRequired: null, // Available to all users
    },
    {
      id: '2',
      title: 'Inventory',
      icon: 'hardware-chip',
      color: '#FFA500',
      screen: 'Stock',
      description: 'Wires, MCBs, switches & tools',
      badge: lowStockMaterials.length,
      roleRequired: null, // Available to all users
    },
    {
      id: '3',
      title: 'Purchase Orders',
      icon: 'receipt-outline',
      color: '#4ECDC4',
      screen: 'PurchaseHistory',
      description: 'Track material purchases',
      roleRequired: 'root', // Only for root users
    },
    {
      id: '4',
      title: 'GST Records',
      icon: 'document-text',
      color: '#95E1D3',
      screen: 'GST',
      description: 'Tax compliance & invoices',
      roleRequired: 'root', // Only for root users
    },
    {
      id: '5',
      title: 'Financial Reports',
      icon: 'analytics',
      color: '#6C5CE7',
      screen: 'ITR',
      description: 'Income, expenses & profit',
      roleRequired: 'root', // Only for root users
    },
    {
      id: '6',
      title: 'User Management',
      icon: 'people',
      color: '#FF6B35',
      screen: 'UserManagement',
      description: 'Manage system users',
      roleRequired: 'root', // Only for root users
    },
  ];

  const modules = getAllModules().filter(module => 
    module.roleRequired === null || (module.roleRequired === 'root' && isRoot)
  );

  const getTaskPriority = (expectedDate?: string) => {
    if (!expectedDate) return 'low';
    const today = new Date();
    const taskDate = new Date(expectedDate);
    const diffDays = Math.ceil((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 2) return 'high';
    if (diffDays <= 7) return 'medium';
    return 'low';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'overdue': return '#FF3B30';
      case 'high': return '#FF9500';
      case 'medium': return '#FFCC00';
      default: return '#8E8E93';
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header with Gradient Effect */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text variant="headlineLarge" style={styles.headerText}>
              ⚡ ElectriPro
            </Text>
            <Text variant="titleMedium" style={styles.subHeader}>
              Your Electrical Business Hub
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Stats Dashboard */}
      <View style={styles.statsContainer}>
        <View style={styles.statRow}>
          <Card style={[styles.statCard, styles.shadowCard]}>
            <View style={[styles.statGradient, { backgroundColor: '#FF6B35' }]}>
              <View style={styles.statIconCircle}>
                <Ionicons name="flash" size={24} color="#FF6B35" />
              </View>
              <View style={styles.statTextContainer}>
                <Text variant="headlineMedium" style={styles.statValue}>
                  {stats.activeSites}
                </Text>
                <Text variant="bodyMedium" style={styles.statLabel}>
                  Active Projects
                </Text>
              </View>
            </View>
          </Card>

          <Card style={[styles.statCard, styles.shadowCard]}>
            <View style={[styles.statGradient, { backgroundColor: '#FFA500' }]}>
              <View style={styles.statIconCircle}>
                <Ionicons name="hardware-chip" size={24} color="#FFA500" />
              </View>
              <View style={styles.statTextContainer}>
                <Text variant="headlineMedium" style={styles.statValue}>
                  {stats.totalMaterials}
                </Text>
                <Text variant="bodyMedium" style={styles.statLabel}>
                  Low Stock Items
                </Text>
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.statRow}>
          <Card style={[styles.statCard, styles.shadowCard]}>
            <View style={[styles.statGradient, { backgroundColor: '#4ECDC4' }]}>
              <View style={styles.statIconCircle}>
                <Ionicons name="time-outline" size={24} color="#4ECDC4" />
              </View>
              <View style={styles.statTextContainer}>
                <Text variant="headlineMedium" style={styles.statValue}>
                  {stats.pendingTasks}
                </Text>
                <Text variant="bodyMedium" style={styles.statLabel}>
                  Pending Tasks
                </Text>
              </View>
            </View>
          </Card>

          <Card style={[styles.statCard, styles.shadowCard]}>
            <View style={[styles.statGradient, { backgroundColor: '#6C5CE7' }]}>
              <View style={styles.statIconCircle}>
                <Ionicons name="briefcase-outline" size={24} color="#6C5CE7" />
              </View>
              <View style={styles.statTextContainer}>
                <Text variant="headlineMedium" style={styles.statValue}>
                  {stats.totalSites}
                </Text>
                <Text variant="bodyMedium" style={styles.statLabel}>
                  Total Sites
                </Text>
              </View>
            </View>
          </Card>
        </View>
      </View>

      {/* Quick Access Modules */}
      <View style={styles.section}>
        <View style={[styles.sectionHeaderRow, styles.quickAccessHeader]}>
          <Ionicons name="grid" size={24} color="#FF6B35" />
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Quick Access
          </Text>
        </View>
        
        <View style={styles.modulesContainer}>
          {modules.map((module) => (
            <TouchableOpacity
              key={module.id}
              onPress={() => navigation.navigate(module.screen)}
              activeOpacity={0.7}
            >
              <Card style={[styles.moduleCard, styles.shadowCard]} mode="elevated">
                <Card.Content style={styles.moduleContent}>
                  <View style={[styles.moduleIconContainer, { backgroundColor: module.color }]}>
                    <Ionicons name={module.icon as any} size={28} color="white" />
                  </View>
                  <View style={styles.moduleTextContainer}>
                    <View style={styles.moduleTitleRow}>
                      <Text variant="titleMedium" style={styles.moduleTitle}>
                        {module.title}
                      </Text>
                      {module.badge !== undefined && module.badge > 0 && (
                        <Badge style={[styles.moduleBadge, { backgroundColor: module.color }]}>
                          {module.badge}
                        </Badge>
                      )}
                    </View>
                    <Text variant="bodySmall" style={styles.moduleDescription}>
                      {module.description}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color="#C7C7CC" />
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Spacer for better visibility */}
      <View style={styles.sectionSpacer} />

      {/* Active Projects */}
      {activeSites.length > 0 && (
        <View style={styles.section}>
          <View style={[styles.sectionHeader, styles.cardSectionHeader]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="flash" size={24} color="#FF6B35" />
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Active Projects
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Sites')}>
              <Text style={styles.viewAllText}>View All →</Text>
            </TouchableOpacity>
          </View>
          
          {activeSites.map((site) => (
            <TouchableOpacity
              key={site.id}
              onPress={() => navigation.navigate('SiteDetails', { siteId: site.id })}
              activeOpacity={0.7}
            >
              <Card style={[styles.projectCard, styles.shadowCard]} mode="elevated">
                <Card.Content>
                  <View style={styles.projectRow}>
                    <View style={styles.projectIconContainer}>
                      <Ionicons name="flash" size={26} color="#FF6B35" />
                    </View>
                    <View style={styles.projectInfo}>
                      <Text variant="titleMedium" style={styles.projectName}>
                        {site.name}
                      </Text>
                      <View style={styles.projectDetailsRow}>
                        <Ionicons name="person-outline" size={14} color="#8E8E93" />
                        <Text variant="bodySmall" style={styles.projectClient}>
                          {site.client_name || 'No client'}
                        </Text>
                      </View>
                      <View style={styles.projectDetailsRow}>
                        <Ionicons name="location-outline" size={14} color="#8E8E93" />
                        <Text variant="bodySmall" style={styles.projectLocation}>
                          {site.location || 'No location'}
                        </Text>
                      </View>
                    </View>
                    <Badge style={styles.activeStatusBadge}>Active</Badge>
                  </View>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Pending Tasks */}
      {pendingTasks.length > 0 && (
        <View style={styles.section}>
          <View style={[styles.sectionHeader, styles.cardSectionHeader]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="clipboard-outline" size={24} color="#FF6B35" />
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Upcoming Tasks
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Sites')}>
              <Text style={styles.viewAllText}>View All →</Text>
            </TouchableOpacity>
          </View>
          
          {pendingTasks.map((task) => {
            const priority = getTaskPriority(task.expected_date);
            return (
              <Card key={task.id} style={[styles.taskCard, styles.shadowCard]} mode="elevated">
                <Card.Content>
                  <View style={styles.taskRow}>
                    <View style={[styles.taskPriorityBar, { backgroundColor: getPriorityColor(priority) }]} />
                    <View style={styles.taskMainContent}>
                      <View style={styles.taskHeader}>
                        <Text variant="titleSmall" style={styles.taskTitle}>
                          {task.task_name}
                        </Text>
                        {priority === 'overdue' && (
                          <Badge style={styles.taskOverdueBadge}>Overdue</Badge>
                        )}
                      </View>
                      <View style={styles.taskMetaRow}>
                        <Ionicons name="flash-outline" size={14} color="#8E8E93" />
                        <Text variant="bodySmall" style={styles.taskSiteName}>
                          {(task as any).site?.name || 'Unknown Site'}
                        </Text>
                      </View>
                      {!!task.expected_date && (
                        <View style={styles.taskMetaRow}>
                          <Ionicons name="calendar-outline" size={14} color="#8E8E93" />
                          <Text variant="bodySmall" style={styles.taskDueDate}>
                            {new Date(task.expected_date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Card.Content>
              </Card>
            );
          })}
        </View>
      )}

      {/* My Tasks - Tasks assigned to current user */}
      {myTasks.length > 0 && (
        <View style={styles.section}>
          <View style={[styles.sectionHeader, styles.cardSectionHeader]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="checkmark-done" size={24} color="#059669" />
              <Text variant="titleLarge" style={styles.sectionTitle}>
                My Tasks
              </Text>
            </View>
            <Badge style={{ backgroundColor: '#059669' }}>{stats.myTasksCount}</Badge>
          </View>
          
          {myTasks.map((task) => {
            const priority = getTaskPriority(task.expected_date);
            return (
              <Card key={task.id} style={[styles.taskCard, styles.shadowCard]} mode="elevated">
                <Card.Content>
                  <View style={styles.taskRow}>
                    <View style={[styles.taskPriorityBar, { backgroundColor: '#059669' }]} />
                    <View style={styles.taskMainContent}>
                      <View style={styles.taskHeader}>
                        <Text variant="titleSmall" style={styles.taskTitle}>
                          {task.task_name}
                        </Text>
                        {priority === 'overdue' && (
                          <Badge style={styles.taskOverdueBadge}>Overdue</Badge>
                        )}
                      </View>
                      <View style={styles.taskMetaRow}>
                        <Ionicons name="flash-outline" size={14} color="#059669" />
                        <Text variant="bodySmall" style={{ ...styles.taskSiteName, color: '#059669' }}>
                          {(task as any).site?.name || 'Unknown Site'}
                        </Text>
                      </View>
                      {!!task.expected_date && (
                        <View style={styles.taskMetaRow}>
                          <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                          <Text variant="bodySmall" style={styles.taskDueDate}>
                            {new Date(task.expected_date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </Text>
                        </View>
                      )}
                      {!!task.status && (
                        <View style={styles.taskMetaRow}>
                          <Ionicons 
                            name={task.status === 'in_progress' ? 'play-circle-outline' : 'ellipse'} 
                            size={12} 
                            color={task.status === 'completed' ? '#10b981' : task.status === 'in_progress' ? '#3b82f6' : '#f59e0b'} 
                          />
                          <Text variant="bodySmall" style={{ marginLeft: 6, color: '#6B7280' }}>
                            {task.status === 'in_progress' ? 'In Progress' : task.status === 'completed' ? 'Completed' : 'Pending'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Card.Content>
              </Card>
            );
          })}
        </View>
      )}

      {/* Low Stock Alert */}
      {lowStockMaterials.length > 0 && (
        <View style={[styles.section, styles.lastSection]}>
          <View style={[styles.sectionHeader, styles.cardSectionHeader]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="alert-circle" size={24} color="#FF9500" />
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Inventory Alert
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Stock')}>
              <Text style={styles.viewAllText}>View All →</Text>
            </TouchableOpacity>
          </View>
          
          {lowStockMaterials.slice(0, 3).map((material) => (
            <Card key={material.id} style={[styles.inventoryCard, styles.shadowCard]} mode="elevated">
              <Card.Content>
                <View style={styles.inventoryRow}>
                  <View style={styles.inventoryIconContainer}>
                    <Ionicons 
                      name="hardware-chip" 
                      size={26} 
                      color={material.current_stock === 0 ? '#FF3B30' : '#FF9500'} 
                    />
                  </View>
                  <View style={styles.inventoryInfo}>
                    <Text variant="titleSmall" style={styles.inventoryName}>
                      {material.name}
                    </Text>
                    <View style={styles.stockRow}>
                      <View style={[
                        styles.stockIndicator,
                        { backgroundColor: material.current_stock === 0 ? '#FF3B30' : '#FF9500' }
                      ]} />
                      <Text variant="bodySmall" style={styles.inventoryStock}>
                        {material.current_stock} {material.unit} remaining
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.inventoryAddButton}
                    onPress={() => navigation.navigate('Purchase', { materialId: material.id })}
                  >
                    <Ionicons name="add-circle" size={36} color="#34C759" />
                  </TouchableOpacity>
                </View>
              </Card.Content>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    backgroundColor: '#1C1C1E',
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  headerText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  subHeader: {
    color: '#FF6B35',
    marginTop: 4,
    fontWeight: '500',
  },
  statsContainer: {
    padding: 16,
    marginTop: -15,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 16,
    overflow: 'hidden',
  },
  shadowCard: {
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    ...(Platform.OS === 'web' && {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      elevation: 0,
    }),
  },
  statGradient: {
    padding: 16,
    borderRadius: 16,
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statTextContainer: {
    alignItems: 'flex-start',
  },
  statValue: {
    color: 'white',
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    color: 'white',
    opacity: 0.95,
    fontSize: 13,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionSpacer: {
    height: 20,
  },
  lastSection: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardSectionHeader: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickAccessHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#1C1C1E',
  },
  viewAllText: {
    color: '#FF6B35',
    fontWeight: '600',
    fontSize: 15,
  },
  modulesContainer: {
    gap: 10,
  },
  moduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 2,
  },
  moduleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
  },
  moduleIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleTextContainer: {
    flex: 1,
  },
  moduleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  moduleTitle: {
    fontWeight: '600',
    color: '#1C1C1E',
  },
  moduleBadge: {
    height: 22,
  },
  moduleDescription: {
    color: '#8E8E93',
    fontSize: 13,
  },
  projectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 10,
  },
  projectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  projectIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  projectDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  projectClient: {
    color: '#8E8E93',
    fontSize: 13,
  },
  projectLocation: {
    color: '#8E8E93',
    fontSize: 13,
  },
  activeStatusBadge: {
    backgroundColor: '#34C759',
    fontSize: 12,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 10,
  },
  taskRow: {
    flexDirection: 'row',
    gap: 12,
  },
  taskPriorityBar: {
    width: 4,
    borderRadius: 2,
    minHeight: 60,
  },
  taskMainContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskTitle: {
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  taskOverdueBadge: {
    backgroundColor: '#FF3B30',
    fontSize: 11,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  taskSiteName: {
    color: '#8E8E93',
    fontSize: 13,
  },
  taskDueDate: {
    color: '#8E8E93',
    fontSize: 12,
  },
  inventoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 10,
  },
  inventoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  inventoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inventoryInfo: {
    flex: 1,
  },
  inventoryName: {
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stockIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inventoryStock: {
    color: '#8E8E93',
    fontSize: 13,
  },
  inventoryAddButton: {
    padding: 4,
  },
});

export default HomeScreen;