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

const { height: screenHeight } = Dimensions.get('window');

export default function OrderSummaryScreen({ route, navigation }) {
  const { items: initialItems, total: initialTotal, tax: initialTax, tip: initialTipValue } = route.params
  console.log("initial items", initialItems);
  console.log("initial items length:", initialItems?.length);
  console.log("initial items type:", typeof initialItems);
  console.log("initial items is array:", Array.isArray(initialItems));
  const { clearCart } = useContext(CartContext);
  const scrollViewRef = useRef(null);
  const addressInputRef = useRef(null);
  const [deliverySectionY, setDeliverySectionY] = useState(0);

  const stripe = useStripe();
  console.log('🔍 useStripe object:', stripe);

  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState('');

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

  // Calculate responsive height for order list
  const orderListHeight = Math.min(Math.max(screenHeight * 0.25, 150), 300);

  // Debug Apple Pay support
  useEffect(() => {
    console.log('🍎 Apple Pay supported:', isPlatformPaySupported);
  }, [isPlatformPaySupported]);

  const handlePayment = async () => {
    if (!customerName.trim()) return Alert.alert('Please enter your name.')
    if (!address.trim() || !paymentMethod || !method) {
      return Alert.alert('Please enter your address, payment method, and delivery/pickup.')
    }

    setLoading(true)

    const rows = initialItems.map((item, index) => ({
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
      user_id:      null,
      method:       method,
      paymentMethod: paymentMethod,
      tax:           index === 0 ? initialTax : null,
      tip:           index === 0 ? initialTipValue : null
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
      console.log('🌐 URL: http://192.168.2.24:3001/api/payment/create-payment-intent');
      console.log('📦 Request payload:', {
        items: initialItems,
        customerName,
        address,
        method,
        tax: initialTax,
        tip: initialTipValue
      });
      
      const response = await fetch('http://192.168.2.24:3001/api/payment/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: initialItems,
          customerName,
          address,
          method,
          tax: initialTax,
          tip: initialTipValue
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
              amount: backendTotal || initialTotal.toFixed(2),
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
          'Try accessing: http://192.168.2.24:3001 in your browser.'
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
      const res = await fetch('http://192.168.2.24:3001/api/payment/create-paypal-order', {
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
      const rows = initialItems.map((item, index) => ({
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
        tax: index === 0 ? initialTax : null,
        tip: index === 0 ? initialTipValue : null
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            {/* Header and Order List Section - Fixed Height, Scrollable */}
            <View style={[styles.orderListContainer, { height: orderListHeight }]}>
              <TouchableOpacity onPress={() => { Haptics.impactAsync(); navigation.goBack(); }} style={styles.backBtn}>
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>
              <Text style={styles.heading}>Review Your Order</Text>

              <FlatList
                data={initialItems || []}
                keyExtractor={(item, idx) => `${item?.id || idx}-${idx}`}
                renderItem={({ item, index }) => (
                  <View style={[
                    styles.row,
                    index === (initialItems?.length - 1) && { borderBottomWidth: 0 }
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
                    ${(initialTotal - initialTax - initialTipValue).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Tax (HST)</Text>
                  <Text style={styles.breakdownValue}>${initialTax.toFixed(2)}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Tip</Text>
                  <Text style={styles.breakdownValue}>${initialTipValue.toFixed(2)}</Text>
                </View>
                <View style={styles.breakdownRowTotal}>
                  <Text style={styles.breakdownTotalLabel}>Total</Text>
                  <Text style={styles.breakdownTotalValue}>
                    ${backendTotal !== null ? backendTotal : initialTotal.toFixed(2)}
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

              <TouchableOpacity
                onPress={() => { Haptics.impactAsync(); navigation.navigate('Signup', { name: customerName }); }}
              >
                <Text style={styles.signupLink}>
                  Want to make an account?
                </Text>
              </TouchableOpacity>

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
                  onPress={() => { if (!loading) { Haptics.impactAsync(); setMethod('pickup'); } }}
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
                  onPress={() => { if (!loading) { Haptics.impactAsync(); setMethod('delivery'); } }}
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
                </View>
              )}

              <Text style={styles.label}>Payment Method</Text>
              <View style={styles.methodRow}>
                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    paymentMethod === 'card' && styles.methodSelected,
                  ]}
                  onPress={() => { if (!loading) { Haptics.impactAsync(); setPaymentMethod('card'); } }}
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
                <TouchableOpacity
                  style={[
                    styles.methodButton,
                    paymentMethod === 'cash' && styles.methodSelected,
                  ]}
                  onPress={() => { if (!loading) { Haptics.impactAsync(); setPaymentMethod('cash'); } }}
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
              </View>

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
              <Text style={{ color: '#a8e4a0', fontSize: 16, fontWeight: '600' }}>← Cancel</Text>
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
                  ${backendTotal !== null ? backendTotal : initialTotal.toFixed(2)}
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
    paddingBottom: 8,
    backgroundColor: '#ffffff',
  },
  backBtn: {
    marginBottom: 15,
    paddingHorizontal: 0,
  },
  backText: {
    color: '#a8e4a0',
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
    color: "#a8e4a0",
    marginTop: 8,
    fontStyle: 'italic',
    textDecorationLine: 'underline',
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
    padding: 14,
    borderWidth: 1,
    borderColor: "#a8e4a0",
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
    backgroundColor: "#fff",
  },
  methodSelected: {
    backgroundColor: "#a8e4a0",
  },
  methodText: {
    color: "#a8e4a0",
    fontWeight: '600',
  },
  methodTextSelected: {
    color: '#fff',
  },

  confirmButton: {
    backgroundColor: "#a8e4a0",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
    shadowColor: "#000",
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
    fontSize: 16,
    fontWeight: '700',
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
    borderColor: '#a8e4a0',
    borderRadius: 4,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#a8e4a0',
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
});