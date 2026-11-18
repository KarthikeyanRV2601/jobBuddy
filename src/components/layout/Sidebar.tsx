import type { ApplicationMetrics } from "../../types/application";
import type { AppView } from "../../types/navigation";
import { getNavItems, getPipelineMetrics } from "../../utils/navigation";
import { JobBuddyLogo } from "./JobBuddyLogo";

type SidebarProps = {
  readonly metrics: ApplicationMetrics;
  readonly view: AppView;
  readonly onViewChange: (view: AppView) => void;
};

export const Sidebar = ({ metrics, view, onViewChange }: SidebarProps) => (
  <aside className="sidebar">
    <div className="brand">
      <div className="brand-mark">
        <JobBuddyLogo />
      </div>
      <div>
        <h1>JobBuddy</h1>
        <p>Big moves start here.</p>
      </div>
    </div>

    <nav className="nav-tabs" aria-label="Main views">
      {getNavItems().map((item) => (
        <button
          aria-current={view === item.view ? "page" : undefined}
          className={`nav-tab${view === item.view ? " is-active" : ""}`}
          key={item.view}
          onClick={() => onViewChange(item.view)}
          type="button"
        >
          <span aria-hidden="true">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>

    <section className="summary-panel" aria-label="Application summary">
      <div className="summary-heading">
        <h2>Your momentum</h2>
        <span>Status</span>
      </div>
      <dl className="metrics">
        {getPipelineMetrics(metrics).map((metric) => (
          <div className={`metric-card tone-${metric.tone}`} key={metric.label}>
            <div>
              <dt>{metric.label}</dt>
              <dd>{metric.value}</dd>
            </div>
            <div className="metric-rail" aria-hidden="true">
              <span style={{ width: `${metric.percentage}%` }} />
            </div>
          </div>
        ))}
      </dl>
    </section>
    <div className="sidebar-pep-talk">
      <span aria-hidden="true">✳</span>
      <p>Big dreams.<br />Small steps.<br /><strong>You’ve got this.</strong></p>
      <span className="local-first-label">LOCAL FIRST · ALWAYS YOURS</span>
    </div>
  </aside>
);
