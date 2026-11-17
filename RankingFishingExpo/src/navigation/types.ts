import { NavigatorScreenParams } from '@react-navigation/native';
import { Conversation, Capture } from '../store/types';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Rankings: undefined;
  NewCapture: undefined;
  Chat: NavigatorScreenParams<ChatStackParamList> | undefined;
  Profile: NavigatorScreenParams<ProfileStackParamList> | undefined;
};

export type ChatStackParamList = {
  ChatList: undefined;
  Conversation: { conversation: Conversation };
  NewConversation: undefined;
};

export type ProfileStackParamList = {
  ProfileMain: undefined;
  Badges: undefined;
  MyCaptures: undefined;
};

export type MainStackParamList = {
  Tabs: NavigatorScreenParams<MainTabParamList>;
  UserProfile: { userId: string };
  UserSearch: undefined;
  FollowList: { userId: string; type: 'followers' | 'following' };
  FollowRequests: undefined;
  // ─── Captures, profil & paramètres ───
  Settings: undefined;
  EditProfile: undefined;
  Premium: undefined;
  Onboarding: undefined;
};

export type RootStackParamList = {
  // Présentation au premier lancement (issue #25), avant connexion ou app
  Welcome: undefined;
  AuthStack: undefined;
  MainTabs: undefined;
  // focusComment : ouvre le détail avec le champ commentaire actif (bouton commentaires du feed)
  CaptureDetail: { capture: Capture; focusComment?: boolean };
};
