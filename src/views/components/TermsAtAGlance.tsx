/* The key points of the Terms and Privacy Policy, where people agree to them. Folded by default so the
   form stays short; one tap opens them, and the full documents are linked beside the checkbox.
   This "layered" approach (short summary, then full policy) is what Canada's Privacy Commissioner
   recommends. Wording lives in src/models/data/legal.ts. */
import { ChevronDown } from 'lucide-react';
import { AT_A_GLANCE } from '../../models/data/legal';

export default function TermsAtAGlance() {
    return (
        <details className="group rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
            <summary className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer list-none font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
                What you're agreeing to, in {AT_A_GLANCE.length} points
                <ChevronDown size={16} className="shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
            </summary>
            <ul className="space-y-1.5 list-disc pl-8 pr-4 pb-3">
                {AT_A_GLANCE.map((point: string) => <li key={point}>{point}</li>)}
            </ul>
        </details>
    );
}
