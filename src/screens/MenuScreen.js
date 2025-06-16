"use client"
import { useContext, useState } from "react"
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  Image,
  ScrollView,
} from "react-native"
import { CartContext } from "../context/CartContext"
import IcedLatteImg from "../../assets/iced_latte.png"
import { v4 as uuidv4 } from 'uuid';

const COFFEE_MENU = [
  { drink_id: "1", name: "Iced Latte", price: 4.5, description: "Smooth espresso with cold milk over ice", image: IcedLatteImg },
  { drink_id: "2", name: "Hot Latte", price: 4, description: "Rich espresso with steamed milk and light foam", image: IcedLatteImg },
  { drink_id: "3", name: "Iced Matcha Latte", price: 4.75, description: "Refreshing matcha with cold milk over ice", image: IcedLatteImg },
  { drink_id: "4", name: "Hot Matcha Latte", price: 4.25, description: "Premium matcha powder with steamed milk", image: IcedLatteImg },
  { drink_id: "5", name: "Iced Americano", price: 4, description: "Espresso shots with cold water over ice", image: IcedLatteImg },
  { drink_id: "6", name: "Hot Americano", price: 3.5, description: "Bold espresso shots with hot water", image: IcedLatteImg },
  { drink_id: "7", name: "Iced Cappuccino", price: 4.2, description: "Espresso with cold milk and cold foam over ice", image: IcedLatteImg },
  { drink_id: "8", name: "Hot Cappuccino", price: 3.75, description: "Equal parts espresso, steamed milk, and foam", image: IcedLatteImg },
  { drink_id: "9", name: "Espresso", price: 3, description: "Plain espresso", image: IcedLatteImg },
]

const GROUPED_MENU = {
  "Matcha Drinks": COFFEE_MENU.filter(item => item.name.toLowerCase().includes("matcha")),
  "Iced Drinks": COFFEE_MENU.filter(item => item.name.toLowerCase().startsWith("iced") && !item.name.toLowerCase().includes("matcha")),
  "Hot Drinks": COFFEE_MENU.filter(item => (item.name.toLowerCase().startsWith("hot") || item.name.toLowerCase() === "espresso") && !item.name.toLowerCase().includes("matcha")),
}

export default function MenuScreen({ navigation }) {
  const { addToCart } = useContext(CartContext)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [sugarChoice, setSugarChoice] = useState(null)
  const [milkChoice, setMilkChoice] = useState(null)
  const [quantity, setQuantity] = useState(1)

  const espressoIds = new Set(["9"])
  const americanoIds = new Set(["5", "6"])
  const milkIds = new Set(["1", "2", "3", "4", "7", "8"])

  const onItemPress = (item) => {
    setSelectedItem(item)
    setSugarChoice(null)
    setMilkChoice(null)
    setQuantity(1)
    setModalVisible(true)
  }

  const handleAddToCart = () => {
    if (!selectedItem || quantity === 0) return;

    let sugar = null;
    let milkType = null;

    if (espressoIds.has(selectedItem.drink_id)) {
      // No options for espresso
    } else if (americanoIds.has(selectedItem.drink_id)) {
      if (sugarChoice === null) return;
      sugar = sugarChoice;
    } else if (milkIds.has(selectedItem.drink_id)) {
      if (sugarChoice === null || milkChoice === null) return;
      sugar = sugarChoice;
      milkType = milkChoice;
    }

    // Generate a unique cartItemId based on all distinguishing fields
    const id = uuidv4();

    const payload = {
      ...selectedItem,
      sugar,
      milkType,
      quantity,
      id, // new unique ID
    };

    addToCart(payload);

    // Reset UI state
    setModalVisible(false);
    setSelectedItem(null);
    setSugarChoice(null);3
    setMilkChoice(null);
    setQuantity(1);
  };


  const decrementQty = () => {
    setQuantity((q) => (q > 0 ? q - 1 : 0))
  }
  const incrementQty = () => {
    setQuantity((q) => q + 1)
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => onItemPress(item)}>
      <View style={styles.cardContent}>
        <Image source={item.image} style={styles.image} />
        <View style={styles.itemInfo}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.description}>{item.description}</Text>
          <Text style={styles.price}>${item.price.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => onItemPress(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>GRAB COFFEE.</Text>
      </View>

      <View style={styles.subHeader}>
        <Text style={styles.subtitle}>Note: Hot drinks 12 oz (355 ml), Iced drinks 16 oz (473 ml).</Text>
      </View>

      <ScrollView style={styles.menuSection}>
        {Object.entries(GROUPED_MENU).map(([category, items]) => (
          <View key={category} style={{ marginBottom: 24 }}>
            <Text style={styles.sectionTitle}>{category}</Text>
            <FlatList
              data={items}
              horizontal
              keyExtractor={(item) => item.drink_id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingHorizontal: 12 }}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={styles.cartButton}
        onPress={() => navigation.navigate("Cart")}
        activeOpacity={0.9}
      >
        <Text style={styles.cartButtonText}>View Cart</Text>
      </TouchableOpacity>

      {modalVisible && (
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedItem?.name}</Text>
              <Text style={styles.modalPrice}>{selectedItem ? `$${selectedItem.price.toFixed(2)}` : ""}</Text>

              {selectedItem && americanoIds.has(selectedItem.drink_id) && (
                <>
                  <Text style={styles.modalSubtitle}>Sugar?</Text>
                  <View style={styles.choiceRow}>
                    <TouchableOpacity
                      style={[styles.choiceButton, sugarChoice === true && styles.choiceButtonSelected]}
                      onPress={() => setSugarChoice(true)}
                    >
                      <Text style={[styles.choiceText, sugarChoice === true && styles.choiceTextSelected]}>Sugar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.choiceButton, sugarChoice === false && styles.choiceButtonSelected]}
                      onPress={() => setSugarChoice(false)}
                    >
                      <Text style={[styles.choiceText, sugarChoice === false && styles.choiceTextSelected]}>No Sugar</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {selectedItem && milkIds.has(selectedItem.drink_id) && (
                <>
                  <Text style={styles.modalSubtitle}>Sugar?</Text>
                  <View style={styles.choiceRow}>
                    <TouchableOpacity
                      style={[styles.choiceButton, sugarChoice === true && styles.choiceButtonSelected]}
                      onPress={() => setSugarChoice(true)}
                    >
                      <Text style={[styles.choiceText, sugarChoice === true && styles.choiceTextSelected]}>Sugar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.choiceButton, sugarChoice === false && styles.choiceButtonSelected]}
                      onPress={() => setSugarChoice(false)}
                    >
                      <Text style={[styles.choiceText, sugarChoice === false && styles.choiceTextSelected]}>No Sugar</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.modalSubtitle}>Milk Type?</Text>
                  <View style={styles.choiceRow}>
                    <TouchableOpacity
                      style={[styles.choiceButton, milkChoice === "milk" && styles.choiceButtonSelected]}
                      onPress={() => setMilkChoice("milk")}
                    >
                      <Text style={[styles.choiceText, milkChoice === "milk" && styles.choiceTextSelected]}>Organic Milk</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.choiceButton, milkChoice === "oat" && styles.choiceButtonSelected]}
                      onPress={() => setMilkChoice("oat")}
                    >
                      <Text style={[styles.choiceText, milkChoice === "oat" && styles.choiceTextSelected]}>Oat Milk</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <Text style={[styles.modalSubtitle, { marginTop: 8 }]}>Quantity</Text>
              <View style={styles.quantityRow}>
                <TouchableOpacity style={styles.qtyButton} onPress={decrementQty}>
                  <Text style={styles.qtyText}>–</Text>
                </TouchableOpacity>
                <Text style={styles.qtyNumber}>{quantity}</Text>
                <TouchableOpacity style={styles.qtyButton} onPress={incrementQty}>
                  <Text style={styles.qtyText}>+</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.addToCartButton,
                  quantity === 0 ||
                  (selectedItem && americanoIds.has(selectedItem.drink_id) && sugarChoice === null) ||
                  (selectedItem && milkIds.has(selectedItem.drink_id) && (sugarChoice === null || milkChoice === null))
                    ? styles.addToCartButtonDisabled
                    : null
                ]}
                onPress={handleAddToCart}
                disabled={
                  quantity === 0 ||
                  (selectedItem && americanoIds.has(selectedItem.drink_id) && sugarChoice === null) ||
                  (selectedItem && milkIds.has(selectedItem.drink_id) && (sugarChoice === null || milkChoice === null))
                }
              >
                <Text style={styles.addToCartText}>Add to Cart</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setModalVisible(false)
                  setSelectedItem(null)
                  setSugarChoice(null)
                  setMilkChoice(null)
                  setQuantity(1)
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f6f3",
  },
  header: {
    backgroundColor: "#a8e4a0",
    paddingTop: 80,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 32,
    color: "white",
    textAlign: "center",
    ...Platform.select({
      ios: { fontFamily: "AvenirNext-Bold", fontWeight: "500" },
      android: { fontFamily: "sans-serif-condensed", fontWeight: "normal" },
      web: { fontFamily: "Segoe UI Black, Arial Black, sans-serif", fontWeight: "500" },
      default: { fontFamily: "System", fontWeight: "800" },
    }),
  },
  subHeader: {
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.09)",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
  },
  menuSection: {
    paddingTop: 12,
    paddingBottom: 120,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2c1810",
    marginLeft: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: "#fff",
    marginRight: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: 220,
  },
  cardContent: {
    padding: 12,
  },
  image: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    marginBottom: 10,
  },
  itemInfo: {
    marginBottom: 8,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2c1810",
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6b4a3e",
  },
  addButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#a8e4a0",
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  cartButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    backgroundColor: "#a8e4a0",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    shadowColor: "#6b4a3e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cartButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  modalPrice: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#444",
    marginBottom: 8,
    marginTop: 10,
    alignSelf: "flex-start",
  },
  choiceRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 16,
    marginTop: 10,
  },
  choiceButton: {
    backgroundColor: "#e0e0e0",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    minWidth: 100,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  choiceButtonSelected: {
    backgroundColor: "#a8e4a0",
  },
  choiceText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "500",
  },
  choiceTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
  },
  qtyButton: {
    backgroundColor: "#a8e4a0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 16,
  },
  qtyText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  qtyNumber: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  addToCartButton: {
    backgroundColor: "#a8e4a0",
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 25,
    marginBottom: 12,
    marginTop: 52,
    width: "50%",
    alignItems: "center",
    shadowColor: "#6b4a3e",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addToCartButtonDisabled: {
    backgroundColor: "#a0a0a0",
  },
  addToCartText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButton: {
    marginTop: 4,
  },
  cancelText: {
    color: "#6b4a3e",
    fontSize: 16,
    fontWeight: "500",
  },
})