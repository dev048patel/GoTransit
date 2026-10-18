/* The About, Privacy and Terms pages (/about, /privacy, /terms). Wording lives in src/models/data/legal.ts. */
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LEGAL_PAGES, SITE } from '../models/data/legal';
import IndependenceNotice from './components/IndependenceNotice';

/* Swaps {contact} and {region} for their values, or a highlighted marker if not yet filled in */
function Filled({ text }: { text: string }) {
    const parts = text.split(/(\{contact\}|\{region\})/);
    return (
        <>
            {parts.map((part, i) => {
                if (part === '{contact}') return SITE.CONTACT_EMAIL
                    ? <a key={i} href={`mailto:${SITE.CONTACT_EMAIL}`} className="font-semibold text-[#003DA5]">{SITE.CONTACT_EMAIL}</a>
                    : <mark key={i} className="bg-amber-100 text-amber-900 px-1 rounded">[contact email to be filled in]</mark>;
                if (part === '{region}') return SITE.DATA_REGION
                    ? <React.Fragment key={i}>{SITE.DATA_REGION}</React.Fragment>
                    : <mark key={i} className="bg-amber-100 text-amber-900 px-1 rounded">[database region to be filled in]</mark>;
                return <React.Fragment key={i}>{part}</React.Fragment>;
            })}
        </>
    );
}

export default function LegalPage({ page }: { page: keyof typeof LEGAL_PAGES }) {
    const content = LEGAL_PAGES[page];
    return (
        <div className="min-h-screen bg-[#F7F8FA]">
            <div className="max-w-3xl mx-auto px-5 sm:px-6 py-10 sm:py-14">
                <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#003DA5] no-underline hover:underline mb-8">
                    <ArrowLeft size={16} /> {SITE.brand}
                </Link>
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 mb-3">{content.title}</h1>
                <p className="text-lg text-slate-600 mb-10">{content.intro}</p>

                {content.sections.map((section, i) => (
                    <section key={i} className="mb-8">
                        {section.heading && <h2 className="text-xl font-bold text-slate-900 mb-2">{section.heading}</h2>}
                        {section.paragraphs.map((p, j) => <p key={j} className="text-slate-700 leading-relaxed mb-3"><Filled text={p} /></p>)}
                        {section.points && (
                            <ul className="list-disc pl-5 space-y-2 text-slate-700 leading-relaxed">
                                {section.points.map((p, j) => <li key={j}><Filled text={p} /></li>)}
                            </ul>
                        )}
                    </section>
                ))}

                <IndependenceNotice className="mt-14 pt-6 border-t border-slate-200" />
            </div>
        </div>
    );
}
