import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

/** Nom d'icône Ionicons (utiliser les variantes `-outline`). */
export type IoniconName = ComponentProps<typeof Ionicons>['name'];
