/**
 * Writes the daily report workbook as Office Open XML directly (an .xlsx is a zip of XML parts).
 * Libraries like exceljs can't create native charts, and a hand-made template would be a binary to
 * maintain; this keeps the whole workbook, chart included, in reviewable code.
 *
 *   Tab 1 "Requests"          one row per alert sent, a totals row at the end
 *   Tab 2 "Requests by hour"  24 rows (A2:C25): hour, users, SMS sent; a column chart of users by hour
 */
import JSZip from 'jszip';

export type Cell = string | number | null;
export interface Sheet { name: string; header: string[]; rows: Cell[][]; widths?: number[]; boldLastRow?: boolean }
export interface HourRow { hour: number; users: number; sms: number }

const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const NS_PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
const NS_C = 'http://schemas.openxmlformats.org/drawingml/2006/chart';
const NS_A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
export const HOURLY_SHEET = 'Requests by hour';

/** Escapes text for XML and drops characters XML can't hold */
export const esc = (s: string) => s
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]!));

/** 0 → A, 25 → Z, 26 → AA */
export function colName(i: number): string {
    let s = '';
    for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    return s;
}

/** style 0 normal, 1 bold */
function cell(ref: string, v: Cell, style = 0): string {
    const s = style ? ` s="${style}"` : '';
    if (v === null || v === undefined || v === '') return `<c r="${ref}"${s}/>`;
    if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"${s}><v>${v}</v></c>`;
    return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`;
}

function sheetXml(sheet: Sheet, drawing: boolean): string {
    const rows = [sheet.header, ...sheet.rows];
    const body = rows.map((r, ri) => {
        const bold = ri === 0 || (sheet.boldLastRow && ri === rows.length - 1);
        return `<row r="${ri + 1}">${r.map((v, ci) => cell(`${colName(ci)}${ri + 1}`, v, bold ? 1 : 0)).join('')}</row>`;
    }).join('');
    const widths = sheet.widths ?? sheet.header.map(h => Math.max(10, h.length + 2));
    const cols = `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`;
    const frozen = '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>';
    return `${XML}<worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_R}">${frozen}${cols}<sheetData>${body}</sheetData>` +
        `<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>${drawing ? '<drawing r:id="rId1"/>' : ''}</worksheet>`;
}

const rich = (text: string, size: number, bold: boolean) =>
    `<c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${size}" b="${bold ? 1 : 0}"/></a:pPr><a:r><a:rPr lang="en-US" sz="${size}" b="${bold ? 1 : 0}"/><a:t>${esc(text)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/>`;

/** A column chart of column B (users) against column A (hour), rows 2–25 of the hourly sheet */
function chartXml(hours: HourRow[], title: string): string {
    const ref = (col: string) => `'${HOURLY_SHEET}'!$${col}$2:$${col}$${hours.length + 1}`;
    const cats = hours.map((h, i) => `<c:pt idx="${i}"><c:v>${hourLabel(h.hour)}</c:v></c:pt>`).join('');
    const vals = hours.map((h, i) => `<c:pt idx="${i}"><c:v>${h.users}</c:v></c:pt>`).join('');
    const max = Math.max(1, ...hours.map(h => h.users));
    return `${XML}<c:chartSpace xmlns:c="${NS_C}" xmlns:a="${NS_A}" xmlns:r="${NS_R}"><c:roundedCorners val="0"/><c:chart>` +
        `<c:title>${rich(title, 1400, true)}</c:title><c:autoTitleDeleted val="0"/><c:plotArea><c:layout/>` +
        `<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>` +
        `<c:ser><c:idx val="0"/><c:order val="0"/>` +
        `<c:tx><c:strRef><c:f>'${HOURLY_SHEET}'!$B$1</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>Users</c:v></c:pt></c:strCache></c:strRef></c:tx>` +
        `<c:spPr><a:solidFill><a:srgbClr val="2E7D32"/></a:solidFill></c:spPr><c:invertIfNegative val="0"/>` +
        `<c:cat><c:strRef><c:f>${ref('A')}</c:f><c:strCache><c:ptCount val="${hours.length}"/>${cats}</c:strCache></c:strRef></c:cat>` +
        `<c:val><c:numRef><c:f>${ref('B')}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${hours.length}"/>${vals}</c:numCache></c:numRef></c:val>` +
        `</c:ser><c:gapWidth val="50"/><c:axId val="5001"/><c:axId val="5002"/></c:barChart>` +
        `<c:catAx><c:axId val="5001"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/>` +
        `<c:title>${rich('Requested arrival hour', 1000, false)}</c:title><c:numFmt formatCode="General" sourceLinked="1"/>` +
        `<c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:crossAx val="5002"/><c:crosses val="autoZero"/>` +
        `<c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>` +
        `<c:valAx><c:axId val="5002"/><c:scaling><c:orientation val="minMax"/><c:min val="0"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines/>` +
        `<c:title>${rich('Users', 1000, false)}</c:title><c:numFmt formatCode="0" sourceLinked="0"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/>` +
        `<c:tickLblPos val="nextTo"/><c:crossAx val="5001"/><c:crosses val="autoZero"/><c:crossBetween val="between"/>${max <= 10 ? '<c:majorUnit val="1"/>' : ''}</c:valAx>` +
        `</c:plotArea><c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>`;
}

const drawingXml = () => `${XML}<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="${NS_A}">` +
    `<xdr:twoCellAnchor><xdr:from><xdr:col>4</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>1</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>` +
    `<xdr:to><xdr:col>16</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>24</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>` +
    `<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Users by hour"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>` +
    `<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="${NS_C}">` +
    `<c:chart xmlns:c="${NS_C}" xmlns:r="${NS_R}" r:id="rId1"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>`;

const rels = (items: [id: string, type: string, target: string][]) =>
    `${XML}<Relationships xmlns="${NS_PKG}">${items.map(([id, type, target]) => `<Relationship Id="${id}" Type="${type}" Target="${target}"/>`).join('')}</Relationships>`;
const REL = (t: string) => `http://schemas.openxmlformats.org/officeDocument/2006/relationships/${t}`;

const STYLES = `${XML}<styleSheet xmlns="${NS_MAIN}"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
    `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
    `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>` +
    `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

export const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;

export async function buildWorkbook(requests: Sheet, hours: HourRow[], chartTitle = 'Users by requested arrival hour'): Promise<Buffer> {
    if (hours.length !== 24) throw new Error('the hourly sheet needs exactly 24 rows (hours 0 to 23)');
    const hourly: Sheet = { name: HOURLY_SHEET, header: ['Hour', 'Users', 'SMS sent'], rows: hours.map(h => [hourLabel(h.hour), h.users, h.sms]), widths: [10, 10, 12] };

    const zip = new JSZip();
    zip.file('[Content_Types].xml', `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
        `<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>` +
        `<Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>`);
    zip.file('_rels/.rels', rels([['rId1', REL('officeDocument'), 'xl/workbook.xml']]));
    zip.file('xl/workbook.xml', `${XML}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_R}"><sheets>` +
        `<sheet name="${esc(requests.name)}" sheetId="1" r:id="rId1"/><sheet name="${esc(HOURLY_SHEET)}" sheetId="2" r:id="rId2"/></sheets></workbook>`);
    zip.file('xl/_rels/workbook.xml.rels', rels([['rId1', REL('worksheet'), 'worksheets/sheet1.xml'], ['rId2', REL('worksheet'), 'worksheets/sheet2.xml'], ['rId3', REL('styles'), 'styles.xml']]));
    zip.file('xl/styles.xml', STYLES);
    zip.file('xl/worksheets/sheet1.xml', sheetXml(requests, false));
    zip.file('xl/worksheets/sheet2.xml', sheetXml(hourly, true));
    zip.file('xl/worksheets/_rels/sheet2.xml.rels', rels([['rId1', REL('drawing'), '../drawings/drawing1.xml']]));
    zip.file('xl/drawings/drawing1.xml', drawingXml());
    zip.file('xl/drawings/_rels/drawing1.xml.rels', rels([['rId1', REL('chart'), '../charts/chart1.xml']]));
    zip.file('xl/charts/chart1.xml', chartXml(hours, chartTitle));
    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
