/**
 * ResetPasswordPage.tsx — Transit Regina  [VIEW ONLY — MVC]
 *
 * Landing page for the emailed reset link. Lets the user choose a new password.
 * Logic lives in useResetPasswordController.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import logo from '../../New-Image.jpeg';
import { useResetPasswordController } from '../../controllers/auth/usePasswordResetController';

export default function ResetPasswordPage() {
    const {
        linkValid,
        password, setPassword,
        showPw, toggleShowPw,
        error, isLoading, done,
        handleSubmit,
    } = useResetPasswordController();

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
                    <h1 className="text-4xl font-bold text-[#003DA5] mb-2">Reset Password</h1>
                    <p className="text-gray-500 text-sm">Choose a new password for your account</p>
                </div>

                <div className="bg-white rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,0.08)] border border-gray-100 px-8 py-8">
                    {done ? (
                        <div className="text-center space-y-4">
                            <p role="status" className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl py-3 px-4">
                                Password updated. You're signed in.
                            </p>
                            <Link to="/map" className="inline-block text-[#003DA5] font-semibold hover:underline">
                                Continue to the map
                            </Link>
                        </div>
                    ) : !linkValid ? (
                        <div className="text-center space-y-4">
                            <p role="alert" className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl py-3 px-4">
                                This reset link is invalid or has expired.
                            </p>
                            <Link to="/forgot-password" className="inline-block text-[#003DA5] font-semibold hover:underline">
                                Request a new link
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                            <div>
                                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1.5">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="new-password"
                                        type={showPw ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        placeholder="Minimum 8 characters"
                                        autoComplete="new-password"
                                        className={
                                            'w-full px-4 py-3 pr-11 rounded-xl border text-sm text-gray-900 placeholder-gray-400 ' +
                                            'focus:outline-none focus:ring-2 focus:ring-[#003DA5]/30 focus:border-[#003DA5] transition ' +
                                            (error ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white')
                                        }
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
                                {error && <p role="alert" className="text-red-500 text-xs mt-1">{error}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full px-8 py-3.5 bg-gradient-to-r from-[#003DA5] to-[#1a56db] text-white rounded-xl font-bold text-base hover:scale-[1.02] transition-all duration-300 disabled:opacity-60 disabled:pointer-events-none"
                            >
                                {isLoading ? 'Saving…' : 'Update Password'}
                            </button>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
