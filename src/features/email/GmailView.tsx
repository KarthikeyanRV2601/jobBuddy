import { useState } from "react";
import { GmailConnectionPanel } from "./components/GmailConnectionPanel";
import { EmailHistory } from "./components/EmailHistory";
import { GmailSyncPanel } from "./components/GmailSyncPanel";
import type { Application } from "../../types/application";
import type { EmailSignal } from "../../types/email";
import type { GmailConnectionStatus, GmailSyncResult } from "../../types/gmail";
import type { GmailSyncCache } from "../../types/sync";
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

type GmailViewProps = {
  readonly applications: readonly Application[];
  readonly gmailSyncCache: GmailSyncCache;
  readonly onClearAllLocalData: () => void;
  readonly onClearEmailCache: () => void;
  readonly onApplicationsChange: (applications: readonly Application[]) => void;
  readonly onGmailSyncCacheChange: (cache: GmailSyncCache) => void;
  readonly signals: readonly EmailSignal[];
  readonly onSignalsChange: (signals: readonly EmailSignal[]) => void;
};

export const GmailView = ({
  applications,
  gmailSyncCache,
  onClearAllLocalData,
  onClearEmailCache,
  onApplicationsChange,
  onGmailSyncCacheChange,
  signals,
  onSignalsChange,
}: GmailViewProps) => {
  const [accessToken, setAccessToken] = useState<string>("");
  const [connectionStatus, setConnectionStatus] =
    useState<GmailConnectionStatus>("disconnected");
  const [syncQuery, setSyncQuery] = useState<string>(DEFAULT_GMAIL_QUERY);
  const [syncStartDate, setSyncStartDate] = useState<string>("");
  const [syncResult, setSyncResult] = useState<GmailSyncResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const handleClearHistory = (): void => {
    onClearEmailCache();
  };

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
      setErrorMessage("Connect Gmail before syncing messages.");
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
    <section aria-labelledby="gmail-title">
      <header className="page-header">
        <div>
          <p className="eyebrow">Automated Gmail tracking</p>
          <h2 id="gmail-title">Sync job emails and build your tracker</h2>
        </div>
      </header>

      <GmailConnectionPanel
        canConnect={hasGoogleClientId()}
        connectionStatus={connectionStatus}
        errorMessage={errorMessage}
        onConnect={handleConnect}
      />

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

      <EmailHistory
        onClear={handleClearHistory}
        onClearAllLocalData={onClearAllLocalData}
        signals={signals}
      />
    </section>
  );
};
