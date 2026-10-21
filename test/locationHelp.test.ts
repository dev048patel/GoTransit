/* Device detection and the advice the map gives when it can't get a location */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPlatform, locationHelp, problemFromError } from '../src/models/services/LocationHelp';

const UA = {
    iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1',
    ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
    androidChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
    samsung: 'Mozilla/5.0 (Linux; Android 14; SM-S921W) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
    instagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 337.0.3.23.54',
    windowsEdge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
    macFirefox: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:127.0) Gecko/20100101 Firefox/127.0',
};

test('recognises the device and browser', () => {
    assert.deepEqual(detectPlatform(UA.iphoneSafari, 5), { os: 'ios', browser: 'safari', inApp: null });
    assert.deepEqual(detectPlatform(UA.iphoneChrome, 5), { os: 'ios', browser: 'chrome', inApp: null });
    assert.equal(detectPlatform(UA.ipad, 5).os, 'ios', 'iPadOS reports itself as a Mac but has touch');
    assert.equal(detectPlatform(UA.ipad, 0).os, 'mac', 'a real Mac has no touch points');
    assert.deepEqual(detectPlatform(UA.androidChrome, 5), { os: 'android', browser: 'chrome', inApp: null });
    assert.equal(detectPlatform(UA.samsung, 5).browser, 'samsung');
    assert.equal(detectPlatform(UA.instagram, 5).inApp, 'Instagram');
    assert.deepEqual(detectPlatform(UA.windowsEdge, 0), { os: 'windows', browser: 'edge', inApp: null });
    assert.deepEqual(detectPlatform(UA.macFirefox, 0), { os: 'mac', browser: 'firefox', inApp: null });
});

test('maps browser errors to problems', () => {
    assert.equal(problemFromError(1), 'blocked');
    assert.equal(problemFromError(2), 'off');
    assert.equal(problemFromError(3), 'timeout');
});

test('gives the right steps for each setup', () => {
    const iphone = locationHelp('blocked', detectPlatform(UA.iphoneSafari, 5));
    assert.match(iphone.steps[0], /aA/, 'Safari on iPhone: the aA page menu');
    assert.match(locationHelp('off', detectPlatform(UA.iphoneSafari, 5)).steps.join(' '), /Safari Websites/);
    assert.match(locationHelp('blocked', detectPlatform(UA.androidChrome, 5)).steps.join(' '), /Permissions → Location → Allow/);
    assert.match(locationHelp('off', detectPlatform(UA.androidChrome, 5)).steps[0], /Swipe down/);
    assert.match(locationHelp('blocked', detectPlatform(UA.instagram, 5)).title, /Instagram/, 'in-app browsers: open in a real browser');
    assert.match(locationHelp('off', detectPlatform(UA.windowsEdge, 0)).steps.join(' '), /Privacy & security → Location/);
    for (const ua of Object.values(UA)) for (const p of ['blocked', 'off', 'timeout', 'unsupported'] as const) {
        const h = locationHelp(p, detectPlatform(ua, 5));
        assert.ok(h.title && h.intro, `${p} on ${ua.slice(0, 30)} has a title and intro`);
    }
});
