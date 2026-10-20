/* The notice every public page carries: who runs the site, that it is not the City's, the City's
   required data attribution, and links to the About, Privacy and Terms pages. */
import { Link } from 'react-router-dom';
import { SITE } from '../../models/data/legal';

export default function IndependenceNotice({ className = '' }: { className?: string }) {
    return (
        <div className={`text-xs leading-relaxed text-slate-500 ${className}`}>
            <p className="mb-2">
                {SITE.brand} is an independent project by {SITE.operators}. It is not affiliated with, endorsed by or operated by the City of Regina or Regina Transit.
                {' '}Contains information licensed under the{' '}
                <a href={SITE.licenceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-700">{SITE.licenceName}</a>.
                {' '}Bus times are estimates and can be wrong; check{' '}
                <a href={SITE.officialUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-700">regina.ca</a>
                {' '}for official service notices. Maps by Google.
            </p>
            <p className="flex flex-wrap gap-x-4 gap-y-1 font-semibold">
                <Link to="/routes" className="no-underline hover:underline text-slate-600">Bus routes</Link>
                <Link to="/map" className="no-underline hover:underline text-slate-600">Live bus map</Link>
                <Link to="/about" className="no-underline hover:underline text-slate-600">About</Link>
                <Link to="/privacy" className="no-underline hover:underline text-slate-600">Privacy</Link>
                <Link to="/terms" className="no-underline hover:underline text-slate-600">Terms</Link>
                <Link to="/connect" className="no-underline hover:underline text-slate-600">The team</Link>
                <span>© 2026 {SITE.brand}</span>
            </p>
        </div>
    );
}
