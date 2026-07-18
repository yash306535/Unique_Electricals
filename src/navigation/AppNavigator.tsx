import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

// Screens
import AddMaterialScreen from '../screens/AddMaterialScreen';
import AddSiteScreen from '../screens/AddSiteScreen';
import AddUserScreen from '../screens/AddUserScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import GSTScreen from '../screens/GSTScreen';
import HomeScreen from '../screens/HomeScreen';
import ITRScreen from '../screens/ITRScreen';
import MaterialIssueScreen from '../screens/MaterialIssueScreen';
import MyTasksScreen from '../screens/MyTasksScreen';
import PurchaseHistoryScreen from '../screens/PurchaseHistoryScreen';
import PurchaseScreen from '../screens/PurchaseScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SiteDetailsScreen from '../screens/SiteDetailsScreen';
import SiteDocumentationScreen from '../screens/SiteDocumentationScreen';
import SitesScreen from '../screens/SitesScreen';
import SiteTasksScreen from '../screens/SiteTasksScreen';
import SubtaskManager from '../screens/SubtaskManager';
import StockScreen from '../screens/StockScreen';
import UserManagementScreen from '../screens/UserManagementScreen';
import WorkTypesScreen from '../screens/WorkTypesScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'MyTasks') {
            iconName = focused ? 'checkbox' : 'checkbox-outline';
          } else if (route.name === 'Sites') {
            iconName = focused ? 'business' : 'business-outline';
          } else if (route.name === 'Stock') {
            iconName = focused ? 'cube' : 'cube-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#2089dc',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen 
        name="MyTasks" 
        component={MyTasksScreen}
        options={{ title: 'My Tasks' }}
      />
      <Tab.Screen name="Sites" component={SitesScreen} />
      <Tab.Screen name="Stock" component={StockScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddSite"
          component={AddSiteScreen}
          options={{ title: 'Add Site' }}
        />
        <Stack.Screen
          name="SiteDetails"
          component={SiteDetailsScreen}
          options={{ title: 'Site Details' }}
        />
        <Stack.Screen
          name="Expenses"
          component={ExpensesScreen}
          options={{ title: 'Expenses' }}
        />
        <Stack.Screen
          name="MaterialIssue"
          component={MaterialIssueScreen}
          options={{ title: 'Issue Material' }}
        />
        <Stack.Screen
          name="SiteTasks"
          component={SiteTasksScreen}
          options={{ title: 'Site Tasks' }}
        />
        <Stack.Screen
          name="SubtaskManager"
          component={SubtaskManager}
          options={{ title: 'Manage Subtasks' }}
        />
        <Stack.Screen
          name="AddMaterial"
          component={AddMaterialScreen}
          options={{ title: 'Add Material' }}
        />
        <Stack.Screen
          name="Purchase"
          component={PurchaseScreen}
          options={{ title: 'Add Purchase' }}
        />
        <Stack.Screen
          name="PurchaseHistory"
          component={PurchaseHistoryScreen}
          options={{ title: 'Purchase History' }}
        />
        <Stack.Screen
          name="GST"
          component={GSTScreen}
          options={{ title: 'GST Tracking' }}
        />
        <Stack.Screen
          name="ITR"
          component={ITRScreen}
          options={{ title: 'ITR Summary' }}
        />
        <Stack.Screen
          name="WorkTypes"
          component={WorkTypesScreen}
          options={{ title: 'Work Types' }}
        />
        <Stack.Screen
          name="SiteDocumentation"
          component={SiteDocumentationScreen}
          options={{ title: 'Documentation Tracking' }}
        />
        <Stack.Screen
          name="UserManagement"
          component={UserManagementScreen}
          options={{ title: 'User Management' }}
        />
        <Stack.Screen
          name="AddUser"
          component={AddUserScreen}
          options={{ title: 'Add User' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}