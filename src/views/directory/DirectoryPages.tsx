/* The route and stop directory: /routes, /routes/:slug and /stops/:slug.

   These answer what people type into a search box ("Regina route 4 bus", "bus stop 0742", "bus to
   the University of Regina") with real answers drawn from the City's GTFS data, and send them on to
   the live map. They are pre-rendered to plain HTML at build time (scripts/prerender.tsx), so they
   avoid anything that only exists in a browser. */
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Bus, ChevronRight, MapPin, Navigation } from 'lucide-react';
import { ROUTES, routeBySlug, stopBySlug, stopName, stopSlug, project, svgPathNear, type RouteInfo, type StopInfo } from '../../models/services/TransitDirectory';
import { HOME_META, ROUTES_META, routeMeta, stopMeta } from '../../models/seo/pageMeta';
import { usePageMeta } from '../../controllers/usePageMeta';
import { SITE } from '../../models/data/legal';
import IndependenceNotice from '../components/IndependenceNotice';

/* ── Shared pieces ── */
function Shell({ crumbs, children }: { crumbs: [string, string?][]; children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-[#F7F8FA] text-slate-900">
            <header className="border-b border-slate-200 bg-white">
                <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
                    <Link to="/" className="flex items-center gap-2 font-black text-slate-900 no-underline"><Bus size={20} className="text-[#2E7D32]" /> {SITE.brand}</Link>
                    <nav className="flex items-center gap-4 text-sm font-bold">
                        <Link to="/routes" className="text-slate-600 no-underline hover:text-slate-900">All routes</Link>
                        <Link to="/map" className="rounded-full bg-[#2E7D32] px-3 py-1.5 text-white no-underline hover:bg-[#256628]">Live map</Link>
                    </nav>
                </div>
            </header>
            <main className="mx-auto max-w-5xl px-5 py-8 sm:py-10">
                <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-1 text-sm text-slate-500">
                    {crumbs.map(([label, to], i) => (
                        <React.Fragment key={label}>
                            {i > 0 && <ChevronRight size={14} />}
                            {to ? <Link to={to} className="no-underline hover:underline text-slate-500">{label}</Link> : <span className="font-semibold text-slate-700">{label}</span>}
                        </React.Fragment>
                    ))}
                </nav>
                {children}
                <IndependenceNotice className="mt-14 border-t border-slate-200 pt-6" />
            </main>
        </div>
    );
}

const Badge = ({ route, size = 'md' }: { route: RouteInfo; size?: 'md' | 'lg' }) => (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-xl font-black ${size === 'lg' ? 'h-14 min-w-14 px-3 text-2xl' : 'h-8 min-w-8 px-2 text-sm'}`} style={{ background: route.color, color: route.textColor }}>
        {route.num}
    </span>
);

const LiveButton = ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to} className="inline-flex items-center gap-2 rounded-full bg-[#2E7D32] px-5 py-2.5 font-bold text-white no-underline shadow-sm hover:bg-[#256628]">
        <Navigation size={17} /> {children}
    </a>
);

function Faq({ items }: { items: [string, React.ReactNode][] }) {
    return (
        <section className="mt-10">
            <h2 className="mb-3 text-xl font-black">Questions riders ask</h2>
            <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
                {items.map(([q, a]) => (
                    <div key={q} className="px-5 py-4">
                        <h3 className="font-bold text-slate-900">{q}</h3>
                        <div className="mt-1 text-slate-600 leading-relaxed">{a}</div>
                    </div>
                ))}
            </div>
        </section>
    );
}

/* A map of the network: every route faintly, the ones that matter here in their own colours */
function NetworkMap({ highlight, marker, label }: { highlight: RouteInfo[]; marker?: { lat: number; lng: number }; label: string }) {
    const point = marker ? project(marker.lng, marker.lat) : null;
    return (
        <svg viewBox="0 0 1000 600" className="w-full rounded-2xl border border-slate-200 bg-white" role="img" aria-label={label}>
            {ROUTES.map(r => <path key={r.num} d={r.svgPathLite} fill="none" stroke="#e2e8f0" strokeWidth={3} strokeLinejoin="round" />)}
            {highlight.map(r => <path key={r.num} d={highlight.length === 1 ? r.svgPath : r.svgPathLite} fill="none" stroke={r.color} strokeWidth={highlight.length === 1 ? 6 : 5} strokeLinejoin="round" strokeLinecap="round" />)}
            {point && (
                <g>
                    <circle cx={point.x} cy={point.y} r={22} fill="#2E7D32" opacity={0.18} />
                    <circle cx={point.x} cy={point.y} r={9} fill="#ffffff" stroke="#0f172a" strokeWidth={4} />
                </g>
            )}
        </svg>
    );
}

/* A stop's neighbourhood: about 2–3 km around it, the routes that serve it, and the stops nearby */
function StopMap({ info, routes }: { info: StopInfo; routes: RouteInfo[] }) {
    const c = project(info.lng, info.lat), w = 160, h = 96;
    const box = { x: c.x - w / 2, y: c.y - h / 2, w, h };
    return (
        <svg viewBox={`${box.x} ${box.y} ${w} ${h}`} className="w-full rounded-2xl border border-slate-200 bg-white" role="img" aria-label={`Map of the area around stop ${info.id} and the routes that serve it`}>
            {routes.map(r => <path key={r.num} d={svgPathNear(r.num, box)} fill="none" stroke={r.color} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" opacity={0.9} />)}
            {info.nearby.map(n => { const p = project(Number(n.stop.LON), Number(n.stop.LAT)); return <circle key={n.slug} cx={p.x} cy={p.y} r={1.1} fill="#94a3b8" />; })}
            <circle cx={c.x} cy={c.y} r={4.5} fill="#2E7D32" opacity={0.2} />
            <circle cx={c.x} cy={c.y} r={2} fill="#ffffff" stroke="#0f172a" strokeWidth={1} />
        </svg>
    );
}

/* ── /routes ── */
export function RoutesIndexPage() {
    usePageMeta(ROUTES_META);
    const named = (word: string) => ROUTES.filter(r => r.name.toLowerCase().includes(word));
    return (
        <Shell crumbs={[['Home', '/'], ['Bus routes']]}>
            <h1 className="text-3xl font-black tracking-tight sm:text-5xl">Regina bus routes</h1>
            <p className="mt-3 max-w-3xl text-lg text-slate-600">
                All {ROUTES.length} Regina bus routes, each with a map, every stop in order and the routes you can change to. Want to know where your bus is right now? Open the live map.
            </p>
            <div className="mt-5"><LiveButton to="/map">See every bus live</LiveButton></div>
            <div className="mt-8"><NetworkMap highlight={ROUTES} label="Map of every Regina bus route" /></div>

            <h2 className="mt-10 mb-3 text-xl font-black">Every route</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
                {ROUTES.map(r => (
                    <li key={r.num}>
                        <Link to={`/routes/${r.slug}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 no-underline hover:border-slate-400">
                            <Badge route={r} />
                            <span className="min-w-0 flex-1">
                                <span className="block font-bold text-slate-900">Route {r.num} {r.name}</span>
                                <span className="block text-sm text-slate-500">{r.stopCount} stops</span>
                            </span>
                            <ArrowRight size={18} className="text-slate-400" />
                        </Link>
                    </li>
                ))}
            </ul>

            <Faq items={[
                ['Which buses go to the University of Regina?', <>Routes with University in their name: {named('university').map((r, i) => <React.Fragment key={r.num}>{i ? ', ' : ''}<Link to={`/routes/${r.slug}`}>route {r.num} {r.name}</Link></React.Fragment>)}. Other routes stop nearby too; the live map shows them all.</>],
                ['Is there a bus to Regina airport?', <>{named('airport').map(r => <Link key={r.num} to={`/routes/${r.slug}`}>Route {r.num} {r.name}</Link>)} runs between the airport and downtown. Check the live map before you leave, as service can change.</>],
                ['Which buses go downtown?', <>Routes with downtown in their name: {named('downtown').map((r, i) => <React.Fragment key={r.num}>{i ? ', ' : ''}<Link to={`/routes/${r.slug}`}>route {r.num}</Link></React.Fragment>)}. Most other routes also pass through downtown; each route page lists its stops.</>],
                ['Is this the official Regina Transit timetable?', <>No. {SITE.brand} is an independent project built on the City of Regina's open data. For official schedules and service notices, see <a href={SITE.officialUrl}>regina.ca</a>.</>],
            ]} />
        </Shell>
    );
}

/* ── /routes/:slug ── */
export function RoutePage() {
    const { slug = '' } = useParams();
    const route = routeBySlug(slug);
    usePageMeta(route ? routeMeta(route) : { ...HOME_META, path: `/routes/${slug}`, noindex: true });
    if (!route) return <NotFoundPage />;
    const connections = route.connections.map(n => ROUTES.find(r => r.num === n)).filter((r): r is RouteInfo => !!r);
    const loop = route.directions.length === 1 || route.directions.every(d => d.from.STOP_ID === d.to.STOP_ID);
    return (
        <Shell crumbs={[['Home', '/'], ['Bus routes', '/routes'], [`Route ${route.num}`]]}>
            <div className="flex items-start gap-4">
                <Badge route={route} size="lg" />
                <div>
                    <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Route {route.num} {route.name}</h1>
                    <p className="mt-1 text-lg text-slate-600">Regina bus route {route.num}: live map, all {route.stopCount} stops and connections</p>
                </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
                <LiveButton to={`/map?route=${route.num}`}>See route {route.num} buses live</LiveButton>
                <Link to="/routes" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 font-bold text-slate-700 no-underline hover:border-slate-500">All routes</Link>
            </div>

            <div className="mt-8"><NetworkMap highlight={[route]} label={`Map of Regina bus route ${route.num} ${route.name}`} /></div>

            <h2 className="mt-10 mb-3 text-xl font-black">Stops, in order</h2>
            <div className={`grid gap-4 ${route.directions.length > 1 ? 'md:grid-cols-2' : ''}`}>
                {route.directions.map(d => (
                    <section key={d.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <h3 className="mb-3 font-black">{loop ? `Loop from ${stopName(d.from)}` : `Towards ${stopName(d.to)}`} <span className="font-semibold text-slate-400">· {d.stops.length} stops</span></h3>
                        <ol className="space-y-1">
                            {d.stops.map((s, i) => (
                                <li key={`${s.STOP_ID}-${i}`} className="flex items-baseline gap-3 text-sm">
                                    <span className="w-6 shrink-0 text-right text-slate-400">{i + 1}</span>
                                    <Link to={`/stops/${stopSlug(s)}`} className="text-slate-800 no-underline hover:underline">{stopName(s)}</Link>
                                    <span className="ml-auto shrink-0 font-mono text-xs text-slate-400">#{s.STOP_ID}</span>
                                </li>
                            ))}
                        </ol>
                    </section>
                ))}
            </div>

            {connections.length > 0 && (
                <section className="mt-10">
                    <h2 className="mb-3 text-xl font-black">Change to another route</h2>
                    <p className="mb-3 text-slate-600">Route {route.num} shares stops with these routes, so you can switch buses along the way:</p>
                    <div className="flex flex-wrap gap-2">
                        {connections.map(r => (
                            <Link key={r.num} to={`/routes/${r.slug}`} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-3 text-sm font-bold text-slate-700 no-underline hover:border-slate-400">
                                <Badge route={r} /> {r.name}
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            <Faq items={[
                [`Where is the route ${route.num} bus right now?`, <>Open the <a href={`/map?route=${route.num}`}>live map for route {route.num}</a>. It shows every route {route.num} bus as it moves, with positions updated every few seconds.</>],
                [`How many stops does route ${route.num} have?`, <>{route.stopCount} stops. {loop ? `It runs as a loop from ${stopName(route.directions[0].from)}.` : `It runs between ${stopName(route.directions[0].from)} and ${stopName(route.directions[0].to)}, and back.`}</>],
                [`Which buses connect with route ${route.num}?`, connections.length ? <>Route {route.num} shares stops with routes {connections.map(r => r.num).join(', ')}.</> : <>None share its stops.</>],
                [`Is this the official route ${route.num} timetable?`, <>No. This page is built from the City of Regina's open data by an independent project. For official timetables and detours, see <a href={SITE.officialUrl}>regina.ca</a>.</>],
            ]} />
        </Shell>
    );
}

/* ── /stops/:slug ── */
export function StopPage() {
    const { slug = '' } = useParams();
    const info: StopInfo | null = stopBySlug(slug);
    usePageMeta(info ? stopMeta(info) : { ...HOME_META, path: `/stops/${slug}`, noindex: true });
    if (!info) return <NotFoundPage />;
    const routes = info.routes.map(r => r.route).filter((r, i, a) => a.findIndex(x => x.num === r.num) === i);
    return (
        <Shell crumbs={[['Home', '/'], ['Bus routes', '/routes'], [`Stop ${info.id}`]]}>
            <p className="font-mono text-sm font-bold text-[#2E7D32]">Stop #{info.id}</p>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{info.name}</h1>
            <p className="mt-1 text-lg text-slate-600">Regina bus stop {info.id}{info.direction ? ` · ${info.direction}` : ''}{routes.length ? ` · routes ${routes.map(r => r.num).join(', ')}` : ''}</p>
            <div className="mt-5"><LiveButton to={`/map?stop=${info.id}`}>See live arrivals at stop {info.id}</LiveButton></div>
            <p className="mt-3 text-sm text-slate-500">The 4-digit number {info.id} is on the sign at the stop.</p>

            <div className="mt-8 grid gap-6 md:grid-cols-[1.2fr_1fr]">
                <section>
                    <h2 className="mb-3 text-xl font-black">Buses at this stop</h2>
                    <ul className="space-y-2">
                        {info.routes.map(r => (
                            <li key={`${r.route.num}-${r.towards}`} className="rounded-2xl border border-slate-200 bg-white p-4">
                                <Link to={`/routes/${r.route.slug}`} className="flex items-center gap-3 no-underline">
                                    <Badge route={r.route} />
                                    <span className="min-w-0">
                                        <span className="block font-bold text-slate-900">Route {r.route.num} {r.route.name}</span>
                                        <span className="block text-sm text-slate-500">Towards {r.towards}</span>
                                    </span>
                                </Link>
                                {(r.previous || r.next) && (
                                    <p className="mt-2 text-sm text-slate-600">
                                        {r.previous && <>Previous stop: <Link to={`/stops/${stopSlug(r.previous)}`}>{stopName(r.previous)}</Link></>}
                                        {r.previous && r.next && ' · '}
                                        {r.next && <>Next stop: <Link to={`/stops/${stopSlug(r.next)}`}>{stopName(r.next)}</Link></>}
                                    </p>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>
                <section>
                    <h2 className="mb-3 text-xl font-black">Where it is</h2>
                    <StopMap info={info} routes={routes} />
                    {info.nearby.length > 0 && (
                        <>
                            <h3 className="mt-5 mb-2 font-black">Stops nearby</h3>
                            <ul className="space-y-1 text-sm">
                                {info.nearby.map(n => (
                                    <li key={n.slug} className="flex items-baseline gap-2">
                                        <MapPin size={14} className="shrink-0 translate-y-0.5 text-slate-400" />
                                        <Link to={`/stops/${n.slug}`} className="text-slate-800 no-underline hover:underline">{stopName(n.stop)}</Link>
                                        <span className="ml-auto shrink-0 text-slate-400">{n.metres} m · {Math.max(1, Math.round(n.metres / 80))} min walk</span>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </section>
            </div>

            <Faq items={[
                [`When is the next bus at stop ${info.id}?`, <>Open the <a href={`/map?stop=${info.id}`}>live arrivals for stop {info.id}</a> to see every departure left today, updated as buses move.</>],
                [`Which buses stop at ${info.name}?`, routes.length ? <>Route{routes.length > 1 ? 's' : ''} {routes.map((r, i) => <React.Fragment key={r.num}>{i ? ', ' : ''}<Link to={`/routes/${r.slug}`}>{r.num} {r.name}</Link></React.Fragment>)}.</> : <>No route currently serves this stop.</>],
                ['Is this information official?', <>No. It comes from the City of Regina's open data, shown by an independent project. For official notices, see <a href={SITE.officialUrl}>regina.ca</a>.</>],
            ]} />
        </Shell>
    );
}

/* ── Anything else: a real "not found", kept out of search results ── */
export function NotFoundPage() {
    usePageMeta({ ...HOME_META, path: '/404', title: 'Page not found | Transit Regina', noindex: true, jsonLd: [] });
    return (
        <Shell crumbs={[['Home', '/'], ['Not found']]}>
            <h1 className="text-3xl font-black">That page isn't here</h1>
            <p className="mt-2 text-slate-600">It may have moved. Try the live map or the list of routes.</p>
            <div className="mt-5 flex flex-wrap gap-3">
                <LiveButton to="/map">Open the live map</LiveButton>
                <Link to="/routes" className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 font-bold text-slate-700 no-underline">All routes</Link>
            </div>
        </Shell>
    );
}
