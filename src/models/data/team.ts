/* The people behind Transit Regina and the facts shown on the team pages (/connect).

   Each person's page is their portfolio link: /connect/<slug>.
   Fields left as '' or [] are still to be filled in. In development the page shows a dashed
   reminder box in their place; on the live site those parts are simply left out. */
import type { MarkerCharacterId } from './markerCharacters';

export interface TeamMember {
    /** The end of their link: /connect/<slug> */
    slug: string;
    name: string;
    title: string;
    focus: string;
    /** The map character shown beside them (and instead of a photo until one is added) */
    character: MarkerCharacterId;
    /** Picked up from src/assets/team/<slug>.jpg (or png/webp); '' shows the character instead */
    photo: string;
    /** One line under the name */
    pitch: string;
    /** A few short paragraphs in their own words */
    about: string[];
    /** Where they study, shown under the name */
    education: string;
    /** Jobs and roles, newest first */
    experience: { role: string; org: string; kind: string; from: string; to: string; detail?: string }[];
    /** What they built on Transit Regina */
    built: { title: string; detail: string }[];
    skills: string[];
    /** Work outside Transit Regina */
    projects: {
        name: string;
        blurb: string;
        tags: string[];
        /** One number worth showing large */
        stat?: { value: string; label: string };
        status?: string;
        link?: string;
        linkLabel?: string;
    }[];
    linkedin: string;
    github: string;
    /** Shown as an "Email me" button when filled in */
    email: string;
    /** Import a PDF and put it here to show a "Résumé" button */
    resume: string;
    openToWork: boolean;
}

/* Photos are found by file name, so adding one needs no code change: src/assets/team/<slug>.jpg */
const photos = import.meta.glob('../../assets/team/*.{jpg,jpeg,png,webp}', { eager: true, import: 'default' }) as Record<string, string>;
const photoFor = (slug: string) =>
    Object.entries(photos).find(([path]) => path.split('/').pop()!.split('.')[0] === slug)?.[1] ?? '';

/* Who built what follows the repository itself (12 Oct 2026): `git blame` on the committed code
   gives Dev about 78% of the surviving lines — all of the admin panel, accounts, backend, tests and
   landing pages, and most of the map screen and stop board — and Nirjar about 22%, concentrated in
   the trip planner (68% of it) and in tracking and live-bus motion (79%). Edit the wording freely. */
export const TEAM: TeamMember[] = [
    {
        slug: 'dev',
        name: 'Dev Paresh Patel',
        title: 'Founder',
        focus: 'Full-stack: Frontend, Backend & Security',
        character: 'astronaut',
        photo: photoFor('dev'),
        pitch: 'Computer science student and founder of Transit Regina. I built most of it end to end: the map screens, the API behind them, the admin side, and the security that keeps it standing.',
        /* From Dev's LinkedIn launch post */
        about: [
            'I still remember the first bus I missed in Canada. Knowing which bus was coming was not the problem. The real problem was figuring out which stop to go to and how to get from where I was to where I needed to be. By the time I pieced the route together, the bus was gone.',
            'I filed it away as a "new city" problem and moved on. Then, over my degree, I started learning how software actually gets built: architecture, design patterns, working with live data. When our team had to build a full project from scratch, I remembered that missed bus. My friend Nirjar and I did not need to think twice.',
            'Today I study computer science at the University of Regina and work a co-op term at FCC. I like building things real people can open and rely on, from the screen they tap to the parts they never see: the API, the security and keeping it all running.',
        ],
        education: 'Computer Science, University of Regina · Class of 2027',
        experience: [
            { role: 'Student, Junior Employee Digital Experience Consultant', org: 'FCC / FAC', kind: 'Co-op', from: 'Sep 2026', to: 'Now' },
            { role: 'Peer Tutor', org: 'University of Regina', kind: 'Tutoring', from: 'Jan 2024', to: 'Aug 2026', detail: 'Tutored students in programming and mathematics, teaching the thinking behind each fix so they do not hit the same wall twice.' },
            { role: 'Community Resources Coordinator', org: 'United Way Regina', kind: 'Co-op', from: 'Sep 2024', to: 'Dec 2024', detail: 'Presented campaign data to corporate and government stakeholders, raising donor participation by 18% and pledge conversions by 15%, and built Excel dashboards to validate donation records.' },
            { role: 'Club Member', org: 'Google Developer Student Club, University of Regina', kind: 'Community', from: 'Sep 2024', to: 'Oct 2025' },
        ],
        built: [
            { title: 'Architecture', detail: 'An MVC design in React and TypeScript, with the Observer pattern keeping live bus positions in sync across the map, the tracking panel and the stop details from one data source.' },
            { title: 'The map screens', detail: 'Most of the rider-facing app: the live map, the "you are here" marker, saved places, the profile page and the full phone layout.' },
            { title: 'Stop board and live arrivals', detail: 'Tap a stop and see every departure for the rest of the day, built end to end: the Express API in front of the TransitLive feed and the panel that shows it.' },
            { title: 'Sign-in, roles and two-step for admins', detail: 'Accounts on Supabase, role-protected admin routes, a second sign-in step for admins and a forgot-password flow.' },
            { title: 'Admin panel', detail: 'The whole admin side: people, per-feature access switches, service management, insights and the security centre.' },
            { title: 'Security audit and tests', detail: 'Hardened the API, added a security event log, then fixed all ten findings of an October 2026 audit and locked them in with 48 automated tests.' },
            { title: 'Notifications', detail: 'Text reminders through Twilio, browser push notifications and a weekly trip planner.' },
            { title: 'Map characters', detail: 'Selectable characters that restyle the map screens, each with its own colours and wording.' },
            { title: 'Landing page and deployment', detail: 'The public landing and team pages, the move to Supabase, and the live site: backend on Railway, frontend on Vercel, at transitregina.ca.' },
        ],
        skills: ['TypeScript', 'React', 'Node.js', 'Express', 'Next.js', 'Tailwind CSS', 'Python', 'Kotlin', 'PostgreSQL', 'Supabase', 'Authentication & 2FA', 'API security', 'Automated testing', 'Docker', 'Microsoft Azure', 'Twilio', 'Web Push', 'Railway', 'Vercel'],
        /* From Dev's GitHub READMEs and LinkedIn projects */
        projects: [
            { name: 'AI Code Review Verifier', blurb: 'A GitHub App that reviews pull requests, especially AI-generated ones. It writes property-based and edge-case tests, runs mutation testing to check those tests really constrain the code, and posts a trust score with evidence.', tags: ['TypeScript', 'GitHub App', 'Mutation testing', 'Docker'], stat: { value: '13 / 13', label: 'seeded bugs caught in its own evaluation (mock model), against 9 / 13 for a rules-only baseline' }, link: 'https://github.com/dev048patel/AI-generate-code-review-verifier' },
            { name: 'dmarc-translate', blurb: 'Reads DMARC reports and says in plain English who is sending email as your domain, and when it is safe to start blocking them. A two-person student project.', tags: ['Python', 'parsedmarc', 'SQLite', 'Email security'], status: 'In progress', link: 'https://github.com/dev048patel/dmarc-translate' },
            { name: 'CourseFlow', blurb: 'A peer-to-peer academic guidance platform for university students: verified anonymous course reviews, GPA and credit tracking, and suggested next courses.', tags: ['Next.js', 'TypeScript', 'Supabase'], link: 'https://github.com/dev048patel/courseflow' },
            { name: 'FinScan', blurb: 'A financial audit platform that used OCR to check receipts in under five seconds and flag anomalies, with role-based access and an audit trail. Retired when running costs outgrew a self-funded student project.', tags: ['Python', 'OCR', 'React', 'Supabase'], stat: { value: '25+', label: 'people used it' }, status: 'Retired' },
            { name: 'AlgoLens', blurb: 'An Android app that solved photographed math problems step by step, built on a custom OCR pipeline with a backend on Microsoft Azure. Retired over API costs.', tags: ['Kotlin', 'Android', 'OCR', 'Azure'], stat: { value: '30+', label: 'University of Regina students used it' }, status: 'Retired' },
            { name: 'AI Finance Platform', blurb: 'A personal finance app with AI-written spending summaries and live dashboards.', tags: ['Next.js', 'Prisma', 'Supabase', 'Gemini API'], link: 'https://github.com/dev048patel/AI-Finance' },
        ],
        linkedin: 'https://www.linkedin.com/in/dev-patel-itsme/',
        github: 'https://github.com/dev048patel',
        email: '',
        resume: '',
        openToWork: false,
    },
    {
        slug: 'nirjar',
        name: 'Nirjar Patel',
        title: 'Co-Founder',
        focus: 'Trip Planning, Live Tracking & Maps',
        character: 'fox',
        photo: photoFor('nirjar'),
        pitch: 'Fourth-year computer science student and co-founder of Transit Regina. I built the trip planner and the live tracking that follows your ride.',
        /* Drafted from Nirjar's GitHub profile and LinkedIn — for him to rewrite in his own words */
        about: [
            '"Ship something real, then make it rigorous." That is how I like to work, and it is how my part of Transit Regina got built: a trip planner that works first, then one that is right about which side of the street you stand on.',
            'I am in my fourth year of computer science at the University of Regina, on the Dean\'s List for Fall 2025 and Winter 2026. Before this I spent almost two years as a Junior Technical Business Analyst with the Government of Saskatchewan on the GEM Program, a province-wide Oracle HCM rollout delivered with Deloitte.',
            'I am drawn to AI and machine-learning tooling, transit systems and data-driven automation, and I am looking for co-op or term positions in software development, data or business analysis.',
        ],
        education: 'B.Sc. Computer Science, University of Regina · 4th year · Dean\'s List',
        experience: [
            { role: 'Junior Technical Business Analyst', org: 'Government of Saskatchewan', kind: 'Co-op, then contract', from: 'Sep 2024', to: 'May 2026', detail: 'Worked on the GEM Program, a province-wide Oracle HCM deployment: supported software testing in ALM Octane and managed files across the development and testing teams in SharePoint.' },
            { role: 'Club Coordinator', org: 'UofR Computer Science Students Society', kind: 'Leadership', from: 'Jan 2023', to: 'Dec 2023', detail: 'Ran weekly meetings for 30 members, booked rooms and event approvals with staff, and grew membership by 40%.' },
            { role: 'Club Member', org: 'Google Developer Student Club, University of Regina', kind: 'Community', from: 'Aug 2024', to: 'Oct 2025' },
        ],
        built: [
            { title: 'Trip planner', detail: 'Most of the bus-suggestion engine: door-to-door trips with transfers and walkable shortcuts, checked against GTFS travel direction and ranked with live arrival times.' },
            { title: 'Live trip tracking', detail: 'Follows a ride with real-time GPS along road-following route lines and highlights the leg the rider is on.' },
            { title: 'Smooth live buses', detail: 'Buses glide between position reports instead of jumping, and stay on screen through turnarounds.' },
            { title: 'Place search', detail: 'Address search with Google Places autocomplete, later migrated to the new Places API.' },
            { title: 'Detours on the map', detail: 'Detour roads and routes drawn on the map alongside the regular route lines.' },
            { title: 'Stop direction', detail: 'Uses each stop\'s direction of travel (NB, SB, EB, WB) to pick the right side of the street, with direction arrows on stops.' },
        ],
        skills: ['TypeScript', 'React', 'Google Maps Platform', 'GTFS', 'Route-planning algorithms', 'Python', 'TensorFlow', 'FastAPI', 'C#', '.NET', 'SQL', 'Node.js', 'Socket.io'],
        /* From Nirjar's GitHub READMEs */
        projects: [
            { name: 'YardTracker', blurb: 'Tracks pipe and steel inventory as it moves through a yard. Operators scan tagged bundles on handhelds, trucks report GPS positions and plant machines report over Modbus. A working end-to-end model of an industrial floor system, with a scan audit trail, ETL and reporting on top.', tags: ['C#', '.NET', 'WPF', 'WCF', 'T-SQL', 'Modbus'], link: 'https://github.com/nirjar1012/inventory-asset-tracking-system' },
            { name: 'Stock Price Prediction Dashboard', blurb: 'Forecasts daily share prices in the agri-food sector with an LSTM and Prophet, scores both against a no-change baseline in a rolling backtest, and presents the results in a live dashboard and a quarterly Excel report.', tags: ['Python', 'TensorFlow', 'Prophet', 'FastAPI', 'SQLite'], stat: { value: '9', label: 'agri-food companies forecast' }, link: 'https://github.com/nirjar1012/stock-prediction-dashboard' },
            { name: 'Chatty', blurb: 'A real-time chat app on the MERN stack with Socket.io: secure sign-in, online presence, profile pictures and a choice of themes.', tags: ['React', 'Node.js', 'MongoDB', 'Socket.io'], stat: { value: '30+', label: 'themes to pick from' }, status: 'Live', link: 'https://chat-temp-two.vercel.app', linkLabel: 'Open the live demo' },
        ],
        linkedin: 'https://www.linkedin.com/in/nirjarpatel/',
        github: 'https://github.com/nirjar1012',
        email: '',
        resume: '',
        openToWork: false,
    },
];

/* ── The project, for the team page ── */

export const PROJECT = {
    site: 'https://transitregina.ca',
    siteLabel: 'transitregina.ca',
    tagline: 'Two students. One city. Every bus.',
    story: 'A timetable says when the bus should come. Riders need to know when it will. We are two University of Regina students who built Transit Regina to show the live picture, so you can leave at the right time instead of waiting in the cold.',
};

/* The route so far — taken from the commit history */
export const TIMELINE = [
    { when: 'Jan 2026', title: 'First commit', detail: 'The project starts life as GoTransit Regina.' },
    { when: 'Feb 2026', title: 'Accounts, search and tracking', detail: 'User accounts on Postgres, Google Places search, and route tracking with real-time GPS along road-following lines. The database moves to Supabase.' },
    { when: 'Mar 2026', title: 'The stop board, and a phone-ready app', detail: 'Tap a stop for live arrivals, a "you are here" marker, a full mobile layout, and the code reorganised into models, views and controllers.' },
    { when: 'Apr 2026', title: 'Planner, push and detours', detail: 'A weekly planner, push notifications, per-feature access switches for admins, and detour routes drawn on the map.' },
    { when: 'May 2026', title: 'Text reminders', detail: 'SMS notifications through Twilio, with an opt-in flow.' },
    { when: 'Oct 2026', title: 'Transit Regina', detail: 'A new name, map characters, gliding buses, a direction-aware trip planner, two-step sign-in for admins and a full security audit.' },
];

/* Snapshot taken on 12 October 2026 from the repository — update when it matters */
export const PROJECT_NUMBERS = [
    { value: 'Jan 2026', label: 'Building since' },
    { value: '22', label: 'Regina routes' },
    { value: '1,400+', label: 'Bus stops' },
    { value: '1.5 s', label: 'Live refresh' },
];

export const BUILD_NUMBERS = [
    { value: '160+', label: 'commits' },
    { value: '22', label: 'merged pull requests' },
    { value: '35,000', label: 'lines of TypeScript' },
    { value: '48', label: 'automated security tests' },
];

export const PROJECT_FEATURES = [
    { icon: 'Navigation', title: 'Live map', detail: 'Every bus as it moves, refreshed every 1.5 seconds and coloured by route.' },
    { icon: 'Map', title: 'Trip planner', detail: 'Door-to-door routes with transfers and live arrival predictions.' },
    { icon: 'Clock', title: 'Stop board', detail: 'The next departures at any stop, one tap from the map.' },
    { icon: 'Route', title: 'Trip tracking', detail: 'One line tells you what to do right now, with every step of the trip below.' },
    { icon: 'Smile', title: 'Characters', detail: 'Pick a character and the whole map screen takes on its colours and voice.' },
    { icon: 'Heart', title: 'Saved places', detail: 'Keep home, school and work one tap away.' },
];

/* How a tap becomes a bus on the map */
export const ARCHITECTURE = [
    { name: 'Browser', tech: 'React 19 · Vite · Google Maps', detail: 'Draws the map and asks for fresh bus positions every 1.5 seconds.' },
    { name: 'API', tech: 'Express 5 · TypeScript', detail: 'Guards, validates and rate-limits every request, and shares one copy of the live feed between all riders.' },
    { name: 'Data', tech: 'Supabase (Postgres) · TransitLive feed', detail: 'Accounts, saved places and admin settings in Postgres; live bus positions from the Regina Transit feed.' },
];

export const HARD_PARTS = [
    { title: 'A live loop that stays smooth', detail: 'Poll the feed, merge what changed and redraw, every 1.5 seconds. Buses glide between reports instead of jumping.' },
    { title: 'A trip planner that respects direction', detail: 'Three levels of direction checks against GTFS data, a 500 m then 800 m walking search, live arrival times folded in, and the best five trips ranked.' },
    { title: 'Security treated as a feature', detail: 'Two-step sign-in for admins, a security event log, and a full audit whose ten findings were all fixed and locked in with tests.' },
    { title: 'Three clean layers', detail: 'Views draw the screen, controllers hold the logic, models own the data. Every feature follows the same split.' },
];

export const STACK = ['TypeScript', 'React 19', 'Vite', 'Tailwind CSS', 'Framer Motion', 'Google Maps', 'Node.js', 'Express 5', 'Supabase', 'PostgreSQL', 'Twilio', 'Web Push', 'Railway', 'Vercel'];
