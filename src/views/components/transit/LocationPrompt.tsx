/* Explains why the map would like the rider's location before the browser asks for it, and offers
   a way back if they said no. Shown on the map page. */
import { Link } from 'react-router-dom';
import { LocateFixed } from 'lucide-react';
import { useLocationConsent } from '../../../controllers/useLocationConsent';

export default function LocationPrompt() {
    const { choice, allow, decline } = useLocationConsent();

    if (choice === 'allowed') return null;

    if (choice === 'declined') {
        return (
            <button
                onClick={allow}
                aria-label="Show my location on the map"
                className="fixed z-[1000] right-3 bottom-[118px] w-11 h-11 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center text-[#1a73e8]"
            >
                <LocateFixed size={20} />
            </button>
        );
    }

    return (
        <div role="dialog" aria-labelledby="location-prompt-title" className="fixed z-[1000] left-1/2 -translate-x-1/2 bottom-[96px] w-[min(92vw,400px)] rounded-2xl bg-white shadow-2xl border border-slate-200 p-4">
            <p id="location-prompt-title" className="font-bold text-slate-900 mb-1">Show buses near you?</p>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
                Transit Regina uses your location on this device, while the map is open, to show where you are and find stops near you. It isn't sent to our servers or kept.{' '}
                <Link to="/privacy" className="underline text-slate-700">Privacy</Link>
            </p>
            <div className="flex gap-2">
                <button onClick={allow} className="flex-1 rounded-xl bg-[#1a73e8] text-white font-semibold py-2.5">Use my location</button>
                <button onClick={decline} className="flex-1 rounded-xl bg-slate-100 text-slate-700 font-semibold py-2.5">Not now</button>
            </div>
        </div>
    );
}
