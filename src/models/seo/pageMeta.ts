/*
 What search engines and link previews learn about each page: title, description, canonical address,
 social preview and structured data (JSON-LD).

 The same description is used twice, so the two always agree (Google asks that the canonical in the
 HTML and after JavaScript runs never differ):
 - at build time, scripts/prerender.tsx writes it into each page's HTML (headTags);
 - in the browser, usePageMeta updates the document as people move around the app (applyPageMeta).
*/
import { SITE } from '../data/legal';
import type { RouteInfo, StopInfo } from '../services/TransitDirectory';

export const SITE_URL = 'https://transitregina.ca';
const OG_IMAGE = `${SITE_URL}/og-logo.jpg`;

export interface PageMeta {
    /** Path only, e.g. "/routes/4-hillsdale-walsh-acres" */
    path: string;
    title: string;
    description: string;
    /** Keep out of search results (sign-in, profile, error pages) */
    noindex?: boolean;
    jsonLd?: object[];
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const crumbs = (items: [string, string][]) => ({
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE_URL + path })),
});

/* ── Pages ── */
export const HOME_META: PageMeta = {
    path: '/',
    title: 'Regina Bus Tracker: Live Bus Map & Trip Planner | Transit Regina',
    description: 'See every Regina bus live on the map, check when your bus is coming at any stop, and plan trips with transfers. Free and unofficial, built by two University of Regina students.',
    jsonLd: [{
        '@context': 'https://schema.org', '@type': 'WebApplication',
        name: SITE.brand, url: SITE_URL, applicationCategory: 'TravelApplication', operatingSystem: 'Any (web browser)',
        description: 'Unofficial real-time bus tracker and trip planner for Regina, Saskatchewan. Not affiliated with the City of Regina or Regina Transit.',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'CAD' },
        spatialCoverage: { '@type': 'City', name: 'Regina', containedInPlace: { '@type': 'AdministrativeArea', name: 'Saskatchewan' } },
        creator: [
            { '@type': 'Person', name: 'Dev Patel', url: `${SITE_URL}/connect/dev`, sameAs: ['https://www.linkedin.com/in/dev-patel-itsme/', 'https://github.com/dev048patel'] },
            { '@type': 'Person', name: 'Nirjar Patel', url: `${SITE_URL}/connect/nirjar`, sameAs: ['https://www.linkedin.com/in/nirjarpatel/', 'https://github.com/nirjar1012'] },
        ],
    }],
};

export const ROUTES_META: PageMeta = {
    path: '/routes',
    title: 'All Regina Bus Routes: Live Maps & Stops | Transit Regina',
    description: 'Every Regina bus route with a map, every stop in order both ways, and the routes you can change to. Tap any route to see its buses live.',
    jsonLd: [crumbs([['Home', '/'], ['Bus routes', '/routes']])],
};

export const MAP_META: PageMeta = {
    path: '/map',
    title: 'Live Regina Bus Map: Where Is My Bus? | Transit Regina',
    description: 'Every Regina bus on one live map, updated every few seconds. Tap a stop for its next departures, or plan a trip with transfers.',
    // Sign-in only, so search engines only ever see the login page here
    noindex: true,
};

export function routeMeta(r: RouteInfo): PageMeta {
    const path = `/routes/${r.slug}`;
    const ends = r.directions[0] ? ` between ${r.name.replace(' – ', ' and ')}` : '';
    return {
        path,
        title: `Route ${r.num} ${r.name}: Live Bus Map & Stops | Transit Regina`,
        description: `Where is the route ${r.num} bus right now? See route ${r.num}${ends} live, all ${r.stopCount} stops in order both ways, and where to change to other Regina buses.`,
        jsonLd: [crumbs([['Home', '/'], ['Bus routes', '/routes'], [`Route ${r.num} ${r.name}`, path]])],
    };
}

export function stopMeta(s: StopInfo): PageMeta {
    const path = `/stops/${s.slug}`;
    const routes = s.routes.map(r => r.route.num).filter((n, i, a) => a.indexOf(n) === i);
    const served = routes.length ? `Served by route${routes.length > 1 ? 's' : ''} ${routes.join(', ')}.` : '';
    return {
        path,
        title: `Bus Stop ${s.id}: ${s.name}${s.direction ? ` (${s.direction})` : ''} | Transit Regina`,
        description: `Live arrivals at Regina bus stop ${s.id}, ${s.name}${s.direction ? `, ${s.direction.toLowerCase()}` : ''}. ${served} See where each bus is heading and the stops nearby.`,
        jsonLd: [
            crumbs([['Home', '/'], ['Bus routes', '/routes'], [`Stop ${s.id}`, path]]),
            {
                '@context': 'https://schema.org', '@type': 'BusStop', name: `${s.name} (stop ${s.id})`, identifier: s.id, url: SITE_URL + path,
                geo: { '@type': 'GeoCoordinates', latitude: s.lat, longitude: s.lng },
                address: { '@type': 'PostalAddress', addressLocality: 'Regina', addressRegion: 'SK', addressCountry: 'CA' },
            },
        ],
    };
}

/** Pages whose content lives elsewhere (legal text, portfolios); these just need the right head */
export const STATIC_META: Record<string, PageMeta> = {
    '/about': { path: '/about', title: 'About Transit Regina: an Unofficial Regina Bus Tracker', description: 'Who runs Transit Regina, where its data comes from (City of Regina open data and the TransitLive feed), and how it differs from the official Regina Transit services.' },
    '/privacy': { path: '/privacy', title: 'Privacy Policy | Transit Regina', description: 'What Transit Regina collects, why, how long it is kept, and how to delete it. Plain-language privacy policy under Canadian law.' },
    '/terms': { path: '/terms', title: 'Terms of Use | Transit Regina', description: 'The terms for using Transit Regina, an unofficial Regina bus tracker: estimates only, no warranty, fair use.' },
    '/connect': { path: '/connect', title: 'Meet the Team Behind Transit Regina', description: 'Transit Regina was built by Dev Patel and Nirjar Patel, computer science students at the University of Regina. See what each of them built.' },
};

/** Portfolio pages */
export function teamMeta(p: { slug: string; name: string; title: string; focus: string; pitch: string }): PageMeta {
    return {
        path: `/connect/${p.slug}`,
        title: `${p.name}: ${p.title} of Transit Regina | Portfolio`,
        description: p.pitch.length > 158 ? p.pitch.slice(0, 155).replace(/\s+\S*$/, '') + '…' : p.pitch,
        jsonLd: [{ '@context': 'https://schema.org', '@type': 'Person', name: p.name, jobTitle: `${p.title}, Transit Regina`, url: `${SITE_URL}/connect/${p.slug}`, alumniOf: { '@type': 'CollegeOrUniversity', name: 'University of Regina' } }],
    };
}

/* Pages that are part of the app, not the site: kept out of search results */
const PRIVATE_PREFIXES = ['/login', '/signup', '/forgot-password', '/reset-password', '/profile', '/two-step', '/admin'];

/** The head for pages that do not set their own (the directory pages and "not found" do) */
export function metaForPath(pathname: string, team: { slug: string; name: string; title: string; focus: string; pitch: string }[] = []): PageMeta | null {
    const path = pathname.replace(/\/+$/, '') || '/';
    if (path === '/') return HOME_META;
    if (path === '/map') return MAP_META;
    if (STATIC_META[path]) return STATIC_META[path];
    const person = path.startsWith('/connect/') ? team.find(t => `/connect/${t.slug}` === path) : undefined;
    if (person) return teamMeta(person);
    if (PRIVATE_PREFIXES.some(p => path === p || path.startsWith(p + '/'))) {
        return { path, title: 'Transit Regina', description: HOME_META.description, noindex: true };
    }
    return null;
}

/* ── Writing the head ── */
/** The head tags for a page, as HTML (used at build time) */
export function headTags(m: PageMeta): string {
    const url = SITE_URL + m.path;
    return [
        `<title>${esc(m.title)}</title>`,
        `<meta name="description" content="${esc(m.description)}" />`,
        `<link rel="canonical" href="${url}" />`,
        m.noindex ? '<meta name="robots" content="noindex" />' : '',
        `<meta property="og:type" content="website" />`,
        `<meta property="og:site_name" content="${esc(SITE.brand)}" />`,
        `<meta property="og:url" content="${url}" />`,
        `<meta property="og:title" content="${esc(m.title)}" />`,
        `<meta property="og:description" content="${esc(m.description)}" />`,
        `<meta property="og:image" content="${OG_IMAGE}" />`,
        `<meta property="og:image:width" content="1200" />`,
        `<meta property="og:image:height" content="630" />`,
        `<meta property="og:image:alt" content="Transit Regina: unofficial live bus tracker for Regina" />`,
        `<meta name="twitter:card" content="summary_large_image" />`,
        ...(m.jsonLd ?? []).map(j => `<script type="application/ld+json" data-page-ld>${JSON.stringify(j).replace(/</g, '\\u003c')}</script>`),
    ].filter(Boolean).join('\n    ');
}

/** Updates the document's head for a page (used in the browser) */
export function applyPageMeta(doc: Document, m: PageMeta) {
    doc.title = m.title;
    const set = (selector: string, make: () => HTMLElement, attr: string, value: string) => {
        let el = doc.head.querySelector(selector) as HTMLElement | null;
        if (!el) { el = make(); doc.head.appendChild(el); }
        el.setAttribute(attr, value);
    };
    const meta = (key: 'name' | 'property', name: string) => () => { const el = doc.createElement('meta'); el.setAttribute(key, name); return el; };
    const url = SITE_URL + m.path;
    set('meta[name="description"]', meta('name', 'description'), 'content', m.description);
    set('link[rel="canonical"]', () => { const el = doc.createElement('link'); el.setAttribute('rel', 'canonical'); return el; }, 'href', url);
    set('meta[property="og:url"]', meta('property', 'og:url'), 'content', url);
    set('meta[property="og:title"]', meta('property', 'og:title'), 'content', m.title);
    set('meta[property="og:description"]', meta('property', 'og:description'), 'content', m.description);
    const robots = doc.head.querySelector('meta[name="robots"]');
    if (m.noindex) set('meta[name="robots"]', meta('name', 'robots'), 'content', 'noindex');
    else robots?.remove();
    doc.head.querySelectorAll('script[data-page-ld]').forEach(el => el.remove());
    for (const j of m.jsonLd ?? []) {
        const el = doc.createElement('script');
        el.type = 'application/ld+json';
        el.dataset.pageLd = '';
        el.textContent = JSON.stringify(j);
        doc.head.appendChild(el);
    }
}
