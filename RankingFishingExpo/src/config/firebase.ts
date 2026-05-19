// ─── Configuration Firebase ───────────────────────────────────────────────────
//
// Pour configurer Firebase :
// 1. Créer un projet sur https://console.firebase.google.com
// 2. Ajouter une application Web (icône </> sur la page d'accueil)
// 3. Copier les valeurs de firebaseConfig ci-dessous
// 4. Activer Authentication, Firestore et Storage dans la console Firebase
//
// ─────────────────────────────────────────────────────────────────────────────

export const firebaseConfig = {
  apiKey: 'REMPLACER_PAR_VOTRE_API_KEY',
  authDomain: 'REMPLACER_PAR_VOTRE_PROJECT_ID.firebaseapp.com',
  projectId: 'REMPLACER_PAR_VOTRE_PROJECT_ID',
  storageBucket: 'REMPLACER_PAR_VOTRE_PROJECT_ID.firebasestorage.app',
  messagingSenderId: 'REMPLACER_PAR_VOTRE_MESSAGING_SENDER_ID',
  appId: 'REMPLACER_PAR_VOTRE_APP_ID',
};

// Mode mock : true = données simulées localement, false = Firebase réel
export const USE_MOCK_DATA = true;
