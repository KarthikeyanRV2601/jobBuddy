import { useMemo, useState } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { DashboardView } from "./features/dashboard/DashboardView";
import { TrackerView } from "./features/tracker/TrackerView";
import type { Application } from "./types/application";
import type { EmailSignal } from "./types/email";
import type { AppView } from "./types/navigation";
import type { Note } from "./types/note";
import type { GmailSyncCache } from "./types/sync";
import { isApplicationList } from "./utils/applicationGuards";
import { getApplicationMetrics } from "./utils/applications";
import { isEmailSignalList } from "./utils/emailGuards";
import { isNoteList } from "./utils/noteGuards";
import {
  EMPTY_GMAIL_SYNC_CACHE,
  isGmailSyncCache,
  normalizeGmailSyncCache,
} from "./utils/syncGuards";
import { readJson, removeStorageItem, writeJson } from "./utils/storage";

const APPLICATION_STORAGE_KEY = "jobbuddy.applications.v1";
const EMAIL_STORAGE_KEY = "jobbuddy.emailSignals.v1";
const NOTE_STORAGE_KEY = "jobbuddy.notes.v1";
const GMAIL_SYNC_CACHE_STORAGE_KEY = "jobbuddy.gmailSyncCache.v1";

export const App = () => {
  const [view, setView] = useState<AppView>("dashboard");
  const [applications, setApplicationsState] = useState<readonly Application[]>(() =>
    readJson(window.localStorage, APPLICATION_STORAGE_KEY, [], isApplicationList),
  );
  const [emailSignals, setEmailSignalsState] = useState<readonly EmailSignal[]>(() =>
    readJson(window.localStorage, EMAIL_STORAGE_KEY, [], isEmailSignalList),
  );
  const [notes, setNotesState] = useState<readonly Note[]>(() =>
    readJson(window.localStorage, NOTE_STORAGE_KEY, [], isNoteList),
  );
  const [gmailSyncCache, setGmailSyncCacheState] = useState<GmailSyncCache>(() =>
    normalizeGmailSyncCache(
      readJson(
        window.localStorage,
        GMAIL_SYNC_CACHE_STORAGE_KEY,
        EMPTY_GMAIL_SYNC_CACHE,
        isGmailSyncCache,
      ),
    ),
  );

  const metrics = useMemo(
    () => getApplicationMetrics(applications),
    [applications],
  );

  const setApplications = (nextApplications: readonly Application[]): void => {
    setApplicationsState(nextApplications);
    writeJson(window.localStorage, APPLICATION_STORAGE_KEY, nextApplications);
  };

  const setEmailSignals = (nextSignals: readonly EmailSignal[]): void => {
    setEmailSignalsState(nextSignals);
    writeJson(window.localStorage, EMAIL_STORAGE_KEY, nextSignals);
  };

  const setNotes = (nextNotes: readonly Note[]): void => {
    setNotesState(nextNotes);
    writeJson(window.localStorage, NOTE_STORAGE_KEY, nextNotes);
  };

  const setGmailSyncCache = (nextCache: GmailSyncCache): void => {
    setGmailSyncCacheState(nextCache);
    writeJson(window.localStorage, GMAIL_SYNC_CACHE_STORAGE_KEY, nextCache);
  };

  const clearEmailCache = (): void => {
    setEmailSignalsState([]);
    setGmailSyncCacheState(EMPTY_GMAIL_SYNC_CACHE);
    removeStorageItem(window.localStorage, EMAIL_STORAGE_KEY);
    removeStorageItem(window.localStorage, GMAIL_SYNC_CACHE_STORAGE_KEY);
  };

  const clearAllLocalData = (): void => {
    setApplicationsState([]);
    setEmailSignalsState([]);
    setNotesState([]);
    setGmailSyncCacheState(EMPTY_GMAIL_SYNC_CACHE);
    removeStorageItem(window.localStorage, APPLICATION_STORAGE_KEY);
    removeStorageItem(window.localStorage, EMAIL_STORAGE_KEY);
    removeStorageItem(window.localStorage, NOTE_STORAGE_KEY);
    removeStorageItem(window.localStorage, GMAIL_SYNC_CACHE_STORAGE_KEY);
  };

  return (
    <div className="app-shell">
      <Sidebar metrics={metrics} view={view} onViewChange={setView} />
      <main className="workspace">
        {view === "dashboard" ? (
          <DashboardView
            applications={applications}
            gmailSyncCache={gmailSyncCache}
            onApplicationsChange={setApplications}
            onClearAllLocalData={clearAllLocalData}
            onClearEmailCache={clearEmailCache}
            onGmailSyncCacheChange={setGmailSyncCache}
            onSignalsChange={setEmailSignals}
            signals={emailSignals}
          />
        ) : null}
        {view === "tracker" ? (
          <TrackerView
            applications={applications}
            notes={notes}
            onApplicationsChange={setApplications}
            onNotesChange={setNotes}
          />
        ) : null}
      </main>
    </div>
  );
};
