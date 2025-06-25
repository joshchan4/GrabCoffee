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
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get("window");

export default function CoverScreen({ onFinish }) {
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const [buttonLayout, setButtonLayout] = useState(null);

  const triggerTransition = async () => {
    // Special haptic: three quick vibrations, heavy to light
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 100);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 200);

    // Fade in the soft cloud overlay (50% faster)
    Animated.timing(overlayOpacity, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Fade out the whole screen after a shorter delay
    setTimeout(() => {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onFinish?.();
      });
    }, 350);
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}> 
      <StatusBar translucent backgroundColor="transparent" />

      <View style={styles.mainContent}>
        <Text style={styles.mainText}>GRAB</Text>
        <Text style={styles.mainText}>COFFEE</Text>
      </View>

      <View style={styles.bottomContent}>
        <Text style={styles.tagline}>That Daily Good</Text>
        <TouchableOpacity
          style={styles.startButton}
          onPress={triggerTransition}
          onLayout={(e) => setButtonLayout(e.nativeEvent.layout)}
        >
          <Text style={styles.startButtonText}>Order Now</Text>
        </TouchableOpacity>
      </View>

      {/* Soft cloud overlay */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: '#f8f8f8',
            opacity: overlayOpacity,
            zIndex: 20,
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#a0b796",
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
  startButton: {
    backgroundColor: '#a0b796',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});
