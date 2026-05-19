import { Capture, NewCaptureForm } from '../store/types';
import { MOCK_FEED_CAPTURES, MOCK_MY_CAPTURES, MOCK_CURRENT_USER } from './mock/data';
import { delay, generateId } from '../utils/helpers';
import { calculateCaptureScore } from '../config/constants';
import { USE_MOCK_DATA } from '../config/firebase';

let mockFeed = [...MOCK_FEED_CAPTURES];
let mockMine = [...MOCK_MY_CAPTURES];

export async function fetchFeed(): Promise<Capture[]> {
  if (USE_MOCK_DATA) {
    await delay(600);
    return [...mockFeed].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }
  // TODO: Firestore query
  throw new Error('Firebase non configuré');
}

export async function fetchMyCaptures(userId: string): Promise<Capture[]> {
  if (USE_MOCK_DATA) {
    await delay(400);
    return mockMine.filter((c) => c.userId === userId);
  }
  throw new Error('Firebase non configuré');
}

export async function publishCapture(
  userId: string,
  form: NewCaptureForm,
  username: string,
  userAvatar?: string
): Promise<Capture> {
  if (USE_MOCK_DATA) {
    await delay(1200);
    if (!form.species) throw new Error('Espèce requise');
    const weightGrams = (parseFloat(form.weightKg.replace(',', '.')) || 0) * 1000
      + (parseFloat(form.weightGrams.replace(',', '.')) || 0);
    const sizeCm = parseFloat(form.sizeCm.replace(',', '.')) || 0;

    const newCapture: Capture = {
      id: generateId(),
      userId,
      username,
      userAvatar,
      species: form.species,
      weightGrams,
      sizeCm,
      photos: form.photos.length > 0 ? form.photos : ['https://picsum.photos/seed/newcap/800/600'],
      description: form.description || undefined,
      weather: form.weather ?? undefined,
      publishedAt: new Date().toISOString(),
      isDraft: form.isDraft,
      validationScore: 0,
      score: calculateCaptureScore(weightGrams, form.species),
      likes: 0,
      comments: 0,
      isLiked: false,
    };

    if (!form.isDraft) {
      mockFeed.unshift(newCapture);
    }
    mockMine.unshift(newCapture);
    return newCapture;
  }
  throw new Error('Firebase non configuré');
}

export async function toggleLike(captureId: string, userId: string): Promise<{ likes: number; isLiked: boolean }> {
  if (USE_MOCK_DATA) {
    await delay(200);
    const capture = mockFeed.find((c) => c.id === captureId);
    if (!capture) throw new Error('Capture introuvable');
    capture.isLiked = !capture.isLiked;
    capture.likes += capture.isLiked ? 1 : -1;
    return { likes: capture.likes, isLiked: capture.isLiked };
  }
  throw new Error('Firebase non configuré');
}

export async function deleteCapture(captureId: string): Promise<void> {
  if (USE_MOCK_DATA) {
    await delay(400);
    mockFeed = mockFeed.filter((c) => c.id !== captureId);
    mockMine = mockMine.filter((c) => c.id !== captureId);
    return;
  }
  throw new Error('Firebase non configuré');
}
