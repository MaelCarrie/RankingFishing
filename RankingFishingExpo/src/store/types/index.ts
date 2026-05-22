// ─── User ────────────────────────────────────────────────────────────────────

export type FishingType =
  | 'carp'
  | 'predators'
  | 'sea'
  | 'trout'
  | 'catfish'
  | 'coarse'
  | 'streetfishing'
  | 'fly';

export type ExpertiseLevel = 'beginner' | 'intermediate' | 'expert';

export interface FishingSpecialty {
  type: FishingType;
  level: ExpertiseLevel;
}

export interface UserStats {
  totalCaptures: number;
  totalWeightGrams: number;
  biggestFish: CaptureRef | null;
  globalRank: number | null;
  regionalRank: number | null;
  challengesWon: number;
}

export interface CaptureRef {
  captureId: string;
  species: string;
  weightGrams: number;
  sizeCm: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  location?: string;
  region?: string;
  isPremium: boolean;
  xp: number;
  level: number;
  levelName: string;
  specialties: FishingSpecialty[];
  stats: UserStats;
  createdAt: string; // ISO date string
}

// ─── Fish Species ─────────────────────────────────────────────────────────────

export interface FishSpecies {
  id: string;
  name: string;
  nameFr: string;
  category: 'freshwater' | 'saltwater' | 'migratory';
  icon: string; // emoji
  scoreCoefficient: number;
  rarityScore: number; // 1-20
}

// ─── Capture ──────────────────────────────────────────────────────────────────

export type WeatherCondition =
  | 'sunny'
  | 'cloudy'
  | 'rainy'
  | 'windy'
  | 'stormy'
  | 'foggy';

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface Capture {
  id: string;
  userId: string;
  username: string;
  userAvatar?: string;
  species: FishSpecies;
  weightGrams: number;
  sizeCm: number;
  photos: string[];
  description?: string;
  location?: GeoPoint;
  locationName?: string;
  weather?: WeatherCondition;
  publishedAt: string; // ISO date string
  isDraft: boolean;
  validationScore: number; // 0-100
  score: number; // calculated ranking score
  likes: number;
  comments: number;
  isLiked: boolean;
}

export interface Comment {
  id: string;
  captureId: string;
  userId: string;
  username: string;
  userAvatar?: string;
  content: string;
  createdAt: string; // ISO date string
}

export interface NewCaptureForm {
  species: FishSpecies | null;
  weightKg: string;
  weightGrams: string;
  sizeCm: string;
  photos: string[];
  description: string;
  weather: WeatherCondition | null;
  publishedAt: string;
  isDraft: boolean;
  location?: GeoPoint;
}

// ─── Badge ────────────────────────────────────────────────────────────────────

export type BadgeCategory = 'progression' | 'excellence' | 'community' | 'seasonal';
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji or icon key
  category: BadgeCategory;
  tier: BadgeTier;
  isUnlocked: boolean;
  progress: number; // 0-100
  target: string; // e.g. "10 captures"
  unlockedAt?: string; // ISO date string
  xpReward: number;
}

// ─── Rankings ─────────────────────────────────────────────────────────────────

export type RankingType = 'global' | 'regional' | 'species' | 'friends';
export type RankingPeriod = 'day' | 'week' | 'month' | 'year' | 'alltime';

export interface RankingEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  score: number;
  totalCaptures: number;
  topSpecies?: string;
  region?: string;
  species?: string;
  isCurrentUser?: boolean;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export type MessageType = 'text' | 'image' | 'capture';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  type: MessageType;
  captureRef?: CaptureRef;
  sentAt: string; // ISO date string
  isRead: boolean;
}

export interface Conversation {
  id: string;
  type: 'private' | 'group';
  name?: string;
  avatar?: string;
  participantIds: string[];
  participantNames: string[];
  lastMessage: Message;
  unreadCount: number;
  updatedAt: string; // ISO date string
}

// ─── Redux State ──────────────────────────────────────────────────────────────

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface CapturesState {
  feed: Capture[];
  myCaptures: Capture[];
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
}

export interface RankingsState {
  entries: RankingEntry[];
  currentUserRank: RankingEntry | null;
  type: RankingType;
  period: RankingPeriod;
  selectedSpecies: string; // species_id pour le classement par espèce
  isLoading: boolean;
  error: string | null;
}

export interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Record<string, Message[]>;
  isLoading: boolean;
  error: string | null;
}

export interface BadgesState {
  badges: Badge[];
  isLoading: boolean;
  error: string | null;
}
