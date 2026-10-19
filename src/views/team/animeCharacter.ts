/* Anime-style people for the bus ride, built in code like the rest of the scene.

   Shapes: a turned (lathe) torso with shoulders, chest, waist and hips; tapered limbs with rounded
   joints; hands with a thumb; two-tone shoes; a head with a jaw, ears and a small nose; layered hair.
   Clothes carry small details: a collar, a zip, a belt, cuffs.

   The look comes from cel shading (MeshToonMaterial with a three-step light ramp), a dark ink outline
   (a copy of each shape pushed outward along its normals, drawn back faces only), and a hand-drawn
   anime face painted onto a patch of the head that can smile, talk, blink or sleep.

   Speed: every rigid part of a person (body, head, each arm and leg segment) is merged into one mesh
   with per-vertex colours, so a person costs about a dozen draw calls instead of sixty.

   Faces at feet level y = 0, looking along +z. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface Look {
    skin: string;
    hair: string;
    hairStyle: 'short' | 'spiky' | 'long' | 'bun' | 'bob';
    eyes: string;
    top: string;
    bottom: string;
    shoes: string;
    hat?: { kind: 'toque' | 'cap'; color: string };
    scarf?: string;
    backpack?: string;
    glasses?: boolean;
}

export type Face = 'smile' | 'talk' | 'blink' | 'sleep';
export type Emote = 'think' | 'explain' | 'cheer' | 'point';

interface Limb { upper: THREE.Group; lower: THREE.Group }

export interface Character {
    root: THREE.Group;
    head: THREE.Group;
    body: THREE.Mesh;
    /** Show the ink outlines (worth hiding when the person is far away, to save draw calls) */
    setDetail(near: boolean): void;
    /** [left (-x), right (+x)] */
    arms: Limb[];
    legs: Limb[];
    setFace(face: Face): void;
}

/* ── Shared materials ── */
const ramp = (() => {
    const t = new THREE.DataTexture(new Uint8Array([90, 165, 255]), 3, 1, THREE.RedFormat);
    t.minFilter = t.magFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    t.needsUpdate = true;
    return t;
})();
export const toonRamp = ramp;
const toonCache = new Map<string, THREE.MeshToonMaterial>();
/** A cel-shaded material, shared per colour */
export function toon(color: THREE.ColorRepresentation) {
    const key = String(color);
    let m = toonCache.get(key);
    if (!m) { m = new THREE.MeshToonMaterial({ color, gradientMap: ramp }); toonCache.set(key, m); }
    return m;
}
const personMaterial = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp });

/** The ink line: back faces of the shape, pushed out along the normals by a fixed thickness */
export function inkMaterial(thickness: number) {
    return new THREE.ShaderMaterial({
        uniforms: { thickness: { value: thickness }, ink: { value: new THREE.Color('#1a1820') } },
        vertexShader: 'uniform float thickness; void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position + normal * thickness, 1.0); }',
        fragmentShader: 'uniform vec3 ink; void main() { gl_FragColor = vec4(ink, 1.0); }',
        side: THREE.BackSide,
    });
}
const ink = inkMaterial(0.0075);

/* ── The face, painted on a patch of the head ── */
const PHI = 1.4, THETA = 0.95;   // the patch's width and height, in radians of the head sphere
const faceCache = new Map<string, THREE.CanvasTexture>();
function faceTexture(eyes: string, face: Face) {
    const key = `${eyes}|${face}`;
    const cached = faceCache.get(key);
    if (cached) return cached;
    const S = 256, c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d')!;
    g.lineCap = 'round'; g.lineJoin = 'round';
    const line = '#2a1a22';
    for (const side of [-1, 1]) {
        const x = 128 + side * 46, y = 128;
        g.fillStyle = 'rgba(255,120,130,0.28)';   // blush
        g.beginPath(); g.ellipse(128 + side * 72, 172, 20, 9, 0, 0, Math.PI * 2); g.fill();
        if (face === 'blink' || face === 'sleep') {
            g.strokeStyle = line; g.lineWidth = 6;
            g.beginPath();
            if (face === 'blink') g.arc(x, y + 12, 18, Math.PI * 1.15, Math.PI * 1.85);
            else { g.moveTo(x - 18, y + 8); g.quadraticCurveTo(x, y + 15, x + 18, y + 8); }
            g.stroke();
        } else {
            g.fillStyle = '#ffffff';
            g.beginPath(); g.ellipse(x, y, 21, 27, 0, 0, Math.PI * 2); g.fill();
            const iris = g.createLinearGradient(0, y - 24, 0, y + 24);
            iris.addColorStop(0, '#120c18'); iris.addColorStop(0.5, eyes); iris.addColorStop(1, '#f2f2f2');
            g.fillStyle = iris;
            g.beginPath(); g.ellipse(x + side * 2, y + 3, 16, 22, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#120c18';
            g.beginPath(); g.ellipse(x + side * 2, y + 3, 7, 10, 0, 0, Math.PI * 2); g.fill();
            g.fillStyle = '#ffffff';
            g.beginPath(); g.ellipse(x - 6, y - 8, 6, 8, -0.4, 0, Math.PI * 2); g.fill();
            g.beginPath(); g.arc(x + 7, y + 13, 3, 0, Math.PI * 2); g.fill();
            g.strokeStyle = line; g.lineWidth = 7;
            g.beginPath(); g.ellipse(x, y + 2, 23, 28, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
            g.lineWidth = 5;
            g.beginPath(); g.moveTo(x + side * 21, y - 11); g.lineTo(x + side * 30, y - 18); g.stroke();
            g.strokeStyle = 'rgba(42,26,34,0.5)'; g.lineWidth = 2.5;   // lower lid
            g.beginPath(); g.arc(x, y - 4, 22, Math.PI * 0.3, Math.PI * 0.7); g.stroke();
        }
        g.strokeStyle = line; g.lineWidth = 4.5;   // brow
        g.beginPath(); g.moveTo(x - 17, y - 46); g.quadraticCurveTo(x, y - 54, x + 17, y - 47); g.stroke();
    }
    if (face === 'talk') {
        g.fillStyle = '#6e1f2b';
        g.beginPath(); g.ellipse(128, 206, 13, 10, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ff8a95';
        g.beginPath(); g.ellipse(128, 211, 7, 3.5, 0, 0, Math.PI * 2); g.fill();
    } else {
        g.strokeStyle = line; g.lineWidth = 4.5;
        g.beginPath(); g.arc(128, 192, 12, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    faceCache.set(key, t);
    return t;
}

/* ── Building merged, vertex-coloured parts ── */
type Piece = [THREE.BufferGeometry, string, THREE.Matrix4?];
const at = (x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) =>
    new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
function merge(pieces: Piece[]) {
    const geos = pieces.map(([geo, color, m]) => {
        if (m) geo.applyMatrix4(m);
        const c = new THREE.Color(color), n = geo.attributes.position.count, arr = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
        geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
        return geo;
    });
    const merged = mergeGeometries(geos)!;
    geos.forEach(g => g.dispose());
    return merged;
}
let inks: THREE.Mesh[] = [];   // collects the outlines of the person being built
function segment(pieces: Piece[], parent: THREE.Object3D) {
    const geo = merge(pieces);
    const mesh = new THREE.Mesh(geo, personMaterial);
    const outline = new THREE.Mesh(geo, ink);
    inks.push(outline);
    mesh.add(outline);
    parent.add(mesh);
    return mesh;
}
const sphere = (r: number, w = 18, h = 12) => new THREE.SphereGeometry(r, w, h);
const taper = (top: number, bottom: number, len: number) => new THREE.CylinderGeometry(top, bottom, len, 16, 1);
const darker = (hex: string, k = 0.75) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();

/* The torso as a turned profile: hips, waist, chest, shoulders, collar; then flattened front to back */
const TORSO: [number, number][] = [[0.001, 0.82], [0.13, 0.83], [0.16, 0.9], [0.15, 0.98], [0.14, 1.04], [0.152, 1.14], [0.172, 1.26], [0.182, 1.34], [0.15, 1.42], [0.07, 1.47], [0.001, 1.48]];

export function makeCharacter(look: Look): Character {
    const root = new THREE.Group();
    inks = [];
    const top = look.top, trim = darker(look.top, 0.6);

    /* Body: hips in the trouser colour, the rest in the top colour, with belt, collar and zip */
    const flat = () => at(0, 0, 0, 0, 0, 0, 1, 1, 0.66);
    const pieces: Piece[] = [
        [new THREE.LatheGeometry(TORSO.slice(0, 4).map(([r, y]) => new THREE.Vector2(r, y)), 20), look.bottom, flat()],
        [new THREE.LatheGeometry(TORSO.slice(3).map(([r, y]) => new THREE.Vector2(r, y)), 20), top, flat()],
        [new THREE.TorusGeometry(0.15, 0.014, 6, 24), '#2a2730', at(0, 0.975, 0, Math.PI / 2, 0, 0, 1, 0.66, 1)],
        [new THREE.TorusGeometry(0.07, 0.022, 8, 18), trim, at(0, 1.45, 0.005, Math.PI / 2 - 0.25, 0, 0)],
        [new THREE.BoxGeometry(0.012, 0.36, 0.01), trim, at(0, 1.2, 0.113, -0.05)],
        [taper(0.042, 0.048, 0.1), look.skin, at(0, 1.5, 0)],
    ];
    if (look.scarf) pieces.push([new THREE.TorusGeometry(0.068, 0.036, 10, 22), look.scarf, at(0, 1.47, 0.01, Math.PI / 2 - 0.15, 0, 0)], [sphere(0.035), look.scarf, at(0.05, 1.36, 0.11, 0, 0, 0, 0.9, 1.6, 0.6)]);
    if (look.backpack) pieces.push([sphere(0.5, 18, 12), look.backpack, at(0, 1.17, -0.15, 0, 0, 0, 0.28, 0.36, 0.14)], [sphere(0.5, 14, 10), darker(look.backpack), at(0, 1.08, -0.21, 0, 0, 0, 0.2, 0.14, 0.06)]);
    const body = segment(pieces, root);

    /* Head: a skull, a jaw that narrows to the chin, ears, a small nose, and hair */
    const head = new THREE.Group();
    head.position.set(0, 1.62, 0.01);
    root.add(head);
    const R = 0.118;
    const headPieces: Piece[] = [
        [sphere(R, 28, 20), look.skin, at(0, 0, 0, 0, 0, 0, 0.92, 1, 0.95)],
        [sphere(0.084, 20, 14), look.skin, at(0, -0.046, 0.012, 0, 0, 0, 0.9, 0.85, 1)],
        [sphere(0.012, 8, 6), look.skin, at(0, -0.018, R * 0.94, 0, 0, 0, 0.8, 1, 1)],
    ];
    for (const side of [-1, 1]) headPieces.push([sphere(0.026, 10, 8), look.skin, at(side * R * 0.9, -0.012, -0.005, 0, 0, 0, 0.45, 1, 0.75)]);
    /* Hair: a cap tipped back, a fringe of locks, side locks by the ears, then the style */
    headPieces.push([new THREE.SphereGeometry(R * 1.07, 26, 16, 0, Math.PI * 2, 0, Math.PI * 0.56), look.hair, at(0, 0.012, -0.012, -0.42, 0, 0, 0.95, 1, 1)]);
    for (let i = -3; i <= 3; i++) headPieces.push([new THREE.ConeGeometry(0.028, 0.1, 8), look.hair, at(i * 0.028, 0.07 - Math.abs(i) * 0.006, R * 0.86 - Math.abs(i) * 0.008, Math.PI - 0.55, 0, i * 0.12)]);
    for (const side of [-1, 1]) headPieces.push([new THREE.ConeGeometry(0.03, 0.13, 8), look.hair, at(side * R * 0.86, -0.02, 0.03, Math.PI, 0, side * -0.1)]);
    if (look.hairStyle === 'spiky' && !look.hat) {
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            headPieces.push([new THREE.ConeGeometry(0.04, 0.14, 8), look.hair, at(Math.sin(a) * 0.08, 0.09, Math.cos(a) * 0.06 - 0.03, Math.cos(a) * 0.9 - 0.2, 0, -Math.sin(a) * 0.9)]);
        }
    }
    if (look.hairStyle === 'long') headPieces.push([sphere(0.5, 18, 14), look.hair, at(0, -0.12, -0.07, 0, 0, 0, 0.25, 0.4, 0.13)]);
    if (look.hairStyle === 'bob') headPieces.push([new THREE.SphereGeometry(R * 1.1, 24, 14, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.32), look.hair, at(0, 0.01, -0.02, 0, 0, 0, 0.97, 1, 1)]);
    if (look.hairStyle === 'bun') headPieces.push([sphere(0.055, 14, 10), look.hair, at(0, 0.11, -0.1)]);
    if (look.glasses) for (const side of [-1, 1]) headPieces.push([new THREE.TorusGeometry(0.03, 0.005, 6, 18), '#1a1420', at(side * 0.044, 0, R * 0.96, 0, 0, 0, 1, 0.85, 1)]);
    if (look.hat?.kind === 'toque') {
        headPieces.push(
            [new THREE.SphereGeometry(R * 1.12, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.48), look.hat.color, at(0, 0.02, -0.01)],
            [new THREE.TorusGeometry(R * 1.08, 0.022, 8, 28), darker(look.hat.color, 0.8), at(0, 0.03, -0.01, Math.PI / 2, 0, 0)],
            [sphere(0.04, 12, 10), '#ffffff', at(0, 0.155, -0.01)],
        );
    }
    if (look.hat?.kind === 'cap') {
        headPieces.push(
            [new THREE.SphereGeometry(R * 1.1, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.45), look.hat.color, at(0, 0.03, 0)],
            [new THREE.CylinderGeometry(0.11, 0.11, 0.014, 20, 1, false, -Math.PI / 2, Math.PI), '#1a1820', at(0, 0.055, R * 0.6, 0.12, 0, 0, 1, 1, 0.9)],
            [sphere(0.018, 10, 8), '#f4b400', at(0, 0.11, R * 0.95)],
        );
    }
    segment(headPieces, head);
    const faceMat = new THREE.MeshBasicMaterial({ map: faceTexture(look.eyes, 'smile'), transparent: true, depthWrite: false });
    const facePatch = new THREE.Mesh(new THREE.SphereGeometry(R * 1.006, 24, 16, Math.PI / 2 - PHI / 2, PHI, Math.PI / 2 - 0.45, THETA), faceMat);
    facePatch.scale.set(0.92, 1, 0.95);
    facePatch.renderOrder = 2;
    head.add(facePatch);

    /* Arms: a rounded shoulder, a tapered upper arm, elbow, sleeve, cuff, hand and thumb */
    const arms = [-1, 1].map(side => {
        const upperArm = new THREE.Group();
        upperArm.position.set(side * 0.2, 1.36, 0);
        root.add(upperArm);
        segment([[sphere(0.062), top], [taper(0.054, 0.046, 0.27), top, at(0, -0.15, 0)]], upperArm);
        const lowerArm = new THREE.Group();
        lowerArm.position.y = -0.29;
        upperArm.add(lowerArm);
        segment([
            [sphere(0.047), top],
            [taper(0.045, 0.038, 0.22), top, at(0, -0.12, 0)],
            [new THREE.TorusGeometry(0.038, 0.01, 6, 16), trim, at(0, -0.23, 0, Math.PI / 2, 0, 0)],
            [sphere(0.045, 14, 10), look.skin, at(0, -0.285, 0.004, 0, 0, 0, 0.75, 1.15, 0.55)],
            [sphere(0.016, 8, 6), look.skin, at(-side * 0.03, -0.265, 0.02, 0, 0, 0, 0.8, 1.4, 0.8)],
        ], lowerArm);
        return { upper: upperArm, lower: lowerArm };
    });
    /* Legs: thigh, knee, shin, and a shoe with a pale sole and a lace panel */
    const legs = [-1, 1].map(side => {
        const thigh = new THREE.Group();
        thigh.position.set(side * 0.085, 0.9, 0);
        root.add(thigh);
        segment([[sphere(0.075), look.bottom], [taper(0.076, 0.058, 0.42), look.bottom, at(0, -0.21, 0)]], thigh);
        const shin = new THREE.Group();
        shin.position.y = -0.43;
        thigh.add(shin);
        segment([
            [sphere(0.058), look.bottom],
            [taper(0.056, 0.046, 0.36), look.bottom, at(0, -0.19, 0)],
            [sphere(0.5, 16, 10), look.shoes, at(0, -0.41, 0.04, 0, 0, 0, 0.11, 0.09, 0.25)],
            [sphere(0.5, 16, 8), '#f1f1ee', at(0, -0.445, 0.04, 0, 0, 0, 0.115, 0.03, 0.26)],
            [sphere(0.5, 10, 6), darker(look.shoes, 0.8), at(0, -0.38, 0.08, -0.35, 0, 0, 0.06, 0.03, 0.1)],
        ], shin);
        return { upper: thigh, lower: shin };
    });

    let current: Face = 'smile', near = true;
    const outlines = inks;
    return {
        root, head, body, arms, legs,
        setDetail(value: boolean) {
            if (value === near) return;
            near = value;
            for (const o of outlines) o.visible = value;
            facePatch.visible = value;
        },
        setFace(face: Face) {
            if (face === current) return;
            current = face;
            faceMat.map = faceTexture(look.eyes, face);
        },
    };
}

export interface Pose {
    /** Walk-cycle phase (radians) and how strongly to stride (0 = standing still) */
    walk?: number;
    stride?: number;
    /** 0 standing … 1 seated */
    sit?: number;
    /** Wave with the left (0) or right (1) arm, 0…1 */
    wave?: number;
    waveArm?: 0 | 1;
    /** Both hands up to look at a phone, 0…1 */
    phone?: number;
    /** Reach forward with the left arm (tapping a card), 0…1 */
    reach?: number;
    /** Hands forward on a steering wheel, 0…1 */
    drive?: number;
    /** Arms folded tight against the cold, 0…1 */
    cold?: number;
    /** Talking with one hand (left 0 / right 1), 0…1 */
    gesture?: number;
    gestureArm?: 0 | 1;
    /** A body-language moment while answering: hand to chin, both hands explaining, or a cheer */
    emote?: Emote | null;
    emoteAmount?: number;
    time: number;
}

const mix = THREE.MathUtils.lerp;
export function pose(c: Character, p: Pose) {
    const stride = p.stride ?? 0, walk = p.walk ?? 0, sit = p.sit ?? 0;
    c.legs.forEach((leg, i) => {
        const swing = Math.sin(walk + (i ? Math.PI : 0));
        leg.upper.rotation.x = mix(swing * 0.5 * stride, -Math.PI / 2, sit);
        leg.lower.rotation.x = mix(Math.max(0, -swing) * 0.75 * stride, Math.PI / 2 - 0.1, sit);
    });
    c.arms.forEach((arm, i) => {
        const swing = Math.sin(walk + (i ? 0 : Math.PI));
        /* Walking: the arm swinging forward bends more at the elbow, as real arms do */
        let x = swing * 0.42 * stride + mix(0, -0.35, sit), lowerX = mix(-0.15 - 0.45 * stride * (0.5 + 0.5 * swing), -0.6, sit), z = (i ? 1 : -1) * 0.07;
        if (p.cold) { x = mix(x, -0.5, p.cold); lowerX = mix(lowerX, -1.95, p.cold); z = mix(z, (i ? -1 : 1) * 0.32, p.cold); }
        if (p.phone) { x = mix(x, -0.55, p.phone); lowerX = mix(lowerX, -1.55, p.phone); z = mix(z, (i ? -1 : 1) * 0.28, p.phone); }
        if (p.drive) { x = mix(x, -1.05, p.drive); lowerX = mix(lowerX, -0.45, p.drive); z = mix(z, (i ? -1 : 1) * 0.12, p.drive); }
        if (i === 0 && p.reach) { x = mix(x, -1.35, p.reach); lowerX = mix(lowerX, -0.1, p.reach); }
        if (p.gesture && (p.gestureArm ?? 1) === i) {
            const side = i ? 1 : -1, t = p.time;
            x = mix(x, -0.7 + Math.sin(t * 2.3) * 0.15, p.gesture);
            lowerX = mix(lowerX, -1.25 + Math.sin(t * 3.7) * 0.3, p.gesture);
            z = mix(z, side * (0.22 + Math.sin(t * 1.9) * 0.08), p.gesture);
        }
        arm.upper.rotation.set(x, 0, z);
        arm.lower.rotation.set(lowerX, 0, 0);
        if (p.wave && (p.waveArm ?? 1) === i) {
            const side = i ? 1 : -1;
            arm.upper.rotation.set(mix(x, -0.2, p.wave), 0, mix(z, side * 2.5, p.wave));
            arm.lower.rotation.set(0, 0, mix(0, side * (0.25 + Math.sin(p.time * 10) * 0.45), p.wave));
        }
    });
    /* Emotes override the arms (and nudge the head) while they last */
    const k = p.emote ? (p.emoteAmount ?? 1) : 0;
    if (k > 0) {
        const t = p.time;
        c.arms.forEach((arm, i) => {
            const side = i ? 1 : -1;
            let ux = arm.upper.rotation.x, uz = arm.upper.rotation.z, lx = arm.lower.rotation.x, lz = arm.lower.rotation.z;
            if (p.emote === 'think' && i === 1) { ux = -1.05; uz = -0.42; lx = -2.25; lz = 0; }
            if (p.emote === 'explain') { ux = -0.6 + Math.sin(t * 3 + i * Math.PI) * 0.18; uz = side * 0.2; lx = -1.2 + Math.sin(t * 4.2 + i) * 0.25; lz = 0; }
            if (p.emote === 'cheer') { ux = -0.25; uz = side * (2.55 + Math.sin(t * 9 + i) * 0.12); lx = 0; lz = side * 0.3; }
            if (p.emote === 'point' && i === 1) { ux = -1.35; uz = 0.15; lx = -0.05; lz = 0; }
            arm.upper.rotation.set(mix(arm.upper.rotation.x, ux, k), 0, mix(arm.upper.rotation.z, uz, k));
            arm.lower.rotation.set(mix(arm.lower.rotation.x, lx, k), 0, mix(arm.lower.rotation.z, lz, k));
        });
    }

    /* A little life: breathing, a sway of the shoulders, and a bounce in each step */
    c.body.scale.y = 1 + Math.sin(p.time * 2.2) * 0.01;
    c.body.rotation.y = Math.sin(walk) * 0.06 * stride;
    /* Standing still, people shift their weight from foot to foot */
    c.body.rotation.z = Math.sin(p.time * 0.7) * 0.015 * (1 - stride) * (1 - sit);
    c.head.position.y = 1.62 + Math.abs(Math.sin(walk)) * 0.02 * stride * (1 - sit);
}
