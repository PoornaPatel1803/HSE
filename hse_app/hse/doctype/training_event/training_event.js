// Copyright (c) 2026, Octo Advisory and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Training Event", {
// 	refresh(frm) {

// 	},
// });

// ============================================================
//  training_event.js
//  DocType: Training Event
// ============================================================

frappe.ui.form.on('Training Event', {

    // Single refresh handler — both observation button + HTML table merged here
    refresh(frm) {

        // ── Create Observation button (bound once) ────────────────────────
        if (!frm.custom_create_observation_bound) {
            frm.custom_create_observation_bound = true;

            $('button[data-fieldname="custom_create_observation"]').css({
                "background-color": "#2cb4e0",
                "color":            "#fff",
                "border-radius":    "6px",
                "padding":          "6px 12px",
                "font-weight":      "bold",
                "border":           "none"
            });

            frm.fields_dict.custom_create_observation.$input.off("click").on("click", () => {
                // Extract project ID from the Training Event name  e.g. "PROJ-0001-..."
                const match      = frm.doc.name.match(/PROJ-\d+/);
                const project_id = match ? match[0] : null;

                if (!project_id) {
                    frappe.msgprint(
                        `Could not extract Project ID from Training Event ID: ${frm.doc.name}`
                    );
                    return;
                }

                frappe.new_doc('Observation', {
                    document_type:        "Training Event",
                    checklist_training:   frm.doc.name,
                    current_project:      project_id,
                    observation_by:       frappe.session.user,
                    name1:                frm.doc.training_program,
                    module:               "Training",
                    observation_location: frm.doc.location
                });
            });
        }

        // ── Observations HTML table ───────────────────────────────────────
        frappe.db.get_list("Observation", {
            fields:   ["name", "module", "name1", "priority", "creation"],
            filters:  { checklist_training: frm.doc.name },
            order_by: "creation desc"
        }).then(observations => {
            const $wrapper = frm.fields_dict.custom_html_for_observation.$wrapper;

            if (!observations.length) {
                $wrapper.html("<p>No Observations found.</p>");
                return;
            }

            $wrapper.html(`
                <table class="table table-bordered table-sm"
                       style="width:100%; margin-top:10px;">
                    <thead style="background:#f8f9fa;">
                        <tr>
                            <th>Module</th>
                            <th>Activity</th>
                            <th>Priority</th>
                            <th>Created On</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${observations.map(o => `
                            <tr data-name="${o.name}">
                                <td>${o.module   || ''}</td>
                                <td>${o.name1    || ''}</td>
                                <td>${o.priority || ''}</td>
                                <td>${frappe.datetime.str_to_user(o.creation)}</td>
                                <td>
                                    <button class="btn btn-xs btn-primary"
                                        onclick="frappe.set_route('Form','Observation','${o.name}')">
                                        View
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `);
        });
    }
});