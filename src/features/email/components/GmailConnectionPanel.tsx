import type { GmailConnectionStatus } from "../../../types/gmail";
import { getConnectionLabel } from "../../../utils/gmailUi";

type GmailConnectionPanelProps = {
  readonly canConnect: boolean;
  readonly connectionStatus: GmailConnectionStatus;
  readonly errorMessage: string;
  readonly onConnect: () => Promise<void>;
};

export const GmailConnectionPanel = ({
  canConnect,
  connectionStatus,
  errorMessage,
  onConnect,
}: GmailConnectionPanelProps) => (
  <section className="gmail-control-panel" aria-label="Gmail connection">
    <div>
      <h3>Gmail connection</h3>
      <p>{getConnectionLabel(canConnect, connectionStatus)}</p>
      {errorMessage.length > 0 ? <p className="error-text">{errorMessage}</p> : null}
    </div>
    <button
      className="primary-action"
      disabled={!canConnect || connectionStatus === "connecting"}
      onClick={() => {
        void onConnect();
      }}
      type="button"
    >
      {connectionStatus === "connected" ? "Reconnect Gmail" : "Connect Gmail"}
    </button>
  </section>
);
