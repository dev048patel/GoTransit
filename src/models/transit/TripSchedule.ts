export function computeDepartBy(arriveBy: string, totalMinutes: number): string {
    const [h, m] = arriveBy.split(':').map(Number);
    const raw = h * 60 + m - totalMinutes;
    const adj = ((raw % 1440) + 1440) % 1440;
    const hh = Math.floor(adj / 60);
    const mm = adj % 60;
    return `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}
