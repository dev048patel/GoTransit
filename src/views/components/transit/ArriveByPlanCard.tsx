/* ArriveByPlanCard — the scheduled trip that gets the rider there by the time they picked (pure view) */
import React from 'react';
import transitColors from '../../../models/data/transitColors';
import type { ArriveByPlan, PlannedJourney } from '../../../models/services/ArriveByClient';

const routeColor = (route: string) => transitColors.find(c => c.route_id === parseInt(route))?.colour ?? '#1a73e8';

function Steps({ journey }: { journey: PlannedJourney }) {
    return (
        <>
            {/* When to set off, and when they get there */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <div style={timeBoxStyle}>
                    <div style={timeLabelStyle}>Leave at</div>
                    <div style={timeValueStyle}>{journey.leave}</div>
                </div>
                <div style={timeBoxStyle}>
                    <div style={timeLabelStyle}>Arrive at</div>
                    <div style={timeValueStyle}>{journey.arrive}</div>
                </div>
            </div>

            {journey.legs.map((leg, i) => (
                <React.Fragment key={i}>
                    <div style={stepStyle}>
                        <span style={dotStyle(i === 0 ? '#34a853' : '#9aa0a6')} />
                        <span>
                            {i === 0 ? 'Walk' : 'Change buses: walk'} {leg.walkBeforeMin} min to <strong>{leg.boardStop.name}</strong>
                        </span>
                    </div>
                    <div style={stepStyle}>
                        <span style={dotStyle(routeColor(leg.route))} />
                        <span>
                            <strong>{leg.board}</strong> · Board{' '}
                            <span style={{ ...badgeStyle, backgroundColor: routeColor(leg.route) }}>Route {leg.route}</span>
                            {leg.headsign && <span style={{ color: '#5f6368' }}> towards {leg.headsign}</span>}
                        </span>
                    </div>
                    <div style={{ ...stepStyle, paddingLeft: '12px', color: '#5f6368', fontSize: '12px' }}>
                        Ride {leg.rideMin} min
                    </div>
                    <div style={stepStyle}>
                        <span style={dotStyle('#ea4335')} />
                        <span><strong>{leg.alight}</strong> · Get off at <strong>{leg.alightStop.name}</strong></span>
                    </div>
                </React.Fragment>
            ))}
            <div style={stepStyle}>
                <span style={dotStyle('#1a73e8')} />
                <span>Walk {journey.walkAfterMin} min to your destination · <strong>{journey.arrive}</strong></span>
            </div>
        </>
    );
}

/** One trip: the first (latest that makes it) opens with its steps, backups open on a tap */
function Option({ journey, first }: { journey: PlannedJourney; first: boolean }) {
    const [open, setOpen] = React.useState(first);
    return (
        <div style={{ ...optionStyle, ...(first ? {} : { borderTop: '1px solid var(--t-border-soft)' }) }}>
            <button onClick={() => setOpen(o => !o)} style={optionHeaderStyle} aria-expanded={open}>
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: first ? '#137333' : '#5f6368' }}>
                        {first ? '★ Latest bus that gets you there' : 'Earlier option'}
                    </span>
                    <span style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {journey.legs.map((leg, i) => (
                            <span key={i} style={{ ...badgeStyle, backgroundColor: routeColor(leg.route) }}>Route {leg.route}</span>
                        ))}
                    </span>
                </span>
                <span style={{ textAlign: 'right', fontSize: '13px', color: '#202124' }}>
                    <div>Leave <strong>{journey.leave}</strong></div>
                    <div style={{ color: '#5f6368' }}>Arrive {journey.arrive} {open ? '▴' : '▾'}</div>
                </span>
            </button>
            {open && <div style={{ marginTop: '10px' }}><Steps journey={journey} /></div>}
        </div>
    );
}

export default function ArriveByPlanCard({ plan, loading, error }: { plan: ArriveByPlan | null; loading: boolean; error: string | null }) {
    if (loading) return <div style={noteStyle}>Finding the bus that gets you there in time…</div>;
    if (error) return <div style={{ ...noteStyle, color: '#d93025' }}>{error}</div>;
    if (!plan) return null;

    const when = `${plan.day === 'tomorrow' ? 'Tomorrow' : 'Today'}, arrive by ${plan.arriveBy}`;
    return (
        <div className="t-card" style={cardStyle}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t-accent)', marginBottom: '10px' }}>
                🗓️ {when} · Scheduled bus times
            </div>

            {plan.status === 'planned' && plan.journeys.map((journey, i) => (
                <Option key={i} journey={journey} first={i === 0} />
            ))}

            {plan.status === 'partial' && (
                <>
                    <div style={{ ...warnStyle, marginBottom: '10px' }}>
                        No bus goes all the way in time. This gets you within {(plan.remainingMetres / 1000).toFixed(1)} km.
                    </div>
                    <Steps journey={plan.journey} />
                </>
            )}

            {plan.status === 'no_service' && (
                plan.earliest ? (
                    <>
                        <div style={{ ...warnStyle, marginBottom: '10px' }}>
                            No bus gets you there by {plan.arriveBy}. The earliest you can arrive is {plan.earliest.arrive}:
                        </div>
                        <Steps journey={plan.earliest} />
                    </>
                ) : (
                    <div style={warnStyle}>No buses run between here and your destination around that time.</div>
                )
            )}

            <div style={{ fontSize: '11px', color: '#80868b', marginTop: '10px' }}>
                Times are from the published schedule. Buses can run a few minutes early or late.
            </div>
        </div>
    );
}

const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--t-surface)', borderRadius: '12px', padding: '14px', margin: '10px 12px',
    border: '1px solid var(--t-border-soft)', borderLeft: '4px solid var(--t-accent)',
};
const optionStyle: React.CSSProperties = { padding: '10px 0' };
const optionHeaderStyle: React.CSSProperties = {
    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px',
    background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', font: 'inherit',
};
const timeBoxStyle: React.CSSProperties = {
    flex: 1, backgroundColor: 'var(--t-accent-soft)', borderRadius: '10px', padding: '8px 10px',
};
const timeLabelStyle: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: 'var(--t-accent)' };
const timeValueStyle: React.CSSProperties = { fontSize: '18px', fontWeight: 800, color: 'var(--t-accent-dark)' };
const stepStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '5px 0', fontSize: '13px', color: '#202124', lineHeight: 1.45,
};
const dotStyle = (color: string): React.CSSProperties => ({
    width: '10px', height: '10px', borderRadius: '50%', border: `2.5px solid ${color}`, flexShrink: 0, marginTop: '4px',
});
const badgeStyle: React.CSSProperties = {
    color: 'white', fontWeight: 700, fontSize: '12px', padding: '1px 8px', borderRadius: '8px',
};
const warnStyle: React.CSSProperties = {
    fontSize: '13px', color: '#b06000', backgroundColor: '#fef7e0', borderRadius: '8px', padding: '8px 10px',
};
const noteStyle: React.CSSProperties = { padding: '20px', textAlign: 'center', fontSize: '13px', color: '#5f6368' };
