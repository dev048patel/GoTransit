/* The bus as a real 3D scene (three.js): a city bus driving through a city at night, lit by its
   own cabin lights and by street lamps sweeping past, with one camera that travels from outside,
   in through the front door, past the driver, and down the aisle to the back.

   Nothing here is a cartoon figure. Each thing the person built "rides" as a lit display resting on
   a seat. The page tells the scene how far the reader has scrolled; the scene moves the camera.
   All geometry is built in code, so there are no model files to download. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

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

export function createBusScene(canvas: HTMLCanvasElement, options: BusSceneOptions) {
    const { rows } = options;
    const REAR = rowZ(rows.length - 1) - 1.35;
    const length = FRONT - REAR, middle = (FRONT + REAR) / 2;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
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

    const camera = new THREE.PerspectiveCamera(50, 1, 0.08, 260);

    /* ── Materials ── */
    const standard = (color: THREE.ColorRepresentation, roughness: number, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
    const paint = new THREE.MeshPhysicalMaterial({ color: '#eef1f5', roughness: 0.35, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.12 });
    const band = new THREE.MeshPhysicalMaterial({ color: options.color, roughness: 0.35, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.12 });
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
    const fabric = new THREE.MeshStandardMaterial({ map: cloth, roughness: 0.96 });
    const flooring = panelTexture(256, 256, c => {
        c.fillStyle = '#232830'; c.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 2200; i++) { c.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.16})`; c.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
    });
    flooring.wrapS = flooring.wrapT = THREE.RepeatWrapping; flooring.repeat.set(3, 16);
    const deck = new THREE.MeshStandardMaterial({ map: flooring, roughness: 0.7 });
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
    const shell = standard('#2a303b', 0.55, 0.1);
    const yellow = standard('#f4b400', 0.38, 0.35);
    const steel = standard('#b8c0cc', 0.25, 0.9);
    const glass = new THREE.MeshPhysicalMaterial({ color: '#9fc0e6', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 2.2, side: THREE.DoubleSide, depthWrite: false });
    const glow = (color: THREE.ColorRepresentation) => new THREE.MeshBasicMaterial({ color, toneMapped: false });

    const bus = new THREE.Group();
    scene.add(bus);
    const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = bus) => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        parent.add(mesh);
        return mesh;
    };
    const box = (w: number, h: number, d: number, material: THREE.Material, x: number, y: number, z: number, parent?: THREE.Object3D) => add(new THREE.BoxGeometry(w, h, d), material, x, y, z, parent);
    const soft = (w: number, h: number, d: number, r: number, material: THREE.Material, x: number, y: number, z: number, parent?: THREE.Object3D) => add(new RoundedBoxGeometry(w, h, d, 3, r), material, x, y, z, parent);

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
        const decal = add(new THREE.PlaneGeometry(length * 0.62, 0.78), new THREE.MeshStandardMaterial({ map: livery, transparent: true, roughness: 0.4, depthWrite: false }), side * (WIDTH / 2 + 0.004), 0.93, middle - length * 0.1);
        decal.rotation.y = side * Math.PI / 2;
    }

    /* Doorway frame and step, with the two door leaves folded open */
    for (const [z, turn] of [[DOOR[0] + 0.06, 0.55], [DOOR[1] - 0.06, -0.55]]) {
        const leaf = box(0.03, 1.86, 0.56, glass, WIDTH / 2 - 0.3, FLOOR + 0.96, z);
        leaf.rotation.y = turn;
        const edge = box(0.045, 1.9, 0.05, trim, WIDTH / 2 - 0.54, FLOOR + 0.96, z + turn * 0.26);
        edge.rotation.y = turn;
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
    const signTexture = panelTexture(1024, 128, c => {
        c.fillStyle = '#05070a'; c.fillRect(0, 0, 1024, 128);
        c.fillStyle = '#ffb21e'; c.font = `700 78px ui-monospace, Menlo, monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(options.sign, 512, 68);
    });
    add(new THREE.PlaneGeometry(WIDTH - 0.5, 0.26), new THREE.MeshBasicMaterial({ map: signTexture, toneMapped: false }), 0, 2.5, FRONT + 0.065);
    soft(WIDTH + 0.06, 0.2, 0.34, 0.08, trim, 0, 0.38, FRONT - 0.02);                    // bumper
    const plate = panelTexture(256, 72, c => {
        c.fillStyle = '#f4f6f8'; c.fillRect(0, 0, 256, 72);
        c.fillStyle = '#12306b'; c.font = `800 44px ui-monospace, Menlo, monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('TR 2026', 128, 40);
    });
    add(new THREE.PlaneGeometry(0.44, 0.124), new THREE.MeshStandardMaterial({ map: plate, roughness: 0.5 }), 0, 0.4, FRONT + 0.155);
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
        const lamp = new THREE.SpotLight('#ffe9b0', 60, 34, 0.5, 0.6, 1.4);
        lamp.position.set(side * 0.86, 0.75, FRONT + 0.1);
        lamp.target.position.set(side * 1.1, 0, FRONT + 16);
        bus.add(lamp, lamp.target);
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
        box(0.16, 0.03, length - 4.2, glow('#fff1d6'), side * 0.72, CEILING - 0.03, middle - 1.6);   // light strips
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
    /* Advert cards in the coving above the windows: what this person works with */
    let advert = 0;
    for (let z = FRONT - 3.7; z > REAR + 0.9 && advert < options.adverts.length; z -= 1.02) {
        for (const side of [-1, 1]) {
            const text = options.adverts[advert++];
            if (!text) break;
            const texture = panelTexture(640, 200, c => {
                c.fillStyle = '#f8fafc'; c.fillRect(0, 0, 640, 200);
                c.fillStyle = options.color; c.fillRect(0, 0, 18, 200);
                c.fillStyle = '#64748b'; c.font = `700 24px ${FONT}`; c.textBaseline = 'top';
                c.fillText('WORKS WITH', 48, 36);
                c.fillStyle = '#0f172a'; c.font = `800 62px ${FONT}`;
                wrap(c, text, 48, 78, 560, 66, 1);
            });
            const card = add(new THREE.PlaneGeometry(0.86, 0.27), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55 }), side * (WIDTH / 2 - 0.1), 2.41, z);
            card.rotation.y = -side * Math.PI / 2;
            card.rotation.x = 0;
            card.rotateX(0.32);
        }
    }

    const cabinLights: THREE.PointLight[] = [];
    /* The cabin lights stop short of the cab, which is lit only by the dashboard and the street */
    for (let z = FRONT - 3.4; z > REAR + 0.8; z -= 2.6) {
        const light = new THREE.PointLight('#ffe8c9', 3.6, 7, 1.7);
        light.position.set(0, CEILING - 0.25, z);
        bus.add(light);
        cabinLights.push(light);
    }

    /* Seats, and above each one a fold-down ceiling display carrying what that seat stands for */
    const seatBase = new RoundedBoxGeometry(0.98, 0.14, 0.46, 3, 0.05), seatBack = new RoundedBoxGeometry(0.98, 0.66, 0.1, 3, 0.05);
    const bezel = new RoundedBoxGeometry(0.72, 0.47, 0.035, 3, 0.03), face = new THREE.PlaneGeometry(0.68, 0.43);
    const displays: { row: number; mesh: THREE.Mesh; group: THREE.Group; rods: THREE.Mesh[] }[] = [];
    rows.forEach((row, r) => {
        const z = rowZ(r);
        for (const [k, side] of [-1, 1].entries()) {
            const x = side * 0.76;
            add(seatBase, fabric, x, FLOOR + 0.46, z);
            const back = add(seatBack, fabric, x, FLOOR + 0.84, z - 0.25);
            back.rotation.x = -0.14;
            box(0.98, 0.04, 0.42, shell, x, FLOOR + 0.37, z);
            box(0.06, 0.38, 0.06, steel, x, FLOOR + 0.19, z);
            const grab = add(new THREE.TorusGeometry(0.07, 0.014, 8, 20, Math.PI), yellow, x - side * 0.42, FLOOR + 1.18, z - 0.3);
            grab.rotation.y = Math.PI / 2;

            const title = row.seats[k];
            if (!title) continue;
            const texture = panelTexture(680, 430, c => {
                const g = c.createLinearGradient(0, 0, 0, 430);
                g.addColorStop(0, '#111a2c'); g.addColorStop(1, '#070b14');
                c.fillStyle = g; c.fillRect(0, 0, 680, 430);
                c.fillStyle = options.color; c.fillRect(0, 0, 680, 14);
                c.fillStyle = '#8ea3c4'; c.font = `700 26px ${FONT}`; c.textBaseline = 'top';
                c.fillText(row.kicker.toUpperCase(), 44, 52);
                c.fillStyle = '#ffffff'; c.font = `800 62px ${FONT}`;
                wrap(c, title, 44, 110, 592, 74, 3);
                c.fillStyle = '#ffb21e'; c.font = `700 24px ui-monospace, Menlo, monospace`;
                c.fillText(`SEAT ${String(r * 2 + k + 1).padStart(2, '0')}`, 44, 366);
            });
            const group = new THREE.Group();
            group.position.set(x, STOWED, z - 0.1);
            group.rotation.x = -Math.PI / 2;
            const rods = [-0.24, 0.24].map(dx => {
                const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 8), steel);
                rod.position.set(dx, 0.4, -0.02);
                rod.visible = false;
                group.add(rod);
                return rod;
            });
            const faceMaterial = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, color: new THREE.Color(1.25, 1.25, 1.25) });
            group.add(new THREE.Mesh(bezel, trim));
            const screen = new THREE.Mesh(face, faceMaterial);
            screen.position.z = 0.019;
            group.add(screen);
            bus.add(group);
            displays.push({ row: r, mesh: screen, group, rods });
        }
        if (r % 2 === 0) for (const side of [-1, 1]) {
            add(new THREE.CylinderGeometry(0.02, 0.02, CEILING - FLOOR, 10), yellow, side * 0.3, (CEILING + FLOOR) / 2, z - 0.48);
            box(0.034, 0.05, 0.02, glow('#d92d20'), side * 0.3, FLOOR + 1.2, z - 0.458);   // stop button
        }
        if (row.zone) {
            const label = row.zone.toUpperCase();
            const texture = panelTexture(1024, 150, c => {
                c.fillStyle = '#05070a'; c.fillRect(0, 0, 1024, 150);
                c.fillStyle = '#ffb21e'; c.font = `700 64px ui-monospace, Menlo, monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
                c.fillText(label, 512, 80);
            });
            box(1.5, 0.24, 0.05, trim, 0, CEILING - 0.2, z + 0.55);
            add(new THREE.PlaneGeometry(1.44, 0.2), new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }), 0, CEILING - 0.2, z + 0.58);
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
    const gauges = add(new THREE.PlaneGeometry(0.5, 0.12), glow('#3ddc97'), DX, FLOOR + 0.93, FRONT - 0.56, cab);
    gauges.rotation.set(-0.5, Math.PI, 0);
    const steering = add(new THREE.TorusGeometry(0.21, 0.022, 10, 36), trim, DX, FLOOR + 1.02, DZ + 0.42, cab);
    steering.rotation.x = -1.05;
    box(0.04, 1.1, 0.9, glass, DX + 0.42, FLOOR + 1.35, DZ - 0.25, cab);   // screen behind the cab
    /* The driver: a proportioned person in a bus operator's uniform — hair, ears, collar, sleeves, hands
       on the wheel, legs to the pedals — who glances at the mirrors as they drive */
    const shirt = standard('#6f8fbd', 0.85), trousers = standard('#10161f', 0.9), skin = standard('#a06e4b', 0.72), hair = standard('#120d0a', 0.6);
    const driver = new THREE.Group();
    driver.position.set(DX, FLOOR, DZ);
    cab.add(driver);
    const limb = (radius: number, len: number, material: THREE.Material, x: number, y: number, z: number, rx: number, rz = 0, parent: THREE.Object3D = driver) => {
        const mesh = add(new THREE.CapsuleGeometry(radius, len, 6, 12), material, x, y, z, parent);
        mesh.rotation.set(rx, 0, rz);
        return mesh;
    };
    soft(0.36, 0.2, 0.3, 0.08, trousers, 0, 0.66, -0.06, driver);                       // hips
    const torso = soft(0.4, 0.52, 0.23, 0.09, shirt, 0, 0.99, -0.11, driver);
    torso.rotation.x = -0.07;
    limb(0.085, 0.27, shirt, 0, 1.225, -0.13, 0, Math.PI / 2);                           // shoulders
    soft(0.2, 0.05, 0.16, 0.02, standard('#e9eef5', 0.8), 0, 1.262, -0.11, driver);     // collar
    add(new THREE.CylinderGeometry(0.047, 0.055, 0.09, 14), skin, 0, 1.31, -0.11, driver);
    const head = new THREE.Group();
    head.position.set(0, 1.44, -0.1);
    driver.add(head);
    const skull = add(new THREE.SphereGeometry(0.103, 28, 22), skin, 0, 0, 0, head);
    skull.scale.set(0.9, 1.1, 1);
    const scalp = add(new THREE.SphereGeometry(0.108, 28, 22, 0, Math.PI * 2, 0, Math.PI * 0.55), hair, 0, 0.012, -0.014, head);
    scalp.scale.set(0.93, 1.1, 1.04);
    scalp.rotation.x = -0.62;   // tipped toward the back of the head
    for (const side of [-1, 1]) add(new THREE.SphereGeometry(0.024, 10, 8), skin, side * 0.094, -0.008, 0, head).scale.set(0.5, 1, 0.8);
    add(new THREE.ConeGeometry(0.017, 0.045, 8), skin, 0, -0.012, 0.1, head).rotation.x = Math.PI / 2;                     // nose
    for (const side of [-1, 1]) {
        limb(0.052, 0.22, shirt, side * 0.245, 1.1, -0.02, -0.6, side * -0.08);          // upper arm, in a short sleeve
        limb(0.04, 0.27, skin, side * 0.2, 1.0, 0.23, -1.36, side * -0.2);                // forearm
        add(new THREE.SphereGeometry(0.046, 14, 12), skin, side * 0.16, 1.035, 0.4, driver).scale.set(1, 0.8, 1.15);   // hand on the wheel
        limb(0.075, 0.3, trousers, side * 0.1, 0.64, 0.16, Math.PI / 2);                 // thigh
        limb(0.06, 0.34, trousers, side * 0.1, 0.4, 0.42, 0.42);                          // shin
        soft(0.1, 0.07, 0.24, 0.03, trim, side * 0.1, 0.2, 0.56, driver);                 // shoe on the pedal
    }
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
    const operatorCard = add(new THREE.PlaneGeometry(0.5, 0.275), new THREE.MeshBasicMaterial({ map: operatorTexture, toneMapped: false }), 0.42, CEILING - 0.5, FRONT - 0.12, cab);
    operatorCard.rotation.y = Math.PI;
    const driverTargets: THREE.Object3D[] = [torso, skull, operatorCard, driverBack, steering];

    /* End of the line */
    const endTexture = panelTexture(1024, 150, c => {
        c.fillStyle = '#05070a'; c.fillRect(0, 0, 1024, 150);
        c.fillStyle = '#ffb21e'; c.font = `700 64px ui-monospace, Menlo, monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('END OF THE LINE', 512, 80);
    });
    add(new THREE.PlaneGeometry(1.44, 0.2), new THREE.MeshBasicMaterial({ map: endTexture, toneMapped: false }), 0, 1.25, REAR + 0.06);

    /* ── The city going past ── */
    const world = new THREE.Group();
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
    const road = new THREE.Mesh(new THREE.PlaneGeometry(13, 300), new THREE.MeshStandardMaterial({ map: roadTexture, roughness: 0.5, metalness: 0.25 }));
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
    /* Buildings with lit windows, recycled from behind to ahead as they pass */
    const moving: THREE.Object3D[] = [];
    const windowsTexture = () => panelTexture(128, 256, c => {
        c.fillStyle = '#0a0e17'; c.fillRect(0, 0, 128, 256);
        for (let y = 8; y < 250; y += 18) for (let x = 8; x < 120; x += 16) {
            if (Math.random() < 0.42) { c.fillStyle = Math.random() < 0.75 ? '#ffd68a' : '#a9d0ff'; c.globalAlpha = 0.45 + Math.random() * 0.55; c.fillRect(x, y, 9, 11); }
        }
        c.globalAlpha = 1;
    });
    const facades = [windowsTexture(), windowsTexture(), windowsTexture()];
    const SPANZ = 220;
    for (let i = 0; i < 44; i++) {
        const side = i % 2 ? 1 : -1, w = 6 + Math.random() * 7, h = 7 + Math.random() * 24, d = 7 + Math.random() * 8;
        const map = facades[i % 3].clone();
        map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(Math.max(1, Math.round(d / 7)), Math.max(1, Math.round(h / 12))); map.needsUpdate = true;
        const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color: '#0b0f18', roughness: 0.9, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.9 }));
        building.position.set(side * (12 + w / 2 + Math.random() * 5), h / 2, -SPANZ / 2 + (i / 44) * SPANZ + Math.random() * 3);
        world.add(building);
        moving.push(building);
    }
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
    const sweep = [new THREE.PointLight('#ffb66b', 0, 20, 1.6), new THREE.PointLight('#ffb66b', 0, 20, 1.6)];
    scene.add(...sweep);

    /* Snow, streaming past the bus (never inside it). It is a Regina winter, after all */
    const FLAKES = 1700, SNOW_SPAN = 70;
    const flakes = new Float32Array(FLAKES * 3);
    const outside = (i: number, ahead: boolean) => {
        let x = (Math.random() - 0.5) * 34;
        const z = ahead ? middle + SNOW_SPAN / 2 : middle + (Math.random() - 0.5) * SNOW_SPAN;
        if (Math.abs(x) < 1.7 && z < FRONT + 0.6) x = Math.sign(x || 1) * (1.7 + Math.random() * 15);
        flakes.set([x, Math.random() * 13, z], i * 3);
    };
    for (let i = 0; i < FLAKES; i++) outside(i, false);
    const snowGeometry = new THREE.BufferGeometry();
    snowGeometry.setAttribute('position', new THREE.BufferAttribute(flakes, 3));
    const snow = new THREE.Points(snowGeometry, new THREE.PointsMaterial({ map: halo, color: '#eef4ff', size: 0.13, transparent: true, opacity: 0.85, depthWrite: false, sizeAttenuation: true }));
    snow.frustumCulled = false;
    scene.add(snow);

    /* ── The camera's journey: [share of scroll, where it stands, what it looks at] ── */
    const A = options.aisleStart;
    const far = Math.max(9, length * 0.9);
    const aisleStartZ = rowZ(0) + REACH;
    const keys: [number, THREE.Vector3, THREE.Vector3][] = ([
        [0.00, [far, 3.0, middle - length * 0.5], [0, 1.2, middle]],
        [0.22, [far * 0.85, 2.2, middle + length * 0.2], [0, 1.4, middle + 1]],
        [0.42, [far * 0.5, 1.9, FRONT + 5], [0, 1.5, FRONT - 2.5]],
        [0.58, [3.6, 1.72, 4.2], [0, 1.45, 4.2]],
        [0.68, [1.5, 1.72, 4.2], [-0.6, 1.4, 4.35]],
        [0.76, [0.5, 1.74, 3.95], [-0.62, 1.38, 4.9]],
        [0.86, [0.22, 1.82, 3.05], [-0.5, 1.32, 5.6]],
        [0.93, [0.12, 1.75, aisleStartZ - 0.1], [-2.4, 1.3, aisleStartZ - 0.8]],
        [1.00, [0, 1.72, aisleStartZ], [0, 1.45, aisleStartZ - 3.2]],
    ] as [number, number[], number[]][]).map(([t, p, l]) => [t * A, new THREE.Vector3(...p), new THREE.Vector3(...l)]);

    const wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3();
    const pos = keys[0][1].clone(), look = keys[0][2].clone();
    let progress = 0, activeRow = -1, reach = REACH;
    const aim = (t: number) => {
        if (t >= A) {
            const u = (t - A) / (1 - A), z = rowZ(u * (rows.length - 1)) + reach;
            wantPos.set(0, 1.72, z);
            wantLook.set(0, 1.45, z - 3.2);
            return;
        }
        let i = 0;
        while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
        const [t0, p0, l0] = keys[i], [t1, p1, l1] = keys[i + 1];
        const k = THREE.MathUtils.smoothstep(t, t0, t1);
        wantPos.lerpVectors(p0, p1, k);
        wantLook.lerpVectors(l0, l1, k);
    };

    const resize = () => {
        const w = canvas.clientWidth, h = canvas.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.fov = w < h ? 74 : 52;   // wider on a phone held upright, so both rows of seats still fit
        reach = w < h ? 2.9 : REACH;
        camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const clock = new THREE.Clock();
    let frame = 0, time = 0;
    const tick = () => {
        frame = requestAnimationFrame(tick);
        const dt = Math.min(clock.getDelta(), 0.05);
        time += dt;

        /* The street runs past whether or not anyone is scrolling */
        roadTexture.offset.y = (roadTexture.offset.y + (SPEED * dt) / 10) % 1;
        for (const thing of moving) { thing.position.z -= SPEED * dt; if (thing.position.z < -SPANZ / 2) thing.position.z += SPANZ; }
        for (const wheel of wheels) wheel.rotation.x += (SPEED / 0.5) * dt;
        const near = [...lamps].sort((a, b) => Math.abs(a.position.z - middle) - Math.abs(b.position.z - middle));
        sweep.forEach((light, i) => {
            const lamp = near[i];
            light.position.set(lamp.position.x * 0.72, 6.1, lamp.position.z);
            light.intensity = 130 * Math.max(0, 1 - Math.abs(lamp.position.z - middle) / 26);
        });
        for (let i = 0; i < FLAKES; i++) {
            flakes[i * 3] += Math.sin(time * 1.3 + i) * 0.25 * dt;
            flakes[i * 3 + 1] -= (1.1 + (i % 7) * 0.12) * dt;
            flakes[i * 3 + 2] -= SPEED * 0.85 * dt;
            const inside = Math.abs(flakes[i * 3]) < 1.7 && flakes[i * 3 + 2] < FRONT + 0.6;
            if (flakes[i * 3 + 1] < 0 || flakes[i * 3 + 2] < middle - SNOW_SPAN / 2 || inside) { outside(i, true); flakes[i * 3 + 1] = Math.random() * 13; }
        }
        snowGeometry.attributes.position.needsUpdate = true;
        for (const strap of straps) strap.rotation.z = Math.sin(time * 2.1 + strap.userData.phase) * 0.14;
        /* The driver steers, and glances at the mirrors now and then */
        head.rotation.y = Math.sin(time * 0.45) * 0.34 * Math.max(0, Math.sin(time * 0.17));
        driver.position.y = FLOOR + Math.sin(time * 5.1) * 0.004;

        /* The bus rides on its suspension, and the cabin lights flicker very slightly */
        bus.position.y = Math.sin(time * 5.1) * 0.006 + Math.sin(time * 1.7) * 0.01;
        bus.rotation.z = Math.sin(time * 1.3) * 0.004;
        steering.rotation.z = Math.sin(time * 0.8) * 0.18;
        cabinLights.forEach((light, i) => { light.intensity = 3.6 + Math.sin(time * 13 + i * 2.1) * 0.06; });
        /* Each row's displays fold down from the ceiling as the camera reaches it, and back up after */
        for (const display of displays) {
            const down = display.row === activeRow;
            const k = 1 - Math.exp(-dt * 5);
            display.group.position.y += ((down ? CEILING - 0.56 : STOWED) - display.group.position.y) * k;
            display.group.rotation.x += ((down ? 0.16 : -Math.PI / 2) - display.group.rotation.x) * k;
            for (const rod of display.rods) rod.visible = display.group.position.y < CEILING - 0.4;
        }

        /* One continuous camera move: ease toward where the scroll says it should be */
        aim(progress);
        const ease = 1 - Math.exp(-dt * 3.4);
        pos.lerp(wantPos, ease);
        look.lerp(wantLook, ease);
        camera.position.copy(pos);
        camera.position.y += Math.sin(time * 6.3) * 0.004;
        camera.lookAt(look);
        camera.rotation.z += Math.sin(time * 1.3) * 0.003;
        renderer.render(scene, camera);
    };
    tick();

    const ray = new THREE.Raycaster(), pointer = new THREE.Vector2();
    return {
        setProgress(t: number) { progress = THREE.MathUtils.clamp(t, 0, 1); },
        setActiveRow(row: number) { activeRow = row; },
        /* What is under a click, given its position inside the canvas */
        pick(x: number, y: number): Pick {
            pointer.set((x / canvas.clientWidth) * 2 - 1, -(y / canvas.clientHeight) * 2 + 1);
            ray.setFromCamera(pointer, camera);
            const hit = ray.intersectObjects([...displays.map(d => d.mesh), ...driverTargets], false)[0];
            if (!hit) return null;
            const display = displays.find(d => d.mesh === hit.object);
            return display ? { kind: 'row', row: display.row } : { kind: 'driver' };
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
            pmrem.dispose();
            renderer.dispose();
        },
    };
}
