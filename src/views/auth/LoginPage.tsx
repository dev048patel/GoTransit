/**
 * LoginPage.tsx — GoTransit Regina  [VIEW ONLY — MVC]
 *
 * Pure View: renders UI only.
 * All logic (validation, auth, redirect) lives in useLoginController.
 *
 * Style: landing page "white sections" aesthetic.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';
import logo from '../../New-Image.jpeg';
import { useLoginController } from '../../controllers/auth/useLoginController';

/* ── Shared input class helper ──────────────────────────────────── */
const inputCls = (hasError: boolean) =>
    `w-full px-4 py-3 rounded-xl border text-sm text-gray-900 placeholder-gray-400 ` +
    `focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30 focus:border-[#003DA5] transition ` +
    (hasError ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white');

/* ── View ───────────────────────────────────────────────────────── */
export default function LoginPage() {
    const {
        identifier, setIdentifier,
        password, setPassword,
        showPw, toggleShowPw,
        errors, isLoading,
        isMobileDetected,
        handleLogin,
    } = useLoginController();

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12 font-sans">

            {/* Top gradient stripe */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#003DA5] via-[#0066FF] to-[#003DA5]" />

            <motion.div
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55 }}
                className="w-full max-w-md"
            >
                {/* ── Brand ─────────────────────────────────── */}
                <div className="text-center mb-10">
                    <Link to="/" className="inline-block mb-4">
                        <img src={logo} alt="GoTransit Regina" className="w-16 h-16 mx-auto rounded-2xl object-cover shadow-[0_8px_24px_rgba(0,61,165,0.2)]" />
                    </Link>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-[#003DA5] to-[#003DA5] bg-clip-text text-transparent mb-2">
                        Welcome Back
                    </h1>
                    <p className="text-gray-500 text-sm">Sign in to your GoTransit Regina account</p>
                </div>

                {/* ── Card ─────────────────────────────────── */}
                <div className="bg-white rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,0.08)] border border-gray-100 px-8 py-8">
                    <form onSubmit={handleLogin} className="space-y-5" noValidate>

                        {/* Form-level error */}
                        {errors.form && (
                            <p className="text-red-500 text-sm text-center bg-red-50 border border-red-200 rounded-xl py-2 px-4">
                                {errors.form}
                            </p>
                        )}

                        {/* Email / Mobile */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Email or Mobile Number
                            </label>
                            <input
                                type="text"
                                value={identifier}
                                onChange={e => setIdentifier(e.target.value)}
                                placeholder="jane@example.com  or  +1 306-555-0199"
                                className={inputCls(!!errors.identifier)}
                                autoComplete="username"
                            />
                            {isMobileDetected && identifier.length > 2 && (
                                <p className="text-gray-400 text-xs mt-1">Detected: Mobile number</p>
                            )}
                            {errors.identifier && (
                                <p className="text-red-500 text-xs mt-1">{errors.identifier}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-sm font-medium text-gray-700">Password</label>
                                <Link to="#" className="text-xs font-medium text-[#003DA5] hover:text-blue-600 transition">
                                    Forgot Password?
                                </Link>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className={inputCls(!!errors.password) + ' pr-11'}
                                    autoComplete="current-password"
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
                            {errors.password && (
                                <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                            )}
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
                                    <LogIn className="w-4 h-4" />
                                    Sign In
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
                        Don't have an account?{' '}
                        <Link to="/signup" className="text-[#003DA5] font-semibold hover:text-[#003DA5] transition">
                            Sign Up Free
                        </Link>
                    </p>
                </div>

                {/* Trust line */}
                <p className="text-center text-gray-400 text-xs mt-6">
                    ✓ Free to use &nbsp;•&nbsp; ✓ Built for Regina commuters &nbsp;•&nbsp; ✓ No credit card
                </p>
            </motion.div>
        </div>
    );
}
