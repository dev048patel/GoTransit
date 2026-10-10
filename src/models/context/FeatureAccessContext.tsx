import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { FeatureKey, FEATURES } from '../admin/FeatureAccessTypes';
import { getUserFeatureAccess } from '../services/FeatureAccessService';

type AccessMap = Record<FeatureKey, boolean>;

const allEnabled = Object.fromEntries(FEATURES.map(f => [f.key, true])) as AccessMap;

interface FeatureAccessCtx {
    hasFeature: (key: FeatureKey) => boolean;
    accessMap: AccessMap;
    refetch: () => void;
}

const FeatureAccessContext = createContext<FeatureAccessCtx>({
    hasFeature: () => true,
    accessMap: allEnabled,
    refetch: () => {},
});

export function FeatureAccessProvider({ children }: { children: React.ReactNode }) {
    const { user, isAuthenticated } = useAuth();
    const [accessMap, setAccessMap] = useState<AccessMap>(allEnabled);

    const load = () => {
        if (!user || !isAuthenticated) { setAccessMap(allEnabled); return; }
        getUserFeatureAccess(user.id).then(setAccessMap).catch(() => setAccessMap(allEnabled));
    };

    useEffect(load, [user?.id, isAuthenticated]);

    return (
        <FeatureAccessContext.Provider value={{
            hasFeature: (key) => accessMap[key] ?? true,
            accessMap,
            refetch: load,
        }}>
            {children}
        </FeatureAccessContext.Provider>
    );
}

export function useFeatureAccess() {
    return useContext(FeatureAccessContext);
}
