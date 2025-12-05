import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { useAuthModal, useAuthStore } from '@/utils/auth/store';
import { useAuth } from '@/utils/auth/useAuth';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import Logo from '../../assets/images/logo.svg';

const colors = {
  background: "#FFFFFF",
  foreground: "#0A0A0A",
  gray: "#666666",
  lightGray: "#F8F8F8",
  border: "#E5E5E5",
};

export const AuthModal = () => {
  const { isOpen, mode, close } = useAuthModal();
  const { auth } = useAuthStore();
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const insets = useSafeAreaInsets();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [localMode, setLocalMode] = useState(mode);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Update local mode when modal mode changes
  React.useEffect(() => {
    setLocalMode(mode);
    setError('');
    setEmail('');
    setPassword('');
    setFullName('');
  }, [mode, isOpen]);

  if (!fontsLoaded) {
    return null;
  }

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (localMode === 'signup' && !fullName.trim()) {
      setError('Please enter your full name');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (localMode === 'signup') {
        const result = await signUpWithEmail(email, password, fullName);
        if (result?.requiresConfirmation) {
          Alert.alert(
            'Check Your Email',
            'We sent you a confirmation email. Please verify your email before signing in.',
            [{ text: 'OK', onPress: () => close() }]
          );
        }
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setLocalMode(localMode === 'signin' ? 'signup' : 'signin');
    setError('');
    setPassword('');
    if (localMode === 'signin') {
      setFullName('');
    }
  };

  return (
    <Modal
      visible={isOpen && !auth}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={close}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + 20,
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 40,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Close Button */}
          <View style={{ alignItems: 'flex-end', marginBottom: 16 }}>
            <TouchableOpacity onPress={close}>
              <X size={24} color={colors.foreground} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <Logo width={180} height={45} />
          </View>

          {/* Header */}
          <Text
            style={{
              fontFamily: 'Inter_700Bold',
              fontSize: 28,
              color: colors.foreground,
              letterSpacing: -1,
              marginBottom: 24,
            }}
          >
            {localMode === 'signin' ? 'Sign In' : 'Create Account'}
          </Text>

          {/* Error Message */}
          {error ? (
            <View
              style={{
                backgroundColor: '#FEE2E2',
                borderWidth: 1,
                borderColor: '#EF4444',
                borderRadius: 8,
                padding: 12,
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_500Medium',
                  fontSize: 14,
                  color: '#EF4444',
                }}
              >
                {error}
              </Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={{ gap: 20 }}>
            {localMode === 'signup' && (
              <View>
                <Text
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 14,
                    color: colors.foreground,
                    marginBottom: 8,
                  }}
                >
                  Full Name
                </Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.gray}
                  autoCapitalize="words"
                  style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: 15,
                    color: colors.foreground,
                    backgroundColor: colors.lightGray,
                    borderRadius: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                />
              </View>
            )}

            <View>
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 14,
                  color: colors.foreground,
                  marginBottom: 8,
                }}
              >
                Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor={colors.gray}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 15,
                  color: colors.foreground,
                  backgroundColor: colors.lightGray,
                  borderRadius: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              />
            </View>

            <View>
              <Text
                style={{
                  fontFamily: 'Inter_600SemiBold',
                  fontSize: 14,
                  color: colors.foreground,
                  marginBottom: 8,
                }}
              >
                Password
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={colors.gray}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={localMode === 'signin' ? 'password' : 'password-new'}
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 15,
                  color: colors.foreground,
                  backgroundColor: colors.lightGray,
                  borderRadius: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              />
            </View>

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              style={{
                backgroundColor: colors.foreground,
                borderRadius: 8,
                paddingVertical: 16,
                alignItems: 'center',
                marginTop: 8,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 15,
                    color: colors.background,
                  }}
                >
                  {localMode === 'signin' ? 'Sign In' : 'Sign Up'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Toggle Mode */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 4,
                marginTop: 12,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Inter_400Regular',
                  fontSize: 14,
                  color: colors.gray,
                }}
              >
                {localMode === 'signin'
                  ? "Don't have an account? "
                  : 'Already have an account? '}
              </Text>
              <TouchableOpacity onPress={toggleMode}>
                <Text
                  style={{
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 14,
                    color: colors.foreground,
                    textDecorationLine: 'underline',
                  }}
                >
                  {localMode === 'signin' ? 'Sign Up' : 'Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default AuthModal;


