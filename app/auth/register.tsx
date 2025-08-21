import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Phone, MessageSquare, Eye, EyeOff, ArrowRight, LogIn, User, Mail, Lock, CircleCheck as CheckCircle } from 'lucide-react-native';

interface RegisterFormData {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  otp: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  password?: string;
  confirmPassword?: string;
  otp?: string;
  general?: string;
}

export default function RegisterScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState<RegisterFormData>({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    otp: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showOtp, setShowOtp] = useState(false);

  // Timer for OTP resend
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  // Validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^9\d{8,9}$/;
    return phoneRegex.test(phone);
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const validateOtp = (otp: string): boolean => {
    return otp.length === 6 && /^\d{6}$/.test(otp);
  };

  // Handle input changes
  const handleInputChange = (field: keyof RegisterFormData, value: string) => {
    if (field === 'phoneNumber') {
      // Remove any non-digit characters and limit length
      const cleanValue = value.replace(/\D/g, '');
      if (cleanValue.length <= 10) {
        setFormData(prev => ({ ...prev, [field]: cleanValue }));
      }
    } else if (field === 'otp') {
      // Only allow digits and limit to 6 characters
      const cleanValue = value.replace(/\D/g, '').slice(0, 6);
      setFormData(prev => ({ ...prev, [field]: cleanValue }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }

    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Send OTP
  const handleSendOtp = async () => {
    // Validate required fields first
    const newErrors: FormErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!validatePhoneNumber(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid Myanmar phone number (9 digits)';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call to send OTP
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In real implementation, make API call here
      // const response = await sendRegistrationOtpApi(`+95${formData.phoneNumber}`, formData.email);
      
      setIsOtpSent(true);
      setOtpTimer(60); // 60 seconds timer
      Alert.alert(
        'OTP Sent',
        `Verification code has been sent to +95 ${formData.phoneNumber}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        general: 'Failed to send OTP. Please try again.',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission
  const handleRegister = async () => {
    const newErrors: FormErrors = {};

    // Validate all fields
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!validatePhoneNumber(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid Myanmar phone number';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!validatePassword(formData.password)) {
      newErrors.password = 'Password must be at least 6 characters long';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (!formData.otp) {
      newErrors.otp = 'OTP is required';
    } else if (!validateOtp(formData.otp)) {
      newErrors.otp = 'Please enter a valid 6-digit OTP';
    }

    // Check if OTP was sent
    if (!isOtpSent) {
      newErrors.otp = 'Please request OTP first';
    }

    setErrors(newErrors);

    // If there are errors, don't proceed
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call for registration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In real implementation, register user with backend
      // const response = await registerUserApi({
      //   fullName: formData.fullName,
      //   email: formData.email,
      //   phoneNumber: `+95${formData.phoneNumber}`,
      //   password: formData.password,
      //   otp: formData.otp
      // });
      
      // Simulate successful registration
      if (formData.otp === '123456') { // Demo OTP
        Alert.alert(
          'Registration Successful',
          'Your account has been created successfully! Welcome to White Heart Driver.',
          [
            {
              text: 'Continue',
              onPress: () => {
                // Navigate to main app (orders list)
                router.replace('/(tabs)/');
              },
            },
          ]
        );
      } else {
        setErrors(prev => ({
          ...prev,
          otp: 'Invalid OTP. Please try again.',
        }));
      }
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        general: 'Registration failed. Please try again.',
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to login
  const handleNavigateToLogin = () => {
    router.push('/auth/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join White Heart Driver today</Text>
          </View>

          {/* Registration Form */}
          <View style={styles.form}>
            {/* Full Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputContainer}>
                <User size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={[
                    styles.textInput,
                    errors.fullName && styles.inputError,
                  ]}
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChangeText={(text) => handleInputChange('fullName', text)}
                  autoComplete="name"
                  accessibilityLabel="Full name input"
                />
              </View>
              {errors.fullName && (
                <Text style={styles.errorText}>{errors.fullName}</Text>
              )}
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Mail size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={[
                    styles.textInput,
                    errors.email && styles.inputError,
                  ]}
                  placeholder="Enter your email"
                  value={formData.email}
                  onChangeText={(text) => handleInputChange('email', text)}
                  keyboardType="email-address"
                  autoComplete="email"
                  autoCapitalize="none"
                  accessibilityLabel="Email input"
                />
              </View>
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            {/* Phone Number Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.phoneInputContainer}>
                <View style={styles.countryCode}>
                  <Phone size={20} color="#6B7280" />
                  <Text style={styles.countryCodeText}>+95</Text>
                </View>
                <TextInput
                  style={[
                    styles.phoneInput,
                    errors.phoneNumber && styles.inputError,
                  ]}
                  placeholder="9 123 456 789"
                  value={formData.phoneNumber}
                  onChangeText={(text) => handleInputChange('phoneNumber', text)}
                  keyboardType="phone-pad"
                  maxLength={10}
                  autoComplete="tel"
                  accessibilityLabel="Phone number input"
                />
              </View>
              {errors.phoneNumber && (
                <Text style={styles.errorText}>{errors.phoneNumber}</Text>
              )}
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <Lock size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={[
                    styles.textInput,
                    errors.password && styles.inputError,
                  ]}
                  placeholder="Create a password"
                  value={formData.password}
                  onChangeText={(text) => handleInputChange('password', text)}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  accessibilityLabel="Password input"
                />
                <TouchableOpacity
                  style={styles.eyeToggle}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#6B7280" />
                  ) : (
                    <Eye size={20} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputContainer}>
                <CheckCircle size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={[
                    styles.textInput,
                    errors.confirmPassword && styles.inputError,
                  ]}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChangeText={(text) => handleInputChange('confirmPassword', text)}
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="new-password"
                  accessibilityLabel="Confirm password input"
                />
                <TouchableOpacity
                  style={styles.eyeToggle}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="#6B7280" />
                  ) : (
                    <Eye size={20} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Text style={styles.errorText}>{errors.confirmPassword}</Text>
              )}
            </View>

            {/* OTP Input */}
            <View style={styles.inputGroup}>
              <View style={styles.otpHeader}>
                <Text style={styles.label}>Verification Code</Text>
                <TouchableOpacity
                  style={[
                    styles.otpButton,
                    (isLoading || otpTimer > 0) && styles.otpButtonDisabled,
                  ]}
                  onPress={handleSendOtp}
                  disabled={isLoading || otpTimer > 0}
                >
                  <MessageSquare size={16} color="white" />
                  <Text style={styles.otpButtonText}>
                    {otpTimer > 0 ? `Resend (${otpTimer}s)` : 'Get OTP'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.otpInputContainer}>
                <TextInput
                  style={[
                    styles.otpInput,
                    errors.otp && styles.inputError,
                  ]}
                  placeholder="Enter 6-digit code"
                  value={formData.otp}
                  onChangeText={(text) => handleInputChange('otp', text)}
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry={!showOtp}
                  autoComplete="one-time-code"
                  accessibilityLabel="OTP input"
                />
                <TouchableOpacity
                  style={styles.otpToggle}
                  onPress={() => setShowOtp(!showOtp)}
                >
                  {showOtp ? (
                    <EyeOff size={20} color="#6B7280" />
                  ) : (
                    <Eye size={20} color="#6B7280" />
                  )}
                </TouchableOpacity>
              </View>
              
              {errors.otp && (
                <Text style={styles.errorText}>{errors.otp}</Text>
              )}
              
              {isOtpSent && !errors.otp && (
                <Text style={styles.successText}>
                  OTP sent to +95 {formData.phoneNumber}
                </Text>
              )}
            </View>

            {/* General Error */}
            {errors.general && (
              <Text style={styles.generalError}>{errors.general}</Text>
            )}

            {/* Register Button */}
            <TouchableOpacity
              style={[
                styles.registerButton,
                isLoading && styles.registerButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={isLoading}
              accessibilityLabel="Register button"
              accessibilityRole="button"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Text style={styles.registerButtonText}>Register</Text>
                  <ArrowRight size={20} color="white" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Login Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={handleNavigateToLogin}>
              <View style={styles.loginLink}>
                <LogIn size={16} color="#3B82F6" />
                <Text style={styles.loginLinkText}>Login here</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Demo Instructions */}
          <View style={styles.demoInstructions}>
            <Text style={styles.demoTitle}>Demo Instructions:</Text>
            <Text style={styles.demoText}>• Fill all fields with valid information</Text>
            <Text style={styles.demoText}>• Use OTP: 123456 for demo registration</Text>
            <Text style={styles.demoText}>• Password must be at least 6 characters</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  inputIcon: {
    marginLeft: 16,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  eyeToggle: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    gap: 8,
  },
  countryCodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  otpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  otpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  otpButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  otpButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  otpInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
  },
  otpInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1F2937',
    letterSpacing: 2,
  },
  otpToggle: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginTop: 4,
  },
  successText: {
    fontSize: 14,
    color: '#10B981',
    marginTop: 4,
  },
  generalError: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  registerButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  footerText: {
    fontSize: 16,
    color: '#6B7280',
  },
  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  loginLinkText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  demoInstructions: {
    backgroundColor: '#D1FAE5',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  demoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 8,
  },
  demoText: {
    fontSize: 14,
    color: '#065F46',
    marginBottom: 4,
  },
});