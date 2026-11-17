import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector } from '../store';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList, ChatStackParamList, ProfileStackParamList, MainStackParamList } from './types';
import { colors } from '../theme';
import IconButton from '../components/ui/IconButton';
import { RootHeader, detailScreenOptions } from './headers';

import HomeScreen from '../screens/home/HomeScreen';
import RankingsScreen from '../screens/rankings/RankingsScreen';
import NewCaptureScreen from '../screens/captures/NewCaptureScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import ConversationScreen from '../screens/chat/ConversationScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import BadgesScreen from '../screens/profile/BadgesScreen';
import CapturesScreen from '../screens/captures/CapturesScreen';
import UserProfileScreen from '../screens/profile/UserProfileScreen';
import UserSearchScreen from '../screens/search/UserSearchScreen';
import FollowListScreen from '../screens/social/FollowListScreen';
import FollowRequestsScreen from '../screens/social/FollowRequestsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import EditProfileScreen from '../screens/settings/EditProfileScreen';
import PremiumScreen from '../screens/premium/PremiumScreen';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const ChatStack = createNativeStackNavigator<ChatStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

function ChatNavigator() {
  return (
    <ChatStack.Navigator screenOptions={{ ...detailScreenOptions, headerBackTitle: 'Retour' }}>
      <ChatStack.Screen
        name="ChatList"
        component={ChatScreen}
        options={{ title: 'Messages', header: () => <RootHeader title="Messages" /> }}
      />
      <ChatStack.Screen
        name="Conversation"
        component={ConversationScreen}
        // Une route par conversation : naviguer vers une autre conversation empile un nouvel écran
        getId={({ params }) => params.conversation.id}
        options={({ route }) => ({
          // Titre provisoire ; ConversationScreen le met à jour depuis le store
          title: route.params.conversation.displayName
            ?? (route.params.conversation.type === 'group'
              ? route.params.conversation.name ?? 'Groupe'
              : route.params.conversation.otherParticipant?.username ?? 'Conversation'),
        })}
      />
      <ChatStack.Screen
        name="NewConversation"
        getComponent={() => require('../screens/chat/NewConversationScreen').default}
        options={{ title: 'Nouveau message' }}
      />
    </ChatStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={detailScreenOptions}>
      <ProfileStack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{ title: 'Mon profil', header: () => <RootHeader title="Mon profil" /> }}
      />
      <ProfileStack.Screen name="Badges" component={BadgesScreen} options={{ title: 'Mes badges' }} />
      <ProfileStack.Screen name="MyCaptures" component={CapturesScreen} options={{ title: 'Mes captures' }} />
    </ProfileStack.Navigator>
  );
}

/** Onglet central « + » : carré arrondi vert de 52 pt, intégré à la barre (pas flottant). */
function AddTabButton({ onPress, selected }: { onPress: () => void; selected: boolean }) {
  return (
    <View style={styles.addSlot}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="Publier une prise"
        accessibilityState={{ selected }}
        style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
        testID="tab-new-capture"
      >
        <Ionicons name="add" size={30} color={colors.textOnPrimary} />
      </Pressable>
    </View>
  );
}

/** Actions des en-têtes racines : recherche + demandes d'abonnement (avec compteur). */
function RootHeaderActions({ navigation }: { navigation: any }) {
  const count = useAppSelector((s) => s.auth.pendingRequestsCount);
  const goSearch = () => navigation.getParent()?.navigate('UserSearch');
  const goRequests = () => navigation.getParent()?.navigate('FollowRequests');
  return (
    <>
      <IconButton icon="search-outline" accessibilityLabel="Rechercher un pêcheur" onPress={goSearch} />
      <IconButton
        icon="notifications-outline"
        accessibilityLabel="Demandes d'abonnement"
        badgeCount={count}
        onPress={goRequests}
      />
    </>
  );
}

const TAB_ICONS: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ['home', 'home-outline'],
  Rankings: ['trophy', 'trophy-outline'],
  Chat: ['chatbubbles', 'chatbubbles-outline'],
  Profile: ['person', 'person-outline'],
};

/** Hauteur utile de la barre d'onglets (hors zone sûre) : loge le « + » de 52 pt. */
const TAB_BAR_CONTENT = 56;
const TAB_BAR_PAD = 6;

/**
 * Écrans poussés dans les piles des onglets : la barre d'onglets s'efface,
 * comme sur les écrans de la pile principale (détail, profil public, Paramètres…).
 * Le champ de saisie de Conversation repose ainsi sur la zone sûre.
 */
const ROUTES_WITHOUT_TAB_BAR = new Set(['Conversation', 'NewConversation', 'Badges', 'MyCaptures']);

function TabsNavigator() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // Route focalisée dans la pile imbriquée (Chat, Profil), lue aussi dans les params
        // avant le premier rendu de la pile (ex. popTo vers Chat → Conversation).
        tabBarStyle: ROUTES_WITHOUT_TAB_BAR.has(getFocusedRouteNameFromRoute(route) ?? '')
          ? { display: 'none' }
          : [
            styles.tabBar,
            {
              height: TAB_BAR_CONTENT + TAB_BAR_PAD * 2 + insets.bottom,
              paddingBottom: TAB_BAR_PAD + insets.bottom,
            },
          ],
        headerShown: route.name === 'Home' || route.name === 'Rankings' || route.name === 'NewCapture',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkSecondary,
        tabBarHideOnKeyboard: true,
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarAllowFontScaling: false,
        sceneStyle: { backgroundColor: colors.background },
        tabBarIcon: ({ color, focused }) => {
          const [activeIcon, inactiveIcon] = TAB_ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={focused ? activeIcon : inactiveIcon} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={({ navigation }) => ({
          title: 'Accueil',
          header: () => <RootHeader title="Accueil" actions={<RootHeaderActions navigation={navigation} />} />,
        })}
      />
      <Tab.Screen
        name="Rankings"
        component={RankingsScreen}
        options={({ navigation }) => ({
          // Libellé d'onglet court pour ne pas être tronqué ; grand titre au pluriel
          title: 'Classement',
          header: () => <RootHeader title="Classements" actions={<RootHeaderActions navigation={navigation} />} />,
        })}
      />
      <Tab.Screen
        name="NewCapture"
        component={NewCaptureScreen}
        options={({ navigation }) => ({
          title: 'Publier',
          header: () => <RootHeader title="Nouvelle capture" />,
          tabBarButton: () => (
            <AddTabButton
              onPress={() => navigation.navigate('NewCapture')}
              selected={navigation.isFocused()}
            />
          ),
        })}
      />
      <Tab.Screen name="Chat" component={ChatNavigator} options={{ title: 'Messages', headerShown: false }} />
      <Tab.Screen name="Profile" component={ProfileNavigator} options={{ title: 'Profil', headerShown: false }} />
    </Tab.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <MainStack.Navigator screenOptions={detailScreenOptions}>
      <MainStack.Screen name="Tabs" component={TabsNavigator} options={{ headerShown: false }} />
      <MainStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ title: 'Profil', headerBackTitle: 'Retour' }}
      />
      <MainStack.Screen
        name="UserSearch"
        component={UserSearchScreen}
        options={{ title: 'Rechercher', headerBackTitle: 'Retour' }}
      />
      <MainStack.Screen
        name="FollowList"
        component={FollowListScreen}
        options={{ title: 'Abonnés', headerBackTitle: 'Retour' }}
      />
      <MainStack.Screen
        name="FollowRequests"
        component={FollowRequestsScreen}
        options={{ title: 'Demandes', headerBackTitle: 'Retour' }}
      />
      {/* ─── Captures, profil & paramètres ─── */}
      <MainStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Paramètres', headerBackTitle: 'Retour' }}
      />
      <MainStack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Modifier le profil', headerBackTitle: 'Retour' }}
      />
      <MainStack.Screen
        name="Premium"
        component={PremiumScreen}
        options={{ title: 'Premium', headerBackTitle: 'Retour' }}
      />
      <MainStack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'fade' }}
      />
    </MainStack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.hairline,
    borderTopWidth: 1,
    paddingTop: TAB_BAR_PAD,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabBarItem: { paddingHorizontal: 0, paddingVertical: 0, justifyContent: 'center' },
  tabBarLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    marginTop: 3,
    // Web : même pile système que le reste de l'app (le thème de navigation impose system-ui)
    ...(Platform.OS === 'web'
      ? { fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }
      : null),
  },
  addSlot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonPressed: { backgroundColor: colors.primaryDark, transform: [{ scale: 0.96 }] },
});
