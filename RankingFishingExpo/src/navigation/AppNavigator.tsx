import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useAppDispatch, useAppSelector } from '../store';
import { initAuth, refreshUser, refreshPendingCount } from '../store/slices/authSlice';
import { colors, typography } from '../theme';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { detailScreenOptions } from './headers';
import CaptureDetailScreen from '../screens/captures/CaptureDetailScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import { hasSeenOnboarding } from '../utils/preferences';

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
  // Onboarding (issue #25) : null tant que le drapeau AsyncStorage n'est pas lu
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    hasSeenOnboarding().then(setOnboardingDone);
  }, []);

  useEffect(() => {
    dispatch(initAuth()).then((action) => {
      if (initAuth.fulfilled.match(action) && action.payload) {
        dispatch(refreshUser(action.payload.id));
        dispatch(refreshPendingCount(action.payload.id));
      }
    });
  }, [dispatch]);

  if (isLoading || onboardingDone === null) return <LoadingScreen />;

  return (
    <NavigationContainer>
      <Root.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!onboardingDone ? (
          <Root.Screen name="Welcome">
            {() => <OnboardingScreen onDone={() => setOnboardingDone(true)} />}
          </Root.Screen>
        ) : isAuthenticated ? (
          <>
            <Root.Screen name="MainTabs" component={MainNavigator} />
            <Root.Screen
              name="CaptureDetail"
              component={CaptureDetailScreen}
              options={{
                ...detailScreenOptions,
                headerShown: true,
                animation: 'slide_from_right',
                title: 'Prise',
              }}
            />
          </>
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
