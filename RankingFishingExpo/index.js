import { registerRootComponent } from 'expo';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

console.log('🔥 Index.js is loading');

const App = () => {
  console.log('📱 Simple App is rendering');
  return (
    <View style={styles.container}>
      <Text style={styles.text}>TEST SIMPLE</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 32,
    color: 'white',
  }
});

registerRootComponent(App); 