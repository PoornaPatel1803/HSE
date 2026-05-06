// Copyright (c) 2026, Octo Advisory and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Inspection Checklist", {
// 	refresh(frm) {

// 	},
// });


// ============================================================
//  inspection_checklist.js
//  DocType: Inspection Checklist
// ============================================================

frappe.ui.form.on('Inspection Checklist', {

    refresh(frm) {

        // ── Create Observation button ─────────────────────────────────────
        $('button[data-fieldname="create_observation"]').css({
            "background-color": "#2cb4e0",
            "color":            "#fff",
            "border-radius":    "6px",
            "padding":          "6px 12px",
            "font-weight":      "bold",
            "border":           "none"
        });

        frm.fields_dict.create_observation.$input.off("click").on("click", () => {
            frappe.model.with_doc("HSE Charter", frm.doc.inspection_for, function () {
                const hse_doc    = frappe.model.get_doc("HSE Charter", frm.doc.inspection_for);
                const matched_row = (hse_doc.planning || []).find(
                    row => row.inspection_checklist === frm.doc.name
                );

                if (matched_row) {
                    frappe.new_doc('Observation', {
                        checklist_training:   frm.doc.name,
                        document_type:        "Inspection Checklist",
                        observation_select:   matched_row.inspector,
                        observation_by_link:  matched_row.conducted_by_link,
                        observation_by_data:  matched_row.conducted_by_data,
                        observation_location: matched_row.location || "",
                        current_project:      hse_doc.project,
                        name1:                matched_row.activity_name,
                        name_of_the_plant:    matched_row.plantlocation
                    });
                }
            });
        });

        // ── Observations HTML table ───────────────────────────────────────
        frappe.db.get_list("Observation", {
            fields:   ["name", "module", "name1", "priority", "creation"],
            filters:  { checklist_training: frm.doc.name },
            order_by: "creation desc"
        }).then(observations => {
            const $wrapper = frm.fields_dict.html_for_observation.$wrapper;

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

        // ── Show / hide columns based on planning type ────────────────────
        const child      = "Inspection Checklist Item";
        const table      = "checklist_items";

        const all_fields = [
            "inspected_ppes_in_nos",
            "found_ok_in_nos",
            "rejected_ppes_in_nos",
            "quantity_required_in_first_aid_box",
            "quantity_available_in_first_aid_box_during_inspection",
            "added_quantity",
            "expiry_date",
            "total_quantity_in_first_aid_box_after_addition",
            "required_quantity_to_be_purchased"
        ];

        // Hide all first
        all_fields.forEach(f => {
            frappe.meta.get_docfield(child, f, frm.doc.name).hidden = 1;
        });

        if (frm.doc.planning === "Inspection-PPE Inspection Record") {
            ["inspected_ppes_in_nos", "found_ok_in_nos", "rejected_ppes_in_nos"]
                .forEach(f => {
                    frappe.meta.get_docfield(child, f, frm.doc.name).hidden = 0;
                });

        } else if (frm.doc.planning === "Inspection-First Aid Box Inspection Checklist") {
            [
                "quantity_required_in_first_aid_box",
                "quantity_available_in_first_aid_box_during_inspection",
                "added_quantity",
                "expiry_date",
                "total_quantity_in_first_aid_box_after_addition",
                "required_quantity_to_be_purchased"
            ].forEach(f => {
                frappe.meta.get_docfield(child, f, frm.doc.name).hidden = 0;
            });
        }

        frm.refresh_field(table);
    }
});