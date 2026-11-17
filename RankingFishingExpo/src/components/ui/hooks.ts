import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** true si l'utilisateur a activé « Réduire les animations » (iOS) / « Supprimer les animations » (Android). */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (mounted) setReduce(v); })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduce(v));
    return () => {
      mounted = false;
      sub?.remove();
    };
  }, []);
  return reduce;
}
