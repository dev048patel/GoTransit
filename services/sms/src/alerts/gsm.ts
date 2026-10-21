/**
 * Texts are billed per segment. In the GSM-7 alphabet a single segment holds 160 characters; one
 * character outside it (an arrow, a curly quote, an emoji) switches the whole text to UCS-2, where a
 * segment holds 70. So every outgoing text goes through toGsm() first.
 */
const BASIC = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const EXTENDED = '^{}\\[~]|€';   // allowed, but each takes two characters' room
const basic = new Set(BASIC), extended = new Set(EXTENDED);

const REPLACE: Record<string, string> = {
    '‘': "'", '’': "'", '‚': "'", '′': "'", '“': '"', '”': '"', '„': '"', '″': '"',
    '–': '-', '—': '-', '−': '-', '‐': '-', '…': '...', '→': 'to', '←': 'from', '•': '-', '·': '-',
    ' ': ' ', ' ': ' ', ' ': ' ', '\t': ' ',
};

export const isGsm = (ch: string) => basic.has(ch) || extended.has(ch);

/** The same text using only GSM-7 characters: look-alikes swapped, accents dropped, anything else removed */
export function toGsm(text: string): string {
    let out = '';
    for (const ch of text) {
        if (isGsm(ch)) { out += ch; continue; }
        if (REPLACE[ch] !== undefined) { out += REPLACE[ch]; continue; }
        const plain = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
        if (plain && [...plain].every(isGsm)) out += plain;
    }
    return out.replace(/ {2,}/g, ' ').trim();
}

/** Characters of room the text takes in GSM-7 (extended ones count twice) */
export function gsmLength(text: string): number {
    let n = 0;
    for (const ch of text) n += extended.has(ch) ? 2 : 1;
    return n;
}

/** How many segments Twilio will bill for this text */
export function segments(text: string): number {
    const chars = [...text];
    if (chars.every(isGsm)) {
        const n = gsmLength(text);
        return n <= 160 ? 1 : Math.ceil(n / 153);
    }
    return chars.length <= 70 ? 1 : Math.ceil(chars.length / 67);
}
