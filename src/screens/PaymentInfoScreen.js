import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  SafeAreaView,
  Image,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { supabase } from '../utils/supabase';
import PersistentHeader from '../components/PersistentHeader';
import * as Haptics from 'expo-haptics';
import CardLogo from '../../assets/card.png';
import PaypalLogo from '../../assets/paypal.png';
import AppleLogo from '../../assets/apple.png';

export default function PaymentInfoScreen({ navigation, route }) {
  const [user, setUser] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState({
    type: 'card',
    name: '',
    last4: '',
    brand: '',
    isDefault: false,
  });

  useEffect(() => {
    checkUserAndLoadPaymentMethods();
  }, []);

  const checkUserAndLoadPaymentMethods = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await loadPaymentMethods(session.user.id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setLoading(false);
    }
  };

  const loadPaymentMethods = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error loading payment methods:', error);
      Alert.alert('Error', 'Failed to load payment methods');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (user) {
      await loadPaymentMethods(user.id);
    }
  };

  const addPaymentMethod = async () => {
    if (!newPaymentMethod.name.trim()) {
      Alert.alert('Error', 'Please enter a name for this payment method');
      return;
    }

    try {
      setLoading(true);
      
      // If this is set as default, unset other defaults first
      if (newPaymentMethod.isDefault) {
        await supabase
          .from('payment_methods')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { data, error } = await supabase
        .from('payment_methods')
        .insert({
          user_id: user.id,
          type: newPaymentMethod.type,
          name: newPaymentMethod.name,
          last4: newPaymentMethod.last4,
          brand: newPaymentMethod.brand,
          is_default: newPaymentMethod.isDefault,
        })
        .select()
        .single();

      if (error) throw error;

      setPaymentMethods(prev => [data, ...prev]);
      setAddModalVisible(false);
      setNewPaymentMethod({
        type: 'card',
        name: '',
        last4: '',
        brand: '',
        isDefault: false,
      });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Payment method added successfully');
    } catch (error) {
      console.error('Error adding payment method:', error);
      Alert.alert('Error', 'Failed to add payment method');
    } finally {
      setLoading(false);
    }
  };

  const setDefaultPaymentMethod = async (paymentMethodId) => {
    try {
      setLoading(true);
      
      // Unset all other defaults
      await supabase
        .from('payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Set this one as default
      await supabase
        .from('payment_methods')
        .update({ is_default: true })
        .eq('id', paymentMethodId);

      // Reload payment methods
      await loadPaymentMethods(user.id);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error setting default payment method:', error);
      Alert.alert('Error', 'Failed to set default payment method');
    } finally {
      setLoading(false);
    }
  };

  const deletePaymentMethod = async (paymentMethodId) => {
    Alert.alert(
      'Delete Payment Method',
      'Are you sure you want to delete this payment method?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('payment_methods')
                .delete()
                .eq('id', paymentMethodId);

              if (error) throw error;

              setPaymentMethods(prev => prev.filter(pm => pm.id !== paymentMethodId));
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error) {
              console.error('Error deleting payment method:', error);
              Alert.alert('Error', 'Failed to delete payment method');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const getPaymentMethodIcon = (type) => {
    switch (type) {
      case 'card':
        return CardLogo;
      case 'paypal':
        return PaypalLogo;
      case 'apple_pay':
        return AppleLogo;
      default:
        return CardLogo;
    }
  };

  const getPaymentMethodDisplayName = (paymentMethod) => {
    switch (paymentMethod.type) {
      case 'card':
        return `${paymentMethod.brand || 'Card'} •••• ${paymentMethod.last4}`;
      case 'paypal':
        return 'PayPal';
      case 'apple_pay':
        return 'Apple Pay';
      default:
        return paymentMethod.name;
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <PersistentHeader navigation={navigation} title="Payment Info" route={route} />
        <View style={styles.centerContent}>
          <Text style={styles.loginMessage}>Please log in to manage your payment methods</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login', { returnScreen: 'PaymentInfo' })}
          >
            <Text style={styles.loginButtonText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- COMING SOON SCREEN ---
  return (
    <SafeAreaView style={styles.container}>
      <PersistentHeader navigation={navigation} title="Payment Info" route={route} />
      <View style={styles.comingSoonContainer}>
        <Text style={styles.comingSoonIcon}>💳</Text>
        <Text style={styles.comingSoonTitle}>Payment Methods</Text>
        <Text style={styles.comingSoonText}>
          Managing your saved payment methods is coming soon!
        </Text>
        <Text style={styles.comingSoonSubtext}>
          You'll be able to add, remove, and set default cards and wallets in a future update.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f6f3',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginMessage: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  loginButton: {
    backgroundColor: '#a0b796',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2c1810',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  paymentMethodsList: {
    marginBottom: 24,
  },
  paymentMethodCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentMethodIcon: {
    width: 32,
    height: 24,
    marginRight: 12,
    resizeMode: 'contain',
  },
  paymentMethodDetails: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c1810',
    marginBottom: 4,
  },
  paymentMethodLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  defaultBadge: {
    fontSize: 12,
    color: '#a0b796',
    fontWeight: '600',
    backgroundColor: '#f0f8f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  paymentMethodActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#ffe6e6',
  },
  deleteButtonText: {
    color: '#d32f2f',
  },
  addButton: {
    backgroundColor: '#a0b796',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#6b4a3e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 16,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    paddingBottom: 50,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    minHeight: 400,
    borderWidth: 2,
    borderColor: '#a0b796',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c1810',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c1810',
    marginBottom: 8,
    textAlign: 'center',
    width: '100%',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  typeButtonSelected: {
    borderColor: '#a0b796',
    backgroundColor: '#f0f8f0',
  },
  typeIcon: {
    width: 20,
    height: 16,
    marginRight: 8,
    resizeMode: 'contain',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c1810',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#2c1810',
    backgroundColor: '#fff',
    width: '100%',
    textAlign: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    justifyContent: 'center',
    width: '100%',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#a0b796',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    width: 12,
    height: 12,
    backgroundColor: '#a0b796',
    borderRadius: 2,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#2c1810',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#a0b796',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  modalScrollView: {
    maxHeight: '100%',
  },
  modalScrollContent: {
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f8f6f3',
  },
  comingSoonIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  comingSoonTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2c1810',
    marginBottom: 12,
  },
  comingSoonText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  comingSoonSubtext: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
  },
}); 