// Copyright (c) 2026, Octo Advisory and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Observation", {
// 	refresh(frm) {

// 	},
// });



// ============================================================
//  observation.js
//  DocType: Observation
// ============================================================


// ── List View ────────────────────────────────────────────────────────────────

frappe.listview_settings['Observation'] = {
    onload: function (listview) {
        cur_list.columns.push({
            type: "Field",
            df: {
                label:     __("Created On"),
                fieldname: "creation",
                fieldtype: "Datetime"
            }
        });
        cur_list.refresh(true);
    },
    formatters: {
        creation: function (value) {
            return value ? frappe.format(value, { fieldtype: "Datetime" }) : "";
        }
    }
};


// ── Form ─────────────────────────────────────────────────────────────────────

frappe.ui.form.on('Observation', {

    refresh(frm) {

        // "Go to Source Record" button
        if (frm.doc.document_type && frm.doc.checklist_training) {
            frm.add_custom_button("Go to Source Record", () => {
                frappe.set_route("Form", frm.doc.document_type, frm.doc.checklist_training);
            }).css({
                "background-color": "#2cb4e0",
                "color":            "#fff",
                "border-radius":    "6px",
                "padding":          "6px 12px",
                "font-weight":      "bold",
                "border":           "none"
            });
        }

        // "Create Lesson Learned" button
        frm.add_custom_button(__("Create Lesson Learned"), () => {
            frappe.new_doc("Lesson Learned", {
                doctype_selected:  frm.doctype,
                source_record:     frm.doc.name,
                title:             frm.doc.name1,
                type:              frm.doc.observation_type,
                incident_location: frm.doc.observation_location
            });
        }).css({
            "background-color": "#2cb4e0",
            "color":            "#fff",
            "border-radius":    "6px",
            "padding":          "6px 12px",
            "font-weight":      "bold",
            "border":           "none"
        });
    },

    // UA / UC category filter
    observation_type(frm) {
        const type_map = {
            "Unsafe Condition": "Unsafe Condition",
            "Unsafe Act":       "Unsafe Act"
        };
        const type = type_map[frm.doc.observation_type];
        if (type) {
            frm.set_query('condition_category', () => ({
                filters: { type }
            }));
        }
    },

    // Auto-fill observation_by_link when Employee is selected
    observation_select(frm) {
        if (frm.doc.observation_select === "Employee") {
            frm.set_value('observation_by_link', frappe.session.user);
        }
    }
});