import React, { useState, useContext, useEffect, useRef } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Button,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
  SafeAreaView,
  Modal,
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native'
import { supabase } from '../utils/supabase'
import { CartContext } from '../context/CartContext'
import { useStripe } from '@stripe/stripe-react-native';
import * as Haptics from 'expo-haptics';
import PickupMap from '../components/PickupMap';
import PaypalLogo from '../../assets/paypal.png';
import CardLogo from '../../assets/card.png';
import { WebView } from 'react-native-webview';
import PersistentHeader from '../components/PersistentHeader';

const { height: screenHeight } = Dimensions.get('window');

export default function OrderSummaryScreen({ route, navigation }) {
  // Add proper error handling for missing route parameters
  const routeParams = route?.params || {};
  const { 
    items: initialItems = [], 
    total: initialTotal = 0, 
    tax: initialTax = 0, 
    tip: initialTipValue = 0 
  } = routeParams;

  // Get cart items from context as fallback
  const { items: cartItems, clearCart } = useContext(CartContext);
  
  // Use route params if available, otherwise use cart context
  const items = initialItems.length > 0 ? initialItems : cartItems;
  const total = initialTotal > 0 ? initialTotal : cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = initialTax > 0 ? initialTax : total * 0.13;
  const tip = initialTipValue > 0 ? initialTipValue : 0;

  // Check if we have valid items, if not, redirect back to cart
  useEffect(() => {
    if (!items || items.length === 0) {
      Alert.alert(
        'No Items Found',
        'Your cart appears to be empty. Please add items to your cart first.',
        [
          {
            text: 'Go to Menu',
            onPress: () => navigation.navigate('Menu')
          },
          {
            text: 'Go to Cart',
            onPress: () => navigation.navigate('Cart')
          }
        ]
      );
    }
  }, [items, navigation]);

  // Don't render the main content if there are no items
  if (!items || items.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <PersistentHeader navigation={navigation} title="Order Summary" route={route} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, color: '#666', textAlign: 'center', marginBottom: 20 }}>
            No items found in your order.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#a0b796',
              paddingVertical: 12,
              paddingHorizontal: 24,
              borderRadius: 8,
            }}
            onPress={() => navigation.navigate('Menu')}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              Go to Menu
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  console.log("items", items);
  console.log("items length:", items?.length);
  console.log("items type:", typeof items);
  console.log("items is array:", Array.isArray(items));
  const scrollViewRef = useRef(null);
  const addressInputRef = useRef(null);
  const [deliverySectionY, setDeliverySectionY] = useState(0);

  const stripe = useStripe();
  console.log('🔍 useStripe object:', stripe);

  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState('');
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [paymentSheetReady, setPaymentSheetReady] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [backendTotal, setBackendTotal] = useState(null); // Store backend total for payment

  const [paymentMethod, setPaymentMethod] = useState(null); // 'card' | 'cash'
  const {
    isPlatformPaySupported
  } = useStripe();

  const [paypalUrl, setPaypalUrl] = useState(null);
  const [paypalVisible, setPaypalVisible] = useState(false);
  const [cashModalVisible, setCashModalVisible] = useState(false);
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactFormErrors, setContactFormErrors] = useState({});
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState(null);

  // Calculate responsive height for order list
  const orderListHeight = Math.min(Math.max(screenHeight * 0.25, 150), 300);

  // Debug Apple Pay support
  useEffect(() => {
    console.log('🍎 Apple Pay supported:', isPlatformPaySupported);
  }, [isPlatformPaySupported]);

  // ETA fallback values
  const DEFAULT_PICKUP_ETA_MINUTES = 15;
  const DEFAULT_DELIVERY_ETA_MINUTES = 30;

  // Helper to get ETA in minutes
  const getEtaMinutes = () => {
    // TODO: If you have location, calculate ETA here
    return method === 'pickup' ? DEFAULT_PICKUP_ETA_MINUTES : DEFAULT_DELIVERY_ETA_MINUTES;
  };

  // Fetch user data and prefill fields if logged in
  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        setUser(currentUser);
        
        // Fetch profile data
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (!error && profileData) {
          setUserProfile(profileData);
          // Prefill name
          if (profileData.full_name) {
            setCustomerName(profileData.full_name);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  // Prefill address when delivery method is selected
  const handleMethodChange = (selectedMethod) => {
    setMethod(selectedMethod);
    if (selectedMethod === 'delivery' && userProfile?.address) {
      setAddress(userProfile.address);
    }
  };

  const handlePayment = async () => {
    if (!customerName.trim()) return Alert.alert('Please enter your name.')
    if (!address.trim() || !paymentMethod || !method) {
      return Alert.alert('Please enter your address, payment method, and delivery/pickup.')
    }

    setLoading(true)

    const etaMinutes = getEtaMinutes();
    const rows = items.map((item, index) => ({
      drink_id:     item.drink_id,
      drink_name:   item.name,
      sugar:        item.sugar,
      milk:         item.milkType,
      price:        item.price,
      quantity:     item.quantity,
      totalAmount:  item.price * item.quantity,
      location:     address,
      delivered:    index === 0 ? 'f' : null,  // only first item gets 'f'
      ready:        index === 0 ? 'f' : null,  // only first item gets 'f'
      name:         customerName,
      user_id:      user?.id || null,
      method:       method,
      paymentMethod: paymentMethod,
      tax:           index === 0 ? tax : null,
      tip:           index === 0 ? tip : null,
      eta:           index === 0 ? etaMinutes : null, // Only set on first row
      order_time:    orderTime,
    }))

    const { data, error } = await supabase
      .from('Orders')
      .insert(rows)
      .select('id')

    setLoading(false)

    if (error) {
      console.error('Supabase insert error:', error)
      return Alert.alert('Could not place order', error.message)
    }

    console.log('RAW ERROR →', JSON.stringify(error, null, 2));

    const orderId = data?.[0]?.id;

    clearCart()
    Alert.alert('Order placed!', 'Thank you for your purchase.')
    navigation.navigate('OrderStatus', { orderId })
  }

  const initializePaymentSheet = async () => {
    console.log('🚀 Starting payment sheet initialization...');
    setLoading(true);
    try {
      console.log('📡 Making network request to create payment intent...');
      console.log('🌐 URL: http://100.66.27.232:3001/api/payment/create-payment-intent');
      console.log('📦 Request payload:', {
        items: items,
        customerName,
        address,
        method,
        tax: tax,
        tip: tip
      });
      
      const response = await fetch('http://100.66.27.232:3001/api/payment/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items,
          customerName,
          address,
          method,
          tax: tax,
          tip: tip
        }),
      });
      
      console.log('📥 Response status:', response.status);
      console.log('📥 Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ HTTP error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }
      
      const responseData = await response.json();
      console.log('✅ Payment intent response received:', responseData);
      
      const { clientSecret, amount } = responseData;
      if (amount) setBackendTotal(amount); // Store backend total
  
      if (!clientSecret) {
        console.error('❌ Missing clientSecret in response');
        throw new Error('Missing clientSecret in server response');
      }
  
      console.log('🔐 Client secret received, initializing Stripe payment sheet...');
      const paymentSheetConfig = {
        merchantDisplayName: 'Grab Coffee',
        paymentIntentClientSecret: clientSecret,
        applePay: {
          merchantCountryCode: 'CA',
          paymentSummaryItems: [
            {
              label: 'Grab Coffee',
              amount: backendTotal || total.toFixed(2),
            },
          ],
        },
        googlePay: {
          merchantCountryCode: 'CA',
          testEnv: true,
        },
        style: 'automatic',
        defaultBillingDetails: {
          name: customerName,
        },
        allowsDelayedPaymentMethods: true,
      };
      console.log('📱 Payment sheet config:', paymentSheetConfig);
      
      const { error } = await initPaymentSheet(paymentSheetConfig);
  
      if (error) {
        console.error('❌ Payment sheet init error:', error);
        throw error;
      }
  
      console.log('✅ Payment sheet initialized successfully');
      setClientSecret(clientSecret);
      setPaymentSheetReady(true);
    } catch (err) {
      console.error('💥 PaymentSheet init error:', err);
      console.error('💥 Error type:', typeof err);
      console.error('💥 Error message:', err.message);
      console.error('💥 Error stack:', err.stack);
      
      // Improved error message for network timeouts
      if (err.message && err.message.includes('timeout')) {
        Alert.alert(
          'Network Timeout', 
          'Could not reach the payment server.\n\n' +
          'Please check:\n' +
          '• Is your backend server running?\n' +
          '• Is the IP address correct?\n' +
          '• Are you on the same network?\n\n' +
          'Try accessing: http://100.66.27.232 in your browser.'
        );
      } else if (err.message && err.message.includes('Network request failed')) {
        Alert.alert(
          'Network Error', 
          'Cannot connect to payment server.\n\n' +
          'Please check your backend server and network connection.'
        );
      } else {
        Alert.alert('Payment Error', `Failed to initialize payment: ${err.message}`);
      }
      setPaymentSheetReady(false);
    } finally {
      console.log('🏁 Payment sheet initialization completed');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paymentMethod === 'card') {
      initializePaymentSheet();
    }
  }, [paymentMethod]);

  const scrollToInput = () => {
    if (scrollViewRef.current && deliverySectionY > 0) {
      // Scroll to show the delivery address section with some padding
      scrollViewRef.current.scrollTo({
        y: deliverySectionY - 50, // Reduced padding for less aggressive scrolling
        animated: true
      });
    }
  };

  const handleDeliverySectionLayout = (event) => {
    const { y } = event.nativeEvent.layout;
    setDeliverySectionY(y);
  };

  const handlePayPalPress = async () => {
    try {
      if (!backendTotal) {
        Alert.alert('Error', 'Order total not available.');
        return;
      }
      const res = await fetch('http://100.66.27.232:3001/api/payment/create-paypal-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: backendTotal }),
      });
      const data = await res.json();
      if (!data.approvalUrl) {
        Alert.alert('Error', 'Could not get PayPal approval URL.');
        return;
      }
      setPaypalUrl(data.approvalUrl);
      setPaypalVisible(true);
    } catch (err) {
      Alert.alert('PayPal Error', err.message);
    }
  };

  const handleCashPayment = () => {
    if (!customerName.trim() || !method || (method === 'delivery' && !address.trim())) {
      Alert.alert("Missing Info", "Please fill out all required fields.");
      return;
    }
    setCashModalVisible(true);
  };

  const confirmCashPayment = async () => {
    if (!policyAccepted) {
      Alert.alert("Policy Agreement Required", "Please read and accept the cash payment policy to continue.");
      return;
    }

    setLoading(true);
    try {
      // Create order in database (similar to handlePayment but for cash)
      const etaMinutes = getEtaMinutes();
      const rows = items.map((item, index) => ({
        drink_id: item.drink_id,
        drink_name: item.name,
        sugar: item.sugar,
        milk: item.milkType,
        price: item.price,
        quantity: item.quantity,
        totalAmount: item.price * item.quantity,
        location: method === 'delivery' ? address : 'Pickup',
        delivered: index === 0 ? 'f' : null,
        ready: index === 0 ? 'f' : null,
        name: customerName,
        user_id: null,
        method: method,
        paymentMethod: 'cash',
        tax: index === 0 ? tax : null,
        tip: index === 0 ? tip : null,
        eta: index === 0 ? etaMinutes : null,
        order_time: orderTime,
      }));

      const { data, error } = await supabase
        .from('Orders')
        .insert(rows)
        .select('id');

      if (error) {
        console.error('Supabase insert error:', error);
        Alert.alert('Could not place order', error.message);
        return;
      }

      const orderId = data?.[0]?.id;
      
      clearCart();
      setCashModalVisible(false);
      setPolicyAccepted(false);
      Alert.alert('Order placed!', 'Please have exact change ready for pickup/delivery.');
      navigation.navigate('OrderStatus', { orderId });
    } catch (err) {
      console.error('Cash payment error:', err);
      Alert.alert('Error', 'Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // --- Time Slot Generator and Validation Helper ---
  const generateTimeSlots = () => {
    const slots = [];
    const pad = (n) => n.toString().padStart(2, '0');
    const pushTime = (hour, minute) => {
      slots.push({ label: `${pad(hour)}:${pad(minute)}`, value: `${pad(hour)}:${pad(minute)}` });
    };
    for (let hour = 8; hour < 11; hour++) {
      for (let min = 0; min < 60; min += 15) pushTime(hour, min);
    }
    for (let hour = 13; hour < 18; hour++) {
      for (let min = 0; min < 60; min += 15) pushTime(hour, min);
    }
    return slots;
  };
  const timeSlots = generateTimeSlots();
  const isTimeValid = (timeStr) => {
    if (!timeStr) return false;
    const [hourStr] = timeStr.split(':');
    const hour = parseInt(hourStr, 10);
    return (hour >= 8 && hour < 11) || (hour >= 13 && hour < 18);
  };

  // --- Add state hooks for time picker ---
  const [wantsToSchedule, setWantsToSchedule] = useState(false);
  const [orderTime, setOrderTime] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Contact form validation
  const validateContactForm = () => {
    const errors = {};
    
    // Phone validation (required)
    if (!contactPhone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(contactPhone.trim())) {
      errors.phone = 'Please enter a valid phone number';
    }
    
    // Email validation (optional but must be valid if provided)
    if (contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    
    setContactFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle contact info submission
  const handleContactSubmit = async () => {
    if (!validateContactForm()) return;
    
    setIsSubmittingContact(true);
    try {
      // Store in no_profile table
      const { error } = await supabase
        .from('no_profile')
        .insert({
          name: customerName,
          address: method === 'delivery' ? address : 'Pickup',
          phone: contactPhone.trim(),
          email: contactEmail.trim() || null,
          order_id: null, // Will be updated after order creation
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error storing contact info:', error);
        Alert.alert('Error', 'Failed to save contact information. Please try again.');
        return;
      }

      setContactModalVisible(false);
      // Proceed with the pending payment method
      if (pendingPaymentMethod === 'card') {
        setPaymentMethod('card');
      } else if (pendingPaymentMethod === 'cash') {
        handleCashPayment();
      }
    } catch (err) {
      console.error('Contact submission error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmittingContact(false);
    }
  };

  // Handle payment method selection with contact check
  const handlePaymentMethodSelect = async (method) => {
    // Check if user is logged in and has profile
    if (user && userProfile) {
      // User is logged in with profile - proceed directly
      setPaymentMethod(method);
      return;
    }

    // For all other cases (not logged in or no profile), show contact modal
    setPendingPaymentMethod(method);
    setContactModalVisible(true);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <PersistentHeader navigation={navigation} title="Order Summary" route={route} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            {/* Header and Order List Section - Fixed Height, Scrollable */}
            <View style={[styles.orderListContainer, { height: orderListHeight }]}>
              <Text style={styles.heading}>Review Your Order</Text>

              <FlatList
                data={items || []}
                keyExtractor={(item, idx) => `${item?.id || idx}-${idx}`}
                renderItem={({ item, index }) => (
                  <View style={[
                    styles.row,
                    index === (items?.length - 1) && { borderBottomWidth: 0 }
                  ]}>
                    <Text style={styles.name}>
                      {item?.name || 'Unknown Item'} ×{item?.quantity || 0}
                    </Text>
                    <Text style={styles.price}>
                      ${((item?.price || 0) * (item?.quantity || 0)).toFixed(2)}
                    </Text>
                  </View>
                )}
                style={styles.list}
                scrollEnabled={true}
                showsVerticalScrollIndicator={true}
                ListEmptyComponent={() => (
                  <Text style={styles.emptyText}>No items in order</Text>
                )}
              />
            </View>

            {/* Rest of Content - Scrollable */}
            <ScrollView 
              ref={scrollViewRef}
              style={{ flex: 1 }}
              contentContainerStyle={[styles.contentContainer, { paddingBottom: 120 }]} 
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              keyboardDismissMode="interactive"
            >
              <View style={styles.breakdownContainer}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Subtotal</Text>
                  <Text style={styles.breakdownValue}>
                    ${(total - tax - tip).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Tax (HST)</Text>
                  <Text style={styles.breakdownValue}>${tax.toFixed(2)}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Tip</Text>
                  <Text style={styles.breakdownValue}>${tip.toFixed(2)}</Text>
                </View>
                <View style={styles.breakdownRowTotal}>
                  <Text style={styles.breakdownTotalLabel}>Total</Text>
                  <Text style={styles.breakdownTotalValue}>
                    ${backendTotal !== null ? backendTotal : total.toFixed(2)}
                  </Text>
                </View>
              </View>

              <Text style={styles.label}>Your Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                value={customerName}
                onChangeText={setCustomerName}
                editable={!loading}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  // Focus next input or dismiss keyboard
                  if (method === 'delivery') {
                    // Focus address input if delivery is selected
                    addressInputRef.current?.focus();
                  } else {
                    // Dismiss keyboard if pickup
                    Keyboard.dismiss();
                  }
                }}
              />
              {user && userProfile?.full_name && (
                <Text style={styles.prefilledNote}>
                  ✓ Filled from your profile
                </Text>
              )}

              {!user && (
                <TouchableOpacity
                  onPress={() => { Haptics.impactAsync(); navigation.navigate('Signup', { name: customerName, returnScreen: 'OrderSummary' }); }}
                >
                  <Text style={styles.signupLink}>
                    Want to make an account?
                  </Text>
                </TouchableOpacity>
              )}

              <Text style={styles.label}>Delivery or Pickup?</Text>
              {method === 'pickup' && (
                <>
                  <Text style={styles.note}>
                    Pickup location: Outside 10 Bellair Street
                  </Text>
                  <PickupMap />
                </>
              )}
              <View style={styles.methodRow}>
                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    method === 'pickup' && styles.methodSelected,
                  ]}
                  onPress={() => { if (!loading) { Haptics.impactAsync(); handleMethodChange('pickup'); } }}
                >
                  <Text
                    style={[
                      styles.methodText,
                      method === 'pickup' && styles.methodTextSelected,
                    ]}
                  >
                    Pickup
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    method === 'delivery' && styles.methodSelected,
                  ]}
                  onPress={() => { if (!loading) { Haptics.impactAsync(); handleMethodChange('delivery'); } }}
                >
                  <Text
                    style={[
                      styles.methodText,
                      method === 'delivery' && styles.methodTextSelected,
                    ]}
                  >
                    Delivery
                  </Text>
                </TouchableOpacity>
              </View>

              {method === 'delivery' && (
                <View onLayout={handleDeliverySectionLayout}>
                  <Text style={styles.label}>Delivery Address</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your address"
                    value={address}
                    onChangeText={setAddress}
                    onFocus={scrollToInput}
                    editable={!loading}
                    multiline={false}
                    returnKeyType="done"
                    ref={addressInputRef}
                    blurOnSubmit={true}
                    onSubmitEditing={() => {
                      Keyboard.dismiss();
                    }}
                  />
                  {user && userProfile?.address && address === userProfile.address && (
                    <Text style={styles.prefilledNote}>
                      ✓ Filled from your profile
                    </Text>
                  )}
                </View>
              )}

              {method && (
                <>
                  <Text style={styles.label}>Order Method</Text>
                  <View style={styles.methodRow}>
                    <TouchableOpacity
                      style={[styles.methodButton, !wantsToSchedule && styles.methodSelected]}
                      onPress={() => {
                        setWantsToSchedule(false);
                        setOrderTime(null);
                      }}
                    >
                      <Text style={[styles.methodText, !wantsToSchedule && styles.methodTextSelected]}>
                        Order Now
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.methodButton, wantsToSchedule && styles.methodSelected]}
                      onPress={() => setWantsToSchedule(true)}
                    >
                      <Text style={[styles.methodText, wantsToSchedule && styles.methodTextSelected]}>
                        Schedule Order
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {wantsToSchedule && (
                    <>
                      <Text style={styles.label}>Choose Pickup/Delivery Time</Text>
                      <TouchableOpacity onPress={() => setShowTimePicker(true)} style={styles.timeInput}>
                        <Text style={{ color: orderTime ? '#333' : '#999' }}>
                          {typeof orderTime === 'string' ? orderTime : 'Select time'}
                        </Text>
                      </TouchableOpacity>
                      {showTimePicker && (
                        <View style={styles.timeListWrapper}>
                          <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
                            {timeSlots.map(({ label, value }) => (
                              <TouchableOpacity
                                key={value}
                                onPress={() => {
                                  setOrderTime(value);
                                  setShowTimePicker(false);
                                }}
                                style={[
                                  styles.timeOption,
                                  orderTime === value && styles.timeOptionSelected,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.timeOptionText,
                                    orderTime === value && styles.timeOptionTextSelected,
                                  ]}
                                >
                                  {label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Only show Payment Method if method is selected */}
              {method !== '' && (
                <>
                  <Text style={styles.label}>Payment Method</Text>
                  <View style={styles.methodRow}>
                    <TouchableOpacity
                      style={[
                        styles.methodButton,
                        paymentMethod === 'card' && styles.methodSelected,
                      ]}
                      onPress={() => { if (!loading) { Haptics.impactAsync(); handlePaymentMethodSelect('card'); } }}
                    >
                      <Text
                        style={[
                          styles.methodText,
                          paymentMethod === 'card' && styles.methodTextSelected,
                        ]}
                      >
                        Pay by Card
                      </Text>
                    </TouchableOpacity>
                    {/* Only show Pay in Cash if method is pickup */}
                    {method === 'pickup' && (
                      <TouchableOpacity
                        style={[
                          styles.methodButton,
                          paymentMethod === 'cash' && styles.methodSelected,
                        ]}
                        onPress={() => { if (!loading) { Haptics.impactAsync(); handlePaymentMethodSelect('cash'); } }}
                      >
                        <Text
                          style={[
                            styles.methodText,
                            paymentMethod === 'cash' && styles.methodTextSelected,
                          ]}
                        >
                          Pay in Cash
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </>
              )}

              {/* Show payment options only if 'Pay by Card' is selected */}
              {paymentMethod === 'card' && (
                <View style={{ marginTop: 18 }}>
                  {/* Pay via Credit/Debit (includes Apple Pay) */}
                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      loading && styles.confirmDisabled,
                      {
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: '#fff',
                        borderWidth: 1,
                        borderColor: '#d1d8f6', // Softer light blue
                        marginBottom: 0,
                      },
                    ]}
                    onPress={async () => {
                      Haptics.impactAsync();
                      if (!customerName.trim() || !method || !paymentMethod || (method === 'delivery' && !address.trim())) {
                        Alert.alert("Missing Info", "Fill out all required fields.");
                        return;
                      }
                      if (paymentMethod === 'card') {
                        console.log('Presenting payment sheet with clientSecret:', clientSecret);
                        try {
                          const { error } = await presentPaymentSheet();
                          if (error) {
                            Alert.alert('Payment failed', error.message);
                          } else {
                            Alert.alert('Success', 'Your order is placed!');
                            clearCart();
                            navigation.navigate('OrderStatus', { orderId: clientSecret });
                          }
                        } catch (err) {
                          console.error('Payment sheet error:', err);
                          Alert.alert('Payment Error', 'Unable to process payment. Please try again.');
                        }
                      }
                    }}
                    disabled={
                      !customerName.trim() ||
                      !method ||
                      !paymentMethod ||
                      loading ||
                      (paymentMethod === 'card' && !paymentSheetReady) ||
                      (method === 'delivery' && !address.trim())
                    }
                  >
                    {/* Minimalistic card logo before text */}
                    <Image source={CardLogo} style={{ width: 26, height: 20, marginRight: 10, resizeMode: 'contain' }} />
                    <Text style={[styles.confirmText, { color: '#1a1f71' }]}>
                      {isPlatformPaySupported ? 'Pay with Card or Apple Pay' : 'Pay via Credit/Debit'}
                    </Text>
                  </TouchableOpacity>

                  {/* PayPal */}
                  <TouchableOpacity
                    style={[styles.confirmButton, {
                      backgroundColor: '#fff',
                      borderWidth: 1,
                      borderColor: '#d1d8f6', // Match credit/debit border
                      marginTop: 16,
                      flexDirection: 'row',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }]}
                    onPress={handlePayPalPress}
                    disabled={loading}
                  >
                    <Image source={PaypalLogo} style={{ width: 32, height: 20, marginRight: 10, resizeMode: 'contain' }} />
                    <Text style={[styles.confirmText, { color: '#003087' }]}>PayPal</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Show cash payment button if 'Pay in Cash' is selected */}
              {paymentMethod === 'cash' && (
                <View style={{ marginTop: 18 }}>
                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      loading && styles.confirmDisabled,
                      {
                        flexDirection: 'row',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: '#fff',
                        borderWidth: 1,
                        borderColor: '#d1d8f6',
                      },
                    ]}
                    onPress={handleCashPayment}
                    disabled={
                      !customerName.trim() ||
                      !method ||
                      loading ||
                      (method === 'delivery' && !address.trim())
                    }
                  >
                    <Text style={[styles.confirmText, { color: '#1a1f71' }]}>
                      Pay with Cash
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* PayPal WebView Modal */}
      <Modal
        visible={paypalVisible}
        animationType="slide"
        onRequestClose={() => setPaypalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
            <TouchableOpacity onPress={() => setPaypalVisible(false)}>
              <Text style={{ color: '#003087', fontSize: 16, fontWeight: '600' }}>← Close</Text>
            </TouchableOpacity>
            <Text style={{ fontWeight: '700', fontSize: 18, marginLeft: 16 }}>PayPal Checkout</Text>
          </View>
          <WebView
            source={{ uri: paypalUrl }}
            onNavigationStateChange={navState => {
              if (navState.url.includes('paypal-success')) {
                setPaypalVisible(false);
                Alert.alert('Success', 'PayPal payment approved! (Implement capture on backend)');
              }
              if (navState.url.includes('paypal-cancel')) {
                setPaypalVisible(false);
                Alert.alert('Payment Cancelled', 'You cancelled the PayPal payment.');
              }
            }}
            startInLoadingState
          />
        </SafeAreaView>
      </Modal>

      {/* Cash Payment Policy Modal */}
      <Modal
        visible={cashModalVisible}
        animationType="slide"
        onRequestClose={() => setCashModalVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' }}>
            <TouchableOpacity onPress={() => setCashModalVisible(false)}>
              <Text style={{ color: '#a0b796', fontSize: 16, fontWeight: '600' }}>← Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontWeight: '700', fontSize: 18, marginLeft: 16 }}>Cash Payment Policy</Text>
          </View>
          
          <ScrollView style={{ flex: 1, padding: 20 }}>
            <View style={styles.policyContainer}>
              <Text style={styles.policyTitle}>Cash Payment Agreement</Text>
              
              <Text style={styles.policySection}>Payment Process</Text>
              <Text style={styles.policyText}>
                • Pay the full amount in cash when your order arrives{'\n'}
                • Have exact change ready to speed up the transaction{'\n'}
                • No partial payments or promises to pay later
              </Text>

              <Text style={styles.policySection}>Important</Text>
              <Text style={styles.policyText}>
                • Confirm you have the full amount available{'\n'}
                • If you can't pay in full, inform staff immediately{'\n'}
                • Non-payment may result in order cancellation and future restrictions
              </Text>

              <View style={styles.totalContainer}>
                <Text style={styles.policySection}>Your Total</Text>
                <Text style={styles.policyTotal}>
                  ${backendTotal !== null ? backendTotal : total.toFixed(2)}
                </Text>
              </View>

              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={[styles.checkbox, policyAccepted && styles.checkboxChecked]}
                  onPress={() => setPolicyAccepted(!policyAccepted)}
                >
                  {policyAccepted && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
                <Text style={styles.checkboxText}>
                  I have read and agree to the cash payment policy above
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: '#e0e0e0' }}>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!policyAccepted || loading) && styles.confirmDisabled,
              ]}
              onPress={confirmCashPayment}
              disabled={!policyAccepted || loading}
            >
              <Text style={styles.confirmText}>
                {loading ? 'Processing...' : 'Confirm Cash Payment'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Contact Information Modal */}
      <Modal
        visible={contactModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setContactModalVisible(false)}
      >
        <View style={styles.contactOverlay}>
          <View style={styles.contactContent}>
            <Text style={styles.contactTitle}>Stay Updated</Text>
            
            <Text style={styles.contactText}>
              Provide your contact information to receive order tracking updates and receipts.
            </Text>

            <Text style={styles.contactNote}>
              If you already have an account, please{' '}
              <Text 
                style={styles.loginLink}
                onPress={() => {
                  setContactModalVisible(false);
                  navigation.navigate('Login', { returnScreen: 'OrderSummary' });
                }}
              >
                login here
              </Text>
              {' '}to continue.
            </Text>

            <Text style={styles.contactLabel}>Phone Number *</Text>
            <TextInput
              style={[styles.contactInput, contactFormErrors.phone && styles.contactInputError]}
              placeholder="Enter your phone number"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
              returnKeyType="next"
            />
            {contactFormErrors.phone && (
              <Text style={styles.errorText}>{contactFormErrors.phone}</Text>
            )}

            <Text style={styles.contactLabel}>Email Address (Optional)</Text>
            <TextInput
              style={[styles.contactInput, contactFormErrors.email && styles.contactInputError]}
              placeholder="Enter your email address"
              value={contactEmail}
              onChangeText={setContactEmail}
              keyboardType="email-address"
              returnKeyType="done"
              autoCapitalize="none"
            />
            {contactFormErrors.email && (
              <Text style={styles.errorText}>{contactFormErrors.email}</Text>
            )}

            <Text style={styles.contactNote}>
              * Phone number is required for order updates and delivery coordination.
            </Text>

            <TouchableOpacity
              style={[
                styles.contactButton,
                (!contactPhone.trim() || isSubmittingContact) && styles.contactButtonDisabled,
              ]}
              onPress={handleContactSubmit}
              disabled={!contactPhone.trim() || isSubmittingContact}
            >
              <Text style={styles.contactButtonText}>
                {isSubmittingContact ? 'Saving...' : 'Continue with Payment'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactCancelButton}
              onPress={() => setContactModalVisible(false)}
            >
              <Text style={styles.contactCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#ffffff",
  },
  contentContainer: {
    padding: 16,
    backgroundColor: "#ffffff",
  },
  orderListContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
  },
  backBtn: {
    marginBottom: 15,
    paddingHorizontal: 0,
  },
  backText: {
    color: '#a0b796',
    fontSize: 16,
    fontWeight: '600',
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    paddingHorizontal: 0,
  },
  list: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  name: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    marginRight: 10,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
  },

  breakdownContainer: {
    marginTop: 12,
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#f0f5f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2efe7',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#555',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  breakdownRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#d8d8d8',
    paddingTop: 8,
    marginTop: 10,
  },
  breakdownTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  breakdownTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    color: '#444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cdd7ce',
    borderRadius: 8,
    padding: 12,
    marginTop: 6,
    backgroundColor: '#fff',
  },
  signupLink: {
    color: '#a0b796',
    fontSize: 14,
    textDecorationLine: 'underline',
    marginBottom: 20,
  },
  note: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  locationNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },

  methodRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  methodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a0b796',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  methodSelected: {
    backgroundColor: '#a0b796',
  },
  methodText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#a0b796',
  },
  methodTextSelected: {
    color: '#fff',
  },

  confirmButton: {
    backgroundColor: '#a0b796',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmDisabled: {
    backgroundColor: '#ccc',
  },
  confirmText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },

  debugText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
  },

  policyContainer: {
    marginBottom: 20,
  },
  policyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  policySection: {
    fontSize: 15,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
    marginTop: 16,
  },
  policyText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  policyTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 24,
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#a0b796',
    borderRadius: 4,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#a0b796',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    flex: 1,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#a0b796',
  },
  prefilledNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#cdd7ce',
    borderRadius: 8,
    padding: 12,
    marginTop: 6,
    backgroundColor: '#fff',
  },
  timeListWrapper: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cdd7ce',
    borderRadius: 8,
    marginTop: 6,
  },
  timeOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#cdd7ce',
  },
  timeOptionSelected: {
    backgroundColor: '#a0b796',
  },
  timeOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timeOptionTextSelected: {
    color: '#fff',
  },
  contactContainer: {
    marginBottom: 20,
  },
  contactTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  contactText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#444',
  },
  contactInput: {
    borderWidth: 1,
    borderColor: '#cdd7ce',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  contactInputError: {
    borderColor: '#ff0000',
  },
  contactNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: '#ff0000',
    marginTop: 4,
  },
  loginLink: {
    color: '#a0b796',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  contactOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  contactContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  contactButton: {
    backgroundColor: '#a0b796',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  contactButtonDisabled: {
    backgroundColor: '#ccc',
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  contactCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  contactCancelText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '500',
  },
});