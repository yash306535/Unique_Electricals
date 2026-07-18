import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { PaperProvider } from 'react-native-paper';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import LoginScreen from './src/screens/LoginScreen';
import CustomSplashScreen from './src/screens/SplashScreen';

function MainApp() {
  const [showCustomSplash, setShowCustomSplash] = useState(true);
  const { user, isAuthenticated, hydrated, login } = useAuth();

  const handleSplashFinish = () => {
    setShowCustomSplash(false);
  };

  const handleLogin = (userData: any, isRoot: boolean) => {
    login(userData, isRoot);
  };

  if (showCustomSplash) {
    return (
      <>
        <StatusBar hidden={true} />
        <CustomSplashScreen onFinish={handleSplashFinish} />
      </>
    );
  }

  if (!hydrated) {
    return (
      <>
        <StatusBar hidden={true} />
      </>
    );
  }

  return (
    <PaperProvider>
      <StatusBar style="auto" />
      {isAuthenticated ? (
        <AppNavigator />
      ) : (
        <LoginScreen onLogin={handleLogin} />
      )}
    </PaperProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}