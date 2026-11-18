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
        <p className="eyebrow">YOUR CAREER, IN MOTION</p>
        <span className={`hero-status is-${connectionStatus}`}>
          {connectionStatus === "connected"
            ? "Gmail ready"
            : connectionStatus === "connecting"
              ? "Connecting"
              : "Local mode"}
        </span>
      </div>
      <h2 id="dashboard-title">Next stop.<br /><span>Your next big thing.</span></h2>
      <span className="hero-sticker" aria-hidden="true">✳</span>
      <p className="hero-copy">
        Less inbox chaos. More main-character career moves.
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
    <dl className="hero-metrics" aria-label="Your job search at a glance">
      <div className="hero-metric-card">
        <dt>Shots taken ↗</dt>
        <dd>{analytics.total}</dd>
        <span>applications</span>
      </div>
      <div className="hero-metric-card">
        <dt>In the works</dt>
        <dd>{analytics.ongoing}</dd>
        <span>active opportunities</span>
      </div>
      <div className="hero-metric-card">
        <dt>Inbox intel</dt>
        <dd>{signalCount}</dd>
        <span>emails, decoded</span>
      </div>
    </dl>
  </header>
);
