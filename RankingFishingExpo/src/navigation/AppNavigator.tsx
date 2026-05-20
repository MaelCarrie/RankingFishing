import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useAppDispatch, useAppSelector } from '../store';
import { initAuth, refreshUser } from '../store/slices/authSlice';
import { colors } from '../theme';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';

const Root = createNativeStackNavigator<RootStackParamList>();

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export default function AppNavigator() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(initAuth()).then((action) => {
      if (initAuth.fulfilled.match(action) && action.payload) {
        dispatch(refreshUser(action.payload.id));
      }
    });
  }, [dispatch]);

  if (isLoading) return <LoadingScreen />;

  return (
    <NavigationContainer>
      <Root.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {isAuthenticated ? (
          <Root.Screen name="MainTabs" component={MainNavigator} />
        ) : (
          <Root.Screen name="AuthStack" component={AuthNavigator} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
