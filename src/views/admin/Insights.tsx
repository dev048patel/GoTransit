/**
 * Insights.tsx — Transit Regina  [VIEW — MVC]
 * Usage over time: what riders do in the app, and who is visiting.
 */
import Dashboard from './Dashboard';
import VisitorAnalytics from './VisitorAnalytics';

export default function Insights() {
    return (
        <div className="space-y-8">
            <Dashboard />
            <VisitorAnalytics />
        </div>
    );
}
