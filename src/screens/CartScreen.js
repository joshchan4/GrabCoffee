// CartScreen.js

import React, { useContext, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TextInput,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CartContext } from '../context/CartContext';
import * as Haptics from 'expo-haptics';
import { Swipeable } from 'react-native-gesture-handler';
import PersistentHeader from '../components/PersistentHeader';

export default function CartScreen({ navigation, route }) {
  const {
    items,
    updateItemQuantity,
    removeItem,
  } = useContext(CartContext);

  const [scrollOffset, setScrollOffset] = useState(0);
  const [selectedTip, setSelectedTip] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const flatListRef = useRef(null);
  const animatedTotal = useRef(new Animated.Value(0)).current;
  const holdInterval = useRef(null);
  const holdTimeout = useRef(null);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tipValue = selectedTip === 'custom' ? parseFloat(customTip || 0) : (selectedTip / 100) * subtotal;
  const tax = subtotal * 0.13;
  const total = subtotal + tax + tipValue;
  // Use consistent rounding: round to nearest cent, then convert to cents
  const roundedTotal = Math.round(total * 100) / 100;
  const amountInCents = Math.round(roundedTotal * 100);

  useEffect(() => {
    Animated.timing(animatedTotal, {
      toValue: total,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [total]);

  // Handler that always uses the latest quantity
  const handleChangeQuantity = (id, delta) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      removeItem(id);
    } else {
      updateItemQuantity(id, newQty);
    }
  };

  // Hold logic
  const startHold = (id, delta) => {
    handleChangeQuantity(id, delta);
    holdTimeout.current = setTimeout(() => {
      holdInterval.current = setInterval(() => handleChangeQuantity(id, delta), 120);
    }, 400);
  };
  const stopHold = () => {
    if (holdTimeout.current) clearTimeout(holdTimeout.current);
    if (holdInterval.current) clearInterval(holdInterval.current);
    holdTimeout.current = null;
    holdInterval.current = null;
  };

  const renderItem = ({ item }) => {
    const subtotal = item.price * item.quantity;
    const scaleAnim = new Animated.Value(1);

    const bounce = () => {
      scaleAnim.setValue(0.9);
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.name === 'Espresso Tonic' ? (
            <Text style={styles.itemDetail}>
              Extra Shot: {item.extraShot ? 'Yes (+$1.50)' : 'No'}
            </Text>
          ) : (
            <>
              {item.sugar != null && (
                <Text style={styles.itemDetail}>
                  Sugar: {typeof item.sugar === 'string' ? item.sugar.charAt(0).toUpperCase() + item.sugar.slice(1) : item.sugar}
                </Text>
              )}
              {item.milkType && (
                <Text style={styles.itemDetail}>
                  Milk: {item.milkType === 'milk' ? 'Organic' : 'Oat'}{item.milkType === 'oat' ? ' (+$0.50)' : ''}
                </Text>
              )}
              {item.extraShot && (
                <Text style={styles.itemDetail}>
                  Extra Shot: Yes (+$1.50)
                </Text>
              )}
            </>
          )}
        </View>

        <View style={styles.quantitySection}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={styles.qtyButton}
              onPressIn={() => {
                Haptics.impactAsync();
                bounce();
                startHold(item.id, -1);
              }}
              onPressOut={stopHold}
            >
              <Text style={styles.qtyText}>–</Text>
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.qtyNumber}>{item.quantity}</Text>

          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={styles.qtyButton}
              onPressIn={() => {
                Haptics.impactAsync();
                bounce();
                startHold(item.id, 1);
              }}
              onPressOut={stopHold}
            >
              <Text style={styles.qtyText}>+</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <View style={styles.priceSection}>
          <Text style={styles.itemPrice}>${subtotal.toFixed(2)}</Text>
        </View>

        <View style={styles.deleteOrderContainer}>
          <TouchableOpacity
            style={styles.deleteOrderButton}
            onPress={() => {
              Haptics.impactAsync();
              removeItem(item.id);
            }}
          >
            <Text style={styles.deleteOrderText}>Delete Order</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const TipOption = ({ percent }) => (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync();
        setSelectedTip(prev => (prev === percent ? 0 : percent));
      }}
      style={[
        styles.tipButton,
        selectedTip === percent && styles.tipSelected,
      ]}
    >
      <Text style={styles.tipText}>{percent}%</Text>
    </TouchableOpacity>
  );

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <PersistentHeader navigation={navigation} title="Your Cart" route={route} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Your cart is empty.</Text>
          <TouchableOpacity
            style={{ marginTop: 24, backgroundColor: '#a0b796', padding: 14, borderRadius: 8 }}
            onPress={() => navigation.replace('Menu')}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Back to Menu</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0} >
      <SafeAreaView style={styles.container}>
        <PersistentHeader navigation={navigation} title="Your Cart" route={route} />
        <FlatList
          ref={flatListRef}
          data={items}
          keyExtractor={(item, idx) => `${item.name}-${item.sugar}-${item.milkType}-${idx}`}
          renderItem={renderItem}
          onScroll={(e) => setScrollOffset(e.nativeEvent.contentOffset.y)}
          onLayout={() => {
            if (flatListRef.current) {
              flatListRef.current.scrollToOffset({ offset: scrollOffset, animated: false });
            }
          }}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.divider} />

        {/*
        <View style={styles.tipSection}>
          <Text style={styles.tipLabel}>Tip:</Text>
          <View style={styles.tipRow}>
            {[5, 10, 15, 20].map(p => (
              <TipOption key={p} percent={p} />
            ))}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync();
                setSelectedTip('custom');
              }}
              style={[
                styles.tipButton,
                selectedTip === 'custom' && styles.tipSelected,
              ]}
            >
              <Text style={styles.tipText}>Custom</Text>
            </TouchableOpacity>
          </View>
          {selectedTip === 'custom' && (
            <>
              <TextInput
                style={styles.customInput}
                keyboardType="numeric"
                returnKeyType="done"
                value={customTip}
                onChangeText={setCustomTip}
                placeholder="Enter tip $"
                placeholderTextColor="#aaa"
              />
              <Text style={styles.tipPreview}>
                Tip: ${tipValue.toFixed(2)}
              </Text>
            </>
          )}
        </View>
        */}

        <View style={styles.footer}>
          <View style={styles.calcRow}>
            <Text style={styles.label}>Subtotal</Text>
            <Text style={styles.amount}>${Number(subtotal).toFixed(2)}</Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.label}>Tax (HST)</Text>
            <Text style={styles.amount}>${Number(tax).toFixed(2)}</Text>
          </View>
          <View style={styles.calcRow}>
            <Text style={styles.label}>Total</Text>
            <Text style={[styles.amount, { fontWeight: '700', fontSize: 16 }]}>${Number(total).toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            style={styles.orderButton}
            onPress={() => {
              Haptics.impactAsync();
              navigation.navigate('OrderSummary', {
                items,
                subtotal,
                tax,
                tip: tipValue,
                total: roundedTotal,
                amountInCents,
              });
            }}
          >
            <Text style={styles.orderButtonText}>Place Order</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
  },
  backBtn: {
    marginBottom: 16,
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  backText: {
    color: '#a0b796',
    fontSize: 16,
    fontWeight: '600',
  },     
  listContainer: { padding: 16, paddingBottom: 100 },
  itemContainer: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    marginBottom: 16,
    padding: 12,
    flexDirection: 'column',
    elevation: 1,
  },
  itemInfo: { marginBottom: 8 },
  itemName: { fontSize: 20, fontWeight: '700', color: '#2c1810' },
  itemDetail: { fontSize: 14, color: '#555', marginTop: 2 },
  swipeHint: { fontSize: 12, color: '#888' },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  qtyButton: {
    backgroundColor: '#a0b796',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  qtyNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 16,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  itemPrice: { fontSize: 16, fontWeight: '600', color: '#6b4a3e' },
  swipeRemove: {
    backgroundColor: '#a0b796',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    marginBottom: 16,
    borderRadius: 8,
  },
  removeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  tipSection: { paddingHorizontal: 16, marginBottom: 10 },
  tipLabel: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  tipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  
  tipButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#a0b796',
    backgroundColor: 'white',
  },
  
  tipSelected: {
    backgroundColor: '#a0b796',
  },
  
  tipText: {
    fontSize: 14,
    color: '#333',
  },  
  customInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#333',
  },
  tipPreview: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    marginBottom: 4,
  },  
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  totalText: { fontSize: 16, fontWeight: '600', textAlign: 'right', marginBottom: 2 },
  orderButton: {
    backgroundColor: '#a0b796',
    paddingVertical: 15,
    width: '100%',
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 16,
  },
  orderButtonText: { color: '#fff', fontSize: 20 },
  paymentHint: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 2,
  },
  label: {
    color: '#555',
    fontSize: 14,
  },
  amount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c1810',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginHorizontal: 16,
    marginBottom: 16,
  },   
  deleteOrderContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  deleteOrderButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#bbb',
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteOrderText: {
    color: '#888',
    fontWeight: '400',
    fontSize: 13,
  },
});