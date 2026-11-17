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
  followersCount: number;
  followingCount: number;
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
  caughtAt?: string; // ISO date string — date/heure réelle de la prise (colonne caught_at)
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
  publishedAt: string; // utilisé comme date/heure de la prise (caught_at)
  isDraft: boolean;
  location?: GeoPoint;
  locationName?: string; // Premium : lieu lisible issu du géocodage inverse
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
  // Critère de déblocage (table badges) et valeur courante (user_badges.current_value)
  metric?: string; // 'total_captures' | 'species_weight' | 'global_rank' | 'validations' | 'seasonal_captures'
  targetValue?: number;
  currentValue?: number | null;
  targetSpecies?: string;
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
  level?: number;
  /**
   * Rang précédent, s'il est connu. La vue `rankings` de production ne le fournit
   * pas encore (RankRow n'affiche alors rien) ; seul le mock le dérive.
   */
  previousRank?: number | null;
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
  // Infos d'affichage d'une capture partagée (type = 'capture'), en plus de captureRef
  capturePreview?: SharedCapturePreview;
  // État local d'envoi (optimistic UI). Absent = message confirmé par le serveur.
  status?: MessageStatus;
}

export type MessageStatus = 'sending' | 'sent' | 'failed';

export interface SharedCapturePreview {
  photoUrl?: string;
  speciesIcon?: string;
  score?: number;
  ownerId?: string;
  ownerUsername?: string;
}

export interface ConversationParticipant {
  id: string;
  username: string;
  avatar?: string;
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
  // Participants résolus (id, pseudo, avatar), utilisateur courant inclus
  participants?: ConversationParticipant[];
  // Conversation 1:1 : l'autre pêcheur
  otherParticipant?: ConversationParticipant;
  // Nom et avatar à afficher (nom du groupe ou pseudo de l'autre participant)
  displayName?: string;
  displayAvatar?: string;
  lastReadAt?: string; // ISO date string
}

// ─── Redux State ──────────────────────────────────────────────────────────────

export interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  pendingRequestsCount: number;
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
  // Taille max de la liste affichée (top 100 mondial, top 50 régional…)
  limit?: number;
  // true si la ligne de l'utilisateur fait partie de `entries` (sinon épinglée en bas)
  isCurrentUserInList?: boolean;
  // Région utilisée pour le classement régional en cours (null = non renseignée)
  region?: string | null;
  // Rafraîchissement manuel (pull-to-refresh) en cours
  isRefreshing?: boolean;
  // Identifiant de la dernière requête : ignore les réponses obsolètes
  requestId?: string;
}

export interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Record<string, Message[]>;
  isLoading: boolean;
  error: string | null;
  // Chargement / erreur des messages, par conversation
  messagesLoading?: Record<string, boolean>;
  messagesError?: Record<string, string | null>;
}

export interface BadgesState {
  badges: Badge[];
  isLoading: boolean;
  error: string | null;
  // Badges débloqués par la dernière publication, en attente d'affichage (modal)
  newlyUnlocked?: Badge[];
  // Ids débloqués pendant la session (mise en avant « Nouveau » dans BadgesScreen)
  recentlyUnlockedIds?: string[];
}
