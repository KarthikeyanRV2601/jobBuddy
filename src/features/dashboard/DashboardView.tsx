import { useMemo, useState } from "react";
import { AnalyticsHero } from "./components/AnalyticsHero";
import { AttentionPanel } from "./components/AttentionPanel";
import { DataControls } from "./components/DataControls";
import { FocusMetrics } from "./components/FocusMetrics";
import { GmailSyncPanel } from "../email/components/GmailSyncPanel";
import { TimelineChart } from "./components/TimelineChart";
import type { Application } from "../../types/application";
import type { EmailSignal } from "../../types/email";
import type { GmailConnectionStatus, GmailSyncResult } from "../../types/gmail";
import type { GmailSyncCache } from "../../types/sync";
import { getDashboardAnalytics } from "../../utils/analytics";
import { getErrorMessage } from "../../utils/errors";
import {
  DEFAULT_GMAIL_QUERY,
  getGoogleClientId,
  hasGoogleClientId,
} from "../../utils/gmailConfig";
import { syncGmailAndBuildTracker } from "../../utils/gmailAutomation";
import { requestGmailAccessToken } from "../../utils/googleIdentity";
import {
  buildIncrementalGmailQuery,
  createGmailSyncCache,
} from "../../utils/syncCache";
import {
  getAttentionItems,
  getAttentionSummary,
} from "../../utils/emailTriage";

type DashboardViewProps = {
  readonly applications: readonly Application[];
  readonly gmailSyncCache: GmailSyncCache;
  readonly onApplicationsChange: (applications: readonly Application[]) => void;
  readonly onClearAllLocalData: () => void;
  readonly onClearEmailCache: () => void;
  readonly onGmailSyncCacheChange: (cache: GmailSyncCache) => void;
  readonly onSignalsChange: (signals: readonly EmailSignal[]) => void;
  readonly signals: readonly EmailSignal[];
};

export const DashboardView = ({
  applications,
  gmailSyncCache,
  onApplicationsChange,
  onClearAllLocalData,
  onClearEmailCache,
  onGmailSyncCacheChange,
  onSignalsChange,
  signals,
}: DashboardViewProps) => {
  const [accessToken, setAccessToken] = useState<string>("");
  const [connectionStatus, setConnectionStatus] =
    useState<GmailConnectionStatus>("disconnected");
  const [syncQuery, setSyncQuery] = useState<string>(DEFAULT_GMAIL_QUERY);
  const [syncStartDate, setSyncStartDate] = useState<string>("");
  const [syncResult, setSyncResult] = useState<GmailSyncResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const analytics = useMemo(
    () => getDashboardAnalytics(applications),
    [applications],
  );
  const attentionItems = useMemo(
    () => getAttentionItems(signals),
    [signals],
  );
  const attentionSummary = useMemo(
    () => getAttentionSummary(attentionItems),
    [attentionItems],
  );

  const handleConnect = async (): Promise<void> => {
    setErrorMessage("");
    setConnectionStatus("connecting");

    try {
      const token = await requestGmailAccessToken(getGoogleClientId());
      setAccessToken(token);
      setConnectionStatus("connected");
    } catch (error) {
      setConnectionStatus("disconnected");
      setErrorMessage(getErrorMessage(error));
    }
  };

  const handleSync = async (): Promise<void> => {
    if (accessToken.length === 0) {
      setErrorMessage("Connect Gmail before analyzing emails.");
      return;
    }

    setIsSyncing(true);
    setErrorMessage("");

    try {
      const query = buildIncrementalGmailQuery(
        syncQuery,
        gmailSyncCache,
        syncStartDate,
      );
      const result = await syncGmailAndBuildTracker(
        {
          accessToken,
          query,
        },
        applications,
        signals,
      );

      onApplicationsChange(result.applications);
      onSignalsChange(result.signals);
      onGmailSyncCacheChange(
        createGmailSyncCache(
          result.syncedAt,
          syncQuery,
          result.matchedCount,
          result.signals.length,
        ),
      );
      setSyncResult(result);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <section aria-labelledby="dashboard-title" className="dashboard-view">
      <AnalyticsHero
        analytics={analytics}
        canConnect={hasGoogleClientId()}
        connectionStatus={connectionStatus}
        errorMessage={errorMessage}
        isSyncing={isSyncing}
        onConnect={handleConnect}
        onSync={handleSync}
        signalCount={signals.length}
      />
      <section className="dashboard-main-grid">
        <div className="dashboard-left-stack">
          <section className="dashboard-sync-grid">
            <GmailSyncPanel
              cache={gmailSyncCache}
              isConnected={connectionStatus === "connected"}
              isSyncing={isSyncing}
              onQueryChange={setSyncQuery}
              onStartDateChange={setSyncStartDate}
              onSync={handleSync}
              query={syncQuery}
              result={syncResult}
              startDate={syncStartDate}
            />
            <DataControls
              onClearAllLocalData={onClearAllLocalData}
              onClearEmailCache={onClearEmailCache}
            />
          </section>
          <section className="dashboard-lower-scroll">
            <FocusMetrics metrics={analytics.focusMetrics} />
            <section className="dashboard-grid">
              <TimelineChart applications={applications} />
            </section>
          </section>
        </div>
        <AttentionPanel items={attentionItems} summary={attentionSummary} />
      </section>
    </section>
  );
};
