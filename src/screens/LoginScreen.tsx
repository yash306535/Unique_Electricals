import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, Surface, Text, TextInput } from 'react-native-paper';
import { supabase } from '../config/supabase';

interface LoginProps {
  onLogin: (user: any, isRoot: boolean) => void;
}

const LoginScreen = ({ onLogin }: LoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);

    try {
      // Check for root user credentials
      if (email === 'pravinrokade@gmail.com' && password === 'Unique@123') {
        // Root user login - no need to check with database
        onLogin({ email, role: 'root' }, true);
        return;
      }

      // Regular user login via Supabase.
      // Normalize the email exactly like AddUserScreen does on create
      // (lowercase + trim), otherwise a user created as "Foo@Gmail.com "
      // could never match.
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .eq('password', password)
        .maybeSingle();

      if (userError) {
        Alert.alert('Error', userError.message);
        return;
      }

      if (userData) {
        onLogin(userData, false);
      } else {
        Alert.alert('Error', 'Invalid email or password');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#1E40AF', '#3B82F6', '#60A5FA']}
        style={styles.gradient}
      >
        <Surface style={styles.loginContainer}>
          <View style={styles.logoContainer}>
            <Ionicons name="flash" size={80} color="#1E40AF" />
            <Text style={styles.logoText}>Unique Electricals</Text>
          </View>

          <Text style={styles.title}>Login</Text>

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            left={<TextInput.Icon icon="email" />}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            style={styles.input}
            secureTextEntry={secureTextEntry}
            right={
              <TextInput.Icon
                icon={secureTextEntry ? 'eye-off' : 'eye'}
                onPress={() => setSecureTextEntry(!secureTextEntry)}
              />
            }
            left={<TextInput.Icon icon="lock" />}
          />

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Login
          </Button>

          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2024 Unique Electricals</Text>
          </View>
        </Surface>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginContainer: {
    width: '100%',
    maxWidth: 500,
    padding: 20,
    borderRadius: 10,
    elevation: 5,
    alignItems: 'center',
    // Web compatibility
    ...(Platform.OS === 'web' && {
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      elevation: 0,
    }),
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    marginBottom: 15,
  },
  button: {
    width: '100%',
    marginTop: 10,
    borderRadius: 5,
    backgroundColor: '#1E40AF',
  },
  buttonContent: {
    height: 50,
  },
  footer: {
    marginTop: 30,
  },
  footerText: {
    color: '#666',
    textAlign: 'center',
  },
});

export default LoginScreen;
