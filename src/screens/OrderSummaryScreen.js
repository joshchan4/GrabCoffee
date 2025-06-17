import React, { useState, useContext, useEffect } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Button,
  ActivityIndicator
} from 'react-native'
import { supabase } from '../utils/supabase'
import { CartContext } from '../context/CartContext'
import { useStripe, PlatformPayButton } from '@stripe/stripe-react-native';

export default function OrderSummaryScreen({ route, navigation }) {
  const { items: initialItems, total: initialTotal, tax: initialTax, tip: initialTipValue } = route.params
  console.log("initial items", initialItems);
  const { clearCart } = useContext(CartContext);

  const calculatedTotal = initialTotal + initialTax + initialTipValue;

  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState('');

  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [paymentSheetReady, setPaymentSheetReady] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState(null); // 'card' | 'cash'
  const {
    isPlatformPaySupported,
    presentPlatformPay,
    confirmPlatformPayPayment
  } = useStripe();  

  const stripe = useStripe();
  console.log('🔍 useStripe object:', stripe);

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
    setLoading(true);
    try {
      const response = await fetch('http://100.66.24.204:3001/api/payment/create-payment-intent', {
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
      const { clientSecret } = await response.json();
  
      if (!clientSecret) throw new Error('Missing clientSecret');
  
      const { error } = await initPaymentSheet({
        merchantDisplayName: 'Grab Coffee',
        paymentIntentClientSecret: clientSecret,
        applePay: true,
        googlePay: true,
        merchantCountryCode: 'CA',
        style: 'automatic',
      });
  
      if (error) throw error;
  
      setClientSecret(clientSecret);
      setPaymentSheetReady(true);
    } catch (err) {
      console.error('PaymentSheet init error:', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (paymentMethod === 'card') {
      initializePaymentSheet();
    }
  }, [paymentMethod]);
  
  const handleApplePayPress = async () => {
    if (!customerName.trim() || !method) {
      Alert.alert("Missing Info", "Please fill out your name and delivery method.");
      return;
    }

    setLoading(true);
    try {
      // Create payment intent for Apple Pay
      const response = await fetch('http://100.66.24.204:3001/api/payment/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: initialItems,
          customerName,
          address: method === 'delivery' ? address : 'Pickup',
          method,
          tax: initialTax,
          tip: initialTipValue
        }),
      });
      
      const { clientSecret } = await response.json();
      
      if (!clientSecret) throw new Error('Missing clientSecret');

      // Present Apple Pay
      const { error } = await presentPlatformPay({
        clientSecret,
        forSetupIntent: false,
        currencyCode: 'CAD',
        countryCode: 'CA',
        paymentSummaryItems: [
          {
            label: 'Grab Coffee',
            amount: calculatedTotal.toFixed(2),
          },
        ],
      });

      if (error) {
        Alert.alert('Apple Pay Error', error.message);
      } else {
        // Confirm the payment
        const { error: confirmError } = await confirmPlatformPayPayment(clientSecret);
        
        if (confirmError) {
          Alert.alert('Payment Failed', confirmError.message);
        } else {
          Alert.alert('Success', 'Your order is placed!');
          clearCart();
          navigation.navigate('OrderStatus', { orderId: clientSecret });
        }
      }
    } catch (err) {
      console.error('Apple Pay error:', err);
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
       <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      <Text style={styles.heading}>Review Your Order</Text>

      <FlatList
        data={initialItems}
        keyExtractor={(item, idx) => item.id + idx}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name}>
              {item.name} ×{item.quantity}
            </Text>
            <Text style={styles.price}>
              ${(item.price * item.quantity).toFixed(2)}
            </Text>
          </View>
        )}
        style={styles.list}
      />

      <View style={styles.breakdownContainer}>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Subtotal</Text>
          <Text style={styles.breakdownValue}>${initialTotal.toFixed(2)}</Text>
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
          <Text style={styles.breakdownTotalValue}>${calculatedTotal.toFixed(2)}</Text>
        </View>
      </View>

      <Text style={styles.label}>Your Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your name"
        value={customerName}
        onChangeText={setCustomerName}
        editable={!loading}
      />

      <TouchableOpacity
        onPress={() => navigation.navigate('Signup', { name: customerName })}
      >
        <Text style={styles.signupLink}>
          Want to make an account?
        </Text>
      </TouchableOpacity>

      <Text style={styles.label}>Delivery or Pickup?</Text>
      <Text style={styles.note}>
        Pickup location: Outside 10 Bellair Street
      </Text>
      <View style={styles.methodRow}>
        <TouchableOpacity
          style={[
            styles.methodButton,
            method === 'pickup' && styles.methodSelected,
          ]}
          onPress={() => !loading && setMethod('pickup')}
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
          onPress={() => !loading && setMethod('delivery')}
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
        <>
          <Text style={styles.label}>Delivery Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your address"
            value={address}
            onChangeText={setAddress}
            editable={!loading}
          />
        </>
      )}

      <Text style={styles.label}>Payment Method</Text>
      <View style={styles.methodRow}>
        <TouchableOpacity
          style={[
            styles.methodButton,
            paymentMethod === 'card' && styles.methodSelected,
          ]}
          onPress={() => !loading && setPaymentMethod('card')}
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
          onPress={() => !loading && setPaymentMethod('cash')}
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

      <TouchableOpacity
        style={[
          styles.confirmButton,
          (!customerName.trim() || !method || !paymentMethod || loading) && styles.confirmDisabled
        ]}
        onPress={async () => {
          if (!customerName.trim() || !method || !paymentMethod) {
            Alert.alert("Missing Info", "Fill out all required fields.");
            return;
          }

          if (paymentMethod === 'card') {
            const { error } = await presentPaymentSheet();
            if (error) {
              Alert.alert('Payment failed', error.message);
            } else {
              Alert.alert('Success', 'Your order is placed!');
              clearCart();
              navigation.navigate('OrderStatus', { orderId: clientSecret }); // or show confirmation
            }
          } else {
            handlePayment(); // fallback for cash method
          }
        }}
        disabled={
          !customerName.trim() ||
          !method ||
          !paymentMethod ||
          loading
        }
      >
        <Text style={styles.confirmText}>
          {loading ? 'Processing…' : paymentMethod === 'card' ? 'Pay Now' : 'Confirm'}
        </Text>
      </TouchableOpacity>

      {isPlatformPaySupported && (
        <PlatformPayButton
          buttonStyle="black"
          type="order"
          borderRadius={8}
          style={{ width: '100%', height: 50, marginTop: 20 }}
          onPress={handleApplePayPress}
        />
      )}

    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#ffffff",
  },
  backBtn: {
    marginTop: 40,
    marginBottom: 15,
    paddingHorizontal: 5,
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
  },
  list: {
    maxHeight: 200,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  name: {
    fontSize: 16,
    color: '#333',
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: '#444',
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
});