"use client"
import { useContext, useState, useRef, useEffect } from "react"
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
  Dimensions,
  Animated,
} from "react-native"
import { CartContext } from "../context/CartContext"
import IcedLatteImg from "../../assets/iced_latte.png"
import IcedMatchaJPG from "../../assets/IcedMatcha.jpg"
import IcedLatteJPG from "../../assets/IcedLatte.jpg"
import IcedAmericanoJPG from "../../assets/IcedAmericano.jpg"
import LatteJPG from "../../assets/Latte.jpg"
import AmericanoJPG from "../../assets/Americano.jpg"
import CappuccinoJPG from "../../assets/Cappuccino.jpg"
import { v4 as uuidv4 } from 'uuid';
import * as Haptics from 'expo-haptics';
import PersistentHeader from '../components/PersistentHeader';
import { supabase } from '../utils/supabase';
// Add placeholder imports for new matcha drinks (replace with real images if available)
import CremeBruleeMatchaImg from "../../assets/CremeBruleeMatcha.png"
import BlueberryMatchaImg from "../../assets/BlueberryMatcha.png"
import EspressoTonicImg from "../../assets/EspressoTonic.png"
import { useWindowDimensions } from 'react-native';
import { PinchGestureHandler, State } from 'react-native-gesture-handler';

const COFFEE_MENU = [
  { drink_id: "1", name: "Iced Cafe Latte", price: 4.5, description: "Smooth espresso with cold milk over ice", image: IcedLatteJPG },
  { drink_id: "2", name: "Cafe Latte", price: 4, description: "Rich espresso with steamed milk and light foam", image: LatteJPG },
  // Matcha Drinks
  { drink_id: "10", name: "Crème Brûlée Matcha", price: 6.45, description: "Your favorite matcha topped with creamy cloud foam and crystallized sugar", image: CremeBruleeMatchaImg },
  { drink_id: "11", name: "Blueberry Matcha Latte", price: 5.75, description: "Smooth and rich matcha with a natural blueberry twist", image: BlueberryMatchaImg },
  { drink_id: "3", name: "Iced Matcha Latte", price: 5.50, description: "Refreshing matcha with cold milk over ice", image: IcedMatchaJPG },
  { drink_id: "4", name: "Hot Matcha Latte", price: 4.25, description: "Premium matcha powder with steamed milk", image: IcedMatchaJPG },
  { drink_id: "5", name: "Iced Americano", price: 4, description: "Espresso shots with cold water over ice", image: IcedAmericanoJPG },
  { drink_id: "6", name: "Americano", price: 3.5, description: "Bold espresso shots with hot water", image: AmericanoJPG },
  { drink_id: "7", name: "Espresso Tonic", price: 4.2, description: "Espresso with tonic water and ice", image: EspressoTonicImg },
  { drink_id: "8", name: "Cappuccino", price: 3.75, description: "Equal parts espresso, steamed milk, and foam", image: CappuccinoJPG },
]

const GROUPED_MENU = {
  "Matcha Drinks": COFFEE_MENU.filter(item => ["10","11","3"].includes(item.drink_id)),
  "Iced Drinks": COFFEE_MENU.filter(item => (item.name.toLowerCase().startsWith("iced") || item.name === "Espresso Tonic") && !item.name.toLowerCase().includes("matcha")),
  "Hot Drinks": COFFEE_MENU.filter(item =>
    (
      item.name.toLowerCase().startsWith("hot") ||
      ["cafe latte", "americano", "cappuccino", "espresso"].includes(item.name.toLowerCase())
    ) && !item.name.toLowerCase().includes("matcha")
  ),
}

const CARD_WIDTH = Math.min(200, Dimensions.get("window").width * 0.7);

export default function MenuScreen({ navigation, showWelcomePopup = false, route }) {
  const { addToCart, items } = useContext(CartContext)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [sugarChoice, setSugarChoice] = useState(null)
  const [milkChoice, setMilkChoice] = useState(null)
  const [extraShot, setExtraShot] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [welcomePopupVisible, setWelcomePopupVisible] = useState(false)
  const [welcomeBackPopupVisible, setWelcomeBackPopupVisible] = useState(false)
  const [user, setUser] = useState(null)
  const [hasCheckedUser, setHasCheckedUser] = useState(false)
  const [hasShownWelcomeBack, setHasShownWelcomeBack] = useState(false)
  const holdInterval = useRef(null);
  const holdTimeout = useRef(null);
  const [cartButtonVisible, setCartButtonVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [zoomModalVisible, setZoomModalVisible] = useState(false);
  const [scale, setScale] = useState(new Animated.Value(1));
  const window = useWindowDimensions();

  const handlePinchEvent = Animated.event([
    { nativeEvent: { scale: scale } }
  ], { useNativeDriver: true });

  const handlePinchStateChange = event => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };

  const cartQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // Animate View Cart button when it appears
  useEffect(() => {
    if (cartQuantity > 0 && !cartButtonVisible) {
      setCartButtonVisible(true);
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
        tension: 120,
      }).start();
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    } else if (cartQuantity === 0 && cartButtonVisible) {
      setCartButtonVisible(false);
    }
  }, [cartQuantity]);

  // Check user authentication status
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setHasCheckedUser(true);
    };
    
    checkUser();
  }, []);

  // Show welcome popup only when CoverScreen is dismissed and user is not logged in
  useEffect(() => {
    if (showWelcomePopup && hasCheckedUser && !user) {
      // Reduced delay for faster popup appearance
      const timer = setTimeout(() => {
        setWelcomePopupVisible(true);
      }, 100); // Reduced from 500ms to 100ms
      
      return () => clearTimeout(timer);
    }
  }, [showWelcomePopup, hasCheckedUser, user]);

  // Show welcome back popup for logged-in users, only once per app open
  useEffect(() => {
    if (hasCheckedUser && user && !hasShownWelcomeBack) {
      setWelcomeBackPopupVisible(true);
      setHasShownWelcomeBack(true);
      const timer = setTimeout(() => {
        setWelcomeBackPopupVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [hasCheckedUser, user, hasShownWelcomeBack]);

  // Helper sets for drink types
  const espressoIds = new Set([])
  const americanoIds = new Set(["5", "6"])
  const milkIds = new Set(["1", "2", "3", "4", "8", "10", "11"])
  const matchaIds = new Set(["3", "4"])
  // Show extra shot for all drinks except matcha (3, 4)
  const drinksWithExtraShot = new Set(["1", "2", "5", "6", "7", "8"]); // All except matcha and espresso

  const onItemPress = (item) => {
    Haptics.impactAsync();
    setSelectedItem(item)
    setSugarChoice(null)
    setMilkChoice(null)
    setExtraShot(null)
    setQuantity(1)
    setModalVisible(true)
  }

  const handleAddToCart = () => {
    Haptics.impactAsync();
    if (!selectedItem || quantity === 0) return;
    let sugar = null;
    let milkType = null;
    let price = selectedItem.price;
    let extraShotValue = false;
    if (espressoIds.has(selectedItem.drink_id)) {
      // No options for espresso
    } else if (americanoIds.has(selectedItem.drink_id)) {
      if (sugarChoice === null) return;
      sugar = sugarChoice; // now a string
      if (extraShot === null) return;
      if (extraShot) {
        price += 1.5;
        extraShotValue = true;
      }
    } else if (milkIds.has(selectedItem.drink_id)) {
      if (sugarChoice === null || milkChoice === null) return;
      sugar = sugarChoice; // now a string
      milkType = milkChoice;
      if (milkChoice === 'oat') {
        price += 0.5;
      }
      if (drinksWithExtraShot.has(selectedItem.drink_id) && !americanoIds.has(selectedItem.drink_id)) {
        if (extraShot === null) return;
        if (extraShot) {
          price += 1.5;
          extraShotValue = true;
        }
      }
    }
    const id = uuidv4();
    const payload = {
      ...selectedItem,
      sugar,
      milkType,
      extraShot: extraShotValue,
      price,
      quantity,
      id,
    };
    addToCart(payload);
    setModalVisible(false);
    setSelectedItem(null);
    setSugarChoice(null);
    setMilkChoice(null);
    setExtraShot(null);
    setQuantity(1);
  };

  // Hold-to-increase/decrease logic
  const startHold = (action) => {
    action();
    holdTimeout.current = setTimeout(() => {
      holdInterval.current = setInterval(action, 150);
    }, 500);
  };
  const stopHold = () => {
    if (holdTimeout.current) clearTimeout(holdTimeout.current);
    if (holdInterval.current) clearInterval(holdInterval.current);
    holdTimeout.current = null;
    holdInterval.current = null;
  };

  const decrementQty = () => {
    Haptics.impactAsync();
    setQuantity((q) => (q > 0 ? q - 1 : 0))
  }
  const incrementQty = () => {
    Haptics.impactAsync();
    setQuantity((q) => q + 1)
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity style={[styles.card, { width: CARD_WIDTH }]} activeOpacity={0.8} onPress={() => onItemPress(item)}>
      <View style={styles.cardContent}>
        <Image 
          source={item.image} 
          style={styles.image}
          resizeMode="cover"
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => { Haptics.impactAsync(); onItemPress(item); }}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
        <View style={styles.itemInfo}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.description}>{item.description}</Text>
          <Text style={styles.price}>${item.price.toFixed(2)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <PersistentHeader navigation={navigation} route={route} />
      
      <ScrollView style={styles.menuSection}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {Object.entries(GROUPED_MENU).map(([category, items]) => (
          <View key={category} style={{ marginBottom: 24 }}>
            <Text style={styles.sectionTitle}>{category}</Text>
            <Text style={styles.swipeHint}>Swipe to see more →</Text>
            <FlatList
              data={items}
              horizontal
              keyExtractor={(item) => item.drink_id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingHorizontal: 12, paddingRight: 24, marginTop: 8 }}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        ))}
      </ScrollView>

      {/* View Cart Button - Only show if cartQuantity > 0, with pop-in animation */}
      {cartButtonVisible && (
        <Animated.View style={[styles.cartButtonAnimated, { transform: [{ scale: scaleAnim }], opacity: opacityAnim }]}> 
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => { Haptics.impactAsync(); navigation.navigate("Cart"); }}
            activeOpacity={0.9}
          >
            {/* Badge */}
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartQuantity}</Text>
            </View>
            <Text style={styles.cartButtonText}>View Cart</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Welcome Popup for Guest Users */}
      <Modal
        visible={welcomePopupVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWelcomePopupVisible(false)}
      >
        <View style={styles.welcomeOverlay}>
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeTitle}>Welcome to Grab Coffee!</Text>
            <Text style={styles.welcomeSubtitle}>
              Create an account to save your preferences and track your orders
            </Text>
            
            <TouchableOpacity
              style={styles.welcomeSignupButton}
              onPress={() => {
                Haptics.impactAsync();
                setWelcomePopupVisible(false);
                setTimeout(() => {
                  navigation.navigate('Signup', { returnScreen: 'Menu' });
                }, 50);
              }}
            >
              <Text style={styles.welcomeButtonText}>Sign Up</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.welcomeLoginButton}
              onPress={() => {
                Haptics.impactAsync();
                setWelcomePopupVisible(false);
                setTimeout(() => {
                  navigation.navigate('Login', { returnScreen: 'Menu' });
                }, 50);
              }}
            >
              <Text style={styles.welcomeLoginButtonText}>Log In</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.welcomeExitButton}
              onPress={() => {
                Haptics.impactAsync();
                setWelcomePopupVisible(false);
              }}
            >
              <Text style={styles.welcomeExitText}>Continue as Guest</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Welcome Back Popup for Logged-in Users */}
      {welcomeBackPopupVisible && user && (
        <View style={styles.welcomeOverlay} pointerEvents="none">
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeTitle}>
              {`Welcome Back, ${user.user_metadata?.full_name || user.email || 'User'}!`}
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Glad to see you again. Enjoy your coffee!
            </Text>
          </View>
        </View>
      )}

      {/* Existing Item Modal */}
      {modalVisible && (
        <Modal
          visible={modalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingTop: 36 }]}> 
              {/* Close button for item modal */}
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync();
                  setModalVisible(false);
                  setSelectedItem(null);
                  setSugarChoice(null);
                  setMilkChoice(null);
                  setExtraShot(null);
                  setQuantity(1);
                }}
                style={{ position: 'absolute', top: 10, right: 10, zIndex: 2, backgroundColor: '#fff', borderRadius: 20, padding: 6, elevation: 2 }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 18, color: '#333', fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
              <ScrollView contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
                <Text style={[styles.subtitle, { marginBottom: 12, marginTop: 4 }]}>Note: Hot drinks 12 oz (355 ml), Iced drinks 16 oz (473 ml).</Text>
                {selectedItem && (
                  <>
                    <TouchableOpacity onPress={() => setZoomModalVisible(true)} activeOpacity={0.9} style={{ marginBottom: 12 }}>
                      <Image
                        source={selectedItem.image}
                        style={{ width: 180, height: 180, borderRadius: 16, alignSelf: 'center', resizeMode: 'cover' }}
                      />
                      <Text style={{ textAlign: 'center', color: '#888', fontSize: 13, marginTop: 4 }}>Click to view</Text>
                    </TouchableOpacity>
                    <Modal
                      visible={zoomModalVisible}
                      transparent={true}
                      animationType="fade"
                      onRequestClose={() => setZoomModalVisible(false)}
                    >
                      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center', paddingTop: 40 }}>
                        {/* Close button for zoom modal */}
                        <TouchableOpacity onPress={() => setZoomModalVisible(false)} style={{ position: 'absolute', top: 40, right: 30, zIndex: 2, backgroundColor: '#fff', borderRadius: 20, padding: 8 }}>
                          <Text style={{ fontSize: 18, color: '#333', fontWeight: '700' }}>✕</Text>
                        </TouchableOpacity>
                        <PinchGestureHandler
                          onGestureEvent={handlePinchEvent}
                          onHandlerStateChange={handlePinchStateChange}
                        >
                          <Animated.Image
                            source={selectedItem.image}
                            style={{
                              width: window.width * 0.9,
                              height: window.width * 0.9,
                              borderRadius: 20,
                              transform: [{ scale }],
                              resizeMode: 'contain',
                              backgroundColor: '#222',
                            }}
                          />
                        </PinchGestureHandler>
                      </View>
                    </Modal>
                  </>
                )}
                <Text style={[styles.modalTitle, { marginTop: 8 }]}>{selectedItem?.name}</Text>
                <Text style={styles.modalPrice}>{selectedItem ? `$${selectedItem.price.toFixed(2)}` : ""}</Text>

                {selectedItem && americanoIds.has(selectedItem.drink_id) && (
                  <>
                    <Text style={styles.modalSubtitle}>Sugar Level?</Text>
                    <View style={styles.sugarMeterRow}>
                      {['none', 'less', 'regular', 'more'].map((level, idx) => (
                        <View key={level} style={styles.sugarMeterSegment}>
                          <TouchableOpacity
                            style={[styles.sugarMeterCircle, sugarChoice === level && styles.sugarMeterCircleSelected]}
                            onPress={() => { Haptics.impactAsync(); setSugarChoice(level); }}
                            activeOpacity={0.8}
                          >
                            {sugarChoice === level && <View style={styles.sugarMeterCircleInner} />}
                          </TouchableOpacity>
                          <Text style={[styles.sugarMeterLabel, sugarChoice === level && styles.sugarMeterLabelSelected]}>{level.charAt(0).toUpperCase() + level.slice(1)}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={styles.modalSubtitle}>Extra Espresso Shot?</Text>
                    <View style={styles.choiceRow}>
                      <TouchableOpacity
                        style={[styles.choiceButton, extraShot === true && styles.choiceButtonSelected]}
                        onPress={() => { Haptics.impactAsync(); setExtraShot(true); }}
                      >
                        <Text style={[styles.choiceText, extraShot === true && styles.choiceTextSelected]}>Yes</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.choiceButton, extraShot === false && styles.choiceButtonSelected]}
                        onPress={() => { Haptics.impactAsync(); setExtraShot(false); }}
                      >
                        <Text style={[styles.choiceText, extraShot === false && styles.choiceTextSelected]}>No</Text>
                      </TouchableOpacity>
                    </View>
                    {extraShot === true && (
                      <Text style={{ color: '#a0b796', fontSize: 14, fontWeight: '600', marginTop: 4, marginBottom: 8 }}>
                        +$1.50 for extra shot
                      </Text>
                    )}
                  </>
                )}

                {selectedItem && milkIds.has(selectedItem.drink_id) && !americanoIds.has(selectedItem.drink_id) && (
                  <>
                    <Text style={styles.modalSubtitle}>Sugar Level?</Text>
                    <View style={styles.sugarMeterRow}>
                      {['none', 'less', 'regular', 'more'].map((level, idx) => (
                        <View key={level} style={styles.sugarMeterSegment}>
                          <TouchableOpacity
                            style={[styles.sugarMeterCircle, sugarChoice === level && styles.sugarMeterCircleSelected]}
                            onPress={() => { Haptics.impactAsync(); setSugarChoice(level); }}
                            activeOpacity={0.8}
                          >
                            {sugarChoice === level && <View style={styles.sugarMeterCircleInner} />}
                          </TouchableOpacity>
                          <Text style={[styles.sugarMeterLabel, sugarChoice === level && styles.sugarMeterLabelSelected]}>{level.charAt(0).toUpperCase() + level.slice(1)}</Text>
                        </View>
                      ))}
                    </View>

                    <Text style={styles.modalSubtitle}>Milk Type?</Text>
                    <View style={styles.choiceRow}>
                      <TouchableOpacity
                        style={[styles.choiceButton, milkChoice === "milk" && styles.choiceButtonSelected]}
                        onPress={() => { Haptics.impactAsync(); setMilkChoice("milk"); }}
                      >
                        <Text style={[styles.choiceText, milkChoice === "milk" && styles.choiceTextSelected]}>Regular Milk</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.choiceButton, milkChoice === "oat" && styles.choiceButtonSelected]}
                        onPress={() => { Haptics.impactAsync(); setMilkChoice("oat"); }}
                      >
                        <Text style={[styles.choiceText, milkChoice === "oat" && styles.choiceTextSelected]}>Oat Milk</Text>
                      </TouchableOpacity>
                    </View>
                    {milkChoice === 'oat' && (
                      <Text style={{ color: '#000', fontSize: 14, fontWeight: '600', marginTop: 4, marginBottom: 8 }}>
                        +$0.50 for oat milk
                      </Text>
                    )}
                   {/* Only show Extra Espresso Shot for coffee drinks (not matcha), and for Americano */}
                   {drinksWithExtraShot.has(selectedItem.drink_id) && !americanoIds.has(selectedItem.drink_id) && (
                     <>
                       <Text style={styles.modalSubtitle}>Extra Espresso Shot?</Text>
                       <View style={styles.choiceRow}>
                         <TouchableOpacity
                           style={[styles.choiceButton, extraShot === true && styles.choiceButtonSelected]}
                           onPress={() => { Haptics.impactAsync(); setExtraShot(true); }}
                         >
                           <Text style={[styles.choiceText, extraShot === true && styles.choiceTextSelected]}>Yes</Text>
                         </TouchableOpacity>
                         <TouchableOpacity
                           style={[styles.choiceButton, extraShot === false && styles.choiceButtonSelected]}
                           onPress={() => { Haptics.impactAsync(); setExtraShot(false); }}
                         >
                           <Text style={[styles.choiceText, extraShot === false && styles.choiceTextSelected]}>No</Text>
                         </TouchableOpacity>
                       </View>
                       {extraShot === true && (
                         <Text style={{ color: '#000', fontSize: 14, fontWeight: '600', marginTop: 4, marginBottom: 8 }}>
                           +$1.50 for extra shot
                         </Text>
                       )}
                     </>
                   )}
                  </>
                )}

                {/* Special case: Espresso Tonic extra shot */}
                {selectedItem && selectedItem.drink_id === "7" && (
                  <>
                    <Text style={styles.modalSubtitle}>Extra Espresso Shot?</Text>
                    <View style={styles.choiceRow}>
                      <TouchableOpacity
                        style={[styles.choiceButton, extraShot === true && styles.choiceButtonSelected]}
                        onPress={() => { Haptics.impactAsync(); setExtraShot(true); }}
                      >
                        <Text style={[styles.choiceText, extraShot === true && styles.choiceTextSelected]}>Yes</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.choiceButton, extraShot === false && styles.choiceButtonSelected]}
                        onPress={() => { Haptics.impactAsync(); setExtraShot(false); }}
                      >
                        <Text style={[styles.choiceText, extraShot === false && styles.choiceTextSelected]}>No</Text>
                      </TouchableOpacity>
                    </View>
                    {extraShot === true && (
                      <Text style={{ color: '#a0b796', fontSize: 14, fontWeight: '600', marginTop: 4, marginBottom: 8 }}>
                        +$1.50 for extra shot
                      </Text>
                    )}
                  </>
                )}

                <Text style={[styles.modalSubtitle, { marginTop: 8 }]}>Quantity</Text>
                <View style={styles.quantityRow}>
                  <TouchableOpacity
                    style={styles.qtyButton}
                    onPressIn={() => startHold(decrementQty)}
                    onPressOut={stopHold}
                  >
                    <Text style={styles.qtyText}>–</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyNumber}>{quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyButton}
                    onPressIn={() => startHold(incrementQty)}
                    onPressOut={stopHold}
                  >
                    <Text style={styles.qtyText}>+</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[
                    styles.addToCartButton,
                    quantity === 0 ||
                    (selectedItem && americanoIds.has(selectedItem.drink_id) && sugarChoice === null) ||
                    (selectedItem && milkIds.has(selectedItem.drink_id) && (sugarChoice === null || milkChoice === null)) ||
                    (selectedItem && ((americanoIds.has(selectedItem.drink_id) && extraShot === null) || (drinksWithExtraShot.has(selectedItem.drink_id) && !americanoIds.has(selectedItem.drink_id) && extraShot === null)))
                      ? styles.addToCartButtonDisabled
                      : null
                    , { marginBottom: 16 }
                  ]}
                  onPress={handleAddToCart}
                  disabled={
                    quantity === 0 ||
                    (selectedItem && americanoIds.has(selectedItem.drink_id) && sugarChoice === null) ||
                    (selectedItem && milkIds.has(selectedItem.drink_id) && (sugarChoice === null || milkChoice === null)) ||
                    (selectedItem && ((americanoIds.has(selectedItem.drink_id) && extraShot === null) || (drinksWithExtraShot.has(selectedItem.drink_id) && !americanoIds.has(selectedItem.drink_id) && extraShot === null)))
                  }
                >
                  <Text style={styles.addToCartText}>Add to Cart</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cancelButton, { marginTop: 0, marginBottom: 4 }]}
                  onPress={() => {
                    Haptics.impactAsync();
                    setModalVisible(false)
                    setSelectedItem(null)
                    setSugarChoice(null)
                    setMilkChoice(null)
                    setExtraShot(null)
                    setQuantity(1)
                  }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
               </ScrollView>
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 300,
    maxWidth: 220,
  },
  cardContent: {
    padding: 16,
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    flex: 1,
    justifyContent: 'flex-start',
  },
  image: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#f8f8f8',
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: 2,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2c1810",
    marginBottom: 2,
  },
  description: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
    flexShrink: 1,
  },
  price: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6b4a3e",
    marginTop: 2,
    marginBottom: 0,
    textAlign: 'center',
  },
  addButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#a0b796",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "600",
  },
  cartButton: {
    backgroundColor: "#a0b796",
    paddingVertical: 22,
    paddingHorizontal: 32,
    borderRadius: 32,
    shadowColor: "#6b4a3e",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartButtonText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  // Welcome Popup Styles
  welcomeOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  welcomeContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2c1810",
    marginBottom: 8,
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  welcomeSignupButton: {
    backgroundColor: '#a0b796',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    width: '100%',
  },
  welcomeButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  welcomeLoginButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#a0b796',
    width: '100%',
  },
  welcomeLoginButtonText: {
    color: '#a0b796',
    fontSize: 16,
    fontWeight: '600',
  },
  welcomeExitButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  welcomeExitText: {
    color: "#999",
    fontSize: 16,
    fontWeight: "500",
  },
  // Existing Modal Styles
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
    maxHeight: '90%',
    overflow: 'scroll',
    paddingBottom: 16,
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
    textAlign: 'center',
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
    backgroundColor: "#a0b796",
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
    justifyContent: "center",
    marginVertical: 12,
    width: '100%',
  },
  qtyButton: {
    backgroundColor: '#a0b796',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  qtyText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  qtyNumber: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginHorizontal: 20,
  },
  addToCartButton: {
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
    alignSelf: 'center',
  },
  cancelText: {
    color: "#6b4a3e",
    fontSize: 16,
    fontWeight: "500",
  },
  swipeHint: {
    fontSize: 13,
    color: '#888',
    marginLeft: 16,
    marginBottom: 2,
    fontStyle: 'italic',
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    left: -8,
    backgroundColor: '#d32f2f',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    zIndex: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  cartBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sugarMeterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    alignSelf: 'center',
    marginBottom: 16,
    marginTop: 10,
  },
  sugarMeterSegment: {
    alignItems: 'center',
    flex: 1,
  },
  sugarMeterCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#a0b796',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  sugarMeterCircleSelected: {
    backgroundColor: '#fff',
    borderColor: '#a0b796',
  },
  sugarMeterCircleInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#a0b796',
  },
  sugarMeterLabel: {
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  sugarMeterLabelSelected: {
    color: '#000',
    fontWeight: '700',
  },
  cartButtonAnimated: {
    position: "absolute",
    bottom: 30,
    right: 20,
    left: 20,
    zIndex: 10,
  },
})