/**
 * ForgotPasswordPage.tsx — Transit Regina  [VIEW ONLY — MVC]
 *
 * Asks for an email and sends a password-reset link.
 * Logic lives in useForgotPasswordController.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import logo from '../../New-Image.jpeg';
import { useForgotPasswordController } from '../../controllers/auth/usePasswordResetController';

export default function ForgotPasswordPage() {
    const { email, setEmail, error, isLoading, sent, handleSubmit } = useForgotPasswordController();

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12 font-sans">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#003DA5] via-[#0066FF] to-[#003DA5]" />

            <motion.div
                initial={{ opacity: 0, y: 32 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-10">
                    <Link to="/" className="inline-block mb-4">
                        <img src={logo} alt="Transit Regina" className="w-16 h-16 mx-auto rounded-2xl object-cover shadow-[0_8px_24px_rgba(0,61,165,0.2)]" />
                    </Link>
                    <h1 className="text-4xl font-bold text-[#003DA5] mb-2">Forgot Password</h1>
                    <p className="text-gray-500 text-sm">We'll email you a link to reset it</p>
                </div>

                <div className="bg-white rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,0.08)] border border-gray-100 px-8 py-8">
                    {sent ? (
                        <p role="status" className="text-sm text-center text-green-700 bg-green-50 border border-green-200 rounded-xl py-3 px-4">
                            If an account exists for <strong>{email.trim()}</strong>, a reset link is on its way. Check your inbox and spam folder.
                        </p>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                            <div>
                                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Email
                                </label>
                                <input
                                    id="reset-email"
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="jane@example.com"
                                    autoComplete="email"
                                    className={
                                        'w-full px-4 py-3 rounded-xl border text-sm text-gray-900 placeholder-gray-400 ' +
                                        'focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30 focus:border-[#003DA5] transition ' +
                                        (error ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white')
                                    }
                                />
                                {error && <p role="alert" className="text-red-500 text-xs mt-1">{error}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full px-8 py-3.5 bg-gradient-to-r from-[#003DA5] to-[#1a56db] text-white rounded-xl font-bold text-base hover:scale-[1.02] transition-all duration-300 disabled:opacity-60 disabled:pointer-events-none"
                            >
                                {isLoading ? 'Sending…' : 'Send Reset Link'}
                            </button>
                        </form>
                    )}

                    <p className="text-center text-sm text-gray-500 mt-6">
                        <Link to="/login" className="text-[#003DA5] font-semibold hover:underline">
                            Back to Sign In
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
