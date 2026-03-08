/**
 * SignupPage.tsx — GoTransit Regina  [VIEW ONLY — MVC]
 *
 * Pure View: renders UI only.
 * All logic (validation, password strength, mobile formatting) lives in useSignupController.
 *
 * Style: landing page "white sections" aesthetic.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import logo from '../../New-Image.jpeg';
import { useSignupController } from '../../controllers/auth/useSignupController';

/* ── Shared input class ─────────────────────────────────────────── */
const inputCls = (hasError: boolean) =>
    `w-full px-4 py-3 rounded-xl border text-sm text-gray-900 placeholder-gray-400 ` +
    `focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30 focus:border-[#003DA5] transition ` +
    (hasError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white');

/* ── View ───────────────────────────────────────────────────────── */
export default function SignupPage() {
    const {
        fullName, setFullName,
        email, setEmail,
        password, setPassword,
        showPw, toggleShowPw,
        mobile,
        errors, isLoading, success,
        strength,
        handleMobileChange,
        handleSubmit,
    } = useSignupController();

    /* ── Success State ──────────────────────────── */
    if (success) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center px-4 font-sans">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#003DA5] via-[#0066FF] to-[#003DA5]" />
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center max-w-sm"
                >
                    <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#003DA5] to-[#1a56db] flex items-center justify-center shadow-[0_10px_40px_rgba(0,61,165,0.3)]">
                        <CheckCircle2 className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-[#003DA5] to-[#1a56db] bg-clip-text text-transparent mb-3">
                        Check Your Email
                    </h2>
                    <p className="text-gray-600 font-medium mb-2">Hi {fullName.split(' ')[0]}, you're almost there!</p>
                    <p className="text-gray-500 text-sm mb-8">
                        We sent a confirmation link to <span className="font-semibold text-gray-700">{email}</span>.
                        Click the link in your inbox to activate your account, then sign in.
                    </p>
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#003DA5] to-[#1a56db] text-white rounded-xl font-bold shadow-[0_10px_40px_rgba(0,61,165,0.3)] hover:scale-105 transition-all duration-300"
                    >
                        Go to Sign In <ArrowRight className="w-4 h-4" />
                    </Link>
                </motion.div>
            </div>
        );
    }

    /* ── Main Form ──────────────────────────────── */
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12 font-sans">
            {/* Gradient stripe */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#003DA5] via-[#0066FF] to-[#003DA5]" />

            <motion.div
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55 }}
                className="w-full max-w-md"
            >
                {/* Brand */}
                <div className="text-center mb-10">
                    <Link to="/" className="inline-block mb-4">
                        <img src={logo} alt="GoTransit Regina" className="w-16 h-16 mx-auto rounded-2xl object-cover shadow-[0_8px_24px_rgba(0,61,165,0.2)]" />
                    </Link>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-[#003DA5] to-[#003DA5] bg-clip-text text-transparent mb-2">
                        Create Account
                    </h1>
                    <p className="text-gray-500 text-sm">Join GoTransit Regina — it's free</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,0.08)] border border-gray-100 px-8 py-8">
                    <form onSubmit={handleSubmit} className="space-y-5" noValidate>

                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                placeholder="Jane Doe"
                                className={inputCls(!!errors.fullName)}
                                autoComplete="name"
                            />
                            {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="jane@example.com"
                                className={inputCls(!!errors.email)}
                                autoComplete="email"
                            />
                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                        </div>

                        {/* Password + strength bar */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Min. 8 characters"
                                    className={inputCls(!!errors.password) + ' pr-11'}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={toggleShowPw}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                                    aria-label="Toggle password visibility"
                                >
                                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                            {password.length > 0 && (
                                <div className="mt-2">
                                    <div className="flex gap-1.5">
                                        {[1, 2, 3, 4].map(i => (
                                            <div
                                                key={i}
                                                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= strength.score ? strength.color : 'bg-gray-100'}`}
                                            />
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">{strength.label}</p>
                                </div>
                            )}
                        </div>

                        {/* Mobile — optional */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-sm font-medium text-gray-700">Mobile Number</label>
                                <span className="text-xs text-gray-400">Optional</span>
                            </div>
                            <input
                                type="tel"
                                value={mobile}
                                onChange={e => handleMobileChange(e.target.value)}
                                placeholder="+1 306-555-0199"
                                className={inputCls(!!errors.mobile) + ' tracking-wide'}
                                autoComplete="tel"
                            />
                            {errors.mobile && <p className="text-red-500 text-xs mt-1">{errors.mobile}</p>}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group w-full flex items-center justify-center gap-2 px-8 py-3.5 bg-gradient-to-r from-[#003DA5] to-[#1a56db] text-white rounded-xl font-bold text-base shadow-[0_10px_40px_rgba(255,107,53,0.3)] hover:shadow-[0_15px_50px_rgba(255,107,53,0.45)] hover:scale-[1.02] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60 disabled:pointer-events-none mt-2"
                        >
                            {isLoading ? (
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" className="opacity-25" />
                                    <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" className="opacity-75" />
                                </svg>
                            ) : (
                                <>
                                    Create Account
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-6">
                        <div className="flex-1 h-px bg-gray-100" />
                        <span className="text-gray-300 text-xs font-medium">OR</span>
                        <div className="flex-1 h-px bg-gray-100" />
                    </div>

                    <p className="text-center text-sm text-gray-500">
                        Already have an account?{' '}
                        <Link to="/login" className="text-[#003DA5] font-semibold hover:text-[#003DA5] transition">
                            Sign In
                        </Link>
                    </p>
                </div>

                <p className="text-center text-gray-400 text-xs mt-6">
                    ✓ Free to use &nbsp;•&nbsp; ✓ Built for Regina commuters &nbsp;•&nbsp; ✓ No credit card
                </p>
            </motion.div>
        </div>
    );
}
