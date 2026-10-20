/* Keeps the document's title, description, canonical address and structured data in step with the
   page being shown, matching what scripts/prerender.tsx wrote into that page's HTML. */
import { useEffect } from 'react';
import { applyPageMeta, type PageMeta } from '../models/seo/pageMeta';

export function usePageMeta(meta: PageMeta | null) {
    const key = meta ? `${meta.path}|${meta.title}|${meta.noindex ? 1 : 0}` : '';
    useEffect(() => {
        if (meta) applyPageMeta(document, meta);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
}
