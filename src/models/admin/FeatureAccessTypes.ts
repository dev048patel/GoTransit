export type FeatureKey =
    | 'weekly_planner'
    | 'trip_planner'
    | 'saved_locations'
    | 'bus_suggestions'
    | 'push_notifications';

export interface FeatureDef {
    key: FeatureKey;
    label: string;
    description: string;
    color: string; // Tailwind bg color for the legend pill
    textColor: string;
}

export const FEATURES: FeatureDef[] = [
    {
        key: 'weekly_planner',
        label: 'Weekly Planner',
        description: 'Plan commute schedule for each weekday',
        color: 'bg-green-100',
        textColor: 'text-green-700',
    },
    {
        key: 'trip_planner',
        label: 'Trip Planner',
        description: 'Calculate multi-leg transit routes',
        color: 'bg-blue-100',
        textColor: 'text-blue-700',
    },
    {
        key: 'saved_locations',
        label: 'Saved Locations',
        description: 'Save favourite home/work destinations',
        color: 'bg-purple-100',
        textColor: 'text-purple-700',
    },
    {
        key: 'bus_suggestions',
        label: 'Bus Suggestions',
        description: 'Smart nearby bus recommendations',
        color: 'bg-yellow-100',
        textColor: 'text-yellow-700',
    },
    {
        key: 'push_notifications',
        label: 'Push Notifications',
        description: 'Departure reminder push alerts',
        color: 'bg-red-100',
        textColor: 'text-red-700',
    },
];

/** One row from the `feature_access` table */
export interface FeatureAccessRow {
    id: string;
    user_id: string;
    feature: FeatureKey;
    enabled: boolean;
    note: string | null;
    updated_by: string | null;
    updated_at: string;
}

/** Per-user summary for the admin matrix view */
export interface UserAccessRecord {
    userId: string;
    email: string;
    fullName: string | null;
    /** Map of feature → enabled (defaults to true if no DB row) */
    access: Record<FeatureKey, boolean>;
}
