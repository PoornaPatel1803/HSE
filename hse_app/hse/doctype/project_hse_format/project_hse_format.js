frappe.ui.form.on("HSE Charter", {
	refresh: async function (frm) {
		toggle_safety_inspections(frm);
		toggle_audit_table(frm);
		toggle_walkthrough_table(frm);

		if (frm.is_new() && should_reload_all_tables(frm)) {
			frappe.dom.freeze("Loading HSE Data...");
			await reload_all_tables(frm);
			frappe.dom.unfreeze();
		}
	},
});
frappe.ui.form.on("Project HSE Format", {
	applicability(frm, cdt, cdn) {
		toggle_safety_inspections(frm);
		maybe_load_inspections_once(frm);

		toggle_audit_table(frm);
		maybe_load_audit_once(frm);

		toggle_walkthrough_table(frm);
		maybe_load_walkthrough_once(frm);
	},
});

function should_reload_all_tables(frm) {
	const inspections_empty = !(frm.doc.custom_safety_inspections || []).length;
	const audit_empty = !(frm.doc.custom_audit || []).length;
	const walkthrough_empty = !(frm.doc.custom_walkthrough || []).length;

	console.log(inspections_empty, audit_empty, walkthrough_empty);

	return inspections_empty || audit_empty || walkthrough_empty;
}

// ------------------ SAFETY INSPECTIONS ------------------

function toggle_safety_inspections(frm) {
	let show = false;
	let target_row = null;

	(frm.doc.project_hse_formats || []).forEach((row) => {
		if (row.format_number === "F-HSE-031") {
			target_row = row;
			if (cint(row.applicability) === 1) {
				show = true;
			}
		}
	});

	frm.set_df_property("custom_safety_inspections", "hidden", show ? 0 : 1);

	if (target_row && cint(target_row.applicability) === 0) {
		frm.clear_table("custom_safety_inspections");
		frm.refresh_field("custom_safety_inspections");
	}
}

async function maybe_load_inspections_once(frm) {
	const row = (frm.doc.project_hse_formats || []).find((r) => r.format_number === "F-HSE-031");

	if (!row || cint(row.applicability) !== 1) return;
	if ((frm.doc.custom_safety_inspections || []).length > 0) return;

	await load_hse_activities(frm);
}

// async function load_hse_activities(frm) {
//     let scope_frequency = null;

//     (frm.doc.project_hse_formats || []).forEach(row => {
//         if (row.format_number === "F-HSE-031" && cint(row.applicability) === 1) {
//             scope_frequency = row.frequency;
//         }
//     });

//     const records = await frappe.db.get_list('HSE Activity', {
//         fields: ['name'],
//         filters: { activity_type: 'Inspection' },
//         limit: 1000
//     });

//     const templates = await frappe.db.get_list('HSE Checklist Template', {
//         fields: ['name'],
//         limit: 1000
//     });

//     let template_map = {};
//     templates.forEach(t => template_map[t.name] = t.name);

//     frm.clear_table("custom_safety_inspections");

//     records.forEach(act => {
//         let row = frm.add_child("custom_safety_inspections");
//         row.activity_name = act.name;

//         if (["Daily", "Weekly", "Monthly"].includes(scope_frequency)) {
//             row.frequency = scope_frequency;
//         }

//         row.template = template_map[act.name] || null;
//     });

//     for (const act of records) {

//         // Fetch ALL item groups matching activity
//         const item_groups = await frappe.db.get_list('Item Group', {
//             fields: ['name'],
//             filters: {
//                 custom_hse_activity_name: act.name   // 🔥 your condition
//             },
//             limit: 1000
//         });

//         // 👉 If multiple item groups → create multiple rows
//         if (item_groups.length > 0) {

//             for (const ig of item_groups) {

//                 let row = frm.add_child("custom_safety_inspections");

//                 row.activity_name = act.name;
//                 row.group = ig.name;   // ✅ set item group

//                 if (["Daily", "Weekly", "Monthly"].includes(scope_frequency)) {
//                     row.frequency = scope_frequency;
//                 }

//                 row.template = template_map[act.name] || null;
//             }

//         } else {
//             // 👉 fallback if no item group found

//             let row = frm.add_child("custom_safety_inspections");

//             row.activity_name = act.name;

//             if (["Daily", "Weekly", "Monthly"].includes(scope_frequency)) {
//                 row.frequency = scope_frequency;
//             }

//             row.template = template_map[act.name] || null;
//         }
//     }

//     // 🔥 IMPORTANT CHANGE ENDS HERE

//     frm.refresh_field("custom_safety_inspections");

// }
async function load_hse_activities(frm) {
	let scope_frequency = null;

	(frm.doc.project_hse_formats || []).forEach((row) => {
		if (row.format_number === "F-HSE-031" && cint(row.applicability) === 1) {
			scope_frequency = row.frequency;
		}
	});

	const records = await frappe.db.get_list("HSE Activity", {
		fields: ["name"],
		filters: { activity_type: "Inspection" },
		limit: 1000,
	});

	const templates = await frappe.db.get_list("HSE Checklist Template", {
		fields: ["name"],
		limit: 1000,
	});

	let template_map = {};
	templates.forEach((t) => (template_map[t.name] = t.name));

	frm.clear_table("custom_safety_inspections");

	for (const act of records) {
		const item_groups = await frappe.db.get_list("Item Group", {
			fields: ["name"],
			filters: {
				custom_hse_activity_name: act.name,
			},
			limit: 1000,
		});

		if (item_groups.length > 0) {
			for (const ig of item_groups) {
				let row = frm.add_child("custom_safety_inspections");

				row.activity_name = act.name;
				row.group = ig.name;

				if (["Daily", "Weekly", "Monthly"].includes(scope_frequency)) {
					row.frequency = scope_frequency;
				}

				row.template = template_map[act.name] || null;
			}
		} else {
			let row = frm.add_child("custom_safety_inspections");

			row.activity_name = act.name;

			if (["Daily", "Weekly", "Monthly"].includes(scope_frequency)) {
				row.frequency = scope_frequency;
			}

			row.template = template_map[act.name] || null;
		}
	}

	frm.refresh_field("custom_safety_inspections");
}

// ------------------ AUDIT ------------------

function toggle_audit_table(frm) {
	let audit_show = false;
	let target_row = null;

	(frm.doc.project_hse_formats || []).forEach((row) => {
		if (
			row.format_number === "F-HSE-039" ||
			row.format_number === "F-HSE-038" ||
			row.format_number === "F-HSE-032"
		) {
			target_row = row;
			if (cint(row.applicability) === 1) {
				audit_show = true;
			}
		}
	});

	frm.set_df_property("custom_audit", "hidden", audit_show ? 0 : 1);

	if (target_row && cint(target_row.applicability) === 0) {
		frm.clear_table("custom_audit");
		frm.refresh_field("custom_audit");
	}
}

async function maybe_load_audit_once(frm) {
	const has_applicable = (frm.doc.project_hse_formats || []).some(
		(row) =>
			["F-HSE-039", "F-HSE-038", "F-HSE-032"].includes(row.format_number) &&
			cint(row.applicability) === 1,
	);

	console.log("Audit applicable found:", has_applicable);

	if (!has_applicable) return;
	if ((frm.doc.custom_audit || []).length > 0) return;

	await load_audit_activities(frm);
}

async function load_audit_activities(frm) {
	let scope_frequency = null;

	(frm.doc.project_hse_formats || []).forEach((row) => {
		if (
			row.format_number === "F-HSE-039" ||
			row.format_number === "F-HSE-038" ||
			row.format_number === "F-HSE-032"
		) {
			scope_frequency = row.frequency;
		}
	});

	const audit = await frappe.db.get_list("HSE Activity", {
		fields: ["name"],
		filters: { activity_type: "Audit" },
		limit: 1000,
	});

	const templates = await frappe.db.get_list("HSE Checklist Template", {
		fields: ["name"],
		limit: 1000,
	});

	let template_map = {};
	templates.forEach((t) => (template_map[t.name] = t.name));

	frm.clear_table("custom_audit");

	audit.forEach((aud) => {
		let row = frm.add_child("custom_audit");
		row.activity_name = aud.name;

		if (["Daily", "Weekly", "Monthly"].includes(scope_frequency)) {
			row.frequency = scope_frequency;
		}

		row.template = template_map[aud.name] || null;
	});

	frm.refresh_field("custom_audit");
}

// ------------------ WALKTHROUGH ------------------

function toggle_walkthrough_table(frm) {
	let show = false;
	let target_row = null;

	(frm.doc.project_hse_formats || []).forEach((row) => {
		if (row.format_number === "F-HSE-040") {
			target_row = row;
			if (cint(row.applicability) === 1) {
				show = true;
			}
		}
	});

	frm.set_df_property("custom_walkthrough", "hidden", show ? 0 : 1);

	if (target_row && cint(target_row.applicability) === 0) {
		frm.clear_table("custom_walkthrough");
		frm.refresh_field("custom_walkthrough");
	}
}

async function maybe_load_walkthrough_once(frm) {
	const row = (frm.doc.project_hse_formats || []).find((r) => r.format_number === "F-HSE-040");

	if (!row || cint(row.applicability) !== 1) return;
	if ((frm.doc.custom_walkthrough || []).length > 0) return;

	await load_hse_walkthrough(frm);
}

async function load_hse_walkthrough(frm) {
	let scope_frequency = null;

	(frm.doc.project_hse_formats || []).forEach((row) => {
		if (row.format_number === "F-HSE-040") {
			scope_frequency = row.frequency;
		}
	});

	const walk = await frappe.db.get_list("HSE Activity", {
		fields: ["name"],
		filters: { activity_type: "Walkthrough" },
		limit: 1000,
	});

	const templates = await frappe.db.get_list("HSE Checklist Template", {
		fields: ["name"],
		limit: 1000,
	});

	let template_map = {};
	templates.forEach((t) => (template_map[t.name] = t.name));

	frm.clear_table("custom_walkthrough");

	walk.forEach((nos) => {
		let row = frm.add_child("custom_walkthrough");
		row.activity_name = nos.name;

		if (["Daily", "Weekly", "Monthly"].includes(scope_frequency)) {
			row.frequency = scope_frequency;
		}

		row.template = template_map[nos.name] || null;
	});

	frm.refresh_field("custom_walkthrough");
}

// ------------------ RELOAD ------------------

async function reload_all_tables(frm) {
	await maybe_load_inspections_once(frm);
	await maybe_load_audit_once(frm);
	await maybe_load_walkthrough_once(frm);

	if (!frm.is_new()) {
		await frm.save();
	}
}
