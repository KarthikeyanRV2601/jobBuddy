import type { ApplicationFilters, ApplicationStatus } from "../../../types/application";
import type { ApplicationFilterCard } from "../../../utils/applicationFilters";

type TrackerToolbarProps = {
  readonly filterCards: readonly ApplicationFilterCard[];
  readonly filters: ApplicationFilters;
  readonly onQueryChange: (query: string) => void;
  readonly onStatusChange: (status: ApplicationStatus | "All") => void;
};

export const TrackerToolbar = ({
  filterCards,
  filters,
  onQueryChange,
  onStatusChange,
}: TrackerToolbarProps) => (
  <section className="toolbar" aria-label="Tracker controls">
    <div className="filter-card-grid" role="list" aria-label="Status filters">
      {filterCards.map((card) => (
        <button
          className={`filter-card${filters.status === card.label ? " is-active" : ""}`}
          key={card.label}
          onClick={() => onStatusChange(card.label)}
          type="button"
        >
          <span>{card.label}</span>
          <strong>{card.count}</strong>
        </button>
      ))}
    </div>
    <label className="search-field">
      Search
      <input
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Company, role, notes, skills"
        type="search"
        value={filters.query}
      />
    </label>
  </section>
);
