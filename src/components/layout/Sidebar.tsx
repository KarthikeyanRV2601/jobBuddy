import type { ApplicationMetrics } from "../../types/application";
import type { AppView } from "../../types/navigation";
import { getNavItems, getPipelineMetrics } from "../../utils/navigation";

type SidebarProps = {
  readonly metrics: ApplicationMetrics;
  readonly view: AppView;
  readonly onViewChange: (view: AppView) => void;
};

export const Sidebar = ({ metrics, view, onViewChange }: SidebarProps) => (
  <aside className="sidebar">
    <div className="brand">
      <div className="brand-mark">JB</div>
      <div>
        <h1>JobBuddy</h1>
        <p>Application command center</p>
      </div>
    </div>

    <nav className="nav-tabs" aria-label="Main views">
      {getNavItems().map((item) => (
        <button
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
        <h2>Pipeline</h2>
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
  </aside>
);
