import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';

const Tab = createBottomTabNavigator();

// Composants temporaires pour les écrans
const HomeScreen = () => (
  <View style={styles.screen}>
    <Text style={styles.text}>Accueil</Text>
  </View>
);

const CapturesScreen = () => (
  <View style={styles.screen}>
    <Text style={styles.text}>Captures</Text>
  </View>
);

const ChatScreen = () => (
  <View style={styles.screen}>
    <Text style={styles.text}>Chat</Text>
  </View>
);

const ProfileScreen = () => (
  <View style={styles.screen}>
    <Text style={styles.text}>Profil</Text>
  </View>
);

const AppNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#e91e63',
        tabBarInactiveTintColor: 'gray',
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Captures" component={CapturesScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

const App = () => {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 24,
    color: '#000',
  }
});

export default App;