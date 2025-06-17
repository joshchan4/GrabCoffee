import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Easing,
  StatusBar,
  Platform,
} from "react-native";

const { width, height } = Dimensions.get("window");

export default function CoverScreen({ onFinish }) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const [buttonLayout, setButtonLayout] = useState(null);
  const [circlePosition, setCirclePosition] = useState({ x: width / 2 - 100, y: height / 2 - 100 });

  const triggerTransition = () => {
    if (!buttonLayout) return;
  
    const centerX = buttonLayout.x + buttonLayout.width / 2 - 100;
    const centerY = buttonLayout.y + buttonLayout.height / 2 + 550;
    setCirclePosition({ x: centerX, y: centerY });
  
    // Start long animation
    Animated.timing(scaleAnim, {
      toValue: 25,
      duration: 10000,
      easing: Easing.out(Easing.circle),
      useNativeDriver: true,
    }).start();
  
    // Cut it off early by triggering fade after a few seconds
    setTimeout(() => {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onFinish?.();
      });
    }, 1000);
  };  

  return (
    <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
      <StatusBar translucent backgroundColor="transparent" />

      <View style={styles.mainContent}>
        <Text style={styles.mainText}>GRAB</Text>
        <Text style={styles.mainText}>COFFEE.</Text>
      </View>

      <View style={styles.bottomContent}>
        <Text style={styles.tagline}>That Daily Good</Text>
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={triggerTransition}
          onLayout={(e) => setButtonLayout(e.nativeEvent.layout)}
        >
          <Text style={styles.getStartedText}>Order Now</Text>
        </TouchableOpacity>
      </View>

      {buttonLayout && (
        <Animated.View
          style={[
            styles.circle,
            {
              left: circlePosition.x,
              top: circlePosition.y,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#a8e4a0",
    zIndex: 10,
  },
  mainContent: {
    position: "absolute",
    top: height * 0.27,
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  mainText: {
    fontSize: 46,
    color: "white",
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 54,
    textTransform: "uppercase",
    ...Platform.select({
      ios: { fontFamily: "AvenirNext-Bold", fontWeight: "500" },
      android: { fontFamily: "sans-serif-condensed", fontWeight: "normal" },
      web: { fontFamily: "Segoe UI Black, Arial Black, sans-serif", fontWeight: "500" },
      default: { fontFamily: "System", fontWeight: "800" },
    }),
  },
  bottomContent: {
    position: "absolute",
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  tagline: {
    color: "white",
    fontSize: 18,
    fontWeight: "500",
    marginBottom: 40,
    textAlign: "center",
    opacity: 0.9,
  },
  getStartedButton: {
    backgroundColor: "white",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  getStartedText: {
    color: "#a8e4a0",
    fontSize: 16,
    fontWeight: "bold",
  },
  circle: {
    position: "absolute",
    width: 200,
    height: 200,
    backgroundColor: "#fefefe",
    borderRadius: 100,
    zIndex: 20,
  },
});
