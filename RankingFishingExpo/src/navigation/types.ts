import { NavigatorScreenParams } from '@react-navigation/native';
import { Conversation } from '../store/types';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Rankings: undefined;
  NewCapture: undefined;
  Chat: undefined;
  Profile: undefined;
};

export type ChatStackParamList = {
  ChatList: undefined;
  Conversation: { conversation: Conversation };
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
};

export type RootStackParamList = {
  AuthStack: undefined;
  MainTabs: undefined;
};
