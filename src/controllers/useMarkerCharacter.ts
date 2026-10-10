/**
 * useMarkerCharacter — which character the user picked as their map marker.
 *
 * localStorage gives an instant value (and keeps working if the DB column is
 * missing); user_preferences.marker_character syncs the choice across devices.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../models/lib/supabase';
import { useAuth } from '../models/context/AuthContext';
import {
    DEFAULT_MARKER_CHARACTER, isMarkerCharacterId, type MarkerCharacterId,
} from '../models/data/markerCharacters';

const STORAGE_KEY = 'markerCharacter';

function readLocal(): MarkerCharacterId {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        if (isMarkerCharacterId(v)) return v;
    } catch { /* storage blocked — fall through */ }
    return DEFAULT_MARKER_CHARACTER;
}

export function useMarkerCharacter() {
    const { user } = useAuth();
    const [character, setCharacterState] = useState<MarkerCharacterId>(readLocal);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        supabase.from('user_preferences').select('marker_character').eq('id', user.id).single()
            .then(({ data }) => {
                const saved = (data as { marker_character?: unknown } | null)?.marker_character;
                if (!cancelled && isMarkerCharacterId(saved)) setCharacterState(saved);
            });
        return () => { cancelled = true; };
    }, [user?.id]);

    const setCharacter = useCallback(async (id: MarkerCharacterId) => {
        setCharacterState(id);
        try { localStorage.setItem(STORAGE_KEY, id); } catch { /* storage blocked */ }
        if (!user) return;
        const { error } = await supabase.from('user_preferences')
            .update({ marker_character: id, updated_at: new Date().toISOString() })
            .eq('id', user.id);
        if (error) console.warn('[MarkerCharacter] Not saved to account:', error.message);
    }, [user]);

    return { character, setCharacter };
}
