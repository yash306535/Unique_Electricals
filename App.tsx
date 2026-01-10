import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { PaperProvider } from 'react-native-paper';
import AppNavigator from './src/navigation/AppNavigator';
import CustomSplashScreen from './src/screens/SplashScreen';

export default function App() {
  const [showCustomSplash, setShowCustomSplash] = useState(true);

  const handleSplashFinish = () => {
    setShowCustomSplash(false);
  };

  if (showCustomSplash) {
    return (
      <>
        <StatusBar hidden={true} />
        <CustomSplashScreen onFinish={handleSplashFinish} />
      </>
    );
  }

  return (
    <PaperProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </PaperProvider>
  );
}