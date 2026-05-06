// Copyright (c) 2026, Octo Advisory and contributors
// For license information, please see license.txt

// frappe.ui.form.on("HSE Checklist Template", {
// 	refresh(frm) {

// 	},
// });


// ============================================================
//  hse_checklist_template.js
//  DocType: HSE Checklist Template
// ============================================================

frappe.ui.form.on('HSE Checklist Template', {

    // Auto-generate acronym from uppercase letters of the checklist type
    validate(frm) {
        if (frm.doc.custom_inspection_checklist_type) {
            const matches = frm.doc.custom_inspection_checklist_type.match(/[A-Z]/g);
            frm.set_value('custom_activity_acronym', matches ? matches.join('') : '');
        } else {
            frm.set_value('custom_activity_acronym', '');
        }
    }
});


// ── Checklist child table ─────────────────────────────────────────────────────
// Hide rows where applicable == 0

frappe.ui.form.on('Checklist', {
    applicable(frm, cdt, cdn) {
        const row      = locals[cdt][cdn];
        const grid_row = frm.get_field('checklist').grid.grid_rows_by_docname[cdn];

        if (!grid_row) return;

        if (row.applicable == 0) {
            grid_row.wrapper.hide();
        } else {
            grid_row.wrapper.show();
        }
    }
});