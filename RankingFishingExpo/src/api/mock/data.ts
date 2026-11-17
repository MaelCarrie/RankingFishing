// ─── Données mock (mode EXPO_PUBLIC_USE_MOCK=1) ─────────────────────────────
//
// Jeu de données cohérent pour faire tourner l'app sans backend :
// pêcheurs français, espèces réelles, poids/tailles crédibles, scores calculés
// avec la vraie formule (calculateCaptureScore), graphe social et chat.
//
// Ce fichier est pur (aucun import natif) pour rester testable sous Jest.
// L'état mutable (comptes inscrits, follows…) vit dans ./db.ts.
// ─────────────────────────────────────────────────────────────────────────────

import {
  User, Capture, Badge, RankingEntry, Conversation, Message, Comment,
  WeatherCondition, FishingSpecialty, UserStats,
} from '../../store/types';
import { FISH_SPECIES, calculateCaptureScore, getLevelFromXP } from '../../config/constants';

const HOUR = 3600000;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

// ─── Compte démo ──────────────────────────────────────────────────────────────

export const MOCK_DEMO_EMAIL = 'demo@rankingfishing.app';
export const MOCK_DEMO_PASSWORD = 'demo1234';

// ─── Utilisateurs ─────────────────────────────────────────────────────────────

function makeUser(u: {
  id: string;
  username: string;
  email: string;
  /** Portrait randomuser.me (« men/NN » ou « women/NN ») cohérent avec le prénom */
  avatarSeed: string;
  bio: string;
  location: string;
  region: string;
  isPremium?: boolean;
  xp: number;
  specialties: FishingSpecialty[];
  stats: UserStats;
  createdAt: string;
}): User {
  const lvl = getLevelFromXP(u.xp);
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    avatar: `https://randomuser.me/api/portraits/${u.avatarSeed}.jpg`,
    bio: u.bio,
    location: u.location,
    region: u.region,
    isPremium: u.isPremium ?? false,
    xp: u.xp,
    level: lvl.level,
    levelName: lvl.name,
    specialties: u.specialties,
    stats: u.stats,
    // Recalculés dynamiquement depuis le graphe social (voir db.ts)
    followersCount: 0,
    followingCount: 0,
    createdAt: u.createdAt,
  };
}

// L'utilisateur démo garde l'id 'user_me' et le pseudo 'PierreM' (référencés par le chat)
export const MOCK_CURRENT_USER: User = makeUser({
  id: 'user_me',
  username: 'PierreM',
  email: MOCK_DEMO_EMAIL,
  avatarSeed: 'men/32',
  bio: 'Carpiste depuis 20 ans, je traque aussi le sandre l\'hiver. Basé à Rennes.',
  location: 'Rennes, Ille-et-Vilaine',
  region: 'Bretagne',
  xp: 1250,
  specialties: [
    { type: 'carp', level: 'expert' },
    { type: 'predators', level: 'intermediate' },
  ],
  stats: {
    totalCaptures: 47,
    totalWeightGrams: 187500,
    biggestFish: { captureId: 'cap_me_1', species: 'Carpe', weightGrams: 18200, sizeCm: 102 },
    globalRank: 12,
    regionalRank: 2,
    challengesWon: 5,
  },
  createdAt: '2023-06-15T10:00:00Z',
});

export const MOCK_USERS: User[] = [
  makeUser({
    id: 'user_2', username: 'SilureMaster', email: 'julien@example.com', avatarSeed: 'men/45',
    bio: 'Siluriste sur le Rhône. Record perso : 2,15 m pour 87 kg, relâché.',
    location: 'Lyon, Rhône', region: 'Auvergne-Rhône-Alpes', isPremium: true, xp: 5800,
    specialties: [{ type: 'catfish', level: 'expert' }, { type: 'predators', level: 'intermediate' }],
    stats: {
      totalCaptures: 231, totalWeightGrams: 4200000,
      biggestFish: { captureId: 'cap_2_1', species: 'Silure', weightGrams: 72000, sizeCm: 198 },
      globalRank: 3, regionalRank: 1, challengesWon: 28,
    },
    createdAt: '2022-01-10T08:00:00Z',
  }),
  makeUser({
    id: 'user_3', username: 'BrochetQueen', email: 'sophie@example.com', avatarSeed: 'women/44',
    bio: 'Leurres souples et jerkbaits, en float tube sur les lacs normands.',
    location: 'Rouen, Seine-Maritime', region: 'Normandie', xp: 2100,
    specialties: [{ type: 'predators', level: 'expert' }, { type: 'sea', level: 'beginner' }],
    stats: {
      totalCaptures: 89, totalWeightGrams: 312000,
      biggestFish: { captureId: 'cap_3_1', species: 'Brochet', weightGrams: 9100, sizeCm: 101 },
      globalRank: 5, regionalRank: 1, challengesWon: 12,
    },
    createdAt: '2023-02-20T14:00:00Z',
  }),
  makeUser({
    id: 'user_4', username: 'CarpeFanatik', email: 'marc@example.com', avatarSeed: 'men/52',
    bio: 'Sessions de 72 h en étang, que des grosses communes et des miroirs.',
    location: 'Créteil, Val-de-Marne', region: 'Île-de-France', isPremium: true, xp: 9200,
    specialties: [{ type: 'carp', level: 'expert' }],
    stats: {
      totalCaptures: 412, totalWeightGrams: 8900000,
      biggestFish: { captureId: 'cap_4_1', species: 'Carpe', weightGrams: 26400, sizeCm: 112 },
      globalRank: 1, regionalRank: 1, challengesWon: 47,
    },
    createdAt: '2021-05-01T09:00:00Z',
  }),
  makeUser({
    id: 'user_5', username: 'TruiteurAlpin', email: 'lea@example.com', avatarSeed: 'women/68',
    bio: 'Pêche à la mouche dans les torrents des Hautes-Alpes. No-kill.',
    location: 'Briançon, Hautes-Alpes', region: "Provence-Alpes-Côte d'Azur", xp: 780,
    specialties: [{ type: 'trout', level: 'expert' }, { type: 'fly', level: 'intermediate' }],
    stats: {
      totalCaptures: 56, totalWeightGrams: 78000,
      biggestFish: { captureId: 'cap_5_1', species: 'Truite fario', weightGrams: 1850, sizeCm: 48 },
      globalRank: 9, regionalRank: 1, challengesWon: 3,
    },
    createdAt: '2023-09-01T11:00:00Z',
  }),
  makeUser({
    id: 'user_6', username: 'LePecheur44', email: 'antoine@example.com', avatarSeed: 'men/22',
    bio: 'Silure et sandre en Loire, du bateau ou du bord.',
    location: 'Nantes, Loire-Atlantique', region: 'Pays de la Loire', isPremium: true, xp: 6400,
    specialties: [{ type: 'catfish', level: 'expert' }, { type: 'predators', level: 'expert' }],
    stats: {
      totalCaptures: 289, totalWeightGrams: 3650000,
      biggestFish: { captureId: 'cap_6_1', species: 'Silure', weightGrams: 45000, sizeCm: 182 },
      globalRank: 2, regionalRank: 1, challengesWon: 31,
    },
    createdAt: '2021-11-12T08:00:00Z',
  }),
  makeUser({
    id: 'user_7', username: 'BrochetFou', email: 'nicolas@example.com', avatarSeed: 'men/75',
    bio: 'Brochets XXL au Lac du Der. Big baits only.',
    location: 'Lac du Der, Marne', region: 'Grand Est', xp: 3300,
    specialties: [{ type: 'predators', level: 'expert' }],
    stats: {
      totalCaptures: 178, totalWeightGrams: 640000,
      biggestFish: { captureId: 'cap_7_1', species: 'Brochet', weightGrams: 11400, sizeCm: 108 },
      globalRank: 4, regionalRank: 1, challengesWon: 15,
    },
    createdAt: '2022-04-03T10:00:00Z',
  }),
  makeUser({
    id: 'user_8', username: 'SandreKing', email: 'thomas@example.com', avatarSeed: 'men/11',
    bio: 'Verticale et jig en Loire. Le sandre, c\'est une obsession.',
    location: 'Orléans, Loiret', region: 'Centre-Val de Loire', xp: 2650,
    specialties: [{ type: 'predators', level: 'expert' }, { type: 'streetfishing', level: 'intermediate' }],
    stats: {
      totalCaptures: 145, totalWeightGrams: 410000,
      biggestFish: { captureId: 'cap_8_1', species: 'Sandre', weightGrams: 6300, sizeCm: 83 },
      globalRank: 6, regionalRank: 1, challengesWon: 9,
    },
    createdAt: '2022-08-19T16:00:00Z',
  }),
  makeUser({
    id: 'user_9', username: 'NocturnePeche', email: 'camille@example.com', avatarSeed: 'women/26',
    bio: 'Carpe de nuit au lac de Vouglans. Montages maison.',
    location: 'Lac de Vouglans, Jura', region: 'Bourgogne-Franche-Comté', xp: 2400,
    specialties: [{ type: 'carp', level: 'expert' }, { type: 'coarse', level: 'intermediate' }],
    stats: {
      totalCaptures: 203, totalWeightGrams: 2100000,
      biggestFish: { captureId: 'cap_9_1', species: 'Carpe', weightGrams: 21700, sizeCm: 104 },
      globalRank: 7, regionalRank: 1, challengesWon: 7,
    },
    createdAt: '2022-06-07T21:00:00Z',
  }),
  makeUser({
    id: 'user_10', username: 'LacOuvert', email: 'hugo@example.com', avatarSeed: 'men/60',
    bio: 'Black-bass et perches au lac de Pareloup, en kayak.',
    location: 'Salles-Curan, Aveyron', region: 'Occitanie', xp: 1900,
    specialties: [{ type: 'predators', level: 'intermediate' }],
    stats: {
      totalCaptures: 167, totalWeightGrams: 260000,
      biggestFish: { captureId: 'cap_10_1', species: 'Black-bass', weightGrams: 1900, sizeCm: 47 },
      globalRank: 8, regionalRank: 1, challengesWon: 4,
    },
    createdAt: '2023-01-28T12:00:00Z',
  }),
  makeUser({
    id: 'user_11', username: 'GrandLac76', email: 'manon@example.com', avatarSeed: 'women/57',
    bio: 'Pêche au coup et tanches dans les étangs du pays de Bray.',
    location: 'Forges-les-Eaux, Seine-Maritime', region: 'Normandie', xp: 1600,
    specialties: [{ type: 'coarse', level: 'expert' }, { type: 'carp', level: 'beginner' }],
    stats: {
      totalCaptures: 134, totalWeightGrams: 190000,
      biggestFish: { captureId: 'cap_11_1', species: 'Tanche', weightGrams: 2100, sizeCm: 48 },
      globalRank: 10, regionalRank: 2, challengesWon: 2,
    },
    createdAt: '2023-03-14T09:00:00Z',
  }),
  makeUser({
    id: 'user_12', username: 'BarDuRaz', email: 'yann@example.com', avatarSeed: 'men/86',
    bio: 'Bar aux leurres dans le courant du Raz de Sein. Tout est remis à l\'eau.',
    location: 'Audierne, Finistère', region: 'Bretagne', xp: 1450,
    specialties: [{ type: 'sea', level: 'expert' }],
    stats: {
      totalCaptures: 72, totalWeightGrams: 205000,
      biggestFish: { captureId: 'cap_12_1', species: 'Bar', weightGrams: 4600, sizeCm: 71 },
      globalRank: 11, regionalRank: 1, challengesWon: 6,
    },
    createdAt: '2023-05-02T07:00:00Z',
  }),
];

export const MOCK_ALL_USERS: User[] = [MOCK_CURRENT_USER, ...MOCK_USERS];

function userById(id: string): User {
  const u = MOCK_ALL_USERS.find((x) => x.id === id);
  if (!u) throw new Error(`Mock: utilisateur inconnu ${id}`);
  return u;
}

// ─── Captures ─────────────────────────────────────────────────────────────────

function species(id: string) {
  const s = FISH_SPECIES.find((x) => x.id === id);
  if (!s) throw new Error(`Mock: espèce inconnue ${id}`);
  return s;
}

function makeCapture(c: {
  id: string;
  userId: string;
  speciesId: string;
  weightGrams: number;
  sizeCm: number;
  agoMs: number;
  description: string;
  weather: WeatherCondition;
  locationName?: string;
  likes: number;
  isLiked?: boolean;
  isDraft?: boolean;
}): Capture {
  const u = userById(c.userId);
  const sp = species(c.speciesId);
  return {
    id: c.id,
    userId: u.id,
    username: u.username,
    userAvatar: u.avatar,
    species: sp,
    weightGrams: c.weightGrams,
    sizeCm: c.sizeCm,
    photos: [`https://picsum.photos/seed/${c.id}/800/600`],
    description: c.description,
    locationName: c.locationName,
    weather: c.weather,
    publishedAt: ago(c.agoMs),
    isDraft: c.isDraft ?? false,
    validationScore: 90,
    score: calculateCaptureScore(c.weightGrams, sp),
    likes: c.likes,
    comments: 0, // recalculé depuis MOCK_COMMENTS plus bas
    isLiked: c.isLiked ?? false,
  };
}

// Captures de l'utilisateur démo (partagées avec le feed : même objet → un like reste synchro)
export const MOCK_MY_CAPTURES: Capture[] = [
  makeCapture({
    id: 'cap_me_2', userId: 'user_me', speciesId: 'zander', weightGrams: 4200, sizeCm: 72,
    agoMs: 26 * HOUR, weather: 'cloudy', likes: 34,
    description: 'Beau sandre en verticale sur la Vilaine, au tombant des 6 m. Relâché.',
  }),
  makeCapture({
    id: 'cap_me_1', userId: 'user_me', speciesId: 'carp', weightGrams: 18200, sizeCm: 102,
    agoMs: 7 * DAY, weather: 'sunny', likes: 87,
    description: 'Ma plus belle carpe à ce jour ! 18,2 kg après 45 min de combat à l\'étang de Paimpont.',
  }),
  makeCapture({
    id: 'cap_me_3', userId: 'user_me', speciesId: 'pike', weightGrams: 5600, sizeCm: 82,
    agoMs: 14 * DAY, weather: 'foggy', likes: 28,
    description: 'Brochet au spinnerbait, sortie du matin dans la brume sur le canal d\'Ille-et-Rance.',
  }),
  makeCapture({
    id: 'cap_me_4', userId: 'user_me', speciesId: 'carp', weightGrams: 12800, sizeCm: 91,
    agoMs: 21 * DAY, weather: 'cloudy', likes: 52,
    description: 'Belle commune en session de nuit, prise sur bouillette maison.',
  }),
  makeCapture({
    id: 'cap_me_draft', userId: 'user_me', speciesId: 'perch', weightGrams: 640, sizeCm: 33,
    agoMs: 2 * DAY, weather: 'rainy', likes: 0, isDraft: true,
    description: 'Perche au drop-shot (brouillon, photo à refaire).',
  }),
];

const OTHERS_CAPTURES: Capture[] = [
  makeCapture({
    id: 'cap_4_1', userId: 'user_4', speciesId: 'carp', weightGrams: 26400, sizeCm: 112,
    agoMs: 1.5 * HOUR, weather: 'cloudy', likes: 142, locationName: 'Lac de Créteil',
    description: 'Superbe commune prise cette nuit après 48 h sans touche. Rendue vivante bien sûr !',
  }),
  makeCapture({
    id: 'cap_2_1', userId: 'user_2', speciesId: 'catfish', weightGrams: 72000, sizeCm: 198,
    agoMs: 3 * HOUR, weather: 'sunny', likes: 287, isLiked: true, locationName: 'Rhône, Lyon',
    description: '72 kg ! Le plus gros de la saison, pris au clonk après 2 h de combat.',
  }),
  makeCapture({
    id: 'cap_3_1', userId: 'user_3', speciesId: 'pike', weightGrams: 9100, sizeCm: 101,
    agoMs: 6 * HOUR, weather: 'sunny', likes: 98,
    description: 'Le mètre est tombé ! Brochet de 1,01 m au jerkbait, eau claire, combat de folie.',
  }),
  makeCapture({
    id: 'cap_8_1', userId: 'user_8', speciesId: 'zander', weightGrams: 6300, sizeCm: 83,
    agoMs: 9 * HOUR, weather: 'cloudy', likes: 61,
    description: 'Sandre de 83 cm en verticale, au pied du pont Royal. Mon record !',
  }),
  makeCapture({
    id: 'cap_5_1', userId: 'user_5', speciesId: 'brown_trout', weightGrams: 1850, sizeCm: 48,
    agoMs: 12 * HOUR, weather: 'sunny', likes: 45,
    description: 'Magnifique fario à la mouche sèche dans la Clarée. Catch & release.',
  }),
  makeCapture({
    id: 'cap_12_1', userId: 'user_12', speciesId: 'sea_bass', weightGrams: 4600, sizeCm: 71,
    agoMs: 18 * HOUR, weather: 'windy', likes: 73, isLiked: true,
    description: 'Bar de 71 cm au stickbait dans la veine de courant. Remis à l\'eau.',
  }),
  makeCapture({
    id: 'cap_7_1', userId: 'user_7', speciesId: 'pike', weightGrams: 11400, sizeCm: 108,
    agoMs: 30 * HOUR, weather: 'stormy', likes: 156,
    description: 'Juste avant l\'orage, ce monstre de 108 cm sur un swimbait de 23 cm.',
  }),
  makeCapture({
    id: 'cap_9_1', userId: 'user_9', speciesId: 'carp', weightGrams: 21700, sizeCm: 104,
    agoMs: 40 * HOUR, weather: 'foggy', likes: 94,
    description: 'Miroir de 21,7 kg à 3 h du matin. Le brouillard n\'a pas aidé pour la photo !',
  }),
  makeCapture({
    id: 'cap_6_1', userId: 'user_6', speciesId: 'catfish', weightGrams: 45000, sizeCm: 182,
    agoMs: 2 * DAY, weather: 'cloudy', likes: 118, locationName: 'Loire, Ancenis',
    description: 'Silure de 1,82 m en Loire, pris du bord au vif.',
  }),
  makeCapture({
    id: 'cap_10_1', userId: 'user_10', speciesId: 'black_bass', weightGrams: 1900, sizeCm: 47,
    agoMs: 2.5 * DAY, weather: 'sunny', likes: 39,
    description: 'Black-bass au texas rig dans les herbiers, depuis le kayak.',
  }),
  makeCapture({
    id: 'cap_2_2', userId: 'user_2', speciesId: 'perch', weightGrams: 1350, sizeCm: 44,
    agoMs: 3 * DAY, weather: 'cloudy', likes: 21,
    description: 'Grosse perche de 44 cm pour changer du gros poisson !',
  }),
  makeCapture({
    id: 'cap_3_2', userId: 'user_3', speciesId: 'sea_bass', weightGrams: 3100, sizeCm: 62,
    agoMs: 3.5 * DAY, weather: 'windy', likes: 67,
    description: 'Week-end à Étretat, bar de belle taille au popper.',
  }),
  makeCapture({
    id: 'cap_11_1', userId: 'user_11', speciesId: 'tench', weightGrams: 2100, sizeCm: 48,
    agoMs: 4 * DAY, weather: 'rainy', likes: 26,
    description: 'Tanche de 2,1 kg au feeder, sous la pluie. Ça valait le coup.',
  }),
  makeCapture({
    id: 'cap_6_2', userId: 'user_6', speciesId: 'asp', weightGrams: 3800, sizeCm: 74,
    agoMs: 5 * DAY, weather: 'sunny', likes: 48,
    description: 'Aspe de 74 cm en chasse en surface, pris au jerkminnow.',
  }),
  makeCapture({
    id: 'cap_4_2', userId: 'user_4', speciesId: 'carp', weightGrams: 19600, sizeCm: 98,
    agoMs: 6 * DAY, weather: 'cloudy', likes: 88,
    description: 'Miroir écaillé de 19,6 kg, deuxième touche de la session.',
  }),
  makeCapture({
    id: 'cap_5_2', userId: 'user_5', speciesId: 'rainbow_trout', weightGrams: 2400, sizeCm: 55,
    agoMs: 8 * DAY, weather: 'cloudy', likes: 33,
    description: 'Arc-en-ciel au lac de Serre-Ponçon, à la nymphe.',
  }),
  makeCapture({
    id: 'cap_12_2', userId: 'user_12', speciesId: 'sea_bream', weightGrams: 1200, sizeCm: 42,
    agoMs: 9 * DAY, weather: 'sunny', likes: 29,
    description: 'Dorade royale au surfcasting, montée sur crabe.',
  }),
  makeCapture({
    id: 'cap_8_2', userId: 'user_8', speciesId: 'eel', weightGrams: 1100, sizeCm: 85,
    agoMs: 11 * DAY, weather: 'rainy', likes: 14,
    description: 'Anguille de 85 cm prise par hasard au ver, relâchée tout de suite.',
  }),
  makeCapture({
    id: 'cap_7_2', userId: 'user_7', speciesId: 'salmon', weightGrams: 6800, sizeCm: 82,
    agoMs: 16 * DAY, weather: 'cloudy', likes: 132,
    description: 'Saumon de l\'Allier à la mouche, voyage de pêche inoubliable (no-kill).',
  }),
];

export const MOCK_FEED_CAPTURES: Capture[] = [
  ...OTHERS_CAPTURES,
  ...MOCK_MY_CAPTURES.filter((c) => !c.isDraft),
];

// ─── Commentaires ─────────────────────────────────────────────────────────────

function makeComment(id: string, captureId: string, userId: string, content: string, agoMs: number): Comment {
  const u = userById(userId);
  return { id, captureId, userId, username: u.username, userAvatar: u.avatar, content, createdAt: ago(agoMs) };
}

export const MOCK_COMMENTS: Comment[] = [
  makeComment('com_1', 'cap_4_1', 'user_9', 'Quelle commune ! Tu pêchais à quelle distance ?', 1 * HOUR),
  makeComment('com_2', 'cap_4_1', 'user_me', 'Énorme Marc, bravo pour la patience 👏', 50 * 60000),
  makeComment('com_3', 'cap_4_1', 'user_4', 'Merci ! À 90 m, sur un plateau à 4 m de fond.', 30 * 60000),
  makeComment('com_4', 'cap_2_1', 'user_6', 'Monstrueux ! La Loire n\'a qu\'à bien se tenir.', 2 * HOUR),
  makeComment('com_5', 'cap_2_1', 'user_me', '72 kg… je n\'ose même pas imaginer le combat.', 2.5 * HOUR),
  makeComment('com_6', 'cap_3_1', 'user_7', 'Bienvenue au club des métrés ! 🐊', 5 * HOUR),
  makeComment('com_7', 'cap_3_1', 'user_10', 'Il est magnifique, belle livrée.', 4 * HOUR),
  makeComment('com_8', 'cap_me_2', 'user_8', 'Joli sandre ! Tu jigguais avec quel poids de tête ?', 20 * HOUR),
  makeComment('com_9', 'cap_me_2', 'user_me', '14 g, le courant était faible ce jour-là.', 19 * HOUR),
  makeComment('com_10', 'cap_me_1', 'user_4', 'Belle carpe Pierre, elle a une sacrée bouille.', 6 * DAY),
  makeComment('com_11', 'cap_12_1', 'user_me', 'Superbe bar, ça donne envie d\'aller au Raz !', 15 * HOUR),
  makeComment('com_12', 'cap_7_1', 'user_3', 'Ce brochet… respect total.', 28 * HOUR),
];

// Compteur de commentaires cohérent avec MOCK_COMMENTS
for (const cap of [...OTHERS_CAPTURES, ...MOCK_MY_CAPTURES]) {
  cap.comments = MOCK_COMMENTS.filter((c) => c.captureId === cap.id).length;
}

// ─── Graphe social ────────────────────────────────────────────────────────────

export interface MockFollow { followerId: string; followedId: string; createdAt: string }
export interface MockFollowRequest { requesterId: string; targetId: string; createdAt: string }

const f = (followerId: string, followedId: string, daysAgo: number): MockFollow =>
  ({ followerId, followedId, createdAt: ago(daysAgo * DAY) });

export const MOCK_FOLLOWS: MockFollow[] = [
  // Démo → abonnements
  f('user_me', 'user_2', 120), f('user_me', 'user_3', 90), f('user_me', 'user_4', 60), f('user_me', 'user_12', 20),
  // Abonnés du démo
  f('user_2', 'user_me', 118), f('user_3', 'user_me', 85), f('user_5', 'user_me', 40), f('user_12', 'user_me', 19),
  // Entre les autres pêcheurs
  f('user_2', 'user_4', 300), f('user_4', 'user_2', 298), f('user_3', 'user_4', 200), f('user_5', 'user_4', 150),
  f('user_6', 'user_4', 140), f('user_6', 'user_2', 130), f('user_7', 'user_3', 110), f('user_8', 'user_2', 100),
  f('user_9', 'user_4', 95), f('user_10', 'user_3', 80), f('user_11', 'user_4', 70), f('user_11', 'user_9', 65),
  f('user_12', 'user_3', 50), f('user_3', 'user_7', 45), f('user_8', 'user_6', 30),
];

export const MOCK_FOLLOW_REQUESTS: MockFollowRequest[] = [
  // Demandes reçues par le démo (en attente)
  { requesterId: 'user_7', targetId: 'user_me', createdAt: ago(3 * HOUR) },
  { requesterId: 'user_8', targetId: 'user_me', createdAt: ago(1 * DAY) },
  { requesterId: 'user_10', targetId: 'user_me', createdAt: ago(2 * DAY) },
  // Demande envoyée par le démo (en attente)
  { requesterId: 'user_me', targetId: 'user_6', createdAt: ago(4 * DAY) },
];

// ─── Badges ───────────────────────────────────────────────────────────────────

export const MOCK_BADGES: Badge[] = [
  {
    id: 'badge_first_catch', name: 'Première prise', description: 'Enregistrer sa première capture',
    icon: '🎣', category: 'progression', tier: 'bronze', isUnlocked: true, progress: 100,
    target: '1 capture', unlockedAt: '2023-06-20T10:00:00Z', xpReward: 50,
  },
  {
    id: 'badge_10_catches', name: 'Pêcheur actif', description: 'Enregistrer 10 captures',
    icon: '🏅', category: 'progression', tier: 'bronze', isUnlocked: true, progress: 100,
    target: '10 captures', unlockedAt: '2023-07-15T14:00:00Z', xpReward: 100,
  },
  {
    id: 'badge_50_catches', name: 'Pêcheur assidu', description: 'Enregistrer 50 captures',
    icon: '🥈', category: 'progression', tier: 'silver', isUnlocked: false, progress: 94,
    target: '50 captures', xpReward: 200,
  },
  {
    id: 'badge_100_catches', name: 'Centenaire', description: 'Enregistrer 100 captures',
    icon: '🏆', category: 'progression', tier: 'gold', isUnlocked: false, progress: 47,
    target: '100 captures', xpReward: 500,
  },
  {
    id: 'badge_big_carp', name: 'Carpiste confirmé', description: 'Capturer une carpe de plus de 15 kg',
    icon: '🐟', category: 'excellence', tier: 'silver', isUnlocked: true, progress: 100,
    target: 'Carpe 15 kg+', unlockedAt: '2024-03-10T18:00:00Z', xpReward: 150,
  },
  {
    id: 'badge_big_pike', name: 'Chasseur de brochets', description: 'Capturer un brochet de plus de 8 kg',
    icon: '🐠', category: 'excellence', tier: 'gold', isUnlocked: false, progress: 70,
    target: 'Brochet 8 kg+', xpReward: 300,
  },
  {
    id: 'badge_top100', name: 'Top 100', description: 'Atteindre le top 100 du classement général',
    icon: '🌍', category: 'excellence', tier: 'gold', isUnlocked: true, progress: 100,
    target: 'Top 100 général', unlockedAt: '2025-09-02T08:00:00Z', xpReward: 500,
  },
  {
    id: 'badge_validator', name: 'Validateur', description: 'Valider 20 captures de la communauté',
    icon: '✅', category: 'community', tier: 'bronze', isUnlocked: true, progress: 100,
    target: '20 validations', unlockedAt: '2023-11-05T09:00:00Z', xpReward: 75,
  },
  {
    id: 'badge_spring', name: 'Pêcheur de printemps', description: 'Réaliser 5 captures en mars-mai',
    icon: '🌸', category: 'seasonal', tier: 'silver', isUnlocked: false, progress: 60,
    target: '5 captures au printemps', xpReward: 120,
  },
];

// ─── Classements ──────────────────────────────────────────────────────────────

const TOP_SPECIES: Record<string, string> = {
  user_4: 'Carpe', user_6: 'Silure', user_2: 'Silure', user_7: 'Brochet', user_3: 'Brochet',
  user_8: 'Sandre', user_9: 'Carpe', user_10: 'Black-bass', user_5: 'Truite fario',
  user_11: 'Tanche', user_12: 'Bar', user_me: 'Carpe',
};
const RANKING_SCORES: [string, number][] = [
  ['user_4', 9847], ['user_6', 7320], ['user_2', 6890], ['user_7', 4102], ['user_3', 3890],
  ['user_8', 3240], ['user_9', 2980], ['user_10', 2710], ['user_5', 2340], ['user_11', 2180],
  ['user_12', 1960], ['user_me', 1412],
];

export const MOCK_RANKINGS_GLOBAL: RankingEntry[] = RANKING_SCORES.map(([id, score], i) => {
  const u = userById(id);
  return {
    rank: i + 1,
    userId: u.id,
    username: u.username,
    avatar: u.avatar,
    score,
    totalCaptures: u.stats.totalCaptures,
    topSpecies: TOP_SPECIES[id],
    region: u.region,
    isCurrentUser: id === MOCK_CURRENT_USER.id,
  };
});

// ─── Chat ─────────────────────────────────────────────────────────────────────

const baseMsg = (
  id: string, convId: string, senderId: string, content: string, hoursAgo: number, isRead = true,
): Message => {
  const u = userById(senderId);
  return {
    id,
    conversationId: convId,
    senderId,
    senderName: u.username,
    senderAvatar: u.avatar,
    content,
    type: 'text',
    sentAt: ago(hoursAgo * HOUR),
    isRead,
  };
};

export const MOCK_MESSAGES: Record<string, Message[]> = {
  conv_1: [
    baseMsg('msg_1_1', 'conv_1', 'user_2', 'Salut Pierre ! Tu as vu mon dernier silure ?', 5),
    baseMsg('msg_1_2', 'conv_1', 'user_me', 'Oui ! 72 kg c\'est dingue, félicitations !', 4.5),
    baseMsg('msg_1_3', 'conv_1', 'user_2', 'Merci ! 2 h de combat intense. Tu pêches ce week-end ?', 4),
    baseMsg('msg_1_4', 'conv_1', 'user_me', 'Oui, je pensais aller sur la Vilaine samedi pour le sandre', 3),
    baseMsg('msg_1_5', 'conv_1', 'user_2', 'Cool ! Bonne pêche à toi 🎣', 2),
  ],
  conv_2: [
    baseMsg('msg_2_1', 'conv_2', 'user_3', 'Salut la team !', 24),
    baseMsg('msg_2_2', 'conv_2', 'user_4', 'Salut Sophie !', 23),
    baseMsg('msg_2_3', 'conv_2', 'user_me', 'Hello !', 22),
    baseMsg('msg_2_4', 'conv_2', 'user_3', 'Quelqu\'un pour une sortie carnassiers dimanche sur la Seine ?', 20),
    baseMsg('msg_2_5', 'conv_2', 'user_4', 'Je suis chaud, je ramène le bateau.', 19, false),
    baseMsg('msg_2_6', 'conv_2', 'user_3', 'Top ! RDV 7 h à la mise à l\'eau de Poses.', 18, false),
  ],
  conv_3: [
    baseMsg('msg_3_1', 'conv_3', 'user_5', 'Salut Pierre, je peux te poser une question sur le matériel ?', 48),
    baseMsg('msg_3_2', 'conv_3', 'user_me', 'Bien sûr, vas-y !', 47),
    baseMsg('msg_3_3', 'conv_3', 'user_5', 'Tu utilises quelle canne pour le sandre en verticale ?', 46, false),
  ],
  conv_4: [
    baseMsg('msg_4_1', 'conv_4', 'user_12', 'Le bar est rentré en masse à Audierne, tu devrais venir !', 72),
    baseMsg('msg_4_2', 'conv_4', 'user_me', 'Grave ! Je regarde les coefs pour le week-end prochain.', 70),
    baseMsg('msg_4_3', 'conv_4', 'user_12', 'Coef 95 samedi, ça va être parfait.', 69),
  ],
};

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_1',
    type: 'private',
    participantIds: ['user_me', 'user_2'],
    participantNames: ['PierreM', 'SilureMaster'],
    avatar: userById('user_2').avatar,
    lastMessage: MOCK_MESSAGES.conv_1[4],
    unreadCount: 0,
    updatedAt: MOCK_MESSAGES.conv_1[4].sentAt,
  },
  {
    id: 'conv_2',
    type: 'group',
    name: 'Sortie carnassiers 🎣',
    participantIds: ['user_me', 'user_3', 'user_4'],
    participantNames: ['PierreM', 'BrochetQueen', 'CarpeFanatik'],
    lastMessage: MOCK_MESSAGES.conv_2[5],
    unreadCount: 2,
    updatedAt: MOCK_MESSAGES.conv_2[5].sentAt,
  },
  {
    id: 'conv_3',
    type: 'private',
    participantIds: ['user_me', 'user_5'],
    participantNames: ['PierreM', 'TruiteurAlpin'],
    avatar: userById('user_5').avatar,
    lastMessage: MOCK_MESSAGES.conv_3[2],
    unreadCount: 1,
    updatedAt: MOCK_MESSAGES.conv_3[2].sentAt,
  },
  {
    id: 'conv_4',
    type: 'private',
    participantIds: ['user_me', 'user_12'],
    participantNames: ['PierreM', 'BarDuRaz'],
    avatar: userById('user_12').avatar,
    lastMessage: MOCK_MESSAGES.conv_4[2],
    unreadCount: 0,
    updatedAt: MOCK_MESSAGES.conv_4[2].sentAt,
  },
];
