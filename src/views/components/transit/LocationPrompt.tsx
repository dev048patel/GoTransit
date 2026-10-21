/* Location on the map: explains why it's wanted before the browser asks, offers a way back if the
   rider said no, and, when the device or browser still won't share a location, says exactly what
   is wrong and where to fix it on their phone or computer. Shown on the map page.

   Websites can't open the phone's Settings app, so the help gives the precise taps for this device
   and browser, and the map tries again by itself when the rider comes back (see LocationConsent). */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, LocateFixed, LocateOff, RotateCw, X } from 'lucide-react';
import { useLocationConsent } from '../../../controllers/useLocationConsent';
import { useGpsFixController } from '../../../controllers/useGpsFixController';
import { detectPlatform, locationHelp } from '../../../models/services/LocationHelp';

/** onCentre moves the map to the rider (the map doesn't follow them on its own) */
export default function LocationPrompt({ onCentre }: { onCentre?: (at: { lat: number; lng: number }) => void }) {
    const { choice, problem, allow, decline, retry } = useLocationConsent();
    const { fix } = useGpsFixController();
    const platform = useMemo(() => detectPlatform(), []);
    const [helpOpen, setHelpOpen] = useState(true);
    const [trying, setTrying] = useState(false);
    const [copied, setCopied] = useState(false);

    const tryAgain = async () => {
        setTrying(true);
        await retry();
        setTrying(false);
    };

    /* Location is working: a button that brings the map to where the rider is */
    if (choice === 'allowed' && !problem) {
        if (!fix || !onCentre) return null;
        return (
            <button
                onClick={() => onCentre({ lat: fix.lat, lng: fix.lng })}
                aria-label="Centre the map on my location"
                title="Centre on me"
                className="fixed z-[1000] right-3 bottom-[118px] w-11 h-11 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center text-[#1a73e8] active:scale-95 transition-transform"
            >
                <LocateFixed size={20} />
            </button>
        );
    }

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

    /* Said yes, but the location still isn't coming through: the fix for this device */
    if (choice === 'allowed' && problem) {
        const help = locationHelp(problem, platform);
        if (!helpOpen) {
            return (
                <button
                    onClick={() => setHelpOpen(true)}
                    aria-label="Your location isn't available: see how to turn it on"
                    className="fixed z-[1000] right-3 bottom-[118px] w-11 h-11 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center text-slate-500"
                >
                    <LocateOff size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
                </button>
            );
        }
        return (
            <div role="dialog" aria-labelledby="location-help-title" className="fixed z-[1000] left-1/2 -translate-x-1/2 bottom-[96px] w-[min(94vw,420px)] max-h-[70dvh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"><LocateOff size={18} /></span>
                    <div className="min-w-0 flex-1">
                        <p id="location-help-title" className="font-bold text-slate-900">{help.title}</p>
                        <p className="mt-1 text-sm text-slate-600 leading-relaxed">{help.intro}</p>
                    </div>
                    <button onClick={() => setHelpOpen(false)} aria-label="Close" className="-mr-1 -mt-1 rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={18} /></button>
                </div>
                {help.steps.length > 0 && (
                    <ol className="mt-3 space-y-2">
                        {help.steps.map((step, i) => (
                            <li key={i} className="flex gap-2.5 text-sm text-slate-700 leading-relaxed">
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1a73e8] text-[11px] font-bold text-white">{i + 1}</span>
                                <span>{step}</span>
                            </li>
                        ))}
                    </ol>
                )}
                <div className="mt-4 flex gap-2">
                    {problem !== 'unsupported' && (
                        <button onClick={tryAgain} disabled={trying} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#1a73e8] text-white font-semibold py-2.5 disabled:opacity-70">
                            <RotateCw size={16} className={trying ? 'animate-spin' : ''} /> {trying ? 'Checking…' : 'Try again'}
                        </button>
                    )}
                    {platform.inApp && (
                        <button
                            onClick={() => { navigator.clipboard?.writeText(window.location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => { /* clipboard blocked */ }); }}
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 text-slate-700 font-semibold py-2.5"
                        >
                            <Copy size={16} /> {copied ? 'Copied' : 'Copy link'}
                        </button>
                    )}
                    <button onClick={decline} className="rounded-xl bg-slate-100 text-slate-700 font-semibold px-4 py-2.5">Not now</button>
                </div>
                {problem !== 'timeout' && !platform.inApp && (
                    <p className="mt-3 text-xs text-slate-400">Fixed it in Settings? Just come back here; the map checks again on its own.</p>
                )}
            </div>
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
