/**
 * AdminLayout.tsx — Transit Regina
 * The frame around every admin page: navigation, who is signed in, and an automatic sign-out
 * when the panel is left unattended.
 */
import { useEffect, useState } from 'react';
import { Outlet, NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, Bus, BarChart3, ShieldAlert, ScrollText, ArrowLeft, Menu, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../../models/context/AuthContext';
import { supabase } from '../../models/lib/supabase';

const NAV = [
    { to: '/admin', label: 'Home', icon: Home, end: true },
    { to: '/admin/people', label: 'People', icon: Users },
    { to: '/admin/service', label: 'Service', icon: Bus },
    { to: '/admin/insights', label: 'Insights', icon: BarChart3 },
    { to: '/admin/security', label: 'Security', icon: ShieldAlert },
    { to: '/admin/activity', label: 'Activity log', icon: ScrollText },
];
const IDLE_MINUTES = 30;
const LAST_ACTIVE_KEY = 'admin-last-active';

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    useEffect(() => { setMenuOpen(false); }, [pathname]);

    // Sign out of an unattended admin panel
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        const signOut = async () => { try { localStorage.removeItem(LAST_ACTIVE_KEY); } catch { /* storage blocked */ } await logout(); navigate('/login', { replace: true }); };
        // The time of the last activity is kept in the browser, so closing the tab does not stop the clock.
        // A login newer than that activity is a fresh start and is left alone.
        let last = 0;
        try { last = Number(localStorage.getItem(LAST_ACTIVE_KEY)) || 0; } catch { /* storage blocked */ }
        const idleFor = Date.now() - last;
        if (last && idleFor > IDLE_MINUTES * 60_000) {
            void supabase.auth.getSession().then(({ data }) => {
                const signedInAt = Date.parse(data.session?.user.last_sign_in_at ?? '') || 0;
                if (signedInAt < last) void signOut();
            });
        }
        let written = 0;
        const reset = () => {
            clearTimeout(timer);
            timer = setTimeout(signOut, IDLE_MINUTES * 60_000);
            if (Date.now() - written > 15_000) { written = Date.now(); try { localStorage.setItem(LAST_ACTIVE_KEY, String(written)); } catch { /* storage blocked */ } }
        };
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(e => window.addEventListener(e, reset, { passive: true }));
        reset();
        return () => { clearTimeout(timer); events.forEach(e => window.removeEventListener(e, reset)); };
    }, [logout, navigate]);

    const nav = (
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Admin sections">
            {NAV.map(({ to, label, icon: Icon, end }) => (
                <NavLink key={to} to={to} end={end}
                    className={({ isActive }) => 'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ' +
                        (isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white')}>
                    <Icon size={18} /> {label}
                </NavLink>
            ))}
        </nav>
    );

    return (
        <div className="flex h-screen bg-slate-100">
            {/* Sidebar: always visible on large screens, a slide-over menu on small ones */}
            <aside className={'fixed inset-y-0 left-0 z-40 w-60 bg-slate-900 text-white flex flex-col transition-transform lg:static lg:translate-x-0 ' + (menuOpen ? 'translate-x-0' : '-translate-x-full')}>
                <div className="h-14 px-5 flex items-center justify-between border-b border-white/10">
                    <span className="font-bold">Transit Regina <span className="text-slate-400 font-medium">Admin</span></span>
                    <button className="lg:hidden text-slate-300" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={20} /></button>
                </div>
                {nav}
                <div className="p-3 border-t border-white/10">
                    <Link to="/map" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white"><ArrowLeft size={18} /> Back to the map</Link>
                </div>
            </aside>
            {menuOpen && <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={() => setMenuOpen(false)} />}

            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-14 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between gap-3">
                    <button className="lg:hidden text-slate-600" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
                    <div className="flex-1" />
                    <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-1"><ShieldCheck size={14} /> Two-step verified</span>
                    <div className="text-right leading-tight">
                        <div className="text-sm font-semibold text-slate-900">{user?.fullName}</div>
                        <div className="text-xs text-slate-500">{user?.email}</div>
                    </div>
                </header>
                <main className="flex-1 overflow-auto p-4 lg:p-6"><Outlet /></main>
            </div>
        </div>
    );
}
