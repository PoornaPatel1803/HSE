import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  useFrappeGetDocList,
  useFrappeDocTypeEventListener,
} from "frappe-react-sdk";
import { Search, FileText, Plus } from "lucide-react";
import DashboardStats from "./DashboardStats.jsx";

export default function ProjectList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: projects,
    isLoading: projectsLoading,
    error: projectsError,
    mutate: refreshProjects,
  } = useFrappeGetDocList("Project", {
    fields: ["name", "project_name", "status"],
    limit: 0,
    orderBy: { field: "modified", order: "desc" },
  });

  const { data: charters, mutate: refreshCharters } = useFrappeGetDocList(
    "HSE Charter",
    {
      fields: ["name", "project"],
      limit: 0,
    },
  );

  useFrappeDocTypeEventListener("Project", () => refreshProjects());
  useFrappeDocTypeEventListener("HSE Charter", () => refreshCharters());

  const charterFor = (projectName) =>
    (charters || []).find((c) => c.project === projectName);

  const filtered = (projects || []).filter((p) => {
    const t = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(t) ||
      (p.project_name || "").toLowerCase().includes(t)
    );
  });

  return (
    <main className="max-w-7xl mx-auto p-6">
      <DashboardStats projects={projects} charters={charters} />
      <div className="card">
        <div className="card-header flex items-center justify-between gap-4">
          {/* LEFT SIDE */}
          <div>
            <div className="card-title">HSE Charter Management</div>
            <div className="card-desc">
              Select a project to view or create an HSE Charter
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="relative w-72">
            <Search
              size={16}
              style={{
                position: "absolute",
                left: ".75rem",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted-foreground)",
              }}
            />
            <input
              className="input w-full"
              style={{ paddingLeft: "2.25rem" }}
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="card-content">
          {/* Table */}
          <div className="border border-default rounded-lg overflow-hidden">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Project Name</th>
                  <th>HSE Charter</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projectsError ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        textAlign: "center",
                        padding: "2rem",
                        color: "var(--destructive)",
                      }}
                    >
                      Failed to load projects: {projectsError.message}
                    </td>
                  </tr>
                ) : projectsLoading ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ textAlign: "center", padding: "2rem" }}
                    >
                      Loading projects...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-muted-foreground"
                      style={{ textAlign: "center", padding: "2rem" }}
                    >
                      No projects found
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const charter = charterFor(p.name);
                    const statusClass =
                      p.status === "Open" || p.status === "Active"
                        ? "badge-blue"
                        : p.status === "Completed"
                          ? "badge-green"
                          : p.status === "Cancelled"
                            ? "badge-gray"
                            : "badge-amber";

                    return (
                      <tr key={p.name}>
                        <td style={{ fontWeight: 500 }}>{p.name}</td>
                        <td>{p.project_name || "-"}</td>
                        {/* <td>
                          <span className={`badge ${statusClass}`}>
                            {p.status || 'Open'}
                          </span>
                        </td> */}
                        <td>
                          {charter ? (
                            <span className="badge badge-green">
                              <FileText size={14} /> {charter.name}
                            </span>
                          ) : (
                            <span
                              className="text-muted-foreground"
                              style={{ fontSize: ".8125rem" }}
                            >
                              No charter
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {charter ? (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() =>
                                navigate(
                                  `/charter/${encodeURIComponent(charter.name)}`,
                                )
                              }
                            >
                              <FileText size={14} /> View Charter
                            </button>
                          ) : (
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() =>
                                navigate(
                                  `/charter/new/${encodeURIComponent(p.name)}`,
                                )
                              }
                            >
                              <Plus size={14} /> Create Charter
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
