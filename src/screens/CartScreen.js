import React, { useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { CartContext } from '../context/CartContext';

export default function CartScreen({ navigation }) {
  const {
    items,
    clearCart,
    updateItemQuantity,
    removeItem,
  } = useContext(CartContext);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Your cart is empty.</Text>
      </View>
    );
  }

  const renderItem = ({ item }) => {
    const subtotal = item.price * item.quantity;

    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.sugar != null && (
            <Text style={styles.itemDetail}>
              Sugar: {item.sugar ? 'Yes' : 'No'}
            </Text>
          )}
          {item.milkType && (
            <Text style={styles.itemDetail}>
              Milk: {item.milkType === 'milk' ? 'Organic' : 'Oat'}
            </Text>
          )}
        </View>

        <View style={styles.quantitySection}>
          <TouchableOpacity
            style={styles.qtyButton}
            onPress={() => {
              const newQty = item.quantity - 1;
              if (newQty <= 0) {
                removeItem(item.id);
              } else {
                updateItemQuantity(item.id, newQty);
              }
            }}
          >
            <Text style={styles.qtyText}>–</Text>
          </TouchableOpacity>

          <Text style={styles.qtyNumber}>{item.quantity}</Text>

          <TouchableOpacity
            style={styles.qtyButton}
            onPress={() => updateItemQuantity(item.id, item.quantity + 1)}
          >
            <Text style={styles.qtyText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.priceSection}>
          <Text style={styles.itemPrice}>${subtotal.toFixed(2)}</Text>
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeItem(item.id)}
          >
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.footer}>
        <Text style={styles.totalText}>Total: ${total.toFixed(2)}</Text>
        <TouchableOpacity
          style={styles.orderButton}
          onPress={() => {
            navigation.navigate('OrderSummary', {
              items,
              total,
            });
          }}
        >
          <Text style={styles.orderButtonText}>Place Order</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  listContainer: { padding: 16, paddingBottom: 100 },
  emptyText: {
    flex: 1,
    textAlign: 'center',
    marginTop: 50,
    fontSize: 18,
    color: '#666',
  },
  itemContainer: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    marginBottom: 16,
    padding: 12,
    flexDirection: 'column',
    elevation: 1,
  },
  itemInfo: {
    marginBottom: 8,
  },
  itemName: { fontSize: 16, fontWeight: '600', color: '#2c1810' },
  itemDetail: { fontSize: 14, color: '#555', marginTop: 2 },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  qtyButton: {
    backgroundColor: "#a8e4a0",
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
  removeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'black',
    borderRadius: 12,
  },
  removeText: { color: '#fff', fontSize: 12 },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  totalText: { fontSize: 18, fontWeight: '700', textAlign: 'right' },
  orderButton: {
    backgroundColor: "#a8e4a0",
    paddingVertical: 15,
    width: '100%',
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 35
  },
  orderButtonText: { color: '#fff', fontSize: 20 },
});
