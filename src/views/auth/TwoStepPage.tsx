/**
 * TwoStepPage.tsx — Transit Regina  [VIEW ONLY — MVC]
 *
 * Two-step sign-in for admins: set up an authenticator app, or enter its code.
 * Logic lives in useTwoStepController.
 */

import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import logo from '../../New-Image.jpeg';
import { useTwoStepController } from '../../controllers/auth/useTwoStepController';

export default function TwoStepPage() {
    const { mode, qr, secret, code, setCode, error, busy, handleSubmit, notAdmin } = useTwoStepController();

    // Only admins use two-step sign-in; anyone else has no business here
    if (notAdmin) return <Navigate to="/map" replace />;

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12 font-sans">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#003DA5] via-[#0066FF] to-[#003DA5]" />

            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <img src={logo} alt="Transit Regina" className="w-16 h-16 mx-auto rounded-2xl object-cover shadow-[0_8px_24px_rgba(0,61,165,0.2)] mb-4" />
                    <h1 className="text-3xl font-bold text-[#003DA5] mb-2">Two-step sign-in</h1>
                    <p className="text-gray-500 text-sm">
                        {mode === 'setup' ? 'Admin accounts need an authenticator app. Set it up once.' : 'Enter the code from your authenticator app to open the admin panel.'}
                    </p>
                </div>

                <div className="bg-white rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,0.08)] border border-gray-100 px-8 py-8">
                    {mode === 'loading' && !error && (
                        <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-[#003DA5] border-t-transparent rounded-full animate-spin" /></div>
                    )}

                    {mode === 'setup' && (
                        <ol className="space-y-4 text-sm text-gray-700 mb-6 list-decimal list-inside">
                            <li>Install an authenticator app on your phone (Google Authenticator, Microsoft Authenticator or Authy).</li>
                            <li>
                                In the app, add an account and scan this code:
                                <img src={qr} alt="QR code to scan with your authenticator app" width={180} height={180} className="mx-auto my-3 border border-gray-200 rounded-xl" />
                                <span className="block text-xs text-gray-500 text-center">
                                    Can't scan? Type this key into the app: <code className="font-mono break-all text-gray-800">{secret}</code>
                                </span>
                            </li>
                            <li>Enter the 6-digit code the app shows.</li>
                        </ol>
                    )}

                    {mode !== 'loading' && (
                        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                            <div>
                                <label htmlFor="two-step-code" className="block text-sm font-medium text-gray-700 mb-1.5">6-digit code</label>
                                <input
                                    id="two-step-code"
                                    value={code}
                                    onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    autoFocus
                                    placeholder="123456"
                                    className={
                                        'w-full px-4 py-3 rounded-xl border text-center text-2xl tracking-[0.4em] font-mono text-gray-900 placeholder-gray-300 ' +
                                        'focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30 focus:border-[#003DA5] transition ' +
                                        (error ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white')
                                    }
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={busy}
                                className="w-full flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#003DA5] to-[#1a56db] text-white rounded-xl font-bold text-base hover:scale-[1.02] transition-all duration-300 disabled:opacity-60 disabled:pointer-events-none"
                            >
                                <ShieldCheck className="w-4 h-4" /> {busy ? 'Checking…' : mode === 'setup' ? 'Finish setup' : 'Verify'}
                            </button>
                        </form>
                    )}

                    {error && <p role="alert" className="text-red-600 text-sm text-center mt-4">{error}</p>}

                    <p className="text-center text-sm text-gray-500 mt-6">
                        <Link to="/map" className="text-[#003DA5] font-semibold hover:underline">Back to the map</Link>
                    </p>
                </div>

                {mode === 'verify' && (
                    <p className="text-center text-gray-400 text-xs mt-6">Lost your phone? Another admin can reset two-step sign-in for you in the Supabase dashboard.</p>
                )}
            </div>
        </div>
    );
}
