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

export type RootStackParamList = {
  AuthStack: undefined;
  MainTabs: undefined;
  CaptureDetail: { capture: Capture };
};
