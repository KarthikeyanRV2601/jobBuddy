type DataControlsProps = {
  readonly onClearAllLocalData: () => void;
  readonly onClearEmailCache: () => void;
};

export const DataControls = ({
  onClearAllLocalData,
  onClearEmailCache,
}: DataControlsProps) => (
  <section className="data-control-panel" aria-label="Local data controls">
    <div>
      <h3>Local data</h3>
      <p>Email cache is compact. Tracker data and skill notes stay local.</p>
    </div>
    <div className="data-actions">
      <button className="secondary-action" onClick={onClearEmailCache} type="button">
        Clear email cache
      </button>
      <button
        className="danger-action"
        onClick={onClearAllLocalData}
        type="button"
      >
        Clear all local data
      </button>
    </div>
  </section>
);
