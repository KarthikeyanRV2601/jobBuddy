import type { Application } from "../../../types/application";
import { getApplicationContributionCalendar } from "../../../utils/analytics";

type TimelineChartProps = {
  readonly applications: readonly Application[];
};

export const TimelineChart = ({ applications }: TimelineChartProps) => {
  const calendar = getApplicationContributionCalendar(applications);

  return (
    <section className="dashboard-panel timeline-panel">
      <div className="section-heading compact-heading">
        <h3>{calendar.total} applications in the last year</h3>
      </div>
      <div className="contribution-chart" aria-label="Applications in the last year">
        <div className="contribution-months" aria-hidden="true">
          {calendar.weeks.map((week) => (
            <span key={week.cells[0]?.dateKey ?? week.monthLabel}>
              {week.monthLabel}
            </span>
          ))}
        </div>
        <div className="contribution-body">
          <div className="contribution-days" aria-hidden="true">
            <span />
            <span>Mon</span>
            <span />
            <span>Wed</span>
            <span />
            <span>Fri</span>
            <span />
          </div>
          <div className="contribution-weeks">
            {calendar.weeks.map((week) => (
              <div
                className="contribution-week"
                key={week.cells[0]?.dateKey ?? week.monthLabel}
              >
                {week.cells.map((cell) => (
                  <span
                    aria-label={`${cell.count} applications on ${cell.dateLabel}`}
                    className={`contribution-cell heat-${cell.intensity}`}
                    key={cell.dateKey}
                    title={`${cell.count} applications on ${cell.dateLabel}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="contribution-footer">
          <span>Less</span>
          <span className="contribution-cell heat-0" />
          <span className="contribution-cell heat-1" />
          <span className="contribution-cell heat-2" />
          <span className="contribution-cell heat-3" />
          <span className="contribution-cell heat-4" />
          <span>More</span>
        </div>
      </div>
    </section>
  );
};
