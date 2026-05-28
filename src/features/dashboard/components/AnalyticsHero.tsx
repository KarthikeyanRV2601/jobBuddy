import type { DashboardAnalytics } from "../../../types/analytics";
import type { GmailConnectionStatus } from "../../../types/gmail";

type AnalyticsHeroProps = {
  readonly analytics: DashboardAnalytics;
  readonly canConnect: boolean;
  readonly connectionStatus: GmailConnectionStatus;
  readonly errorMessage: string;
  readonly isSyncing: boolean;
  readonly onConnect: () => Promise<void>;
  readonly onSync: () => Promise<void>;
  readonly signalCount: number;
};

export const AnalyticsHero = ({
  analytics,
  canConnect,
  connectionStatus,
  errorMessage,
  isSyncing,
  onConnect,
  onSync,
  signalCount,
}: AnalyticsHeroProps) => (
  <header className="operations-header">
    <div className="hero-command">
      <div className="hero-title-row">
        <p className="eyebrow">Gmail operations</p>
        <span className={`hero-status is-${connectionStatus}`}>
          {connectionStatus === "connected"
            ? "Gmail ready"
            : connectionStatus === "connecting"
              ? "Connecting"
              : "Local mode"}
        </span>
      </div>
      <h2 id="dashboard-title">Dashboard</h2>
      <p className="hero-copy">
        Gmail sync, attention queue, and tracker health in one workspace.
      </p>
      {errorMessage.length > 0 ? <p className="error-text">{errorMessage}</p> : null}
      <div className="hero-actions">
        <button
          className={`primary-action hero-connect-action is-${connectionStatus}`}
          disabled={!canConnect || connectionStatus === "connecting"}
          onClick={() => {
            void onConnect();
          }}
          type="button"
        >
          <span aria-hidden="true" />
          {connectionStatus === "connected" ? "Gmail connected" : "Connect Gmail"}
        </button>
        <button
          className="secondary-action hero-sync-action"
          disabled={connectionStatus !== "connected" || isSyncing}
          onClick={() => {
            void onSync();
          }}
          type="button"
        >
          {isSyncing ? "Analyzing..." : "Analyze new emails"}
        </button>
      </div>
    </div>
    <dl className="hero-metrics">
      <div className="hero-metric-card">
        <dt>Total</dt>
        <dd>{analytics.total}</dd>
        <span>applications</span>
      </div>
      <div className="hero-metric-card">
        <dt>Ongoing</dt>
        <dd>{analytics.ongoing}</dd>
        <span>active lanes</span>
      </div>
      <div className="hero-metric-card">
        <dt>Email signals</dt>
        <dd>{signalCount}</dd>
        <span>cached signals</span>
      </div>
    </dl>
  </header>
);
