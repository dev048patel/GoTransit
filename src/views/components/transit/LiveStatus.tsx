/* A warning on the map when live bus positions stop arriving. Shows nothing while the feed is healthy,
   so it never covers the map. */
import { SITE } from '../../../models/data/legal';

export default function LiveStatus({ liveDown }: { liveDown: boolean }) {
    if (!liveDown) return null;
    return (
        <div role="status" className="fixed z-[999] left-1/2 -translate-x-1/2 bottom-7 w-[min(94vw,520px)] rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-sm px-4 py-2.5 shadow-lg text-center">
            Live bus positions aren't coming through right now, so what you see may be out of date.{' '}
            <a href={SITE.officialUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Check regina.ca</a> for official service notices.
        </div>
    );
}
