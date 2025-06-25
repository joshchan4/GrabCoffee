import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import CoverScreen from './CoverScreen';
import MenuScreen from './MenuScreen';

export default function RootScreen({ navigation }) {
  const [showCover, setShowCover] = useState(true);

  return (
    <View style={styles.container}>
      <MenuScreen navigation={navigation} showWelcomePopup={!showCover} />
      {showCover && (
        <CoverScreen onFinish={() => setShowCover(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});
