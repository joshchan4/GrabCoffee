// src/screens/CoverScreen.js
import React, { useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Platform,
} from "react-native"

export default function CoverScreen({ navigation }) {

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" />

      <View style={styles.mainContent}>
        <Text style={styles.mainText}>GRAB</Text>
        <Text style={styles.mainText}>COFFEE.</Text>
      </View>

      <View style={styles.bottomContent}>
        <Text style={styles.tagline}>That Daily Good</Text>
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={() => navigation.replace("Menu")}
        >
          <Text style={styles.getStartedText}>Order Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const { width, height } = Dimensions.get("window")

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#a8e4a0",
  },
  mainContent: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 300,
  },
  mainText: {
    fontSize: 46,
    color: "white",
    textAlign: "center",
    letterSpacing: -0.5,    // tighten spacing for a condensed look
    lineHeight: 54,
    textTransform: "uppercase",
    ...Platform.select({
      ios: {
        fontFamily: "AvenirNext-Bold",
        fontWeight: "500",
      },
      android: {
        fontFamily: "sans-serif-condensed",
        fontWeight: "normal",
      },
      web: {
        fontFamily: "Segoe UI Black, Arial Black, sans-serif",
        fontWeight: "500",
      },
      default: {
        fontFamily: "System",
        fontWeight: "800",
      },
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
    marginBottom: 90,
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
})
