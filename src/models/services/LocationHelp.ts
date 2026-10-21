/*
 When the map can't get the rider's location: what went wrong, and the exact steps to fix it on
 their device and browser.

 A web page cannot open the phone's Settings app (iOS has no web link to Settings, and Chrome on
 Android won't open system settings screens from a page), so instead the rider gets the precise taps
 for their setup, and the map tries again by itself when they come back.
*/

/** What stopped the map getting a location */
export type LocationProblem =
    | 'blocked'        // the browser's permission for this site is set to Block / Deny
    | 'off'            // location services are off on the device (or no fix at all)
    | 'timeout'        // the device is trying but has no fix yet (indoors, weak signal)
    | 'unsupported';   // no geolocation in this browser

export interface Platform {
    os: 'ios' | 'android' | 'mac' | 'windows' | 'other';
    browser: 'safari' | 'chrome' | 'firefox' | 'edge' | 'samsung' | 'other';
    /** Opened inside another app (Instagram, Facebook, LinkedIn…), where location is often unavailable */
    inApp: string | null;
}

export function detectPlatform(ua: string = navigator.userAgent, touchPoints: number = navigator.maxTouchPoints ?? 0): Platform {
    const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1);   // iPadOS reports as a Mac
    const os: Platform['os'] = ios ? 'ios' : /Android/.test(ua) ? 'android' : /Macintosh|Mac OS X/.test(ua) ? 'mac' : /Windows/.test(ua) ? 'windows' : 'other';
    const browser: Platform['browser'] =
        /SamsungBrowser/.test(ua) ? 'samsung'
            : /Edg(A|iOS)?\//.test(ua) ? 'edge'
                : /Firefox|FxiOS/.test(ua) ? 'firefox'
                    : /CriOS|Chrome\//.test(ua) ? 'chrome'
                        : /Safari\//.test(ua) ? 'safari'
                            : 'other';
    const inApp = /Instagram/.test(ua) ? 'Instagram' : /FBAN|FBAV/.test(ua) ? 'Facebook' : /LinkedInApp/.test(ua) ? 'LinkedIn' : /Snapchat/.test(ua) ? 'Snapchat' : /TikTok|musical_ly/.test(ua) ? 'TikTok' : null;
    return { os, browser, inApp };
}

export interface LocationHelpText {
    title: string;
    intro: string;
    steps: string[];
}

const BROWSER_NAME: Record<Platform['browser'], string> = { safari: 'Safari', chrome: 'Chrome', firefox: 'Firefox', edge: 'Edge', samsung: 'Samsung Internet', other: 'your browser' };

/* Turning location on for the whole device */
function deviceSteps(p: Platform): string[] {
    const app = BROWSER_NAME[p.browser];
    switch (p.os) {
        case 'ios': return [
            'Open Settings → Privacy & Security → Location Services and turn it on.',
            `Scroll down to ${p.browser === 'safari' ? 'Safari Websites' : app} and choose "While Using the App".`,
        ];
        case 'android': return [
            'Swipe down from the top of the screen and tap Location to turn it on.',
            `If it's still off: Settings → Location → App location permissions → ${app} → Allow only while using the app.`,
        ];
        case 'mac': return [
            'Open System Settings → Privacy & Security → Location Services and turn it on.',
            `In the same list, turn on ${app}.`,
        ];
        case 'windows': return [
            'Open Settings → Privacy & security → Location and turn on Location services.',
            'Turn on "Let desktop apps access your location" on the same page.',
        ];
        default: return ["Turn on location in your device's settings."];
    }
}

/* Allowing this website in the browser */
function siteSteps(p: Platform): string[] {
    if (p.os === 'ios' && p.browser === 'safari') return [
        'Tap the aA (page menu) button in the address bar → Website Settings → Location → Allow.',
        'Still blocked? Open Settings → Safari (on iOS 18: Settings → Apps → Safari) → Location → Ask or Allow.',
    ];
    if (p.os === 'ios') return [
        `Open Settings → Privacy & Security → Location Services → ${BROWSER_NAME[p.browser]} → While Using the App.`,
        'Then come back and tap Try again.',
    ];
    if (p.os === 'android' && p.browser === 'samsung') return [
        'Tap the lock icon next to the address → Permissions → Location → Allow.',
        'Or: menu (☰) → Settings → Sites and downloads → Site permissions → Location.',
    ];
    if (p.os === 'android') return [
        'Tap the icon to the left of the address (it looks like sliders or a lock) → Permissions → Location → Allow.',
        `Or: ${BROWSER_NAME[p.browser]} menu (⋮) → Settings → Site settings → Location, and remove transitregina.ca from Blocked.`,
    ];
    if (p.browser === 'safari') return [
        'In the menu bar choose Safari → Settings for transitregina.ca… → Location → Allow.',
    ];
    if (p.browser === 'firefox') return [
        'Click the icon to the left of the address → find "Access your location" → click the × next to Blocked.',
        'Reload the page if it asks.',
    ];
    return [
        'Click the icon to the left of the address (it looks like sliders or a lock) → Site settings → Location → Allow.',
        'Reload the page if it asks.',
    ];
}

export function locationHelp(problem: LocationProblem, p: Platform): LocationHelpText {
    if (p.inApp) {
        return {
            title: `${p.inApp} is blocking your location`,
            intro: `Pages opened inside ${p.inApp} usually can't use your location. Open this page in your phone's browser instead.`,
            steps: [
                `Tap the ⋯ menu in ${p.inApp} → Open in ${p.os === 'ios' ? 'Safari' : 'browser'} (or "Open in external browser").`,
                'Or tap Copy link below and paste it into your browser.',
            ],
        };
    }
    switch (problem) {
        case 'blocked': return {
            title: 'Location is blocked for this site',
            intro: `${BROWSER_NAME[p.browser] === 'your browser' ? 'Your browser' : BROWSER_NAME[p.browser]} has been told not to share your location with Transit Regina. Websites can't open your settings for you, so here is exactly where to change it:`,
            steps: [...siteSteps(p), ...(p.os === 'ios' || p.os === 'android' ? ["If location is off for the whole phone, turn it on too (it's in the same settings)."] : [])],
        };
        case 'off': return {
            title: 'Location is turned off on this device',
            intro: "Your device isn't sharing a location with any app right now. To turn it on:",
            steps: deviceSteps(p),
        };
        case 'timeout': return {
            title: "Still looking for you…",
            intro: 'Your device is trying but has no location yet. This usually happens indoors or with a weak signal.',
            steps: ['Step near a window or outside for a moment.', 'Make sure Wi-Fi is on: phones use it to find you faster, even when not connected.'],
        };
        default: return {
            title: "This browser can't share a location",
            intro: 'Open Transit Regina in an up-to-date browser such as Chrome, Safari, Edge or Firefox to see where you are.',
            steps: [],
        };
    }
}

/** A position error (GeolocationPositionError.code) as a problem: 1 denied, 2 unavailable, 3 timeout */
export const problemFromError = (code: number): LocationProblem => (code === 1 ? 'blocked' : code === 3 ? 'timeout' : 'off');
