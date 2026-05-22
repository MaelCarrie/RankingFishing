import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppSelector } from '../store';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList, ChatStackParamList, ProfileStackParamList, MainStackParamList } from './types';
import { colors, typography } from '../theme';

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

const Tab = createBottomTabNavigator<MainTabParamList>();
const ChatStack = createNativeStackNavigator<ChatStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

function ChatNavigator() {
  return (
    <ChatStack.Navigator>
      <ChatStack.Screen name="ChatList" component={ChatScreen} options={{ title: 'Messages' }} />
      <ChatStack.Screen
        name="Conversation"
        component={ConversationScreen}
        options={({ route }) => ({
          title: route.params.conversation.type === 'group'
            ? route.params.conversation.name ?? 'Groupe'
            : route.params.conversation.participantNames.find((n) => n !== 'PierreM') ?? 'Conversation',
          headerTintColor: colors.primary,
        })}
      />
    </ChatStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} options={{ title: 'Mon profil' }} />
      <ProfileStack.Screen name="Badges" component={BadgesScreen} options={{ title: 'Mes badges', headerTintColor: colors.primary }} />
      <ProfileStack.Screen name="MyCaptures" component={CapturesScreen} options={{ title: 'Mes captures', headerTintColor: colors.primary }} />
    </ProfileStack.Navigator>
  );
}

// Bouton central "+" pour nouvelle capture
function AddButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.addButton} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name="add" size={28} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

// Bouton loupe (header) → ouvre l'écran de recherche dans le MainStack parent
function SearchHeaderButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.headerIconBtn}>
      <Ionicons name="search-outline" size={22} color={colors.primary} />
    </TouchableOpacity>
  );
}

// Cloche (header) avec pastille rouge si demandes pendantes → ouvre FollowRequests
function BellHeaderButton({ onPress }: { onPress: () => void }) {
  const count = useAppSelector((s) => s.auth.pendingRequestsCount);
  return (
    <TouchableOpacity onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.headerIconBtn}>
      <Ionicons name="notifications-outline" size={22} color={colors.primary} />
      {count > 0 && (
        <View style={styles.bellBadge}>
          <Text style={styles.bellBadgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// Groupe cloche + loupe pour le header droit
function HeaderRightActions({ navigation }: { navigation: any }) {
  const goSearch = () => navigation.getParent()?.navigate('UserSearch');
  const goRequests = () => navigation.getParent()?.navigate('FollowRequests');
  return (
    <View style={styles.headerRightGroup}>
      <BellHeaderButton onPress={goRequests} />
      <SearchHeaderButton onPress={goSearch} />
    </View>
  );
}

function TabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: route.name === 'Home' || route.name === 'Rankings',
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { ...typography.h4, color: colors.textPrimary },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarIcon: ({ color, focused }) => {
          const icons: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
            Home: ['home', 'home-outline'],
            Rankings: ['trophy', 'trophy-outline'],
            NewCapture: ['add-circle', 'add-circle-outline'],
            Chat: ['chatbubbles', 'chatbubbles-outline'],
            Profile: ['person', 'person-outline'],
          };
          const [activeIcon, inactiveIcon] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={focused ? activeIcon : inactiveIcon} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={({ navigation }) => ({
          title: 'Accueil',
          headerTitle: '🎣 RankingFishing',
          headerRight: () => <HeaderRightActions navigation={navigation} />,
        })}
      />
      <Tab.Screen
        name="Rankings"
        component={RankingsScreen}
        options={({ navigation }) => ({
          title: 'Classements',
          headerRight: () => <HeaderRightActions navigation={navigation} />,
        })}
      />
      <Tab.Screen
        name="NewCapture"
        component={NewCaptureScreen}
        options={({ navigation }) => ({
          title: 'Capturer',
          headerShown: true,
          headerTitle: 'Nouvelle capture',
          headerTintColor: colors.primary,
          tabBarButton: (props) => (
            <AddButton onPress={() => navigation.navigate('NewCapture')} />
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
    <MainStack.Navigator screenOptions={{ headerTintColor: colors.primary }}>
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
    </MainStack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 6,
    paddingTop: 4,
  },
  tabBarLabel: {
    ...typography.caption,
    fontWeight: '600',
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  headerIconBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: 'relative',
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 4,
    backgroundColor: colors.error,
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  bellBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
