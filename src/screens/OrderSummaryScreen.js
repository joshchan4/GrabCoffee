import React, { useState, useContext, use } from 'react'
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native'
import { supabase } from '../utils/supabase'
import { CartContext } from '../context/CartContext'

export default function OrderSummaryScreen({ route, navigation }) {
  const { items: initialItems, total: initialTotal } = route.params
  console.log("initial items", initialItems);
  const { clearCart } = useContext(CartContext)

  const [customerName, setCustomerName] = useState('')
  const [address, setAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState(null) // 'card' | 'cash'
  const [loading, setLoading] = useState(false)
  const [method, setMethod] = useState('');

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
      paymentMethod: paymentMethod
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

  return (
    <View style={styles.container}>
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

      <Text style={styles.total}>Total: ${initialTotal.toFixed(2)}</Text>

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
          (!customerName.trim() ||
            !address.trim() ||
            !paymentMethod ||
            loading) && styles.confirmDisabled,
        ]}
        onPress={handlePayment}
        disabled={
          !customerName.trim() ||
          !address.trim() ||
          !paymentMethod ||
          loading
        }
      >
        <Text style={styles.confirmText}>
          {loading ? 'Placing Order…' : 'Confirm'}
        </Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container:  { flex: 1, padding: 16, backgroundColor: "white" },
  heading:    { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  list:       { maxHeight: 200, marginBottom: 12 },
  row:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  name:       { fontSize: 16 },
  price:      { fontSize: 16, fontWeight: '600' },
  total:      { fontSize: 18, fontWeight: '700', textAlign: 'right', marginVertical: 12 },
  label:      { fontSize: 14, fontWeight: '600', marginTop: 12 },
  input:      { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, marginTop: 4 },
  signupLink: { color: "#a8e4a0", marginTop: 8, fontStyle: 'italic', textDecorationLine: 'underline' },
  methodRow:  { flexDirection: 'row', marginTop: 8 },
  methodButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: "#a8e4a0",
    borderRadius: 6,
    marginRight: 8,
    alignItems: 'center',
  },
  methodSelected:     { backgroundColor: "#a8e4a0" },
  methodText:         { color: "#a8e4a0", fontWeight: '600' },
  methodTextSelected: { color: '#fff' },
  confirmButton:      { backgroundColor: "#a8e4a0", paddingVertical: 14, borderRadius: 6, alignItems: 'center', marginTop: 20 },
  confirmDisabled:    { backgroundColor: '#ccc' },
  confirmText:        { color: '#fff', fontSize: 16, fontWeight: '700' },
})