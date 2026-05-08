import { useFrappeGetDocList } from "frappe-react-sdk";
import {
  Briefcase,
  FileText,
  AlertTriangle,
  Eye,
  ClipboardCheck,
  GraduationCap,
  ShieldAlert,
} from "lucide-react";

const nowISO = () => {
  const d = new Date();
  return d.toISOString().replace("T", " ").slice(0, 19);
};
const daysAgo = (n) => {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString().slice(0, 10);
};

function StatCard({ icon: Icon, label, value, sub, accent, className = "" }) {
  return (
    <div className={`stat-card ${className}`} data-accent={accent}>
      <div className="stat-card-head">
        <span className="stat-card-icon">
          <Icon size={18} />
        </span>
        <span className="stat-card-label">{label}</span>
      </div>
      <div className="stat-card-value">{value ?? "—"}</div>
      {sub && <div className="stat-card-sub">{sub}</div>}
    </div>
  );
}

function HeroCharterCard({ projects, charters }) {
  const total = (projects || []).length;
  const charterSet = new Set((charters || []).map((c) => c.project));
  const covered = (projects || []).filter((p) => charterSet.has(p.name)).length;
  const missing = total - covered;
  const pct = total ? Math.round((covered / total) * 100) : 0;
  const gap = missing > 0;
  const accent = total === 0 ? undefined : gap ? "amber" : "green";

  return (
    <div className="stat-card stat-card-hero" data-accent={accent}>
      <div className="stat-card-head">
        <span className="stat-card-icon">
          <FileText size={18} />
        </span>
        <span className="stat-card-label">HSE Charter Coverage</span>
      </div>
      <div className="hero-content">
        <div className="hero-pct">{pct}%</div>
        <div className="hero-meta">
          <div className="hero-line">
            <strong>{covered}</strong> of <strong>{total}</strong> projects
            have a charter
          </div>
          {gap && (
            <div className="hero-warning">
              <AlertTriangle size={14} /> {missing} project
              {missing > 1 ? "s" : ""} missing a charter
            </div>
          )}
          {!gap && total > 0 && (
            <div className="hero-ok">All projects have a charter</div>
          )}
        </div>
      </div>
      <div className="hero-progress">
        <div
          className="hero-progress-fill"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function IncidentsTallCard({ incidents }) {
  const total = (incidents || []).length;
  const counts = {};
  (incidents || []).forEach((i) => {
    const t = i.type_of_incident || "Other";
    counts[t] = (counts[t] || 0) + 1;
  });
  const types = [
    "Accident",
    "Near Miss",
    "First Aid",
    "HSE Violation",
    "Property Loss",
  ];

  return (
    <div className="stat-card stat-card-tall" data-accent="red">
      <div className="stat-card-head">
        <span className="stat-card-icon">
          <AlertTriangle size={18} />
        </span>
        <span className="stat-card-label">Total Incidents</span>
      </div>
      <div className="stat-card-value">{total}</div>
      <div className="incident-breakdown">
        {types.map((t) => (
          <div key={t} className="bd-row">
            <span>{t}</span>
            <strong>{counts[t] || 0}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrainingWideCard({ trainings }) {
  const counts = { Scheduled: 0, Completed: 0, Cancelled: 0 };
  (trainings || []).forEach((t) => {
    if (counts[t.event_status] !== undefined) counts[t.event_status]++;
  });
  const total = (trainings || []).length;

  return (
    <div className="stat-card stat-card-wide" data-accent="blue">
      <div className="stat-card-head">
        <span className="stat-card-icon">
          <GraduationCap size={18} />
        </span>
        <span className="stat-card-label">Training Events</span>
      </div>
      <div className="training-row">
        <div className="training-stat">
          <div className="training-num">{counts.Scheduled}</div>
          <div className="training-lbl">Scheduled</div>
        </div>
        <div className="training-divider" />
        <div className="training-stat">
          <div className="training-num">{counts.Completed}</div>
          <div className="training-lbl">Completed</div>
        </div>
        <div className="training-divider" />
        <div className="training-stat">
          <div className="training-num">{total}</div>
          <div className="training-lbl">Total</div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardStats({ projects, charters }) {
  const { data: incidents } = useFrappeGetDocList("Incident", {
    fields: ["name", "type_of_incident", "select_xafn", "date_reported"],
    limit: 0,
  });

  const { data: observations } = useFrappeGetDocList("Observation", {
    fields: ["name", "action_status"],
    limit: 0,
  });

  const { data: workPermits } = useFrappeGetDocList("Work Permit", {
    fields: ["name", "dateandtime_to"],
    limit: 0,
  });

  const { data: trainings } = useFrappeGetDocList("Training Event", {
    fields: ["name", "event_status"],
    limit: 0,
  });

  const projectCount = (projects || []).length;

  const openObsCount = (observations || []).filter(
    (o) => o.action_status === "Open" || o.action_status === "In Progress",
  ).length;

  const _now = nowISO();
  const activePermits = (workPermits || []).filter(
    (p) => p.dateandtime_to && p.dateandtime_to >= _now,
  ).length;

  const _30 = daysAgo(30);
  const recordable30 = (incidents || []).filter(
    (i) =>
      i.select_xafn === "Recordable" &&
      i.date_reported &&
      i.date_reported.slice(0, 10) >= _30,
  ).length;

  return (
    <div className="bento">
      <StatCard
        icon={Briefcase}
        label="Total Projects"
        value={projectCount}
        accent="blue"
      />
      <HeroCharterCard projects={projects} charters={charters} />
      <IncidentsTallCard incidents={incidents} />
      <StatCard
        icon={Eye}
        label="Open Observations"
        value={openObsCount}
        sub="needs follow-up"
        accent="amber"
      />
      <StatCard
        icon={ClipboardCheck}
        label="Active Work Permits"
        value={activePermits}
        sub="currently valid"
        accent="green"
      />
      <StatCard
        icon={ShieldAlert}
        label="Recordable Incidents"
        value={recordable30}
        sub="last 30 days"
        accent="red"
      />
      <TrainingWideCard trainings={trainings} />
    </div>
  );
}
