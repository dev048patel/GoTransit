/* Facts and wording for the independence notice and the About, Privacy and Terms pages.
   The Privacy and Terms wording is a plain-language draft, not legal advice; have it reviewed. */

export const SITE = {
    brand: 'Transit Regina',
    url: 'https://transitregina.ca',
    operators: 'Dev Patel and Nirjar Patel',
    /** Where questions about the site and people's information go */
    CONTACT_EMAIL: 'p.p.dev2004@gmail.com',
    /** Where Supabase stores the database: Supabase dashboard → Project Settings → General → Region */
    DATA_REGION: 'Canada (Central)',
    policyDate: 'October 17, 2026',
    /** Bump this whenever the Terms or Privacy policy change in a way people should agree to again.
        Every signed-in account is asked to agree to the current version once. */
    TERMS_VERSION: '2026-10-17.2',
    licenceUrl: 'https://www.regina.ca/city-government/open-data/open-government-licence/',
    licenceName: 'Open Government Licence – City of Regina',
    officialUrl: 'https://www.regina.ca/transportation-roads-parking/transit/',
};

/* The key points, shown where people agree (signup form and the sign-in step). Canada's Privacy
   Commissioner asks that what is collected, why, who it is shared with, and the choices people have
   be emphasized up front rather than only inside a long policy. */
export const AT_A_GLANCE: string[] = [
    `${SITE.brand} is a free, unofficial project by ${SITE.operators}. It is not the City of Regina or Regina Transit.`,
    "Bus positions and times are estimates and can be wrong. Don't rely on them for anything time-critical; we aren't responsible for missed buses.",
    'We store your name, email, optional phone number and what you save, plus visitor and security logs (IP address, browser, pages visited).',
    "We use it only to run the service, send reminders you turn on, and keep it secure. We don't sell it or show ads.",
    `It is stored in ${SITE.DATA_REGION} by Supabase. Google Maps, our hosts and Twilio may process some of it in the United States.`,
    'Location, text reminders and notifications are separate choices you can say no to. You can delete your account and its data at any time from your Profile.',
    'Your rights as a consumer are not affected. If something goes wrong, contact us first; Saskatchewan law applies.',
];

/* A page is a list of sections; `{contact}` and `{region}` are swapped for the values above */
export interface LegalSection { heading?: string; paragraphs: string[]; points?: string[] }
export interface LegalPageContent { title: string; intro: string; sections: LegalSection[] }

export const LEGAL_PAGES: Record<'about' | 'privacy' | 'terms', LegalPageContent> = {
    about: {
        title: 'About Transit Regina',
        intro: 'An unofficial bus tracker and trip planner for Regina, built by two computer science students.',
        sections: [
            {
                paragraphs: [
                    `${SITE.brand} is an independent project by ${SITE.operators}, computer science students in Regina. We built it because checking schedules, live buses and directions meant switching between several tools.`,
                    'We are not part of the City of Regina or Regina Transit, and the City has not endorsed this site. For service changes, detours and anything official, check regina.ca.',
                ],
            },
            {
                heading: 'Where the information comes from',
                paragraphs: [],
                points: [
                    `Schedules, routes and stops: the City of Regina's open data. Contains information licensed under the ${SITE.licenceName}.`,
                    "Live bus positions and arrival times: the live vehicle locations Regina Transit publishes for riders. They are estimates and can be late, missing or wrong.",
                    'Maps and place search: Google Maps.',
                    'Weather: Environment and Climate Change Canada, licensed under the Open Government Licence – Canada.',
                ],
            },
            {
                heading: 'Found a mistake?',
                paragraphs: ['Email us at {contact}. If a bus time or stop looks wrong, tell us the route, the stop and the time you saw it.'],
            },
        ],
    },

    privacy: {
        title: 'Privacy policy',
        intro: `This explains what ${SITE.brand} collects about you, why, who else handles it, and how to have it deleted. Last updated ${SITE.policyDate}.`,
        sections: [
            {
                heading: 'Who we are',
                paragraphs: [`${SITE.brand} is run by ${SITE.operators} in Regina, Saskatchewan. Dev Patel is responsible for how ${SITE.brand} handles personal information. For anything about your information, email {contact}.`],
            },
            {
                heading: 'What we collect',
                paragraphs: [],
                points: [
                    'Your account: your name, email address and, if you add it, your mobile number. Passwords are handled by our sign-in provider; we never see them.',
                    'Things you save: saved places, favourite stops and routes, your weekly trip plans, and the map character you pick.',
                    'Notifications: if you turn on browser notifications, the address your browser gives us for sending them; if you turn on text reminders, your mobile number is used to send them.',
                    "Your location: while you use the map, your device's location is used in your browser to show you on the map and find stops and trips near you. We don't send it to our servers or keep a history of where you have been.",
                    'What you search for: addresses you type into search are sent to Google to find matching places.',
                    'Visitor logs: your IP address, browser, operating system, device type, the pages you open and when; linked to your account if you are signed in.',
                    'Security logs: failed sign-ins, admin actions and blocked requests, with the IP address they came from.',
                ],
            },
            {
                heading: 'Why we use it',
                paragraphs: ['To run the service and your account, to send the reminders you ask for, to keep the service and your account secure, and to count how the site is used so we can improve it. We do not sell your information and we do not show ads.'],
            },
            {
                heading: 'Your consent',
                paragraphs: [
                    'When you create an account and agree, you consent to us collecting and using the information above to run your account and the service. Location, text reminders and browser notifications are optional: each is asked for separately, and saying no does not stop you using the rest of the service.',
                    'You can withdraw your consent at any time by turning those features off, or by deleting your account. We will tell you if withdrawing means part of the service can no longer work for you.',
                ],
            },
            {
                heading: 'Who else handles it',
                paragraphs: ['These services process information for us to make the site work:'],
                points: [
                    'Supabase: our database and sign-in.',
                    'Vercel: hosts the website.',
                    'Railway: hosts our server.',
                    'Google Maps Platform: maps and place search. Google may set its own cookies under its privacy policy.',
                    'Twilio: sends text reminders, only if you turn them on.',
                    "Your browser's push service (for example Google, Apple or Mozilla): delivers browser notifications, only if you turn them on.",
                ],
            },
            {
                heading: 'Where it is kept, and for how long',
                paragraphs: [
                    'Our database is stored by Supabase in {region}. Several of the services above are based in the United States, so your information may be processed there.',
                    'Your account and saved data are kept until you delete your account. Visitor logs and security logs are deleted after 90 days.',
                ],
            },
            {
                heading: 'Your choices',
                paragraphs: [],
                points: [
                    'Delete your account from your Profile page. This permanently deletes your account and everything listed above that is linked to it. Security logs are kept, but no longer name you.',
                    'Turn browser notifications and text reminders off at any time from your Profile page.',
                    "Stop sharing your location in your browser's settings; the map still works without it.",
                    'To see or correct what we hold about you, email {contact}.',
                ],
            },
            {
                heading: 'Security',
                paragraphs: ['Everything travels over an encrypted connection, access to stored data is limited by account, and admin accounts need a second sign-in step. If a breach puts your information at real risk, we will tell you and report it to the Office of the Privacy Commissioner of Canada as the law requires.'],
            },
            {
                heading: 'Cookies and tracking',
                paragraphs: ['We keep you signed in using your browser\'s storage. We use no advertising cookies and no third-party analytics; the visitor logs described above are our own. Google Maps may set its own cookies.'],
            },
            {
                heading: 'Children',
                paragraphs: [`${SITE.brand} is not meant for children under 13, and we don't knowingly collect information from them. If you think a child has given us information, email {contact} and we will delete it.`],
            },
            {
                heading: 'Changes',
                paragraphs: ['If we change this policy, we will update the date at the top of this page. For important changes, signed-in users will be asked to agree to the new version before continuing.'],
            },
        ],
    },

    terms: {
        title: 'Terms of use',
        intro: `These terms are an agreement between you and ${SITE.operators}, who run ${SITE.brand}. Please read them: they explain what the service is, what it isn't, and the limits of our responsibility. Last updated ${SITE.policyDate}.`,
        sections: [
            {
                heading: '1. About these terms',
                paragraphs: [
                    `${SITE.brand} is a free, independent project. It is unofficial: it is not affiliated with, endorsed by or operated by the City of Regina or Regina Transit.`,
                    'You accept these terms when you tick the box to agree, when you create an account, or by using the service. If you don\'t agree, please don\'t use it.',
                    'You must be at least 13 to use the service. If you are under the age of majority where you live, you need a parent or guardian\'s permission.',
                ],
            },
            {
                heading: '2. Your account',
                paragraphs: ['Give accurate information, keep your password to yourself, and tell us if you think someone else has used your account. You are responsible for what happens under your account.'],
            },
            {
                heading: '3. Using the service fairly',
                paragraphs: ["Don't:"],
                points: [
                    'try to break into, overload or disrupt the service or other people\'s accounts;',
                    'copy or scrape the service or its data in bulk, or resell it;',
                    'use it to break the law or to harm, harass or mislead anyone;',
                    'pretend that the City of Regina, Regina Transit or anyone else is behind something they are not.',
                ],
            },
            {
                heading: '4. Bus times are estimates',
                paragraphs: [
                    'Bus positions, arrival times, routes and trip suggestions come from third-party data: schedules from the City of Regina\'s open data and live positions published by Regina Transit. They are estimates. Traffic, weather, detours and data delays mean they can be late, missing or wrong.',
                    `Don't rely on ${SITE.brand} for travel where timing really matters, and check regina.ca for official schedules, service changes and detours.`,
                ],
            },
            {
                heading: '5. The service is provided as is',
                paragraphs: ['We work to keep the service accurate and running, but we provide it "as is" and "as available", without any promise that it will be accurate, complete, uninterrupted or error-free, except for any promises the law says we cannot exclude. We may change, pause or stop any part of it.'],
            },
            {
                heading: '6. Limits on our responsibility',
                paragraphs: [
                    'To the extent the law allows, we are not responsible for missed buses, delays, lost time or money, or other indirect or consequential losses from using, or not being able to use, the service. Our total responsibility for any claim relating to the service is limited to CAD $50.',
                    'These limits do not apply to harm we cause deliberately or through gross negligence, or where the law does not allow them.',
                ],
            },
            {
                heading: '7. If you misuse the service',
                paragraphs: ['If you break these terms or the law while using the service, and someone makes a claim against us because of it, you agree to cover our reasonable costs from that claim, to the extent the law allows.'],
            },
            {
                heading: '8. Third-party data and services',
                paragraphs: [`Schedule data belongs to the City of Regina and is used under the ${SITE.licenceName}. Maps and place search are provided by Google under Google's own terms. These providers are not responsible for ${SITE.brand}, and we are not responsible for their services.`],
            },
            {
                heading: '9. Our name and content',
                paragraphs: [`The ${SITE.brand} name, design and code belong to its creators. You may use the service for your own personal travel, but not copy or reuse it without our permission. If you send us ideas or feedback, we may use them without owing you anything.`],
            },
            {
                heading: '10. Your information',
                paragraphs: ['Our Privacy Policy explains what we collect, why, who handles it, and how to delete it. By agreeing to these terms you also confirm you have read it.'],
            },
            {
                heading: '11. Suspending or ending your use',
                paragraphs: ['You can stop using the service and delete your account at any time from your Profile. We may suspend or close an account that breaks these terms, or if we stop running the service.'],
            },
            {
                heading: '12. Changes to these terms',
                paragraphs: ['We may update these terms. We will change the date at the top, and for important changes we will ask signed-in users to agree to the new version before they continue.'],
            },
            {
                heading: '13. If there is a problem',
                paragraphs: [
                    'Please contact us first at {contact}, and give us 30 days to try to put things right.',
                    'These terms are governed by the laws of Saskatchewan and the laws of Canada that apply there, and disputes can be brought in the courts of Saskatchewan, including small claims court.',
                    'Nothing in these terms takes away any rights you have as a consumer that the law does not allow to be taken away.',
                ],
            },
            {
                heading: '14. Contact',
                paragraphs: ['Questions about these terms: {contact}.'],
            },
        ],
    },
};
