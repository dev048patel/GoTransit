/*
 Pre-render: runs after `vite build` (see the "build" script) and writes a real HTML page for every
 public address, so search engines can read each page without running JavaScript.

 For every page it writes the right title, description, canonical address, social preview and
 structured data into the head. The directory pages (every route and stop) and the About, Privacy and
 Terms pages also get their full content in the body, rendered from the same React components the
 app uses, so what search engines read is exactly what people see. The app then starts as usual and
 takes over the page.

 Files are written as build/<path>.html; vercel.json's cleanUrls serves them at /<path>.
 It also writes build/sitemap.xml listing every page.
*/
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter, Routes, Route } from 'react-router';
import { RoutesIndexPage, RoutePage, StopPage } from '../src/views/directory/DirectoryPages';
import LegalPage from '../src/views/LegalPage';
import { ROUTES, SERVED_STOPS, stopInfo } from '../src/models/services/TransitDirectory';
import { HOME_META, MAP_META, ROUTES_META, STATIC_META, SITE_URL, headTags, routeMeta, stopMeta, teamMeta, type PageMeta } from '../src/models/seo/pageMeta';
import { TEAM } from '../src/models/data/team';

const out = path.resolve(process.cwd(), 'build');   // run from the project root, as npm scripts are
const template = fs.readFileSync(path.join(out, 'index.html'), 'utf8');

/* The app's own HTML, minus the head tags each page sets for itself */
const base = template
    .replace(/<title>[\s\S]*?<\/title>\s*/, '')
    .replace(/<meta\s+name="description"[^>]*>\s*/g, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/g, '')
    .replace(/<meta\s+property="og:[^"]*"[^>]*>\s*/g, '')
    .replace(/<meta\s+name="twitter:[^"]*"[^>]*>\s*/g, '')
    .replace(/<script type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>\s*/g, '');
if (!base.includes('<div id="root"></div>')) throw new Error('prerender: <div id="root"></div> not found in build/index.html');

const routes = (
    <Routes>
        <Route path="/routes" element={<RoutesIndexPage />} />
        <Route path="/routes/:slug" element={<RoutePage />} />
        <Route path="/stops/:slug" element={<StopPage />} />
        <Route path="/about" element={<LegalPage page="about" />} />
        <Route path="/privacy" element={<LegalPage page="privacy" />} />
        <Route path="/terms" element={<LegalPage page="terms" />} />
    </Routes>
);
const render = (url: string) => renderToString(<StaticRouter location={url}>{routes}</StaticRouter>);

/* What the homepage shows before the app starts: the same headline and the ways in */
const homeSnapshot = `<main style="max-width:44rem;margin:0 auto;padding:3rem 1.25rem;font-family:Inter,system-ui,sans-serif">
<h1>Regina bus tracker: every bus, live</h1>
<p>See every Regina bus live on the map, check when your bus is coming at any stop, and plan trips with transfers. Free and unofficial, built by two University of Regina students.</p>
<p><a href="/map">Open the live map</a> · <a href="/routes">All Regina bus routes</a> · <a href="/about">About</a></p>
<ul>${ROUTES.map(r => `<li><a href="/routes/${r.slug}">Route ${r.num} ${r.name}</a></li>`).join('')}</ul>
</main>`;

const written: PageMeta[] = [];
function write(meta: PageMeta, body = '') {
    const html = base
        .replace('</head>', `    ${headTags(meta)}\n  </head>`)
        .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
    const file = meta.path === '/' ? path.join(out, 'index.html') : path.join(out, `${meta.path}.html`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, html);
    if (!meta.noindex) written.push(meta);
}

const started = Date.now();
write(HOME_META, homeSnapshot);
write(MAP_META);
write(ROUTES_META, render('/routes'));
for (const r of ROUTES) write(routeMeta(r), render(`/routes/${r.slug}`));
let stops = 0;
for (const s of SERVED_STOPS) {
    const info = stopInfo(s.STOP_ID);
    if (!info) continue;
    write(stopMeta(info), render(`/stops/${info.slug}`));
    stops++;
}
for (const p of ['/about', '/privacy', '/terms']) write(STATIC_META[p], render(p));
write(STATIC_META['/connect']);
for (const person of TEAM) write(teamMeta(person));

/* The sitemap: every page, with today's date as when it last changed */
const today = new Date().toISOString().slice(0, 10);
const priority = (p: string) => (p === '/' ? '1.0' : p === '/map' || p === '/routes' ? '0.9' : p.startsWith('/routes/') ? '0.8' : p.startsWith('/stops/') ? '0.6' : '0.5');
fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${written.map(m => `  <url><loc>${SITE_URL}${m.path === '/' ? '/' : m.path}</loc><lastmod>${today}</lastmod><priority>${priority(m.path)}</priority></url>`).join('\n')}
</urlset>
`);

console.log(`prerender: ${written.length} pages (${ROUTES.length} routes, ${stops} stops) and sitemap.xml in ${((Date.now() - started) / 1000).toFixed(1)}s`);
