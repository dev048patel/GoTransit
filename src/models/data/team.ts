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
    experience: { role: string; org: string; kind: string; from: string; to: string; detail?: string; tags?: string[]; stat?: { value: string; label: string } }[];
    /** What they built on Transit Regina: each one is a passenger on their bus */
    built: {
        title: string; detail: string; sub?: string; tags?: string[]; stat?: { value: string; label: string };
        /** For hiring managers: the problem, what this person did, and how it works */
        problem?: string; did?: string; how?: string;
    }[];
    skills: string[];
    /** Courses with a credential, newest first */
    certifications: { name: string; issuer: string; date: string }[];
    /** Awards and honour lists, newest first */
    honours: { name: string; issuer: string; date: string }[];
    /** Work outside Transit Regina */
    projects: {
        name: string;
        blurb: string;
        tags: string[];
        /** One number worth showing large */
        stat?: { value: string; label: string };
        /** The problem it set out to solve */
        problem?: string;
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

/* Education, certifications, honours, contact email and the full job history come from each
   person's LinkedIn profile (read 17 Oct 2026). */

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
            'Today I study computer science in Regina and work a co-op term at FCC. I like building things real people can open and rely on, from the screen they tap to the parts they never see: the API, the security and keeping it all running.',
        ],
        education: 'Bachelor\'s in Computer Science, University of Regina · 2023 to 2027',
        experience: [
            { role: 'Student, Junior Employee Digital Experience Consultant', org: 'FCC / FAC', kind: 'Co-op', from: 'Sep 2026', to: 'Now', detail: 'A co-op term on the digital experience team at Farm Credit Canada.', tags: ['Digital experience', 'Consulting'] },
            { role: 'Meat, Deli & Bakery Clerk', org: 'FreshCo', kind: 'Part-time', from: 'Jul 2023', to: 'Now', detail: 'Three years on the floor alongside my degree, taking on more than the role: helping train staff and coordinate shifts for an 8-person team, keeping food-safety standards, and joining the quarterly stock counts that keep waste down.', tags: ['Team leadership', 'Training', 'Food safety', 'Inventory'], stat: { value: '3+ yrs', label: 'while studying full time' } },
            { role: 'Peer Tutor', org: 'University of Regina', kind: 'Tutoring', from: 'Jan 2024', to: 'Aug 2026', detail: 'Helped students get unstuck in programming and mathematics. I diagnose the logic error, then teach the thinking behind the fix so they do not hit the same wall twice, adapting to how each person learns and keeping notes on the patterns that come up again and again.', tags: ['Programming', 'Mathematics', 'Teaching'], stat: { value: '2 yrs 8 mos', label: 'of one-to-one tutoring' } },
            { role: 'Crew Member', org: "McDonald's", kind: 'Part-time', from: 'Apr 2024', to: 'Dec 2025', detail: 'Fast, accurate service under pressure: orders, payments, cleanliness and safety, all at once, as part of a team that has to move as one.', tags: ['Teamwork', 'Working under pressure', 'Customer service'] },
            { role: 'Community Resources Coordinator', org: 'United Way Regina', kind: 'Co-op', from: 'Sep 2024', to: 'Dec 2024', detail: 'My first professional role, and the one that taught me data tells stories that move people to act. My presentations to corporate and government partners lifted donor participation by 18% and pledge conversions by 15%, and my Excel dashboards checked every donation record and gave leadership a live picture of the campaign.', tags: ['Data storytelling', 'Excel dashboards', 'Stakeholder presentations'], stat: { value: '+18%', label: 'donor participation' } },
            { role: 'Club Member', org: 'Google Developer Student Club, University of Regina', kind: 'Community', from: 'Sep 2024', to: 'Oct 2025' },
        ],
        built: [
            { title: 'The live map', sub: 'What riders see first', detail: 'Every Regina bus moving on one map, refreshed every 1.5 seconds and coloured by route, with a "you are here" marker, saved places, a profile page and a full phone layout. Most of what a rider taps, I built.', tags: ['React 19', 'TypeScript', 'Google Maps', 'Tailwind CSS'], stat: { value: '1.5 s', label: 'between live updates' }, problem: 'Regina\'s bus information was split across a schedule site, a live map and general navigation apps, none built for daily riders. Nobody could see where their bus actually was, in one place, on a phone.', did: 'Built most of the rider-facing app in React and TypeScript: the map with every live bus, the "you are here" marker, saved places, the profile page and the full phone layout.', how: 'The browser asks our API for positions every 1.5 seconds. One shared store (the Observer pattern) pushes each update to the map, the tracking panel and the stop details at once, so the three never disagree.' },
            { title: 'Stop board and live arrivals', sub: 'Built end to end', detail: 'Tap any stop and see every departure left today. Behind it, an Express API sits in front of the TransitLive feed and shares one copy between all riders, so the feed is asked once, not once per phone.', tags: ['Express 5', 'Node.js', 'REST API', 'Caching'], stat: { value: '1,400+', label: 'stops covered' }, problem: 'A timetable says when a bus should come. Riders standing at a stop need to know when it will.', did: 'Built both ends: an Express endpoint in front of Regina Transit\'s live feed, and the panel that lists every departure left today when you tap a stop.', how: 'The server fetches the feed once and shares it with every rider, so the city\'s feed is asked once instead of once per phone, and arrival predictions combine live bus positions with the schedule.' },
            { title: 'Architecture', sub: 'The shape every feature follows', detail: 'A strict model-view-controller split: views draw, controllers decide, models own the data. The Observer pattern keeps live bus positions in step across the map, the tracking panel and the stop details from a single source.', tags: ['MVC', 'Observer pattern', 'TypeScript'], stat: { value: '35,000', label: 'lines of TypeScript in the app' }, problem: 'Two students adding features quickly, without the code turning into a tangle nobody can change safely.', did: 'Set the rule every feature follows and reorganised the codebase into models, views and controllers in March 2026.', how: 'Views only draw the screen. Controller hooks hold the logic. Models own the data and talk to Supabase and the live feed. Views may not call services directly, so a change in one layer stays in that layer.' },
            { title: 'Accounts and admin sign-in', sub: 'Who you are, and what you may do', detail: 'Sign-up and sign-in on Supabase, role-protected admin routes, a second step for admins with an authenticator code, a 30-minute idle sign-out, and a Terms agreement the server enforces, not just the screen.', tags: ['Supabase Auth', 'Two-step sign-in', 'Row-level security'], stat: { value: '2 steps', label: 'to sign in as an admin' }, problem: 'Admins can switch features off for every rider, so a stolen admin password would be serious.', did: 'Built sign-up and sign-in on Supabase, role-protected admin routes, a second sign-in step with an authenticator code for admins, a 30-minute idle sign-out, and a Terms agreement checked by the server.', how: 'Every API request carries a Supabase token. Middleware checks the token, the account\'s role and status, and whether the current Terms are agreed before any handler runs, so hiding a button is never the only protection.' },
            { title: 'Admin panel', sub: 'Running the service', detail: 'Everything needed to run Transit Regina day to day: people and roles, an on/off switch for every feature, service settings, usage insights and a security centre.', tags: ['React', 'Supabase', 'Role-based access'], problem: 'Running a live service means changing settings and handling problems without redeploying the app.', did: 'Built the whole admin side: people and roles, a switch for every feature, service settings, usage insights and a security centre.', how: 'Feature switches live in Postgres and are enforced by the server, not just hidden in the interface, so turning a feature off really turns it off.' },
            { title: 'Security audit and tests', sub: 'Security treated as a feature', detail: 'Hardened the API with validation, rate limits and a security event log, fixed all ten findings of an October 2026 audit, then made sessions safer: a password re-check before sensitive changes and "sign out of all devices". Automated tests stop any of it slipping back.', tags: ['API security', 'OWASP guidance', 'Automated testing'], stat: { value: '10 / 10', label: 'audit findings fixed' }, problem: 'A public app with accounts, admin powers and text messages is a target.', did: 'Hardened the API, ran a full audit in October 2026 and fixed all ten findings, then tightened sessions: a password re-check before sensitive changes and "sign out of all devices".', how: 'Validation and rate limits on every route, a security event log, row-level security in Postgres, and automated tests that fail the build if any fix is undone.' },
            { title: 'Reminders that reach you', sub: 'Text and push', detail: 'Opt-in text reminders through Twilio 15 minutes before a saved trip (reply STOP to stop), browser push notifications, and a weekly trip planner to set it all up once.', tags: ['Twilio', 'Web Push', 'Scheduled jobs'], stat: { value: '15 min', label: 'heads-up before your bus' }, problem: 'Most missed buses come down to leaving a few minutes late.', did: 'Built opt-in text reminders through Twilio, browser push notifications and a weekly planner to set trips up once.', how: 'A server job runs every minute, finds saved trips leaving in 15 minutes, and notifies only riders who opted in with a verified number. Replying STOP turns texts off immediately.' },
            { title: 'Map characters', sub: 'Make the app yours', detail: 'Pick a character and the whole map screen takes on its colours and voice.', tags: ['Theming', 'Design system'], stat: { value: '6', label: 'characters to choose from' }, problem: 'Every transit app looks the same, and a tool you open twice a day should feel like yours.', did: 'Designed six characters, each with its own colours and voice.', how: 'Each character is a theme applied to the map screens from one place, so adding a character never means editing every screen.' },
            { title: 'Launch and hosting', sub: 'From laptop to transitregina.ca', detail: 'Moved the data to Supabase, put the API on Railway and the site on Vercel, and wrote plain-language privacy and terms pages, with old logs deleted automatically after 90 days.', tags: ['Railway', 'Vercel', 'Supabase', 'Privacy'], problem: 'A student project only matters if real people can open it and rely on it.', did: 'Moved the data to Supabase, deployed the API on Railway and the site on Vercel at transitregina.ca, and wrote the privacy and terms pages.', how: 'The frontend and backend deploy independently, and a nightly job deletes visitor and security logs after 90 days, so the app keeps only what it needs.' },
            { title: 'This bus ride', sub: 'The page you are on', detail: 'A 3D anime scene built entirely in code: cel shading, ink outlines, people with jointed limbs and hand-drawn faces, and a camera your scroll directs. It lowers its own resolution if your device starts to struggle.', tags: ['three.js', 'WebGL', 'TypeScript', 'Framer Motion'], stat: { value: '0', label: '3D model files: every shape is code' }, problem: 'Hiring managers skim a portfolio in about a minute. This one should be worth staying for, and still give the facts quickly.', did: 'Built this scene and the game you are playing, in code.', how: 'three.js renders people built from merged, vertex-coloured shapes with cel shading and ink outlines. Your scroll drives the story camera; game mode adds collision, a follow camera and branching dialogue, and the scene lowers its own resolution if your device struggles.' },
        ],
        certifications: [
            { name: 'Play It Safe: Manage Security Risks', issuer: 'Google', date: 'Aug 2026' },
            { name: 'Foundations of Cybersecurity', issuer: 'Google', date: 'Jul 2026' },
        ],
        honours: [
            { name: "Dean's Honour List", issuer: 'University of Regina', date: 'May 2026' },
        ],
        skills: ['TypeScript', 'React', 'Node.js', 'Express', 'Next.js', 'Tailwind CSS', 'Python', 'Kotlin', 'PostgreSQL', 'Supabase', 'Authentication & 2FA', 'API security', 'Automated testing', 'Docker', 'Microsoft Azure', 'Twilio', 'Web Push', 'Railway', 'Vercel'],
        /* From Dev's GitHub READMEs and LinkedIn projects */
        projects: [
            { name: 'AI Code Review Verifier', problem: 'AI-written pull requests can look right and still be wrong, and reviewers cannot test every edge case by hand.', blurb: 'A GitHub App that reviews pull requests, especially AI-generated ones. It writes property-based and edge-case tests, runs mutation testing to check those tests really constrain the code, and posts a trust score with evidence.', tags: ['TypeScript', 'GitHub App', 'Mutation testing', 'Docker'], stat: { value: '13 / 13', label: 'seeded bugs caught in its own evaluation (mock model), against 9 / 13 for a rules-only baseline' }, link: 'https://github.com/dev048patel/AI-generate-code-review-verifier' },
            { name: 'dmarc-translate', problem: 'DMARC reports are dense XML, so most domain owners cannot tell who is sending email as them.', blurb: 'Reads DMARC reports and says in plain English who is sending email as your domain, and when it is safe to start blocking them. A two-person student project.', tags: ['Python', 'parsedmarc', 'SQLite', 'Email security'], status: 'In progress', link: 'https://github.com/dev048patel/dmarc-translate' },
            { name: 'CourseFlow', problem: 'Choosing courses usually runs on rumours; students need honest reviews and a clear path to graduation.', blurb: 'A peer-to-peer academic guidance platform for university students: verified anonymous course reviews, GPA and credit tracking, and suggested next courses.', tags: ['Next.js', 'TypeScript', 'Supabase'], link: 'https://github.com/dev048patel/courseflow' },
            { name: 'FinScan', problem: 'Checking receipts against records by hand is slow, and mistakes slip through.', blurb: 'A financial audit platform that used OCR to check receipts in under five seconds and flag anomalies, with role-based access and an audit trail. Retired when running costs outgrew a self-funded student project.', tags: ['Python', 'OCR', 'React', 'Supabase'], stat: { value: '25+', label: 'people used it' }, status: 'Retired' },
            { name: 'AlgoLens', problem: 'A student stuck on a maths problem needs the steps, not just the answer.', blurb: 'An Android app that solved photographed math problems step by step, built on a custom OCR pipeline with a backend on Microsoft Azure. Retired over API costs.', tags: ['Kotlin', 'Android', 'OCR', 'Azure'], stat: { value: '30+', label: 'University of Regina students used it' }, status: 'Retired' },
            { name: 'AI Finance Platform', blurb: 'A personal finance app with AI-written spending summaries and live dashboards.', tags: ['Next.js', 'Prisma', 'Supabase', 'Gemini API'], link: 'https://github.com/dev048patel/AI-Finance' },
        ],
        linkedin: 'https://www.linkedin.com/in/dev-patel-itsme/',
        github: 'https://github.com/dev048patel',
        email: 'devpate.04.08@gmail.com',
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
            'I am in my fourth year of computer science, on the Dean\'s List for Fall 2025 and Winter 2026. Before this I spent almost two years as a Junior Technical Business Analyst with the Government of Saskatchewan on the GEM Program, a province-wide Oracle HCM rollout delivered with Deloitte.',
            'I am drawn to AI and machine-learning tooling, transit systems and data-driven automation, and I am looking for co-op or term positions in software development, data or business analysis.',
        ],
        education: 'BSc in Computer Science, University of Regina · since 2023',
        experience: [
            { role: 'Meat Clerk', org: 'FreshCo', kind: 'Part-time', from: 'Sep 2026', to: 'Now', tags: ['Customer service', 'Food safety'] },
            { role: 'Junior Technical Business Analyst', org: 'Government of Saskatchewan', kind: 'Co-op, then contract', from: 'Sep 2024', to: 'May 2026', detail: 'Almost two years on the GEM Program, a province-wide Oracle HCM rollout delivered with Deloitte: supported software testing in ALM Octane, kept files in order across the development and testing teams in SharePoint, and learned how human capital management works across a whole government.', tags: ['Oracle HCM', 'ALM Octane', 'Software testing', 'SharePoint'], stat: { value: '1 yr 9 mos', label: 'on a province-wide rollout' } },
            { role: 'Club Member', org: 'Google Developer Student Club, University of Regina', kind: 'Community', from: 'Aug 2024', to: 'Oct 2025' },
            { role: 'OMNI Customer Fulfillment Associate', org: 'Walmart Canada', kind: 'Part-time', from: 'Jun 2023', to: 'Apr 2025', detail: 'Picked and fulfilled online orders with handheld technology, solved customer problems on the spot, and worked across teams to get orders out accurately and on time.', tags: ['Order fulfillment', 'Problem solving', 'Customer service'] },
            { role: 'Club Coordinator', org: 'UofR Computer Science Students Society', kind: 'Leadership', from: 'Jan 2023', to: 'Dec 2023', detail: 'Ran weekly meetings for 30 members from agenda to activities, grew the society by 40% with targeted social posts and flyers, handled rooms and approvals with staff, and kept the records other members relied on.', tags: ['Leadership', 'Event planning', 'Communication'], stat: { value: '+40%', label: 'membership growth' } },
        ],
        built: [
            { title: 'Trip planner', sub: 'How do I get there?', detail: 'The engine behind every suggested trip: door to door with transfers, a 500 m walking search that widens to 800 m when nothing is close, three levels of direction checks against GTFS data, and live arrival times folded in before the best five trips are ranked.', tags: ['TypeScript', 'GTFS', 'Routing algorithms'], stat: { value: 'Top 5', label: 'trips ranked for every search' }, problem: 'Knowing which bus is coming was never the hard part. Knowing which stop to walk to, which route to take and where to transfer is.', did: 'Built most of the planner: about two thirds of its code is his.', how: 'It searches stops within 500 m of you, widening to 800 m if nothing is close, checks direction of travel at three levels against GTFS data, combines direct trips, transfers and walking shortcuts, folds in live waits and keeps the best five.' },
            { title: 'Live trip tracking', sub: 'Your ride, step by step', detail: 'Follows your ride with real-time GPS along road-following route lines, highlights the leg you are on, and keeps one line at the top that says what to do right now.', tags: ['Google Maps', 'Geolocation', 'React'], problem: 'Mid-trip, a rider only wants to know one thing: what to do right now.', did: 'Built the tracking and live-bus motion: about four fifths of that code is his.', how: 'Your GPS position is followed along road-following route lines built from the route shapes, the leg you are on is highlighted, and one line at the top says the next step.' },
            { title: 'Smooth live buses', sub: 'No more jumping icons', detail: 'Buses glide between position reports instead of jumping every few seconds, and stay on screen through turnarounds.', tags: ['Animation', 'Map overlays'], stat: { value: '1.5 s', label: 'reports, smoothed in between' }, problem: 'Positions arrive every few seconds, so bus icons used to jump across the map.', did: 'Made buses move smoothly.', how: 'Each bus is animated between its last two reported positions, with turnarounds handled so a bus never disappears at the end of its route.' },
            { title: 'Place search', sub: 'Type where you are going', detail: 'Address search with Google Places autocomplete, tuned to put Regina first, later moved onto the new Places API.', tags: ['Google Places API', 'Autocomplete'], problem: 'Riders type addresses in a hurry; the app has to turn them into a place on the map instantly.', did: 'Built address search, then moved it to Google\'s new Places API.', how: 'Google Places autocomplete, biased to Regina, returns suggestions as you type; choosing one gives the exact coordinates the planner needs.' },
            { title: 'Detours on the map', sub: 'See the change before the stop', detail: 'When a route is diverted, the detour road and route are drawn beside the regular line, so riders see it before they walk to a stop that is not served.', tags: ['Google Maps', 'GTFS'], problem: 'During a detour, riders walk to stops the bus no longer serves.', did: 'Drew detours on the map.', how: 'Detour roads and routes are drawn over the regular route lines, so the change is visible before you leave home.' },
            { title: 'Stop direction', sub: 'The right side of the street', detail: 'Uses each stop\'s direction of travel (northbound, southbound, eastbound, westbound) to send you to the correct side of the road, with an arrow on every stop.', tags: ['GTFS', 'Map UX'], problem: 'Stops on opposite sides of a street share a name, and the wrong one sends you the wrong way.', did: 'Made the planner direction-aware at the stop level.', how: 'Each stop\'s direction of travel from the GTFS data (northbound, southbound, eastbound, westbound) decides which side of the street to use, with an arrow on every stop.' },
        ],
        certifications: [
            { name: 'Play It Safe: Manage Security Risks', issuer: 'Google', date: 'Aug 2026' },
            { name: 'Foundations of Cybersecurity', issuer: 'Google', date: 'Aug 2026' },
            { name: 'Supervised Machine Learning: Regression and Classification', issuer: 'DeepLearning.AI', date: 'Jul 2026' },
            { name: 'Introduction to Artificial Intelligence (AI)', issuer: 'IBM', date: 'Aug 2024' },
            { name: 'The Bits and Bytes of Computer Networking', issuer: 'Google', date: 'Jul 2024' },
        ],
        honours: [
            { name: "Dean's Honour List, Winter 2026", issuer: 'University of Regina', date: 'May 2026' },
            { name: "Dean's Honour List, Fall 2025", issuer: 'University of Regina', date: 'Feb 2026' },
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
        email: 'nirjar000@gmail.com',
        resume: '',
        openToWork: false,
    },
];

/* ── The project, for the team page ── */

export const PROJECT = {
    site: 'https://transitregina.ca',
    siteLabel: 'transitregina.ca',
    tagline: 'Two students. One city. Every bus.',
    story: 'A timetable says when the bus should come. Riders need to know when it will. We are two computer science students in Regina who built Transit Regina, an unofficial bus tracker, to show the live picture, so you can leave at the right time instead of waiting in the cold.',
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
