/**
 * PersonPage.tsx — Transit Regina  [VIEW — MVC]
 * One person on one page: account, features, recent visits, and what admins have done to the account.
 * Actions that can do damage sit in their own "Danger zone" at the bottom.
 */
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePersonController, verifyTwoStepCode } from '../../controllers/admin/usePersonController';
import { useAuth } from '../../models/context/AuthContext';
import { Badge, Card, ConfirmDialog, PageHeader, btn, when } from '../components/admin/ui';

export default function PersonPage() {
    const { id = '' } = useParams();
    const { user } = useAuth();
    const c = usePersonController(id);
    const p = c.person?.profile;
    const isSelf = user?.id === id;

    return (
        <div>
            <Link to="/admin/people" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 mb-3"><ArrowLeft size={16} /> People</Link>
            <PageHeader title={p?.full_name || p?.email || 'Loading…'} subtitle={p?.email ?? undefined}
                actions={p && <><Badge tone={p.role === 'admin' ? 'info' : 'neutral'}>{p.role}</Badge><Badge tone={p.account_status === 'active' ? 'good' : 'bad'}>{p.account_status}</Badge></>} />
            {c.error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">{c.error}</p>}

            {p && c.person && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                    <div className="xl:col-span-2 space-y-4">
                        <Card title="Account">
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 p-5 text-sm">
                                <div><dt className="text-slate-500">Joined</dt><dd className="text-slate-900">{when(p.created_at)}</dd></div>
                                <div><dt className="text-slate-500">Last active</dt><dd className="text-slate-900">{when(p.last_active)}</dd></div>
                                <div><dt className="text-slate-500">Phone</dt><dd className="text-slate-900">{p.mobile_number ?? '—'}{p.mobile_number && <span className={'ml-2 text-xs ' + (p.mobile_verified ? 'text-emerald-700' : 'text-amber-700')}>{p.mobile_verified ? 'Verified' : 'Not verified'}</span>}</dd></div>
                                <div><dt className="text-slate-500">Text reminders</dt><dd className="text-slate-900">{p.sms_opted_in ? 'On' : 'Off'}</dd></div>
                                <div className="sm:col-span-2">
                                    <label htmlFor="person-name" className="text-slate-500">Name</label>
                                    <div className="flex gap-2 mt-1">
                                        <input id="person-name" value={c.name} onChange={e => c.setName(e.target.value)} maxLength={80}
                                            className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30" />
                                        <button onClick={c.saveName} disabled={!c.name.trim() || c.name.trim() === (p.full_name ?? '')} className={btn.plain}>Save</button>
                                    </div>
                                </div>
                            </dl>
                        </Card>

                        <Card title="Features">
                            <ul className="divide-y divide-slate-100">
                                {c.features.map(f => (
                                    <li key={f.key} className="flex items-center justify-between gap-4 px-5 py-3">
                                        <div><div className="text-sm font-medium text-slate-900">{f.label}</div><div className="text-xs text-slate-500">{f.description}</div></div>
                                        <button role="switch" aria-checked={c.featureOn(f.key)} aria-label={f.label} onClick={() => c.toggleFeature(f.key)}
                                            className={'relative w-11 h-6 rounded-full transition flex-none ' + (c.featureOn(f.key) ? 'bg-emerald-500' : 'bg-slate-300')}>
                                            <span className={'absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ' + (c.featureOn(f.key) ? 'translate-x-5' : '')} />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </Card>

                        <Card title="Recent visits">
                            <table className="w-full text-sm">
                                <thead className="text-left text-xs text-slate-500 bg-slate-50"><tr><th className="px-5 py-2">Last seen</th><th className="px-5 py-2">Device</th><th className="px-5 py-2">Browser</th><th className="px-5 py-2 text-right">Pages</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">
                                    {c.person.sessions.map((s, i) => <tr key={i}><td className="px-5 py-2">{when(s.last_seen)}</td><td className="px-5 py-2">{s.device} · {s.os}</td><td className="px-5 py-2">{s.browser}</td><td className="px-5 py-2 text-right tabular-nums">{s.page_views}</td></tr>)}
                                    {c.person.sessions.length === 0 && <tr><td colSpan={4} className="px-5 py-6 text-center text-slate-500">No visits recorded.</td></tr>}
                                </tbody>
                            </table>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        <Card title="Admin actions on this account">
                            <ul className="divide-y divide-slate-100">
                                {c.person.history.map((h, i) => <li key={i} className="px-5 py-3 text-sm"><div className="text-slate-900 break-words">{h.message}</div><div className="text-xs text-slate-500 mt-0.5">{h.admin} · {when(h.created_at)}</div></li>)}
                                {c.person.history.length === 0 && <li className="px-5 py-6 text-sm text-slate-500 text-center">Nothing yet.</li>}
                            </ul>
                        </Card>

                        <section className="rounded-xl border border-red-200 bg-red-50/40">
                            <h2 className="px-5 py-3 text-sm font-semibold text-red-800 border-b border-red-200">Danger zone</h2>
                            <div className="p-5 space-y-3">
                                {isSelf ? <p className="text-sm text-slate-600">You can't change your own role or status. Ask another admin.</p> : <>
                                    {p.account_status === 'active'
                                        ? <button onClick={c.ask.suspend} className={btn.dangerPlain + ' w-full justify-center'}>Suspend account</button>
                                        : <button onClick={c.ask.reactivate} className={btn.plain + ' w-full justify-center'}>Reactivate account</button>}
                                    {p.role === 'admin'
                                        ? <button onClick={c.ask.removeAdmin} className={btn.dangerPlain + ' w-full justify-center'}>Remove admin rights</button>
                                        : <button onClick={c.ask.makeAdmin} className={btn.dangerPlain + ' w-full justify-center'}>Make admin</button>}
                                    <button onClick={c.ask.remove} className={btn.danger + ' w-full justify-center'}>Delete account</button>
                                </>}
                            </div>
                        </section>
                    </div>
                </div>
            )}
            <ConfirmDialog request={c.confirm} onClose={c.closeConfirm} verifyCode={verifyTwoStepCode} />
        </div>
    );
}
