/* The bus as a 3D anime scene (three.js), told as a short story the reader scrolls through: a rider
   walks up the street to a snowy stop while the arrival board counts down, the bus pulls in, the
   doors open, the rider taps their card while the driver (the person whose page this is) waves
   hello, then the bus pulls away and the rider walks down the aisle. Each passenger is one thing the
   person built or one place they worked: as the rider reaches their row they look up, wave, and say
   what it is in a speech bubble.

   The anime look: cel shading and ink outlines (animeCharacter.ts), a painted night sky with a moon,
   and soft additive halos around every lamp.

   Kept fast on purpose: no post-processing pass, only a handful of real lights (each one costs every
   lit pixel), people merged into a few meshes each, and nothing is drawn while the ride is off screen.

   Nothing here is a cartoon figure. Each thing the person built "rides" as a lit display resting on
   a seat. The page tells the scene how far the reader has scrolled; the scene moves the camera.
   All geometry is built in code, so there are no model files to download.

   Text in and on the bus copies what real buses carry: an amber dot-matrix headsign that flips between
   two lines, "next stop" LED marquees, a line map above the windows (here the stops are the person's
   skills), and a lit instrument cluster. Out in the city, "TRANSIT REGINA" glows in neon tubes and
   travels alongside the bus, and oncoming traffic passes in the other lane. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { inkMaterial, makeCharacter, pose, toon, toonRamp, type Character, type Look } from './animeCharacter';

export interface SceneRow {
    /** Titles shown on the two displays in this row (left and right of the aisle) */
    seats: (string | undefined)[];
    /** Set on the first row of each part of the bus, shown on an overhead sign */
    zone?: string;
    kicker: string;
}

export interface BusSceneOptions {
    rows: SceneRow[];
    color: string;
    colorDark: string;
    sign: string;
    operator: string;
    operatorRole: string;
    /** Short phrases shown as the advert cards above the windows (the person's skills) */
    adverts: string[];
    /** Share of the scroll (0–1) at which the walk down the aisle begins */
    aisleStart: number;
}

export type Pick = { kind: 'row'; row: number } | { kind: 'driver' } | null;

/** Who the player can talk to in game mode: a passenger (by index, in seat order) or the driver */
export type Talker = number | 'driver';
/** What a click lands on in game mode */
export type GamePick = { kind: 'passenger'; index: number } | { kind: 'driver' } | { kind: 'floor'; x: number; z: number } | null;
export interface GameState {
    x: number; z: number; heading: number; camYaw: number;
    /** The nearest person close enough to talk to */
    near: Talker | null;
    /** Bus floor extent along z, and every passenger's seat, for the minimap (door-relative metres) */
    rear: number; front: number;
    passengers: { x: number; z: number }[];
    driver: { x: number; z: number };
}

/* Sizes in metres */
const WIDTH = 2.5, FLOOR = 0.45, CEILING = 2.55, FRONT = 5.4, PITCH = 0.95, FIRST_ROW = 2.4;
const DOOR: [number, number] = [3.55, 4.85];
const SPEED = 9;
/* How far in front of the camera the row it is looking at sits */
const REACH = 1.75;
/* Height of a display folded flat under the ceiling */
const STOWED = CEILING - 0.05;

export const rowZ = (row: number) => FIRST_ROW - row * PITCH;

/* Text drawn onto a canvas and used as a texture: displays, signs and the operator card */
function panelTexture(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    draw(canvas.getContext('2d')!);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
}

function wrap(c: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
        const next = line ? `${line} ${word}` : word;
        if (c.measureText(next).width > maxWidth && line) { lines.push(line); line = word; } else line = next;
    }
    lines.push(line);
    const shown = lines.slice(0, maxLines);
    if (lines.length > maxLines) shown[maxLines - 1] = shown[maxLines - 1].replace(/.{0,3}$/, '…');
    shown.forEach((l, i) => c.fillText(l, x, y + i * lineHeight));
}

const FONT = 'Inter, system-ui, -apple-system, Segoe UI, sans-serif';
const MONO = 'ui-monospace, Menlo, monospace';

/* Largest font size (stepping down from `size`) at which the text fits in `maxLines` lines, so long
   titles shrink rather than being cut off */
function fit(c: CanvasRenderingContext2D, text: string, weight: number, size: number, maxWidth: number, maxLines: number) {
    for (; size > 30; size -= 4) {
        c.font = `${weight} ${size}px ${FONT}`;
        let lines = 1, line = '';
        for (const word of text.split(' ')) {
            const next = line ? `${line} ${word}` : word;
            if (c.measureText(next).width > maxWidth && line) { lines++; line = word; } else line = next;
        }
        if (lines <= maxLines) break;
    }
    return size;
}

export function createBusScene(canvas: HTMLCanvasElement, options: BusSceneOptions) {
    const { rows } = options;
    const REAR = rowZ(rows.length - 1) - 1.35;
    const length = FRONT - REAR, middle = (FRONT + REAR) / 2;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    const touchDevice = window.matchMedia('(pointer: coarse)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, touchDevice ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const scene = new THREE.Scene();
    const night = new THREE.Color('#060a15');
    scene.background = night;
    scene.fog = new THREE.FogExp2(night, 0.021);
    /* Soft reflections on paint, glass and metal, from a generated studio environment (no image files) */
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.14;

    /* An anime night sky: deep blue fading to violet at the horizon, stars, and a big soft moon */
    const skyTexture = panelTexture(64, 512, c => {
        const g = c.createLinearGradient(0, 0, 0, 512);
        g.addColorStop(0, '#02040d'); g.addColorStop(0.35, '#0b1440'); g.addColorStop(0.5, '#2a1d5c'); g.addColorStop(0.56, '#46306e'); g.addColorStop(1, '#060a15');
        c.fillStyle = g; c.fillRect(0, 0, 64, 512);
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(230, 32, 16), new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide, fog: false, depthWrite: false }));
    scene.add(sky);
    const starPositions = new Float32Array(900 * 3);
    for (let i = 0; i < 900; i++) {
        const a = Math.random() * Math.PI * 2, h = 0.15 + Math.random() * 0.85;
        starPositions.set([Math.cos(a) * 200 * Math.sqrt(1 - h * h), h * 200, Math.sin(a) * 200 * Math.sqrt(1 - h * h)], i * 3);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: '#ffffff', size: 1.1, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 }));
    scene.add(stars);
    const moon = new THREE.Mesh(new THREE.CircleGeometry(9, 48), new THREE.MeshBasicMaterial({ color: '#fff4d6', fog: false, toneMapped: false }));
    moon.position.set(-70, 85, -150);
    moon.lookAt(0, 0, 0);
    scene.add(moon);
    scene.fog = new THREE.FogExp2('#0b0f24', 0.02);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.08, 500);

    /* ── Materials ── */
    /* Everything is cel-shaded (flat bands of light, like an anime background) */
    const standard = (color: THREE.ColorRepresentation, _roughness?: number, _metalness?: number) => toon(color);
    const paint = toon('#eef1f5');
    const band = toon(options.color);
    const busInk = inkMaterial(0.018);
    const liner = standard('#d9dee6', 0.8);
    const trim = standard('#14181f', 0.6, 0.2);
    const rubber = standard('#1b2029', 0.92);
    /* Bus-seat moquette: a woven pattern in the person's colours */
    const cloth = panelTexture(256, 256, c => {
        c.fillStyle = options.colorDark; c.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 520; i++) {
            c.fillStyle = [options.color, '#f4b400', '#e8edf5', options.color, '#0b0f18'][i % 5];
            c.globalAlpha = 0.25 + Math.random() * 0.5;
            const w = 4 + Math.random() * 16;
            c.fillRect(Math.floor(Math.random() * 32) * 8, Math.floor(Math.random() * 64) * 4, w, 3);
        }
        c.globalAlpha = 1;
    });
    cloth.wrapS = cloth.wrapT = THREE.RepeatWrapping; cloth.repeat.set(3, 2);
    const fabric = new THREE.MeshToonMaterial({ gradientMap: toonRamp, map: cloth });
    const flooring = panelTexture(256, 256, c => {
        c.fillStyle = '#232830'; c.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 2200; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.16})`; c.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
    });
    flooring.wrapS = flooring.wrapT = THREE.RepeatWrapping; flooring.repeat.set(3, 16);
    const deck = new THREE.MeshToonMaterial({ gradientMap: toonRamp, map: flooring });
    /* A soft round glow, used wherever a light should bloom: headlights, tail lights, street lamps, snow */
    const halo = panelTexture(128, 128, c => {
        const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(0, 0, 128, 128);
    });
    const bloom = (color: THREE.ColorRepresentation, size: number, x: number, y: number, z: number, parent: THREE.Object3D) => {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        sprite.scale.setScalar(size);
        sprite.position.set(x, y, z);
        parent.add(sprite);
        return sprite;
    };
    /* Amber dot-matrix LED text, the way bus signs are built: glowing text behind a grid of dark gaps.
       Text too long for the sign scrolls through it as a marquee. `aspect` is the sign's width / height. */
    const marquees: THREE.Texture[] = [];
    const led = (text: string, aspect: number, H = 128, size = 0.58) => {
        const font = `700 ${Math.round(H * size)}px ${MONO}`;
        const measure = document.createElement('canvas').getContext('2d')!;
        measure.font = font;
        const tw = measure.measureText(text).width, visible = Math.round(aspect * H);
        const scrolls = tw > visible * 0.92;
        const w = scrolls ? Math.ceil(tw + visible * 0.6) : visible;
        const texture = panelTexture(w, H, c => {
            c.fillStyle = '#05070a'; c.fillRect(0, 0, w, H);
            c.font = font; c.fillStyle = '#ffb21e'; c.textBaseline = 'middle';
            c.shadowColor = '#ff9500'; c.shadowBlur = H * 0.14;
            c.textAlign = scrolls ? 'left' : 'center';
            c.fillText(text, scrolls ? visible * 0.3 : w / 2, H * 0.54);
            c.shadowBlur = 0; c.fillStyle = 'rgba(5,7,10,0.6)';
            const pitch = Math.max(4, Math.round(H / 24));
            for (let x = 0; x < w; x += pitch) c.fillRect(x, 0, pitch * 0.32, H);
            for (let y = 0; y < H; y += pitch) c.fillRect(0, y, w, pitch * 0.32);
        });
        if (scrolls) {
            texture.wrapS = THREE.RepeatWrapping;
            texture.repeat.x = visible / w;
            texture.userData.speed = 150 / w;   // about 150 pixels a second
            marquees.push(texture);
        }
        return texture;
    };
    const shell = standard('#2a303b', 0.55, 0.1);
    const yellow = standard('#f4b400', 0.38, 0.35);
    const steel = standard('#b8c0cc', 0.25, 0.9);
    const glass = new THREE.MeshPhysicalMaterial({ color: '#9fc0e6', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 2.2, side: THREE.DoubleSide, depthWrite: false });
    /* Lamps, LEDs and neon are drawn brighter than white so that only they pass the bloom threshold */
    const glow = (color: THREE.ColorRepresentation, boost = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(boost), toneMapped: false });
    const LIT = new THREE.Color(1, 1, 1);

    const bus = new THREE.Group();
    scene.add(bus);
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = bus) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        parent.add(mesh);
        return mesh;
    };
    const box = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number, parent?: THREE.Object3D) => add(new THREE.BoxGeometry(w, h, d), material, x, y, z, parent);
    const soft = (w: number, h: number, d: number, r: number, material: THREE.Material, x: number, y: number, z: number, parent?: THREE.Object3D) => {
        const mesh = add(new RoundedBoxGeometry(w, h, d, 3, r), material, x, y, z, parent);
        mesh.add(new THREE.Mesh(mesh.geometry, busInk));
        return mesh;
    };

    /* ── Body ── */
    box(WIDTH, 0.14, length, deck, 0, FLOOR - 0.07, middle);                            // floor
    soft(WIDTH, 0.24, length, 0.1, paint, 0, CEILING + 0.12, middle);                    // roof
    box(WIDTH - 0.16, 0.02, length - 0.2, liner, 0, CEILING - 0.01, middle);             // ceiling lining
    soft(1.6, 0.16, 2.6, 0.06, standard('#cfd5de', 0.6, 0.2), 0, CEILING + 0.3, middle); // roof unit
    soft(WIDTH - 0.16, 0.06, length - 0.5, 0.03, standard('#eef3f8', 1), 0, CEILING + 0.25, middle);   // a dusting of snow on the roof

    /* Side walls: a painted outside and a lined inside, windows between, and a doorway front right */
    for (const side of [-1, 1]) {
        const spans: [number, number][] = side === 1 ? [[REAR, DOOR[0]], [DOOR[1], FRONT]] : [[REAR, FRONT]];
        for (const [from, to] of spans) {
            const len = to - from, z = (from + to) / 2;
            box(0.04, 1.12, len, band, side * (WIDTH / 2 - 0.02), 0.3 + 0.56, z);
            box(0.04, 0.97, len, liner, side * (WIDTH / 2 - 0.07), FLOOR + 0.485, z);
            box(0.02, 0.86, len, glass, side * (WIDTH / 2 - 0.03), 1.85, z);
        }
        box(0.05, 0.36, length, paint, side * (WIDTH / 2 - 0.02), 2.44, middle);
        box(0.04, 0.3, length, liner, side * (WIDTH / 2 - 0.07), 2.42, middle);
        box(0.05, 0.05, length, trim, side * (WIDTH / 2 - 0.02), 1.42, middle);
        for (let z = REAR + 0.6; z < FRONT - 0.3; z += PITCH * 2) {
            if (side === 1 && z > DOOR[0] - 0.1 && z < DOOR[1] + 0.1) continue;
            box(0.07, 0.86, 0.09, trim, side * (WIDTH / 2 - 0.03), 1.85, z);
        }
        /* Running lights along the skirt */
        for (let z = REAR + 1; z < FRONT - 0.5; z += 2.2) box(0.02, 0.04, 0.14, glow('#ffb347'), side * (WIDTH / 2 + 0.005), 0.42, z);
    }
    /* Livery: a sweep of lighter colour, the name, and a fleet number */
    const livery = panelTexture(2048, 256, c => {
        c.clearRect(0, 0, 2048, 256);
        const g = c.createLinearGradient(0, 0, 2048, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g;
        c.beginPath(); c.moveTo(0, 256); c.bezierCurveTo(500, 250, 900, 40, 2048, 0); c.lineTo(2048, 70); c.bezierCurveTo(1000, 110, 600, 256, 300, 256); c.closePath(); c.fill();
        c.fillStyle = '#ffffff'; c.font = `800 92px ${FONT}`; c.textBaseline = 'middle';
        c.fillText('TRANSIT REGINA', 720, 150);
        c.font = `700 44px ui-monospace, Menlo, monospace`; c.globalAlpha = 0.8;
        c.fillText('No. 2026', 1560, 156);
    });
    for (const side of [-1, 1]) {
        const decal = add(new THREE.PlaneGeometry(length * 0.62, 0.78), new THREE.MeshToonMaterial({ gradientMap: toonRamp, map: livery, transparent: true, depthWrite: false }), side * (WIDTH / 2 + 0.004), 0.93, middle - length * 0.1);
        decal.rotation.y = side * Math.PI / 2;
    }

    /* Doorway frame and step, and two glass door leaves hinged at the frame that swing inward */
    const doors: { leaf: THREE.Group; open: number }[] = [];
    for (const [z, dir] of [[DOOR[0], 1], [DOOR[1], -1]]) {
        const leaf = new THREE.Group();
        leaf.position.set(WIDTH / 2 - 0.03, FLOOR + 0.96, z);
        box(0.03, 1.86, 0.64, glass, 0, 0, dir * 0.32, leaf);
        box(0.045, 1.9, 0.05, trim, 0, 0, dir * 0.63, leaf);
        box(0.045, 0.05, 0.64, trim, 0, 0.1, dir * 0.32, leaf);
        bus.add(leaf);
        doors.push({ leaf, open: -dir * 1.4 });
    }
    for (const z of DOOR) box(0.09, 2.0, 0.07, trim, WIDTH / 2 - 0.03, FLOOR + 1.0, z);
    box(0.5, 0.05, DOOR[1] - DOOR[0], yellow, WIDTH / 2 - 0.25, FLOOR + 0.005, (DOOR[0] + DOOR[1]) / 2);

    /* Nose: a rounded lower panel, a raked windscreen with wipers, the destination sign, headlights */
    soft(WIDTH, 1.07, 0.36, 0.14, band, 0, 0.3 + 0.535, FRONT - 0.1);
    const windscreen = box(WIDTH - 0.12, 1.06, 0.03, glass, 0, 1.87, FRONT - 0.07);
    windscreen.rotation.x = -0.13;
    for (const side of [-1, 1]) {
        const wiper = box(0.03, 0.62, 0.02, trim, side * 0.5, 1.68, FRONT - 0.01);
        wiper.rotation.set(-0.13, 0, side * 0.5);
        box(0.07, 1.1, 0.07, trim, side * (WIDTH / 2 - 0.035), 1.87, FRONT - 0.06);
    }
    soft(WIDTH, 0.38, 0.2, 0.08, trim, 0, 2.5, FRONT - 0.04);
    /* Real headsigns alternate between the route and a "via" line */
    const headsigns = [options.sign, 'VIA THREE.JS + WEBGL'].map(text => led(text, (WIDTH - 0.5) / 0.26));
    const headsign = add(new THREE.PlaneGeometry(WIDTH - 0.5, 0.26), new THREE.MeshBasicMaterial({ color: LIT, map: headsigns[0], toneMapped: false }), 0, 2.5, FRONT + 0.065);
    soft(WIDTH + 0.06, 0.2, 0.34, 0.08, trim, 0, 0.38, FRONT - 0.02);                    // bumper
    const plate = panelTexture(256, 72, c => {
        c.fillStyle = '#f4f6f8'; c.fillRect(0, 0, 256, 72);
        c.fillStyle = '#12306b'; c.font = `800 44px ui-monospace, Menlo, monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('TR 2026', 128, 40);
    });
    add(new THREE.PlaneGeometry(0.44, 0.124), new THREE.MeshToonMaterial({ gradientMap: toonRamp, map: plate }), 0, 0.4, FRONT + 0.155);
    /* Bike rack, folded up against the nose */
    for (const x of [-0.75, 0.75]) box(0.035, 0.6, 0.035, steel, x, 0.86, FRONT + 0.2);
    box(1.54, 0.035, 0.035, steel, 0, 1.16, FRONT + 0.2);
    box(1.54, 0.035, 0.035, steel, 0, 0.6, FRONT + 0.2);
    for (const side of [-1, 1]) {
        box(0.34, 0.14, 0.03, glow('#fff3c4'), side * 0.86, 0.72, FRONT + 0.085);
        bloom('#ffe7b0', 1.5, side * 0.86, 0.72, FRONT + 0.12, bus);
        /* The beam hanging in the cold air */
        const beam = add(new THREE.ConeGeometry(2.4, 15, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe7b0', transparent: true, opacity: 0.035, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), side * 0.9, 0.55, FRONT + 7.6);
        beam.rotation.x = -Math.PI / 2 + 0.035;
        if (side === 1) {   // one real light for both headlamps
            const lamp = new THREE.SpotLight('#ffe9b0', 110, 34, 0.6, 0.6, 1.4);
            lamp.position.set(0, 0.75, FRONT + 0.1);
            lamp.target.position.set(0, 0, FRONT + 16);
            bus.add(lamp, lamp.target);
        }
        /* Mirrors */
        box(0.05, 0.05, 0.3, trim, side * (WIDTH / 2 + 0.16), 2.25, FRONT - 0.1);
        box(0.1, 0.34, 0.05, trim, side * (WIDTH / 2 + 0.3), 2.05, FRONT + 0.03);
    }

    /* Tail */
    box(WIDTH, 1.2, 0.08, band, 0, 0.3 + 0.6, REAR);
    box(WIDTH - 0.3, 0.72, 0.03, glass, 0, 1.9, REAR);
    box(WIDTH, 0.3, 0.08, paint, 0, 2.42, REAR);
    for (const side of [-1, 1]) {
        box(0.14, 0.75, 0.08, paint, side * (WIDTH / 2 - 0.07), 1.9, REAR);
        box(0.12, 0.4, 0.03, glow('#ff2a2a'), side * (WIDTH / 2 - 0.2), 0.95, REAR - 0.05);
        bloom('#ff3b30', 0.9, side * (WIDTH / 2 - 0.2), 0.95, REAR - 0.1, bus);
    }

    /* Wheels */
    const wheels: THREE.Object3D[] = [];
    const tyre = new THREE.CylinderGeometry(0.5, 0.5, 0.3, 28), rim = new THREE.CylinderGeometry(0.3, 0.3, 0.31, 20);
    for (const z of [FRONT - 3.1, REAR + 2.3]) {
        for (const side of [-1, 1]) {
            const wheel = new THREE.Group();
            wheel.position.set(side * (WIDTH / 2 - 0.11), 0.5, z);
            wheel.rotation.z = Math.PI / 2;
            wheel.add(new THREE.Mesh(tyre, rubber), new THREE.Mesh(rim, steel));
            for (let n = 0; n < 6; n++) {
                const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.33, 8), trim);
                nut.position.set(Math.cos(n * Math.PI / 3) * 0.19, 0, Math.sin(n * Math.PI / 3) * 0.19);
                wheel.add(nut);
            }
            bus.add(wheel);
            wheels.push(wheel);
            const arch = add(new THREE.CircleGeometry(0.64, 28, 0, Math.PI), trim, side * (WIDTH / 2 + 0.002), 0.46, z);
            arch.rotation.y = side * Math.PI / 2;
        }
    }

    /* ── Cabin ── */
    for (const side of [-1, 1]) {
        box(0.16, 0.03, length - 4.2, glow('#fff1d6', 1), side * 0.72, CEILING - 0.03, middle - 1.6);   // light strips
        const rail = add(new THREE.CylinderGeometry(0.018, 0.018, length - 2, 10), yellow, side * 0.36, CEILING - 0.24, middle - 0.5);
        rail.rotation.x = Math.PI / 2;
    }
    /* Hanging straps that swing with the bus, and stop buttons on the poles */
    const straps: THREE.Object3D[] = [];
    for (let z = FRONT - 3.2; z > REAR + 0.9; z -= PITCH) {
        for (const side of [-1, 1]) {
            const strap = new THREE.Group();
            strap.position.set(side * 0.36, CEILING - 0.25, z);
            const band2 = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.008), trim);
            band2.position.y = -0.08;
            const loop = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.011, 8, 18), standard('#e9edf2', 0.5));
            loop.position.y = -0.2;
            strap.add(band2, loop);
            strap.userData.phase = z * 1.7 + side;
            bus.add(strap);
            straps.push(strap);
        }
    }
    /* Above the windows, a line map like the ones on real buses, except the stops are what this person
       works with. Half the stops run down each side. */
    const half = Math.ceil(options.adverts.length / 2);
    const mapFrom = FRONT - 3.3, mapTo = REAR + 0.9, mapLen = mapFrom - mapTo;
    for (const side of [-1, 1]) {
        const stops = side < 0 ? options.adverts.slice(0, half) : options.adverts.slice(half);
        if (!stops.length) continue;
        const W = 4096, H = 256, start = 470, end = W - 90;
        const texture = panelTexture(W, H, c => {
            c.fillStyle = '#f8fafc'; c.fillRect(0, 0, W, H);
            c.fillStyle = options.color; c.fillRect(0, 0, 420, H);
            c.fillStyle = '#ffffff'; c.textBaseline = 'middle';
            c.font = `700 30px ${FONT}`; c.fillText('LINE MAP', 36, 62);
            c.font = `800 ${fit(c, options.sign, 800, 54, 350, 2)}px ${FONT}`;
            wrap(c, options.sign, 36, 128, 350, 58, 2);
            c.fillStyle = options.color; c.fillRect(start, 141, end - start, 14);
            const step = stops.length > 1 ? (end - start - 120) / (stops.length - 1) : 0;
            stops.forEach((stop, i) => {
                const x = start + 60 + i * step;
                c.beginPath(); c.arc(x, 148, 19, 0, Math.PI * 2);
                c.fillStyle = '#ffffff'; c.fill(); c.lineWidth = 9; c.strokeStyle = options.color; c.stroke();
                c.fillStyle = '#0f172a'; c.textAlign = 'center';
                c.font = `700 ${fit(c, stop, 700, 38, Math.max(150, step * 1.7), 1)}px ${FONT}`;
                c.fillText(stop, x, i % 2 ? 214 : 84);
                c.textAlign = 'left';
            });
        });
        const strip = add(new THREE.PlaneGeometry(mapLen, mapLen * H / W), new THREE.MeshToonMaterial({ gradientMap: toonRamp, map: texture }), side * (WIDTH / 2 - 0.1), 2.4, (mapFrom + mapTo) / 2);
        strip.rotation.y = -side * Math.PI / 2;
        strip.rotateX(0.32);
    }

    const cabinLights: THREE.PointLight[] = [];
    /* The cabin lights stop short of the cab, which is lit only by the dashboard and the street */
    for (let z = FRONT - 3.6; z > REAR + 0.8; z -= 4.6) {
        const light = new THREE.PointLight('#ffe8c9', 1.5, 7, 1.2);
        light.position.set(0, CEILING - 0.25, z);
        bus.add(light);
        cabinLights.push(light);
    }

    /* Seats; a passenger sits in each seat that carries something the person built */
    const seatBase = new RoundedBoxGeometry(0.98, 0.14, 0.46, 3, 0.05), seatBack = new RoundedBoxGeometry(0.98, 0.66, 0.1, 3, 0.05);
    const seatSlots: { row: number; k: number; side: number; title: string }[] = [];
    const zoneSigns: { row: number; sign: THREE.Group }[] = [];
    rows.forEach((row, r) => {
        const z = rowZ(r);
        for (const [k, side] of [-1, 1].entries()) {
            const x = side * 0.76;
            add(seatBase, fabric, x, FLOOR + 0.46, z).add(new THREE.Mesh(seatBase, busInk));
            const back = add(seatBack, fabric, x, FLOOR + 0.84, z - 0.25);
            back.add(new THREE.Mesh(seatBack, busInk));
            back.rotation.x = -0.14;
            box(0.98, 0.04, 0.42, shell, x, FLOOR + 0.37, z);
            box(0.06, 0.38, 0.06, steel, x, FLOOR + 0.19, z);
            const grab = add(new THREE.TorusGeometry(0.07, 0.014, 8, 20, Math.PI), yellow, x - side * 0.42, FLOOR + 1.18, z - 0.3);
            grab.rotation.y = Math.PI / 2;

            const title = row.seats[k];
            if (title) seatSlots.push({ row: r, k, side, title });
        }
        if (r % 2 === 0) for (const side of [-1, 1]) {
            add(new THREE.CylinderGeometry(0.02, 0.02, CEILING - FLOOR, 10), yellow, side * 0.3, (CEILING + FLOOR) / 2, z - 0.48);
            box(0.034, 0.05, 0.02, glow('#d92d20'), side * 0.3, FLOOR + 1.2, z - 0.458);   // stop button
        }
        if (row.zone) {
            /* A "next stop" marquee for each part of the bus, naming what is in it */
            const titles: string[] = [];
            for (let n = r; n < rows.length && (n === r || !rows[n].zone); n++) titles.push(...rows[n].seats.filter((t): t is string => !!t));
            const sign = new THREE.Group();
            box(1.5, 0.24, 0.05, trim, 0, CEILING - 0.2, z + 0.55, sign);
            add(new THREE.PlaneGeometry(1.44, 0.2), new THREE.MeshBasicMaterial({ color: LIT, map: led(`NEXT STOP > ${row.zone.toUpperCase()}  ·  ${titles.join('  ·  ')}`, 1.44 / 0.2), toneMapped: false }), 0, CEILING - 0.2, z + 0.58, sign);
            bus.add(sign);
            zoneSigns.push({ row: r, sign });
        }
    });

    /* ── Driver's cab: seat, wheel, dashboard, the driver, and their operator card ── */
    const cab = new THREE.Group();
    bus.add(cab);
    const DX = -0.62, DZ = 4.3;
    soft(0.56, 0.14, 0.5, 0.05, trim, DX, FLOOR + 0.5, DZ, cab);
    const driverBack = soft(0.56, 1.05, 0.12, 0.05, trim, DX, FLOOR + 1.06, DZ - 0.28, cab);
    driverBack.rotation.x = -0.12;
    box(0.1, 0.44, 0.1, steel, DX, FLOOR + 0.22, DZ, cab);
    soft(WIDTH - 0.2, 0.34, 0.5, 0.08, trim, 0, FLOOR + 0.82, FRONT - 0.32, cab);
    /* Instrument cluster: speed, route and the next stop, facing the driver */
    const cluster = panelTexture(640, 200, c => {
        c.fillStyle = '#04070c'; c.fillRect(0, 0, 640, 200);
        c.strokeStyle = '#1d2a3d'; c.lineWidth = 14; c.beginPath(); c.arc(130, 120, 80, Math.PI * 0.8, Math.PI * 2.2); c.stroke();
        c.strokeStyle = '#3ddc97'; c.beginPath(); c.arc(130, 120, 80, Math.PI * 0.8, Math.PI * 1.55); c.stroke();
        c.fillStyle = '#e8fff4'; c.font = `800 64px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('42', 130, 112);
        c.fillStyle = '#7d8ca3'; c.font = `600 20px ${FONT}`; c.fillText('km/h', 130, 158);
        c.textAlign = 'left'; c.fillStyle = '#ffb21e'; c.font = `700 28px ${MONO}`;
        c.fillText(options.sign, 252, 70);
        c.fillStyle = '#9fb3cf'; c.font = `600 22px ${FONT}`; c.fillText('NEXT STOP', 252, 118);
        c.fillStyle = '#ffffff'; c.font = `700 26px ${FONT}`; c.fillText(rows[0]?.seats[0] ?? 'Downtown', 252, 152);
    });
    const gauges = add(new THREE.PlaneGeometry(0.42, 0.13), new THREE.MeshBasicMaterial({ map: cluster, toneMapped: false }), DX, FLOOR + 1.03, FRONT - 0.52, cab);
    gauges.rotation.y = Math.PI;
    gauges.rotateX(-0.4);
    const steering = add(new THREE.TorusGeometry(0.21, 0.022, 10, 36), trim, DX, FLOOR + 1.02, DZ + 0.42, cab);
    steering.rotation.x = -1.05;
    box(0.04, 1.1, 0.9, glass, DX + 0.42, FLOOR + 1.35, DZ - 0.25, cab);   // screen behind the cab
    /* Fare reader beside the driver, where the rider taps their card */
    soft(0.2, 1.0, 0.2, 0.04, shell, 0.02, FLOOR + 0.5, DZ + 0.05, cab);
    const reader = add(new THREE.PlaneGeometry(0.14, 0.11), new THREE.MeshBasicMaterial({ color: '#7fb4ff', toneMapped: false }), 0.13, FLOOR + 1.02, DZ + 0.05, cab);
    reader.rotation.y = Math.PI / 2;
    reader.rotateX(-0.5);
    /* The driver: the person whose page this is, in a uniform shirt and an operator's cap */
    const driverChar = makeCharacter({
        skin: '#b07a52', hair: '#16111a', hairStyle: options.sign.startsWith('DEV') ? 'short' : 'spiky', eyes: '#5a3a22',
        top: '#7fa3d6', bottom: '#1a2233', shoes: '#141821', hat: { kind: 'cap', color: options.colorDark },
    });
    driverChar.root.position.set(DX, 0.2, DZ - 0.04);
    cab.add(driverChar.root);
    const operatorTexture = panelTexture(800, 440, c => {
        c.fillStyle = '#f8fafc'; c.fillRect(0, 0, 800, 440);
        c.fillStyle = options.color; c.fillRect(0, 0, 800, 96);
        c.fillStyle = '#ffffff'; c.font = `700 40px ${FONT}`; c.textBaseline = 'middle';
        c.fillText('YOUR OPERATOR', 44, 50);
        c.fillStyle = '#0f172a'; c.font = `800 72px ${FONT}`; c.textBaseline = 'top';
        wrap(c, options.operator, 44, 140, 712, 80, 2);
        c.fillStyle = '#475569'; c.font = `600 34px ${FONT}`;
        wrap(c, options.operatorRole, 44, 320, 712, 42, 2);
    });
    const operatorCard = add(new THREE.PlaneGeometry(0.4, 0.22), new THREE.MeshBasicMaterial({ map: operatorTexture, toneMapped: false }), -1.02, CEILING - 0.42, FRONT - 0.35, cab);
    operatorCard.rotation.y = Math.PI;
    const driverTargets: THREE.Object3D[] = [driverChar.root, operatorCard, driverBack, steering];

    /* End of the line */
    add(new THREE.PlaneGeometry(1.44, 0.2), new THREE.MeshBasicMaterial({ color: LIT, map: led('END OF THE LINE  ·  THANKS FOR RIDING', 1.44 / 0.2), toneMapped: false }), 0, 1.25, REAR + 0.06);

    /* ── The city going past ── */
    const world = new THREE.Group();
    world.position.x = -1.6;   // the street, shifted so the bus drives in the right-hand lane
    scene.add(world);
    scene.add(new THREE.HemisphereLight('#7f97d8', '#05070c', 0.34));
    const roadTexture = panelTexture(256, 512, c => {
        c.fillStyle = '#15181e'; c.fillRect(0, 0, 256, 512);
        for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.045})`; c.fillRect(Math.random() * 256, Math.random() * 512, 2, 2); }
        c.fillStyle = '#d8dde6'; c.fillRect(124, 40, 8, 200);
        c.fillStyle = '#e9c46a'; c.fillRect(16, 0, 5, 512); c.fillRect(235, 0, 5, 512);
    });
    roadTexture.wrapS = roadTexture.wrapT = THREE.RepeatWrapping;
    roadTexture.repeat.set(1, 30);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(13, 300), new THREE.MeshToonMaterial({ gradientMap: toonRamp, map: roadTexture }));
    road.rotation.x = -Math.PI / 2;
    world.add(road);
    for (const side of [-1, 1]) {
        const pavement = new THREE.Mesh(new THREE.BoxGeometry(5, 0.16, 300), standard('#c9d3e0', 1));     // snow-covered
        pavement.position.set(side * 9, 0.08, 0);
        world.add(pavement);
        const bank = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 300, 4, 10), standard('#e3eaf3', 1));       // ploughed snowbank at the kerb
        bank.rotation.x = Math.PI / 2;
        bank.scale.set(1.5, 1, 0.7);
        bank.position.set(side * 6.55, 0.12, 0);
        world.add(bank);
    }
    /* Buildings, each with its own facade drawn to its real size: one window per ~2.4 m and per 3.2 m
       floor, in one of four styles (brick, glass offices, concrete flats, painted walls). Lit windows
       are a separate glow map, so walls stay in shadow while rooms glow: warm lamps, cool offices,
       the odd blue TV, curtains half drawn. Ground floors facing the street are shopfronts. Tall
       towers carry a blinking red aviation light; some roofs a water tank. One mesh and one material
       per building, recycled from behind to ahead as they pass. */
    const moving: THREE.Object3D[] = [];
    const beacons: THREE.Mesh[] = [];
    const beaconMaterial = new THREE.MeshBasicMaterial({ color: '#ff2a1a', toneMapped: false });
    const FACADES = [
        { wall: '#5b2f29', band: '#43221e', warm: 0.8, lit: 0.42 },    // brick
        { wall: '#26303e', band: '#1a222d', warm: 0.25, lit: 0.55 },   // glass offices
        { wall: '#5e5a55', band: '#46423e', warm: 0.7, lit: 0.45 },    // concrete flats
        { wall: '#2f4a46', band: '#22362f', warm: 0.75, lit: 0.38 },   // painted
    ];
    const WARM = ['#ffd38f', '#ffc46a', '#ffe3b5', '#ffb45a'], COOL = ['#cfe6ff', '#e4f1ff', '#b8dcff'];
    const AWNINGS = ['#c0392b', '#2e7d32', '#f4b400', '#1f6fd6', '#8e44ad'];
    const roofMaterial = toon('#15181f');
    const makeBuilding = (w: number, h: number, d: number) => {
        const style = FACADES[Math.floor(Math.random() * FACADES.length)];
        const floors = Math.max(2, Math.floor(h / 3.2)), colsA = Math.max(2, Math.round(d / 2.4)), colsB = Math.max(2, Math.round(w / 2.4));
        const CW = 24, FH = 32, ROOF = 8, W = (colsA + colsB) * CW + ROOF, H = floors * FH;
        const wallCanvas = document.createElement('canvas'), litCanvas = document.createElement('canvas');
        wallCanvas.width = litCanvas.width = W; wallCanvas.height = litCanvas.height = H;
        const wc = wallCanvas.getContext('2d')!, lc = litCanvas.getContext('2d')!;
        lc.fillStyle = '#000000'; lc.fillRect(0, 0, W, H);
        const office = style === FACADES[1];
        [[0, colsA, true], [colsA * CW, colsB, false]].forEach(([offset, cols, street]) => {
            const x0 = offset as number, n = cols as number;
            wc.fillStyle = style.wall; wc.fillRect(x0, 0, n * CW, H);
            for (let i = 0; i < 40; i++) { wc.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`; wc.fillRect(x0 + Math.random() * n * CW, 0, 2 + Math.random() * 6, H); }   // weathering
            for (let f = 0; f < floors; f++) {
                wc.fillStyle = style.band; wc.fillRect(x0, f * FH + FH - 3, n * CW, 3);   // floor line
                const ground = f === floors - 1;
                const floorLit = Math.random() < 0.85;   // whole floors go dark at night
                for (let c = 0; c < n; c++) {
                    const x = x0 + c * CW;
                    if (ground && street) {
                        /* shopfront: a wide window, an awning stripe above */
                        wc.fillStyle = '#0d1219'; wc.fillRect(x + 2, f * FH + 9, CW - 4, FH - 10);
                        wc.fillStyle = AWNINGS[(c + Math.floor(x0)) % AWNINGS.length]; wc.fillRect(x, f * FH + 3, CW, 5);
                        if (Math.random() < 0.6) {   // open late: a warm or cool interior, shelves in silhouette
                            const tint = [['#ffe1a8', '#d9893a'], ['#ffd0a0', '#b8603a'], ['#d8f0ff', '#5d8fbf'], ['#ffe9c7', '#a87a3a']][Math.floor(Math.random() * 4)];
                            const g = lc.createLinearGradient(0, f * FH + 9, 0, f * FH + FH - 1);
                            g.addColorStop(0, tint[0]); g.addColorStop(1, tint[1]);
                            lc.globalAlpha = 0.55 + Math.random() * 0.3;
                            lc.fillStyle = g; lc.fillRect(x + 2, f * FH + 9, CW - 4, FH - 10);
                            lc.globalAlpha = 1;
                            lc.fillStyle = 'rgba(0,0,0,0.45)';
                            for (let k = 0; k < 2; k++) lc.fillRect(x + 4 + k * 9, f * FH + 15 + Math.random() * 4, 6, FH - 18);
                        }
                        continue;
                    }
                    const wx = x + (office ? 2 : 5), wy = f * FH + 7, ww = CW - (office ? 4 : 10), wh = FH - 13;
                    const glass = wc.createLinearGradient(0, wy, 0, wy + wh);
                    glass.addColorStop(0, '#1d2a3d'); glass.addColorStop(1, '#0b1018');
                    wc.fillStyle = glass; wc.fillRect(wx, wy, ww, wh);
                    wc.fillStyle = style.band; wc.fillRect(wx - 1, wy + wh, ww + 2, 2);   // sill
                    if (floorLit && Math.random() < style.lit) {
                        const tv = Math.random() < 0.06;
                        const base = tv ? '#7fb6ff' : Math.random() < style.warm ? WARM[Math.floor(Math.random() * WARM.length)] : COOL[Math.floor(Math.random() * COOL.length)];
                        const g = lc.createLinearGradient(0, wy, 0, wy + wh);
                        g.addColorStop(0, base); g.addColorStop(1, '#' + new THREE.Color(base).multiplyScalar(0.55).getHexString());
                        lc.globalAlpha = 0.55 + Math.random() * 0.45;
                        lc.fillStyle = g; lc.fillRect(wx, wy, ww, wh);
                        lc.globalAlpha = 1;
                        if (!office && Math.random() < 0.45) {   // curtains, part drawn
                            lc.fillStyle = 'rgba(0,0,0,0.55)';
                            const cw = ww * (0.25 + Math.random() * 0.35);
                            lc.fillRect(Math.random() < 0.5 ? wx : wx + ww - cw, wy, cw, wh);
                        }
                    }
                    wc.fillStyle = style.band; wc.fillRect(wx + ww / 2 - 0.5, wy, 1, wh);   // mullion
                    lc.fillStyle = '#000000'; lc.fillRect(wx + ww / 2 - 0.5, wy, 1, wh);
                }
            }
        });
        wc.fillStyle = '#15181f'; wc.fillRect(W - ROOF, 0, ROOF, H);
        const map = new THREE.CanvasTexture(wallCanvas), glowMap = new THREE.CanvasTexture(litCanvas);
        map.colorSpace = glowMap.colorSpace = THREE.SRGBColorSpace;
        map.anisotropy = glowMap.anisotropy = 4;
        /* One texture for the whole box: street-facing sides, then the other sides, then a roof patch */
        const geometry = new THREE.BoxGeometry(w, h, d);
        const uv = geometry.attributes.uv as THREE.BufferAttribute;
        const a = (colsA * CW) / W, b = ((colsA + colsB) * CW) / W, roof = 1 - ROOF / 2 / W;
        for (let face = 0; face < 6; face++) {
            for (let v = 0; v < 4; v++) {
                const i = face * 4 + v, u = uv.getX(i);
                if (face === 2 || face === 3) uv.setXY(i, roof, 0.5);                         // top, bottom
                else if (face < 2) uv.setX(i, u * a);                                        // ±x: faces the street
                else uv.setX(i, a + u * (b - a));                                            // ±z
            }
        }
        const building = new THREE.Mesh(geometry, new THREE.MeshToonMaterial({ gradientMap: toonRamp, map, emissive: '#ffffff', emissiveMap: glowMap, emissiveIntensity: 1 }));
        /* roof details */
        if (h > 22) {
            const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), beaconMaterial);
            beacon.position.set(0, h / 2 + 1.2, 0);
            building.add(beacon);
            const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 2.2, 6), roofMaterial);
            mast.position.set(0, h / 2 + 0.1, 0);
            building.add(mast);
            beacons.push(beacon);
        } else if (Math.random() < 0.5) {
            const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.6, 12), roofMaterial);
            tank.position.set(w * 0.2, h / 2 + 1.3, d * 0.15);
            const cap = new THREE.Mesh(new THREE.ConeGeometry(1.0, 0.7, 12), roofMaterial);
            cap.position.set(w * 0.2, h / 2 + 2.45, d * 0.15);
            building.add(tank, cap);
        }
        return building;
    };
    const SPANZ = 220;
    for (let i = 0; i < 44; i++) {
        const side = i % 2 ? 1 : -1, w = 7 + Math.random() * 6, h = 8 + Math.random() * 26, d = 8 + Math.random() * 8;
        const building = makeBuilding(w, h, d);
        building.position.set(side * (12 + w / 2 + Math.random() * 4), h / 2, -SPANZ / 2 + (i / 44) * SPANZ + Math.random() * 3);
        world.add(building);
        moving.push(building);
    }
    /* A distant skyline all the way round, for depth: silhouettes with a scatter of tiny lights */
    const skylineTexture = panelTexture(2048, 256, c => {
        c.clearRect(0, 0, 2048, 256);
        for (let x = 0; x < 2048;) {
            const bw = 30 + Math.random() * 90, bh = 40 + Math.random() * 170;
            c.fillStyle = Math.random() < 0.5 ? '#121835' : '#0e1430';
            c.fillRect(x, 256 - bh, bw, bh);
            for (let i = 0; i < bw * bh / 260; i++) {
                c.fillStyle = Math.random() < 0.7 ? 'rgba(255,205,130,0.55)' : 'rgba(190,220,255,0.45)';
                c.fillRect(x + 3 + Math.random() * (bw - 6), 256 - bh + 4 + Math.random() * (bh - 8), 2, 2);
            }
            x += bw - 6;
        }
    });
    skylineTexture.wrapS = THREE.RepeatWrapping;
    skylineTexture.repeat.x = 3;
    const skyline = new THREE.Mesh(new THREE.CylinderGeometry(185, 185, 56, 48, 1, true), new THREE.MeshBasicMaterial({ map: skylineTexture, transparent: true, side: THREE.BackSide, fog: false, depthWrite: false }));
    skyline.position.y = 26;
    scene.add(skyline);
    /* Street lamps; two real lights ride along with the nearest ones so their glow sweeps through the cabin */
    const lamps: THREE.Object3D[] = [];
    for (let i = 0; i < 14; i++) {
        const lamp = new THREE.Group();
        const side = i % 2 ? 1 : -1;
        lamp.position.set(side * 6.9, 0, -SPANZ / 2 + (i / 14) * SPANZ);
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 6.4, 8), trim);
        post.position.y = 3.2;
        const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.08), trim);
        arm.position.set(-side * 0.8, 6.35, 0);
        const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.22), glow('#ffc37a'));
        bulb.position.set(-side * 1.5, 6.28, 0);
        lamp.add(post, arm, bulb);
        bloom('#ffb866', 3.2, -side * 1.5, 6.2, 0, lamp);
        world.add(lamp);
        moving.push(lamp);
        lamps.push(lamp);
    }

    /* "TRANSIT REGINA" in neon tubes beside the road. It travels with the bus, lights up letter by
       letter when the page opens, and now and then a letter flickers, as old neon does. */
    const NEON = [...'TRANSIT REGINA'];
    const neonCanvas = document.createElement('canvas');
    neonCanvas.width = 2048; neonCanvas.height = 320;
    const nc = neonCanvas.getContext('2d')!;
    let neonSize = 210;
    nc.font = `800 ${neonSize}px ${FONT}`;
    neonSize = Math.floor(neonSize * Math.min(1, 1880 / nc.measureText(NEON.join('')).width));
    nc.font = `800 ${neonSize}px ${FONT}`;
    const advance = NEON.map(ch => nc.measureText(ch).width + neonSize * 0.04);
    const neonLeft = (2048 - advance.reduce((a, b) => a + b, 0)) / 2;
    const neonTexture = new THREE.CanvasTexture(neonCanvas);
    neonTexture.colorSpace = THREE.SRGBColorSpace;
    const lit = NEON.map(() => false);
    const drawNeon = () => {
        nc.clearRect(0, 0, 2048, 320);
        nc.font = `800 ${neonSize}px ${FONT}`; nc.textBaseline = 'middle'; nc.lineJoin = 'round';
        let x = neonLeft;
        NEON.forEach((ch, i) => {
            const color = i < 7 ? '#3dff9a' : '#ffb21e';
            if (ch !== ' ' && lit[i]) {
                nc.shadowColor = color; nc.shadowBlur = 50; nc.strokeStyle = color; nc.lineWidth = 12;
                nc.strokeText(ch, x, 168); nc.strokeText(ch, x, 168);
                nc.shadowBlur = 8; nc.strokeStyle = 'rgba(255,255,240,0.9)'; nc.lineWidth = 3.5;
                nc.strokeText(ch, x, 168);
            } else if (ch !== ' ') {
                nc.shadowBlur = 0; nc.strokeStyle = 'rgba(170,190,210,0.16)'; nc.lineWidth = 6;   // an unlit glass tube
                nc.strokeText(ch, x, 168);
            }
            x += advance[i];
        });
        nc.shadowBlur = 0;
        neonTexture.needsUpdate = true;
    };
    drawNeon();
    const neon = new THREE.Group();
    const NEON_W = 18;
    const neonFace = new THREE.Mesh(new THREE.PlaneGeometry(NEON_W, NEON_W * 320 / 2048), new THREE.MeshBasicMaterial({ map: neonTexture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
    neon.add(neonFace);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(NEON_W * 0.92, 0.1, 0.1), trim);
    rail.position.y = -1.75;
    neon.add(rail);
    neon.rotation.y = Math.PI / 2;
    neon.position.set(-12.6, 7, middle);
    scene.add(neon);
    const neonLight = new THREE.PointLight('#5dffb0', 0, 26, 1.4);
    scene.add(neonLight);
    let neonTime = 0, nextFlicker = 4, flickering = -1, flickerUntil = 0;

    /* Oncoming traffic in the other lane, headlights first */
    const cars: THREE.Group[] = [];
    const carWheel = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 18);
    ['#1c2433', '#6b1d1d', '#d9dde3', '#2c3e50'].forEach((color, i) => {
        const car = new THREE.Group();
        soft(1.8, 0.62, 4.3, 0.14, toon(color), 0, 0.62, 0, car);
        soft(1.58, 0.52, 2.2, 0.16, standard('#0b1018', 0.15, 0.6), 0, 1.15, 0.25, car);
        for (const [x, z] of [[-0.82, -1.35], [0.82, -1.35], [-0.82, 1.35], [0.82, 1.35]]) {
            const w = add(carWheel, rubber, x, 0.33, z, car);
            w.rotation.z = Math.PI / 2;
        }
        for (const x of [-0.62, 0.62]) {
            box(0.34, 0.1, 0.03, glow('#fff6dc'), x, 0.68, -2.16, car);
            bloom('#ffeccc', 2.2, x, 0.68, -2.35, car);
            box(0.3, 0.09, 0.03, glow('#ff2a2a'), x, 0.72, 2.16, car);
            bloom('#ff3b30', 0.8, x, 0.72, 2.25, car);
        }
        car.position.set(-2.4, 0, -SPANZ / 2 + (i + Math.random() * 0.5) * SPANZ / 4);
        world.add(car);
        cars.push(car);
    });

    /* ── The stop: a raised platform, a glass shelter with a bench and a backlit poster, a stop flag,
       and a live arrival board that counts down as the bus approaches ── */
    const DOORZ = (DOOR[0] + DOOR[1]) / 2;
    const stop = new THREE.Group();
    scene.add(stop);
    const concrete = standard('#8f98a3', 0.92);
    box(4.6, 0.42, 16, concrete, 3.9, 0.21, 0, stop);
    box(0.45, 0.012, 16, yellow, 1.85, 0.426, 0, stop);                               // tactile strip at the kerb
    box(4.4, 0.04, 15.6, standard('#e6edf5', 1), 4.0, 0.44, 0, stop).scale.set(0.5, 1, 1);   // snow pushed to the back
    for (const [x, z] of [[4.05, -4.75], [5.75, -4.75], [4.05, -1.25], [5.75, -1.25]]) box(0.07, 2.55, 0.07, trim, x, 0.42 + 1.27, z, stop);
    soft(2.0, 0.1, 3.8, 0.04, trim, 4.9, 2.98, -3, stop);                              // roof
    box(0.04, 2.2, 3.45, glass, 5.75, 1.62, -3, stop);
    box(1.66, 2.2, 0.04, glass, 4.9, 1.62, -4.75, stop);
    box(0.42, 0.06, 2.4, standard('#7a5233', 0.7), 5.45, 0.92, -3, stop);              // bench
    for (const z of [-3.9, -2.1]) box(0.06, 0.5, 0.06, steel, 5.45, 0.67, z, stop);
    /* A backlit poster on the end panel: an ad for the app itself, with a phone showing the live map.
       The bus on that little map really moves, a few times a second, while the stop is in view. */
    const posterCanvas = document.createElement('canvas');
    posterCanvas.width = 560; posterCanvas.height = 800;
    const pc = posterCanvas.getContext('2d')!;
    const posterTexture = new THREE.CanvasTexture(posterCanvas);
    posterTexture.colorSpace = THREE.SRGBColorSpace;
    const ROUTE: [number, number][] = [[300, 640], [300, 560], [380, 560], [380, 470], [460, 470], [460, 380], [400, 380], [400, 300]];
    const drawPoster = (k: number) => {
        const g = pc.createLinearGradient(0, 0, 0, 800);
        g.addColorStop(0, '#0f4a26'); g.addColorStop(1, '#06200f');
        pc.fillStyle = g; pc.fillRect(0, 0, 560, 800);
        pc.fillStyle = '#5dffa6'; pc.font = `800 26px ${FONT}`; pc.textBaseline = 'top'; pc.textAlign = 'left';
        pc.fillText('TRANSIT REGINA', 36, 40);
        pc.fillStyle = '#ffffff'; pc.font = `900 64px ${FONT}`;
        pc.fillText('Your bus,', 36, 84); pc.fillText('live.', 36, 152);
        pc.fillStyle = '#c9f5da'; pc.font = `600 22px ${FONT}`;
        wrap(pc, 'Every Regina bus on one map, so you can leave home at the right minute.', 36, 236, 210, 30, 6);
        /* phone */
        pc.fillStyle = '#0b0f14'; pc.beginPath(); pc.roundRect(262, 230, 262, 470, 34); pc.fill();
        pc.fillStyle = '#e9eef2'; pc.beginPath(); pc.roundRect(274, 250, 238, 432, 24); pc.fill();
        pc.strokeStyle = '#ffffff'; pc.lineWidth = 10;   // streets
        for (const x of [300, 380, 460]) { pc.beginPath(); pc.moveTo(x, 252); pc.lineTo(x, 680); pc.stroke(); }
        for (const y of [300, 380, 470, 560, 640]) { pc.beginPath(); pc.moveTo(276, y); pc.lineTo(510, y); pc.stroke(); }
        pc.fillStyle = '#cfe8d4'; pc.fillRect(392, 590, 60, 40);   // a park
        pc.strokeStyle = '#2E7D32'; pc.lineWidth = 8; pc.lineJoin = 'round';
        pc.beginPath(); ROUTE.forEach(([x, y], i) => i ? pc.lineTo(x, y) : pc.moveTo(x, y)); pc.stroke();
        for (const [x, y] of [ROUTE[0], ROUTE[3], ROUTE[7]]) { pc.fillStyle = '#ffffff'; pc.beginPath(); pc.arc(x, y, 8, 0, Math.PI * 2); pc.fill(); pc.strokeStyle = '#2E7D32'; pc.lineWidth = 4; pc.stroke(); }
        /* the moving bus */
        const lens = ROUTE.slice(1).map((q, i) => Math.hypot(q[0] - ROUTE[i][0], q[1] - ROUTE[i][1]));
        let d = k * lens.reduce((a, b) => a + b, 0), i = 0;
        while (i < lens.length - 1 && d > lens[i]) d -= lens[i++];
        const t = Math.min(1, d / lens[i]), bx = ROUTE[i][0] + (ROUTE[i + 1][0] - ROUTE[i][0]) * t, by = ROUTE[i][1] + (ROUTE[i + 1][1] - ROUTE[i][1]) * t;
        pc.fillStyle = 'rgba(46,125,50,0.25)'; pc.beginPath(); pc.arc(bx, by, 22, 0, Math.PI * 2); pc.fill();
        pc.fillStyle = '#2E7D32'; pc.beginPath(); pc.roundRect(bx - 13, by - 13, 26, 26, 7); pc.fill();
        pc.fillStyle = '#ffffff'; pc.font = `800 14px ${FONT}`; pc.textAlign = 'center'; pc.textBaseline = 'middle'; pc.fillText('3', bx, by + 1);
        /* arrival chip */
        pc.fillStyle = '#ffffff'; pc.beginPath(); pc.roundRect(284, 262, 218, 46, 14); pc.fill();
        pc.fillStyle = '#0f172a'; pc.font = `800 18px ${FONT}`; pc.textAlign = 'left'; pc.fillText('Route 3 · Downtown', 298, 285);
        pc.fillStyle = '#2E7D32'; pc.textAlign = 'right'; pc.fillText(`${Math.max(1, Math.ceil((1 - k) * 6))} min`, 492, 285);
        pc.fillStyle = '#ffb21e'; pc.font = `700 20px ${MONO}`; pc.textAlign = 'left'; pc.textBaseline = 'top';
        pc.fillText('transitregina.ca', 36, 728);
        pc.fillStyle = '#c9f5da'; pc.font = `600 17px ${FONT}`; pc.fillText('Free. No app to install.', 36, 758);
        posterTexture.needsUpdate = true;
    };
    drawPoster(0);
    let posterClock = 0;
    add(new THREE.PlaneGeometry(1.4, 2.0), new THREE.MeshBasicMaterial({ map: posterTexture, toneMapped: false, color: new THREE.Color(0.92, 0.92, 0.92) }), 4.9, 1.65, -1.22, stop);
    box(1.5, 2.1, 0.06, trim, 4.9, 1.65, -1.27, stop);
    const shelterLight = new THREE.PointLight('#ffe2b8', 7, 7, 1.6);
    shelterLight.position.set(4.6, 2.7, -2.2);
    stop.add(shelterLight);
    /* The stop flag, out at the front of the stop */
    add(new THREE.CylinderGeometry(0.05, 0.05, 2.9, 10), steel, 2.3, 0.42 + 1.45, -6.5, stop);
    const flag = panelTexture(400, 480, c => {
        c.fillStyle = '#ffffff'; c.fillRect(0, 0, 400, 480);
        c.fillStyle = '#2E7D32'; c.fillRect(0, 0, 400, 150);
        c.fillStyle = '#ffffff'; c.font = `800 46px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('BUS STOP', 200, 76);
        c.fillStyle = '#0f172a'; c.font = `800 ${fit(c, options.sign, 800, 52, 360, 2)}px ${FONT}`;
        wrap(c, options.sign, 200, 220, 360, 58, 2);
        c.fillStyle = '#64748b'; c.font = `700 30px ${MONO}`;
        c.fillText('STOP 2026', 200, 410);
    });
    add(new THREE.PlaneGeometry(0.5, 0.6), new THREE.MeshBasicMaterial({ map: flag, side: THREE.DoubleSide, color: new THREE.Color(0.85, 0.85, 0.85) }), 2.3, 2.95, -6.47, stop);
    /* The live arrival board hangs from the shelter roof, in clear view of anyone waiting:
       the route on the left, minutes on the right */
    soft(1.62, 0.34, 0.08, 0.03, trim, 4.55, 2.72, -0.98, stop);
    for (const x of [4.0, 5.1]) box(0.03, 0.2, 0.03, steel, x, 2.93, -0.98, stop);
    add(new THREE.PlaneGeometry(1.0, 0.24), new THREE.MeshBasicMaterial({ map: led(options.sign, 1.0 / 0.24, 128, 0.4), toneMapped: false }), 4.24, 2.72, -0.935, stop);
    const arrivals = ['4 MIN', '2 MIN', '1 MIN', 'DUE', 'BOARD', 'GONE'].map(t => led(t, 0.5 / 0.24, 128, 0.5));
    const board = add(new THREE.PlaneGeometry(0.5, 0.24), new THREE.MeshBasicMaterial({ map: arrivals[0], toneMapped: false }), 5.07, 2.72, -0.935, stop);
    /* Street details: a litter bin, a fire hydrant, a newspaper box, and a snowman someone built */
    add(new THREE.CylinderGeometry(0.24, 0.21, 0.8, 16), toon('#2f5d3a'), 4.1, 0.82, 0.5, stop);
    add(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 16), toon('#1f3d27'), 4.1, 1.24, 0.5, stop);
    add(new THREE.CylinderGeometry(0.11, 0.13, 0.55, 12), toon('#d23b2c'), 2.6, 0.7, 4.2, stop);
    add(new THREE.SphereGeometry(0.11, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), toon('#d23b2c'), 2.6, 0.97, 4.2, stop);
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), toon('#e9e2d0'), 2.6, 0.78, 4.2, stop).rotation.z = Math.PI / 2;
    soft(0.42, 0.95, 0.38, 0.04, toon('#2f6fd6'), 5.2, 0.9, 1.4, stop);
    soft(0.36, 0.22, 0.02, 0.01, toon('#e9eef5'), 5.2, 1.1, 1.6, stop);
    for (const [r, y] of [[0.36, 0.72], [0.27, 1.22], [0.19, 1.6]]) add(new THREE.SphereGeometry(r, 18, 14), toon('#f4f8ff'), 5.4, y, 5.6, stop);
    const nose = add(new THREE.ConeGeometry(0.035, 0.18, 8), toon('#ff8a2a'), 5.4, 1.6, 5.8, stop);
    nose.rotation.x = Math.PI / 2;
    for (const dx of [-0.06, 0.06]) add(new THREE.SphereGeometry(0.022, 8, 6), toon('#141821'), 5.4 + dx, 1.67, 5.77, stop);
    add(new THREE.SphereGeometry(0.2, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon('#d63a3a'), 5.4, 1.7, 5.6, stop);
    add(new THREE.TorusGeometry(0.2, 0.05, 8, 18), toon(options.color), 5.4, 1.43, 5.6, stop).rotation.x = Math.PI / 2;

    /* The rider: dressed for a Regina winter (parka, toque, scarf, backpack) */
    const riderChar = makeCharacter({
        skin: '#f0c7a0', hair: '#2b2f3a', hairStyle: 'spiky', eyes: '#3f7fd6',
        top: '#1f8a8a', bottom: '#2a3550', shoes: '#4a3020', hat: { kind: 'toque', color: '#f4b400' }, scarf: '#d63a3a', backpack: '#2a2e38',
    });
    const rider = riderChar.root;
    scene.add(rider);
    /* Someone else waiting on the bench, on their phone, and people walking on the far pavement */
    const bencher = makeCharacter({ skin: '#ffd9bd', hair: '#ff8fb8', hairStyle: 'bun', eyes: '#c2417a', top: '#f5f0e6', bottom: '#4b3b6b', shoes: '#ffffff', scarf: '#7c5cff' });
    bencher.root.position.set(5.4, 0.13, -3);
    bencher.root.rotation.y = -Math.PI / 2;
    stop.add(bencher.root);
    const walkers = ([
        [{ skin: '#8d5a3b', hair: '#0f0c10', hairStyle: 'short', eyes: '#3b2416', top: '#d9822b', bottom: '#20283a', shoes: '#111111', hat: { kind: 'toque', color: '#2f6fd6' } }, 1],
        [{ skin: '#f3d2b5', hair: '#f2d06b', hairStyle: 'long', eyes: '#2f8f6a', top: '#8f3fd0', bottom: '#1c1c28', shoes: '#ffffff', scarf: '#ffffff' }, -1],
        [{ skin: '#c99872', hair: '#3a2416', hairStyle: 'bob', eyes: '#6b3d1e', top: '#2e7d32', bottom: '#333a48', shoes: '#222222', backpack: '#c0392b' }, 1],
    ] as [Look, number][]).map(([look, dir], i) => {
        const c = makeCharacter(look);
        c.root.position.set(-8.4 + i * 0.7, 0.16, -30 + i * 23);
        c.root.rotation.y = dir > 0 ? 0 : Math.PI;
        world.add(c.root);
        c.setDetail(false);   // across the road: no outlines needed at that distance
        return { c, dir, phase: i * 2 };
    });
    /* Where the rider walks, relative to the middle of the bus door: up the pavement to the stop;
       from the stop across the kerb and through the doorway to the fare reader; then to the aisle */
    const toPath = (points: number[][]) => {
        const pts = points.map(([x, z]) => new THREE.Vector2(x, z));
        const total = pts.slice(1).reduce((sum, q, i) => sum + q.distanceTo(pts[i]), 0);
        return (k: number) => {
            let d = k * total;
            for (let i = 1; i < pts.length; i++) {
                const seg = pts[i].distanceTo(pts[i - 1]);
                if (d <= seg || i === pts.length - 1) return { at: pts[i - 1].clone().lerp(pts[i], Math.min(1, d / seg)), dir: pts[i].clone().sub(pts[i - 1]) };
                d -= seg;
            }
            return { at: pts[0].clone(), dir: new THREE.Vector2(0, -1) };
        };
    };
    const toStop = toPath([[3.9, 6.5], [3.4, 2.2], [3.2, -0.3]]);
    const toReader = toPath([[3.2, -0.3], [1.8, 0], [1.0, 0], [0.42, 0.08]]);
    const toAisle = toPath([[0.42, 0.08], [0.08, -0.4], [0, rowZ(0) - 0.35 - DOORZ]]);

    /* ── Passengers: one per thing the person built. Each has their own look and something to do
       (phone, window, music, a nap) until the rider reaches their row. ── */
    const SKINS = ['#f3d2b5', '#c99872', '#8d5a3b', '#ffd9bd', '#b07a52', '#e8b98f'];
    const HAIRS = ['#16111a', '#3a2416', '#f2d06b', '#ff8fb8', '#5b7cfa', '#c0392b', '#e9eef5', '#2b2f3a'];
    const STYLES: Look['hairStyle'][] = ['short', 'long', 'bob', 'spiky', 'bun'];
    const TOPS = ['#e85d75', '#3fa7d6', '#f4b400', '#7c5cff', '#2e7d32', '#f5f0e6', '#ff8a3d', '#1f8a8a'];
    const EYES = ['#3f7fd6', '#2f8f6a', '#c2417a', '#6b3d1e', '#8a5cd6', '#d6862f'];
    const phoneGeometry = new THREE.BoxGeometry(0.07, 0.13, 0.012);
    const passengers = seatSlots.map(({ row, k, side, title }, i) => {
        const c = makeCharacter({
            skin: SKINS[(i * 5 + 1) % SKINS.length], hair: HAIRS[(i * 3) % HAIRS.length], hairStyle: STYLES[(i * 2 + 1) % STYLES.length],
            eyes: EYES[i % EYES.length], top: TOPS[(i * 7 + 2) % TOPS.length], bottom: ['#20283a', '#3b3b4f', '#5a4632'][i % 3], shoes: ['#ffffff', '#141821', '#7a3b2a'][i % 3],
            glasses: i % 4 === 1, scarf: i % 5 === 2 ? '#ffffff' : undefined,
        });
        c.root.position.set(side * 0.76, 0.16, rowZ(row) - 0.1);
        bus.add(c.root);
        const idle = i % 4;   // 0 phone, 1 looking out of the window, 2 music, 3 asleep
        if (idle === 0) {
            const phone = new THREE.Mesh(phoneGeometry, toon('#141821'));
            phone.position.set(0.02, -0.28, 0.04);
            phone.rotation.x = -0.6;
            c.arms[0].lower.add(phone);
        }
        /* The speech bubble that pops up when the rider arrives */
        const bubbleTexture = panelTexture(560, 300, g => {
            g.clearRect(0, 0, 560, 300);
            g.lineJoin = 'round';
            g.fillStyle = '#ffffff'; g.strokeStyle = '#141821'; g.lineWidth = 10;
            g.beginPath(); g.roundRect(14, 14, 532, 210, 60); g.fill(); g.stroke();
            g.beginPath(); g.moveTo(side > 0 ? 170 : 390, 218); g.lineTo(side > 0 ? 130 : 430, 290); g.lineTo(side > 0 ? 230 : 330, 218); g.closePath(); g.fill(); g.stroke();
            g.fillStyle = '#ffffff'; g.fillRect(side > 0 ? 160 : 320, 208, 80, 14);
            g.fillStyle = options.color; g.font = `800 26px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'top';
            g.fillText(`SEAT ${String(row * 2 + k + 1).padStart(2, '0')}`, 280, 44);
            const size = fit(g, title, 900, 50, 470, 2);
            g.fillStyle = '#141821'; g.font = `900 ${size}px ${FONT}`;
            const words = title.split(' '), lines: string[] = [];
            let line = '';
            for (const w of words) { const next = line ? `${line} ${w}` : w; if (g.measureText(next).width > 470 && line) { lines.push(line); line = w; } else line = next; }
            lines.push(line);
            lines.slice(0, 2).forEach((l, n) => g.fillText(l, 280, (lines.length > 1 ? 84 : 108) + n * size * 1.1));
        });
        const bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubbleTexture, depthTest: false, transparent: true }));
        bubble.renderOrder = 20;
        bubble.position.set(side * 0.62, 2.1, rowZ(row) - 0.1);
        bubble.visible = false;
        bus.add(bubble);
        c.root.userData.row = row;
        return { c, row, side, idle, bubble, act: 0, label: 0, since: 0, waving: false, offset: i * 1.37 };
    });
    /* Game markers above heads: a "!" for someone not yet met, a tick once you have talked */
    const markerTexture = (glyph: string, fill: string) => panelTexture(128, 128, g => {
        g.clearRect(0, 0, 128, 128);
        g.fillStyle = fill; g.strokeStyle = '#141821'; g.lineWidth = 8;
        g.beginPath(); g.arc(64, 60, 46, 0, Math.PI * 2); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(52, 102); g.lineTo(64, 122); g.lineTo(76, 102); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = fill; g.fillRect(50, 96, 28, 10);
        g.fillStyle = '#141821'; g.font = `900 64px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(glyph, 64, 64);
    });
    const markNew = markerTexture('!', '#ffc21a'), markDone = markerTexture('✓', '#5be08f');
    const markers = passengers.map(p => {
        const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: markNew, depthTest: false, transparent: true }));
        m.renderOrder = 19;
        m.scale.setScalar(0.17);
        m.position.set(p.side * 0.76, 2.08, rowZ(p.row) - 0.1);
        m.visible = false;
        bus.add(m);
        return m;
    });
    /* The driver's own bubble when the rider steps on */
    const helloTexture = panelTexture(560, 300, g => {
        g.clearRect(0, 0, 560, 300);
        g.lineJoin = 'round'; g.fillStyle = '#ffffff'; g.strokeStyle = '#141821'; g.lineWidth = 10;
        g.beginPath(); g.roundRect(14, 14, 532, 210, 60); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(170, 218); g.lineTo(120, 290); g.lineTo(240, 218); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#ffffff'; g.fillRect(160, 208, 90, 14);
        g.fillStyle = '#141821'; g.font = `900 64px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('Welcome aboard!', 280, 100);
        g.fillStyle = options.color; g.font = `800 30px ${FONT}`;
        g.fillText(`I'm ${options.operator.split(' ')[0]}, your driver`, 280, 170);
    });
    const hello = new THREE.Sprite(new THREE.SpriteMaterial({ map: helloTexture, depthTest: false, transparent: true }));
    hello.renderOrder = 20;
    hello.position.set(DX + 0.3, 2.0, DZ + 0.2);
    hello.visible = false;
    bus.add(hello);
    const driverMarker = new THREE.Sprite(new THREE.SpriteMaterial({ map: markNew, depthTest: false, transparent: true }));
    driverMarker.renderOrder = 19;
    driverMarker.scale.setScalar(0.17);
    driverMarker.position.set(DX, 2.08, DZ);
    driverMarker.visible = false;
    bus.add(driverMarker);
    /* A dark outline around the whole bus, shown only while the camera is outside it */
    const hull = new THREE.Mesh(new THREE.BoxGeometry(WIDTH + 0.06, CEILING + 0.3, length + 0.06), new THREE.MeshBasicMaterial({ color: '#141821', side: THREE.BackSide }));
    hull.position.set(0, (CEILING + 0.3) / 2 + 0.24, middle);
    bus.add(hull);

    /* Snow, streaming past the bus (never inside it). It is a Regina winter, after all */
    const FLAKES = 900, SNOW_SPAN = 60;
    const flakes = new Float32Array(FLAKES * 3);
    let snowCentre = middle;   // snow surrounds the camera, wherever the story has it
    const outside = (i: number) => {
        let x = (Math.random() - 0.5) * 34;
        const z = snowCentre + (Math.random() - 0.5) * SNOW_SPAN;
        if (Math.abs(x) < 1.7 && z < FRONT + 0.6 && z > REAR - 0.6) x = Math.sign(x || 1) * (1.7 + Math.random() * 15);
        flakes.set([x, Math.random() * 13, z], i * 3);
    };
    for (let i = 0; i < FLAKES; i++) outside(i);
    const snowGeometry = new THREE.BufferGeometry();
    snowGeometry.setAttribute('position', new THREE.BufferAttribute(flakes, 3));
    const snow = new THREE.Points(snowGeometry, new THREE.PointsMaterial({ map: halo, color: '#eef4ff', size: 0.13, transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true }));
    snow.frustumCulled = false;
    scene.add(snow);

    /* ── The camera's journey: [share of scroll, where it stands, what it looks at] ── */
    const A = options.aisleStart;
    /* Where the camera stands and looks, relative to the middle of the bus door (z = 0). Until the
       rider has boarded, these follow the stop; after that, the bus. Shares are of the story (0–1),
       which fills the scroll before the aisle walk. */
    const keys: [number, THREE.Vector3, THREE.Vector3][] = ([
        [0.00, [7.8, 3.3, 10.5], [2.8, 1.3, -3]],            // the street at night: the rider walks up to the stop
        [0.12, [6.4, 2.5, 6.2], [2.6, 1.3, -5]],             // the stop, someone on the bench, the bus far off
        [0.20, [4.5, 1.85, 3.1], [0.8, 1.5, -22]],           // over the rider's shoulder, watching it come
        [0.30, [4.7, 1.8, 2.8], [1.2, 1.55, -4]],            // it pulls in alongside
        [0.40, [4.6, 1.85, 2.2], [1.0, 1.45, 0]],            // the doors open
        [0.50, [3.3, 1.9, 1.7], [0.6, 1.4, -0.1]],           // following the rider to the door
        [0.60, [1.75, 1.95, 0.55], [-0.5, 1.55, 0.1]],       // through the doorway
        [0.70, [0.32, 2.05, 1.0], [-0.55, 1.55, -0.1]],      // from the windscreen corner: the driver turns and waves
        [0.80, [0.28, 2.03, 0.98], [-0.6, 1.55, -0.15]],
        [0.90, [0.6, 2.05, 0.9], [0.1, 1.3, -1.4]],          // the rider heads for the aisle
        [1.00, [0.12, 1.95, -0.4], [0, 1.6, -2.25]],         // and meets the first passengers
    ] as [number, number[], number[]][]).map(([t, p, l]) => [t, new THREE.Vector3(...p), new THREE.Vector3(...l)]);
    const span = (u: number, from: number, to: number) => THREE.MathUtils.clamp((u - from) / (to - from), 0, 1);
    /* How far ahead of the bus door the stop is: closing in, stopped, then falling behind */
    const stopAhead = (u: number) => u < 0.32 ? 70 * (1 - span(u, 0, 0.32)) ** 2 : u < 0.8 ? 0 : -45 * span(u, 0.8, 1) ** 2;

    const wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3();
    const pos = keys[0][1].clone(), look = keys[0][2].clone();
    let driverGreet = 0;
    let progress = 0, activeRow = -1, ahead = stopAhead(0), story = 0, rowEased = 0, aisleBack = 1.75;
    /* Where the rider stands in the aisle (relative to the door) when beside a row */
    const aisleZ = (row: number) => rowZ(row) - 0.35 - DOORZ;
    const aim = (t: number) => {
        if (exploring) {
            if (talkingTo !== null) {
                /* A conversation shot from in front of whoever is talking (everyone sits facing the front of
                   the bus), across the aisle from them, with the player at the edge of the frame */
                const target = spotFor(talkingTo);
                if (talkingTo === 'driver') {
                    wantPos.set(0.3, 2.03, 0.95);
                    wantLook.set(-0.55, 1.6, -0.12);
                } else {
                    const side = Math.sign(target.x);
                    wantPos.set(-side * 0.15, 2.0, target.y + 1.35);
                    wantLook.set(target.x * 0.85, 1.68, target.y);
                }
            } else {
                /* Following the player; dragging swings the camera round them (0 = looking toward the back,
                   where the passengers' faces are) */
                const back = aisleBack * 0.95, sn = Math.sin(camYaw), c = Math.cos(camYaw);
                wantPos.set(player.x + sn * back, 2.08, player.y + c * back);
                wantLook.set(player.x - sn * 1.3, 1.3, player.y - c * 1.3);
            }
            /* Never through the walls or out of the windscreen: the camera pulls in instead */
            wantPos.x = THREE.MathUtils.clamp(wantPos.x, -WIDTH / 2 + 0.18, WIDTH / 2 - 0.18);
            wantPos.z = THREE.MathUtils.clamp(wantPos.z, REAR + 0.3 - DOORZ, FRONT - 0.25 - DOORZ);
            return;
        }
        if (t >= A) {
            const z = aisleZ(rowEased);
            wantPos.set(0.12, 1.95, z + aisleBack);
            wantLook.set(0, 1.6, z - 0.1);
            return;
        }
        const u = t / A;
        let i = 0;
        while (i < keys.length - 2 && u > keys[i + 1][0]) i++;
        const [t0, p0, l0] = keys[i], [t1, p1, l1] = keys[i + 1];
        const k = THREE.MathUtils.smoothstep(u, t0, t1);
        wantPos.lerpVectors(p0, p1, k);
        wantLook.lerpVectors(l0, l1, k);
    };
    const offset = new THREE.Vector3();

    const resize = () => {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.fov = w < h ? 74 : 52;   // wider on a phone held upright, so both rows of seats still fit
        aisleBack = w < h ? 2.2 : 1.75;
        camera.updateProjectionMatrix();
    };
    /* Draw nothing while the ride is scrolled off screen */
    let onScreen = true;
    const seen = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; });
    seen.observe(canvas);
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    /* Dynamic resolution, as games do: if frames start taking too long, draw fewer pixels; when there
       is headroom again, step back up. Measured once a second. */
    /* Sharp by default: the screen's own pixel density (up to 2x). Only a device that is really
       struggling (under 30 fps for two seconds running) draws fewer pixels, and never below 1x on a
       sharp screen, or 0.75x otherwise. */
    /* Phones get a lower ceiling (their screens are small and their GPUs share a battery) */
    const maxRatio = Math.min(window.devicePixelRatio, touchDevice ? 1.5 : 2), minRatio = touchDevice ? 0.85 : Math.min(1, maxRatio) * (window.devicePixelRatio >= 1.5 ? 1 : 0.75);
    let slowSeconds = 0;
    let ratio = maxRatio, frames = 0, sampleStart = performance.now();
    const adapt = () => {
        frames++;
        const elapsed = performance.now() - sampleStart;
        if (elapsed < 1000) return;
        const fps = (frames * 1000) / elapsed;
        frames = 0; sampleStart = performance.now();
        slowSeconds = fps < 30 ? slowSeconds + 1 : 0;
        const next = slowSeconds >= 2 ? Math.max(minRatio, ratio - 0.25) : fps > 42 ? Math.min(maxRatio, ratio + 0.25) : ratio;
        if (slowSeconds >= 2) slowSeconds = 0;
        if (Math.abs(next - ratio) > 0.01) { ratio = next; renderer.setPixelRatio(ratio); resize(); }
    };
    const lastSpot = new THREE.Vector2(3.9, 6.5), scratch = new THREE.Vector3();
    /* ── Game mode: the player walks the bus freely ── */
    let exploring = false, talkingTo: Talker | null = null, mouth = false, near: Talker | null = null, driverMet = false;
    const player = new THREE.Vector2(0, aisleZ(0)), input = new THREE.Vector2(), met = new Set<number>();
    let walkTarget: THREE.Vector2 | null = null;
    const AISLE_END = 3.3 - DOORZ, REAR_LIMIT = REAR + 0.55 - DOORZ, FRONT_LIMIT = 4.75 - DOORZ;
    /* Where you can stand: the aisle between the seats, widening into the area by the door and driver */
    const canStand = (x: number, z: number) =>
        z >= REAR_LIMIT && z <= FRONT_LIMIT && (z >= AISLE_END ? x >= -0.05 && x <= 0.95 : Math.abs(x) <= 0.18);
    /* The nearest standable spot to a point (for click-to-walk targets) */
    const walkable = (v: THREE.Vector2) => {
        v.y = THREE.MathUtils.clamp(v.y, REAR_LIMIT, FRONT_LIMIT);
        v.x = v.y >= AISLE_END ? THREE.MathUtils.clamp(v.x, -0.05, 0.95) : THREE.MathUtils.clamp(v.x, -0.18, 0.18);
        return v;
    };
    /* Move with collision, one axis at a time, so you slide along seats instead of stopping dead */
    const stepPlayer = (dx: number, dz: number) => {
        if (canStand(player.x + dx, player.y)) player.x += dx;
        if (canStand(player.x, player.y + dz)) player.y += dz;
        else if (dz !== 0) {   // blocked going along the bus: ease towards the aisle so you can get through
            const toAisle = THREE.MathUtils.clamp(-player.x, -Math.abs(dz), Math.abs(dz));
            if (canStand(player.x + toAisle, player.y)) player.x += toAisle;
        }
    };
    let explored = false, running = false, camYaw = 0, camYawTarget = 0, jumpAt = -10;
    const seatOf = (i: number) => new THREE.Vector2(passengers[i].side * 0.76, rowZ(passengers[i].row) - 0.1 - DOORZ);
    const DRIVER_SPOT = new THREE.Vector2(DX, DZ - 0.04 - DOORZ);
    const spotFor = (t: Talker) => t === 'driver' ? DRIVER_SPOT : seatOf(t);
    /* Where to stand to talk to someone: in the aisle level with their knees, or beside the driver */
    const standFor = (t: Talker) => t === 'driver' ? new THREE.Vector2(0.25, DRIVER_SPOT.y - 0.05) : walkable(new THREE.Vector2(0, seatOf(t).y + 0.42));
    const puffs = Array.from({ length: 8 }, () => {
        const puff = new THREE.Sprite(new THREE.SpriteMaterial({ map: halo, color: '#eef4ff', transparent: true, depthWrite: false, opacity: 0 }));
        puff.visible = false;
        puff.userData = { born: -10, drift: new THREE.Vector3() };
        scene.add(puff);
        return puff;
    });
    let puffNext = 0;
    let riderStride = 0, riderPhase = 0, riderYaw = Math.PI;
    /* A springy "pop" for speech bubbles: overshoots a little, then settles */
    const popIn = (k: number) => { const t = THREE.MathUtils.clamp(k, 0, 1) - 1; return 1 + 2.2 * t * t * t + 1.2 * t * t; };
    const clock = new THREE.Clock();
    let frame = 0, time = 0;
    const tick = () => {
        frame = requestAnimationFrame(tick);
        const dt = Math.min(clock.getDelta(), 0.05);
        if (!onScreen) return;
        time += dt;

        /* The story: where the stop is, and so how far the street moves past the bus this frame.
           In the aisle the bus is out on the road, so the street runs past at cruising speed. */
        const ease = 1 - Math.exp(-dt * 3.4);
        const cruising = progress >= A || exploring;
        story += ((cruising ? 1 : progress / A) - story) * ease;
        const before = ahead;
        ahead += (stopAhead(story) - ahead) * ease;
        const shift = cruising && ahead < -40 ? -SPEED * dt : ahead - before;   // negative: the bus moves forward
        const wrapZ = (o: THREE.Object3D) => { if (o.position.z < -SPANZ / 2) o.position.z += SPANZ; else if (o.position.z > SPANZ / 2) o.position.z -= SPANZ; };
        roadTexture.offset.y = (roadTexture.offset.y - shift / 10) % 1;
        for (const thing of moving) { thing.position.z += shift; wrapZ(thing); }
        for (const wheel of wheels) wheel.rotation.x -= shift / 0.5;
        for (const car of cars) { car.position.z += shift - 13 * dt; wrapZ(car); }
        stop.position.z = DOORZ + ahead;
        stop.visible = ahead > -35;
        if (stop.visible && (posterClock += dt) > 0.12) { posterClock = 0; drawPoster((time * 0.06) % 1); }
        (board.material as THREE.MeshBasicMaterial).map = arrivals[ahead > 45 ? 0 : ahead > 22 ? 1 : ahead > 6 ? 2 : ahead > 0.4 ? 3 : story < 0.8 ? 4 : 5];

        /* Doors open once the bus has stopped, and close as it leaves */
        const doorOpen = span(story, 0.33, 0.38) * (1 - span(story, 0.8, 0.85));
        for (const door of doors) door.leaf.rotation.y = door.open * doorOpen;

        /* The rider: walks up to the stop, waits watching for the bus, turns to the door, walks on,
           taps their card, heads into the aisle, and walks from row to row */
        /* The rider walks to the row the scroll has reached and stops there, one row at a time */
        rowEased += ((cruising ? Math.round(THREE.MathUtils.clamp((progress - A) / (1 - A), 0, 1) * (rows.length - 1)) : 0) - rowEased) * (1 - Math.exp(-dt * 2.2));
        let spot: THREE.Vector2, heading: number, y: number;
        const atRow = Math.abs(rowEased - Math.round(rowEased)) < 0.18;
        if (exploring) {
            /* Keys or a d-pad steer directly; a click sets a target to walk to. Nobody walks mid-conversation. */
            const move = input.clone();
            if (move.lengthSq() > 0) {
                walkTarget = null;
                /* keys and the d-pad are relative to where the camera looks */
                const c = Math.cos(camYaw), sn = Math.sin(camYaw);
                move.set(c * move.x + sn * move.y, -sn * move.x + c * move.y);
            } else if (walkTarget) {
                const d = walkTarget.clone().sub(player);
                if (d.length() < 0.05) walkTarget = null; else move.copy(d);
            }
            if (talkingTo !== null) move.set(0, 0);
            if (move.lengthSq() > 0) {
                move.normalize().multiplyScalar((running ? 2.8 : 1.5) * dt);
                if (walkTarget) move.clampLength(0, walkTarget.distanceTo(player));
                stepPlayer(move.x, move.y);
            }
            spot = player.clone();
            const face = talkingTo !== null ? spotFor(talkingTo).clone().sub(player) : move;
            heading = face.lengthSq() > 0.0001 ? Math.atan2(face.x, face.y) : riderYaw;
            y = FLOOR;
            /* Who is close enough to talk to */
            near = null;
            let best = 1.05;
            passengers.forEach((_, i) => { const d = seatOf(i).distanceTo(player); if (d < best) { best = d; near = i; } });
            if (DRIVER_SPOT.distanceTo(player) < Math.min(best, 1.15)) near = 'driver';
        }
        else if (cruising) { spot = new THREE.Vector2(0, aisleZ(rowEased)); heading = atRow ? 0 : Math.PI; y = FLOOR; }
        else if (story < 0.14) { const w = toStop(span(story, 0, 0.14)); spot = w.at; heading = Math.atan2(w.dir.x, w.dir.y); y = 0.42; }
        else if (story < 0.4) { spot = new THREE.Vector2(3.2, -0.3); heading = story < 0.36 ? Math.PI : THREE.MathUtils.lerp(Math.PI, Math.PI * 1.5, span(story, 0.36, 0.4)); y = 0.42; }
        else if (story < 0.6) { const k = span(story, 0.4, 0.6), w = toReader(k); spot = w.at; heading = Math.atan2(w.dir.x, w.dir.y); y = k > 0.55 ? FLOOR : 0.42 + (FLOOR - 0.42) * span(k, 0.4, 0.55); }
        else if (story < 0.8) { spot = new THREE.Vector2(0.42, 0.08); heading = Math.PI * 1.5; y = FLOOR; }
        else { const k = span(story, 0.8, 0.95), w = toAisle(k); spot = w.at; heading = k < 1 ? Math.atan2(w.dir.x, w.dir.y) : 0; y = FLOOR; }
        const onBoard = cruising || story >= 0.6;
        const moved = spot.distanceTo(lastSpot);
        lastSpot.copy(spot);
        riderStride += (THREE.MathUtils.clamp(moved / Math.max(dt, 1e-3) / 1.1, 0, 1.25) - riderStride) * (1 - Math.exp(-dt * 8));
        riderPhase += moved * (moved / Math.max(dt, 1e-3) > 2 ? 4.2 : 5.5);   // longer strides when running
        let turn = heading - riderYaw;
        turn = Math.atan2(Math.sin(turn), Math.cos(turn));
        riderYaw += turn * (1 - Math.exp(-dt * 9));
        rider.rotation.set(0.07 * riderStride, riderYaw, 0, 'YXZ');   // leans into the walk
        const air = exploring ? Math.max(0, Math.sin(Math.min(1, (time - jumpAt) / 0.55) * Math.PI)) * 0.32 : 0;   // a hop
        rider.position.set(spot.x, y + air + Math.abs(Math.sin(riderPhase)) * 0.028 * riderStride, DOORZ + spot.y + (onBoard ? 0 : ahead));
        const tap = span(story, 0.62, 0.66) * (1 - span(story, 0.7, 0.74));
        const waiting = cruising ? 0 : span(story, 0.13, 0.17) * (1 - span(story, 0.33, 0.37));
        pose(riderChar, { walk: riderPhase, stride: riderStride, reach: cruising ? 0 : tap, cold: waiting, time });
        if (waiting > 0.5) riderChar.legs[Math.floor(time * 1.6) % 2].upper.rotation.x = -Math.max(0, Math.sin(time * 10)) * 0.12;   // stamping feet in the cold
        (reader.material as THREE.MeshBasicMaterial).color.set(tap > 0.6 || (story > 0.66 && story < 0.8) ? '#3ddc97' : '#7fb4ff');
        riderChar.setFace((time % 3.3) < 0.13 ? 'blink' : 'smile');

        /* The driver turns and waves as the rider steps on, and says hello */
        driverGreet += ((exploring && talkingTo === 'driver' ? 1 : 0) - driverGreet) * (1 - Math.exp(-dt * 6));
        const greet = exploring ? driverGreet : cruising ? 0 : span(story, 0.6, 0.66) * (1 - span(story, 0.8, 0.86));
        pose(driverChar, { sit: 1, drive: 1, wave: greet, waveArm: 1, time });
        driverChar.setFace(greet > 0.5 && (!exploring || mouth) ? (Math.sin(time * 14) > 0 ? 'talk' : 'smile') : (time % 4.1) < 0.13 ? 'blink' : 'smile');
        hello.visible = greet > 0.05 && !exploring;
        driverMarker.visible = exploring && talkingTo !== 'driver';
        (driverMarker.material as THREE.SpriteMaterial).map = driverMet ? markDone : markNew;
        driverMarker.position.y = 2.08 + Math.sin(time * 3) * 0.03;
        hello.scale.set(0.62, 0.33, 1).multiplyScalar(popIn(greet));

        /* Passengers: idle until the rider reaches their row, then they look up, wave and talk */
        const arrived = cruising && atRow;
        const talker = Math.floor(time / 2.4) % 2;
        const eye = new THREE.Vector3();
        camera.getWorldPosition(eye);
        const cameraInBus = !hull.visible;
        for (const p of passengers) {
            /* Level of detail: far-off passengers lose outlines and faces; ones deep in a distant bus, or
               many rows ahead down the aisle, are not drawn at all */
            const distance = p.c.root.getWorldPosition(scratch).distanceTo(eye);
            const index = passengers.indexOf(p);
            p.c.root.visible = exploring ? distance < 9 : cameraInBus ? p.row <= Math.round(rowEased) + 4 : distance < 16;
            p.c.setDetail(distance < 6.5);
            const marker = markers[index];
            marker.visible = exploring && p.c.root.visible && talkingTo !== index && near !== index;
            (marker.material as THREE.SpriteMaterial).map = met.has(index) ? markDone : markNew;
            marker.position.y = 2.08 + Math.sin(time * 3 + index) * 0.03;
            if (!p.c.root.visible) continue;
            /* In game mode: people near the player look up; the one being talked to turns, waves, then talks */
            const closeBy = exploring ? seatOf(index).distanceTo(player) : 99;
            const target = exploring ? (talkingTo === index ? 1 : closeBy < 1.6 ? 0.45 : 0) : arrived && p.row === activeRow ? 1 : 0;
            if (target === 1 && p.act < 0.5 && !p.waving) { p.since = time; p.waving = true; }
            if (target < 1) p.waving = false;
            p.act += (target - p.act) * (1 - Math.exp(-dt * 6));
            const talking = exploring ? talkingTo === index && mouth : p.act > 0.5 && (p.side > 0 ? 1 : 0) === talker;
            const asleep = p.idle === 3 && p.act < 0.5;
            const hi = p.act * THREE.MathUtils.clamp(1 - (time - p.since - 0.8) / 0.6, 0, 1);   // a wave first…
            const aisleArm = p.side > 0 ? 0 : 1;
            pose(p.c, { sit: 1, phone: p.idle === 0 ? 1 - p.act : 0, wave: hi, waveArm: aisleArm, gesture: talking ? p.act * (1 - hi) : 0, gestureArm: aisleArm, time: time + p.offset });
            const idleYaw = p.idle === 1 ? p.side * 0.75 : 0;
            const idlePitch = p.idle === 0 ? 0.35 : p.idle === 3 ? 0.3 : 0;
            p.c.head.rotation.set(
                THREE.MathUtils.lerp(idlePitch, -0.12 + (talking ? 0 : Math.sin(time * 2.6 + p.offset) * 0.06), p.act),   // …then the listener nods along
                THREE.MathUtils.lerp(idleYaw + (p.idle === 2 ? Math.sin(time * 3 + p.offset) * 0.08 : 0), exploring ? THREE.MathUtils.clamp(Math.atan2(player.x - seatOf(index).x, player.y - seatOf(index).y), -1.2, 1.2) : -p.side * 0.5, p.act),
                THREE.MathUtils.lerp(p.idle === 3 ? 0.3 * p.side : p.idle === 2 ? Math.sin(time * 6 + p.offset) * 0.06 : 0, 0, p.act),
            );
            p.c.setFace(asleep ? 'sleep' : talking ? (Math.sin(time * 14 + p.offset) > 0 ? 'talk' : 'smile') : ((time + p.offset) % 3.7) < 0.13 ? 'blink' : 'smile');
            /* The name bubble: the guided tour shows it at each row; in game mode it labels whoever is in reach */
            const label = exploring ? (near === index && talkingTo === null ? 1 : 0) : p.act;
            p.label += (label - p.label) * (1 - Math.exp(-dt * 8));
            p.bubble.visible = p.label > 0.02;
            p.bubble.scale.set(0.62, 0.33, 1).multiplyScalar(popIn(p.label));
        }
        /* At a row, the rider looks at whoever is talking */
        if (exploring) riderChar.head.rotation.y = 0;
        else if (cruising) riderChar.head.rotation.y = THREE.MathUtils.lerp(riderChar.head.rotation.y, arrived ? (talker ? 0.55 : -0.55) : 0, 1 - Math.exp(-dt * 5));
        else riderChar.head.rotation.y = 0;

        /* People walking on the far pavement */
        for (const w of walkers) {
            w.c.root.position.z += shift + w.dir * 1.15 * dt;
            wrapZ(w.c.root);
            w.phase += 1.15 * dt * 5.5;
            pose(w.c, { walk: w.phase, stride: 1, time });
            w.c.root.position.y = 0.16 + Math.abs(Math.sin(w.phase)) * 0.028;
            w.c.root.rotation.set(0.06, w.dir > 0 ? 0 : Math.PI, 0, 'YXZ');
            w.c.setFace(((time + w.phase) % 3.1) < 0.13 ? 'blink' : 'smile');
        }
        bencher.setDetail(bencher.root.getWorldPosition(scratch).distanceTo(eye) < 9);
        pose(bencher, { sit: 1, phone: 1, time });
        bencher.head.rotation.x = 0.35;
        bencher.setFace((time % 2.9) < 0.13 ? 'blink' : 'smile');

        /* Breath in the cold: a soft puff from each person outdoors every couple of seconds */
        const outdoors = [...(onBoard ? [] : [riderChar]), bencher];
        outdoors.forEach((c, n) => {
            if (Math.floor((time + n * 0.9) / 2.1) !== Math.floor((time + n * 0.9 - dt) / 2.1)) {
                const puff = puffs[puffNext++ % puffs.length];
                c.head.getWorldPosition(puff.position);
                c.head.getWorldDirection(scratch);
                puff.position.addScaledVector(scratch, 0.16).y -= 0.06;
                puff.userData.born = time;
                puff.userData.drift = scratch.clone().multiplyScalar(0.25);
            }
        });
        for (const puff of puffs) {
            const age = time - puff.userData.born;
            puff.visible = age < 1.4;
            if (!puff.visible) continue;
            puff.position.addScaledVector(puff.userData.drift, dt).y += 0.12 * dt;
            puff.scale.setScalar(0.12 + age * 0.35);
            (puff.material as THREE.SpriteMaterial).opacity = 0.35 * (1 - age / 1.4);
        }

        /* The bus outline only makes sense from outside */
        hull.visible = !(Math.abs(camera.position.x) < WIDTH / 2 + 0.1 && camera.position.z < FRONT + 0.2 && camera.position.z > REAR - 0.2 && camera.position.y < CEILING + 0.3);

        snowCentre = camera.position.z;
        for (let i = 0; i < FLAKES; i++) {
            flakes[i * 3] += Math.sin(time * 1.3 + i) * 0.25 * dt;
            flakes[i * 3 + 1] -= (1.1 + (i % 7) * 0.12) * dt;
            flakes[i * 3 + 2] += shift * 0.85;
            const z = flakes[i * 3 + 2];
            if (z < snowCentre - SNOW_SPAN / 2) flakes[i * 3 + 2] += SNOW_SPAN; else if (z > snowCentre + SNOW_SPAN / 2) flakes[i * 3 + 2] -= SNOW_SPAN;
            const inside = Math.abs(flakes[i * 3]) < 1.7 && z < FRONT + 0.6 && z > REAR - 0.6;
            if (flakes[i * 3 + 1] < 0 || inside) outside(i);
        }
        snowGeometry.attributes.position.needsUpdate = true;
        beaconMaterial.color.set(Math.sin(time * 3) > 0.55 ? '#ff2a1a' : '#3a0805');   // aviation lights blink
        for (const texture of marquees) texture.offset.x = (texture.offset.x + texture.userData.speed * dt) % 1;
        (headsign.material as THREE.MeshBasicMaterial).map = headsigns[Math.floor(time / 3.5) % 2];
        for (const { row, sign } of zoneSigns) sign.visible = row === zoneSigns.find(z => z.row > activeRow)?.row;

        /* Neon: letters light up one by one, then one flickers every few seconds */
        neonTime += dt;
        let neonChanged = false;
        const lightUpTo = Math.min(NEON.length, Math.floor(neonTime / 0.11));
        for (let i = 0; i < lightUpTo; i++) if (!lit[i] && i !== flickering) { lit[i] = true; neonChanged = true; }
        if (flickering >= 0 && neonTime > flickerUntil) { lit[flickering] = true; flickering = -1; neonChanged = true; }
        if (lightUpTo === NEON.length && neonTime > nextFlicker) {
            flickering = Math.floor(Math.random() * NEON.length);
            if (NEON[flickering] === ' ') flickering = 0;
            lit[flickering] = false;
            flickerUntil = neonTime + 0.07 + Math.random() * 0.22;
            nextFlicker = neonTime + 2 + Math.random() * 5;
            neonChanged = true;
        }
        if (neonChanged) drawNeon();
        neon.position.z += (camera.position.z - 18 - neon.position.z) * ease * 0.5;   // keeps pace with the bus (and the camera)
        neon.position.y = 7 + Math.sin(time * 0.9) * 0.05;
        neonLight.position.set(-9, 4.5, neon.position.z);
        neonLight.intensity = 45 * (lit.filter(Boolean).length / NEON.length);
        for (const strap of straps) strap.rotation.z = Math.sin(time * 2.1 + strap.userData.phase) * 0.14;
        /* The driver glances at the mirrors now and then, and turns to greet the rider */
        driverChar.head.rotation.y = THREE.MathUtils.lerp(Math.sin(time * 0.45) * 0.34 * Math.max(0, Math.sin(time * 0.17)), 0.9, greet);

        /* The bus rides on its suspension, and the cabin lights flicker very slightly */
        bus.position.y = Math.sin(time * 5.1) * 0.006 + Math.sin(time * 1.7) * 0.01;
        bus.rotation.z = Math.sin(time * 1.3) * 0.004;
        steering.rotation.z = Math.sin(time * 0.8) * 0.18 * (1 - greet);
        cabinLights.forEach((light, i) => { light.intensity = 1.5 + Math.sin(time * 13 + i * 2.1) * 0.03; });
        /* One continuous camera move: ease toward where the scroll says it should be */
        camYaw += (camYawTarget - camYaw) * (1 - Math.exp(-dt * 8));
        aim(progress);
        pos.lerp(wantPos, ease);
        look.lerp(wantLook, ease);
        /* Until the rider is on board the camera belongs to the stop; then to the bus */
        offset.set(0, 0, DOORZ + (story < 0.6 && !exploring ? ahead : 0));
        camera.position.copy(pos).add(offset);
        camera.position.y += Math.sin(time * 6.3) * 0.004;
        camera.lookAt(look.x + offset.x, look.y + offset.y, look.z + offset.z);
        camera.rotation.z += Math.sin(time * 1.3) * 0.003;
        renderer.render(scene, camera);
        adapt();
    };
    tick();

    const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
    return {
        setProgress(t: number) { progress = THREE.MathUtils.clamp(t, 0, 1); },
        /* ── Game mode ── */
        setExploring(on: boolean) {
            exploring = on;
            talkingTo = null; walkTarget = null; input.set(0, 0);
            if (on) {
                story = 1; ahead = -45;
                if (!explored) { player.set(0, aisleZ(0)); explored = true; }   // coming back keeps your place
            }
        },
        setRun(on: boolean) { running = on; },
        jump() { if (time - jumpAt > 0.6) jumpAt = time; },
        /** Swing the camera round the player (radians), as when dragging */
        turnCamera(delta: number) { camYawTarget = THREE.MathUtils.clamp(camYawTarget + delta, -2.6, 2.6); },
        resetCamera() { camYawTarget = 0; },
        /** Direction from keys or a d-pad: x right, z toward the back of the bus (away from the camera) */
        setInput(x: number, z: number) { input.set(x, z); },
        walkTo(target: Talker) { walkTarget = standFor(target); },
        walkToFloor(x: number, z: number) { walkTarget = walkable(new THREE.Vector2(x, z)); },
        /** Turn to someone and talk; they face the player and talk while `setMouth(true)` */
        setTalking(target: Talker | null) { talkingTo = target; if (target === 'driver') driverMet = true; else if (target !== null) met.add(target); },
        setMouth(on: boolean) { mouth = on; },
        setMet(indices: number[], driver: boolean) { met.clear(); indices.forEach(i => met.add(i)); driverMet = driver; },
        isNearTarget() { return walkTarget === null; },
        state(): GameState {
            return {
                x: player.x, z: player.y, heading: riderYaw, near, camYaw,
                rear: REAR - DOORZ, front: FRONT - DOORZ,
                passengers: passengers.map((_, i) => { const v = seatOf(i); return { x: v.x, z: v.y }; }),
                driver: { x: DRIVER_SPOT.x, z: DRIVER_SPOT.y },
            };
        },
        /* What a click lands on in game mode: a person, or a spot on the floor to walk to */
        pickGame(x: number, y: number): GamePick {
            pointer.set((x / canvas.clientWidth) * 2 - 1, -(y / canvas.clientHeight) * 2 + 1);
            ray.setFromCamera(pointer, camera);
            const hit = ray.intersectObjects([...passengers.map(p => p.c.root), driverChar.root], true)[0];
            if (hit) {
                for (let o: THREE.Object3D | null = hit.object; o; o = o.parent) {
                    if (o === driverChar.root) return { kind: 'driver' };
                    const index = passengers.findIndex(p => p.c.root === o);
                    if (index >= 0) return { kind: 'passenger', index };
                }
            }
            const floor = ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -FLOOR), new THREE.Vector3());
            return floor ? { kind: 'floor', x: floor.x, z: floor.z - DOORZ } : null;
        },
        setActiveRow(row: number) { activeRow = row; },
        /* What is under a click, given its position inside the canvas */
        pick(x: number, y: number): Pick {
            pointer.set((x / canvas.clientWidth) * 2 - 1, -(y / canvas.clientHeight) * 2 + 1);
            ray.setFromCamera(pointer, camera);
            const hit = ray.intersectObjects([...passengers.map(p => p.c.root), ...driverTargets], true)[0];
            if (!hit) return null;
            for (let o: THREE.Object3D | null = hit.object; o; o = o.parent) if (typeof o.userData.row === 'number') return { kind: 'row', row: o.userData.row };
            return { kind: 'driver' };
        },
        dispose() {
            cancelAnimationFrame(frame);
            observer.disconnect();
            scene.traverse(object => {
                const mesh = object as THREE.Mesh;
                mesh.geometry?.dispose();
                for (const material of ([] as THREE.Material[]).concat(mesh.material ?? [])) {
                    (material as THREE.MeshBasicMaterial).map?.dispose();
                    material.dispose();
                }
            });
            headsigns.forEach(t => t.dispose());
            arrivals.forEach(t => t.dispose());
            pmrem.dispose();
            seen.disconnect();
            renderer.dispose();
        },
    };
}
