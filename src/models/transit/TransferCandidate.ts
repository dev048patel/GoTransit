/**
 * TransferCandidate
 * Intermediate scoring structure used by RoutePlanningService.findTransferRoutes
 * to evaluate every (getOff, board) stop pair when building 1-transfer routes.
 */
import { NearbyStop } from './NearbyStop';

export interface TransferCandidate {
    getOffId: string;
    getOffName: string;
    getOffLat: number;
    getOffLng: number;
    boardId: string;
    boardName: string;
    boardLat: number;
    boardLng: number;
    walkDist: number;   // meters to walk between get-off and board stops (0 = same stop)
    detour: number;     // penalty-weighted score used for ranking
    selectedOriginStop: NearbyStop; // which origin stop was valid for leg 1
}
