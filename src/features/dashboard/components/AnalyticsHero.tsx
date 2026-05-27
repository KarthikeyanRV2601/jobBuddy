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
    <div>
      <p className="eyebrow">Gmail operations</p>
      <h2 id="dashboard-title">Dashboard</h2>
      <p className="hero-copy">Gmail sync, attention queue, and tracker health in one workspace.</p>
      {errorMessage.length > 0 ? <p className="error-text">{errorMessage}</p> : null}
      <div className="hero-actions">
        <button
          className="primary-action"
          disabled={!canConnect || connectionStatus === "connecting"}
          onClick={() => {
            void onConnect();
          }}
          type="button"
        >
          {connectionStatus === "connected" ? "Gmail connected" : "Connect Gmail"}
        </button>
        <button
          className="secondary-action"
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
      <div>
        <dt>Total</dt>
        <dd>{analytics.total}</dd>
      </div>
      <div>
        <dt>Ongoing</dt>
        <dd>{analytics.ongoing}</dd>
      </div>
      <div>
        <dt>Email signals</dt>
        <dd>{signalCount}</dd>
      </div>
    </dl>
  </header>
);
