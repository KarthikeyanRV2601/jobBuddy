type JobBuddyLogoProps = {
  readonly title?: string;
};

export const JobBuddyLogo = ({ title = "JobBuddy" }: JobBuddyLogoProps) => (
  <svg
    aria-label={title}
    className="brand-logo"
    fill="none"
    role="img"
    viewBox="0 0 48 48"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect className="brand-logo-shell" height="42" rx="10" width="42" x="3" y="3" />
    <text
      className="brand-logo-type"
      dominantBaseline="middle"
      textAnchor="middle"
      x="24"
      y="24"
    >
      JB
    </text>
    <path className="brand-logo-signal" d="M13 36h22" />
    <circle className="brand-logo-dot" cx="38" cy="10" r="3" />
  </svg>
);
