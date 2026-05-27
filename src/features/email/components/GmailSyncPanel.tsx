import type { FormEvent } from "react";
import { useState } from "react";
import type { GmailSyncResult } from "../../../types/gmail";
import type { GmailSyncCache } from "../../../types/sync";
import { getQueryPreview, getSyncSummary } from "../../../utils/gmailUi";
import { getSyncCacheSummary } from "../../../utils/syncCache";

type GmailSyncPanelProps = {
  readonly cache: GmailSyncCache;
  readonly isConnected: boolean;
  readonly isSyncing: boolean;
  readonly query: string;
  readonly result: GmailSyncResult | null;
  readonly startDate: string;
  readonly onQueryChange: (query: string) => void;
  readonly onStartDateChange: (date: string) => void;
  readonly onSync: () => Promise<void>;
};

export const GmailSyncPanel = ({
  cache,
  isConnected,
  isSyncing,
  query,
  result,
  startDate,
  onQueryChange,
  onStartDateChange,
  onSync,
}: GmailSyncPanelProps) => {
  const [isQueryEditorOpen, setIsQueryEditorOpen] = useState<boolean>(false);
  const [draftQuery, setDraftQuery] = useState<string>(query);
  const queryKeywordCount = getQueryKeywordCount(query);

  const handleOpenQueryEditor = (): void => {
    setDraftQuery(query);
    setIsQueryEditorOpen(true);
  };

  const handleSubmitQuery = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onQueryChange(draftQuery);
    setIsQueryEditorOpen(false);
  };

  return (
    <section className="gmail-control-panel gmail-sync-panel" aria-label="Gmail sync">
      <div className="query-summary">
        <div className="query-summary-main">
          <span className="query-badge">Auto scan rule</span>
          <strong title={query}>{getQueryPreview(query)}</strong>
          <div className="query-chip-list" aria-label="Search rule summary">
            <span>{queryKeywordCount} signals</span>
            <span>180d default</span>
            <span>Incremental</span>
          </div>
        </div>
        <button
          className="query-edit-button"
          onClick={handleOpenQueryEditor}
          type="button"
        >
          <span aria-hidden="true">+</span>
          Edit
        </button>
      </div>
      <label className="sync-date-field">
        <span>Scan from</span>
        <input
          onChange={(event) => onStartDateChange(event.target.value)}
          type="date"
          value={startDate}
        />
      </label>
      <div className="sync-actions">
        <button
          className="primary-action"
          disabled={!isConnected || isSyncing}
          onClick={() => {
            void onSync();
          }}
          type="button"
        >
          {isSyncing ? "Syncing..." : "Sync Gmail"}
        </button>
        {result === null ? null : (
          <span className="meta-line">{getSyncSummary(result)}</span>
        )}
      </div>
      <span className="meta-line sync-window-note">
        Blank uses last sync; first run scans last 180 days.
      </span>
      <p className="sync-cache-line">{getSyncCacheSummary(cache)}</p>

      {isQueryEditorOpen ? (
        <div className="edit-popup-backdrop" role="presentation">
          <section className="query-edit-popup" aria-label="Edit Gmail search query">
            <div className="sticky-note-header">
              <div>
                <p className="eyebrow">Gmail search</p>
                <h3>Edit query</h3>
                <span>Controls which emails JobBuddy analyzes during sync.</span>
              </div>
              <button
                aria-label="Close query editor"
                className="icon-button"
                onClick={() => setIsQueryEditorOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmitQuery}>
              <label>
                Search query
                <textarea
                  onChange={(event) => setDraftQuery(event.target.value)}
                  rows={8}
                  value={draftQuery}
                />
              </label>
              <div className="form-actions">
                <button
                  className="secondary-action"
                  onClick={() => setIsQueryEditorOpen(false)}
                  type="button"
                >
                  Cancel
                </button>
                <button className="primary-action" type="submit">
                  Save query
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
};

const getQueryKeywordCount = (query: string): number => {
  const matches = query.match(/"[^"]+"|[\w-]+/g);
  return matches === null ? 0 : matches.length;
};
