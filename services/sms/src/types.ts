/** Rows of the sms schema, as the service reads them (see docs/security/sms_001_schema.sql) */

export type PlanStatus = 'planned' | 'partial' | 'no_service' | 'active' | 'completed' | 'cancelled';
export type AlertKind = 'leave_now' | 'alight' | 'notice';
export type AlertStatus = 'pending' | 'queued' | 'sent' | 'skipped' | 'failed' | 'suppressed' | 'over_quota' | 'capped';

export interface PlanNotice {
    walkAfterMin?: number;
    remainingMetres?: number;
    lastStopId?: string;
    earliest?: { leaveAt: string; arriveAt: string; route: string };
}

export interface PlanDb {
    id: string;
    schedule_id: string | null;
    /** 'trip': one-time trip texts started from the map (missing before script sms_004) */
    kind?: 'commute' | 'trip';
    user_id: string;
    service_date: string;
    arrive_by: string;
    status: PlanStatus;
    origin_name: string | null;
    destination_name: string | null;
    leave_at: string | null;
    arrive_at: string | null;
    notice: PlanNotice | null;
}

export interface LegDb {
    id: string;
    plan_id: string;
    seq: number;
    route_num: string;
    headsign: string | null;
    board_stop_id: string;
    alight_stop_id: string;
    prev_stop_id: string | null;
    walk_before_min: number;
    sched_board_at: string;
    sched_alight_at: string;
    bus_id: string | null;
    live_board_at: string | null;
    live_alight_at: string | null;
    matched_at: string | null;
}

export interface AlertDb {
    id: string;
    plan_id: string;
    leg_id: string | null;
    user_id: string;
    service_date: string;
    kind: AlertKind;
    due_at: string;
    status: AlertStatus;
    attempts: number;
}
