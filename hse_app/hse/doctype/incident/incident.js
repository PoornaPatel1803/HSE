// Copyright (c) 2026, Octo Advisory and contributors
// For license information, please see license.txt

// frappe.ui.form.on("Incident", {
// 	refresh(frm) {

// 	},
// });


// ============================================================
//  incident.js
//  DocType: Incident
// ============================================================

frappe.ui.form.on('Incident', {

    // ── refresh ──────────────────────────────────────────────────────────
    refresh(frm) {
        // "Create Lesson Learned" button — only for System Manager / HSE Head
        if (
            frappe.user.has_role("System Manager") ||
            frappe.user.has_role("HSE Head")
        ) {
            if (frm.doc.type_of_incident) {
                frm.add_custom_button("Create Lesson Learned", () => {
                    frappe.new_doc("Lesson Learned", {
                        doctype_selected:  frm.doctype,
                        source_record:     frm.doc.name,
                        title:             frm.doc.select_xafn,
                        type:              frm.doc.type_of_incident,
                        incident_location: frm.doc.plant
                    });
                }).css({
                    "background-color": "#2cb4e0",
                    "color":            "#fff",
                    "border-radius":    "6px",
                    "padding":          "6px 12px",
                    "font-weight":      "bold",
                    "border":           "none"
                });
            }
        }
    },

    // ── validate ─────────────────────────────────────────────────────────
    validate(frm) {
        if (frm.doc.age && frm.doc.age <= 18) {
            frappe.throw("Enter appropriate age");
        }
    },

    // ── field triggers ───────────────────────────────────────────────────

    select_xafn(frm) {
        if (frm.doc.select_xafn === "Recordable") {
            frappe.confirm(
                "Are you sure it is a recordable incident?",
                () => { /* confirmed — do nothing */ },
                () => { frm.set_value("select_xafn", "Non-Recordable"); }
            );
        }
    },

    type_of_accident(frm) {
        if (frm.doc.type_of_accident === "LTI:Lost Time Accident") {
            frm.set_value("lti", "1");
        }
        if (frm.doc.type_of_accident === "MTC:Medical Treatment case") {
            frm.set_value("medical_treatment_case", "1");
        }
        if (frm.doc.type_of_accident === "FAC:First Aid Cases") {
            frm.set_value("first_aid_injury", "1");
        }
    },

    project_name(frm) {
        frm.set_query("name_of_site", () => ({
            filters: { project: frm.doc.project_name }
        }));
    },

    // "Others" checkboxes → auto-fill describe_accident
    others_check(frm)         { _update_describe_accident(frm); },
    othrs_non_recordable(frm) { _update_describe_accident(frm); },
    others_recordable(frm)    { _update_describe_accident(frm); }
});


// ── Helper ────────────────────────────────────────────────────────────────────

function _update_describe_accident(frm) {
    const parts = [];
    if (frm.doc.others_check        == 1) parts.push("Others (Specify):\n\n");
    if (frm.doc.othrs_non_recordable == 1) parts.push("Others (Non-recordable):\n\n");
    if (frm.doc.others_recordable    == 1) parts.push("Others (Recordable):\n\n");
    frm.set_value("describe_accident", parts.join(" "));
}