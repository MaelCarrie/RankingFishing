import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { MainTabParamList, ChatStackParamList, ProfileStackParamList } from './types';
import { colors, typography } from '../theme';

import HomeScreen from '../screens/home/HomeScreen';
import RankingsScreen from '../screens/rankings/RankingsScreen';
import NewCaptureScreen from '../screens/captures/NewCaptureScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import ConversationScreen from '../screens/chat/ConversationScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import BadgesScreen from '../screens/profile/BadgesScreen';
import CapturesScreen from '../screens/captures/CapturesScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const ChatStack = createNativeStackNavigator<ChatStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

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

export default function MainNavigator() {
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
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Accueil', headerTitle: '🎣 RankingFishing' }} />
      <Tab.Screen name="Rankings" component={RankingsScreen} options={{ title: 'Classements' }} />
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
});
