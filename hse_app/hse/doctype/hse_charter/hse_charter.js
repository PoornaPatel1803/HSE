// Copyright (c) 2026, Octo Advisory and contributors
// For license information, please see license.txt

// frappe.ui.form.on("HSE Charter", {
// 	refresh(frm) {

// 	},
// });

// ============================================================
//  hse_charter.js  –  Merged & consolidated client script
//  All frappe.ui.form.on('HSE Charter') blocks are merged into
//  single refresh / onload / project handlers to avoid double-
//  binding and duplicate execution.
// ============================================================

// ============================================================
//  UTILITY HELPERS  (module-level, called from handlers below)
// ============================================================

function get_child_fieldname(frm) {
	if (frm.fields_dict["inspection_plan"]) return "inspection_plan";
	if (frm.fields_dict["planning"]) return "planning";
	return null;
}

function init_activity_name_filters(frm) {
	const fieldname = get_child_fieldname(frm);
	if (!fieldname) return;

	frm.fields_dict[fieldname].grid.get_field("activity_name").get_query = function (
		doc,
		cdt,
		cdn,
	) {
		const row = locals[cdt][cdn];
		return {
			filters: { activity_type: row ? row.activity_type || "" : "" },
		};
	};
}

function apply_query_to_visible_rows(frm) {
	const fieldname = get_child_fieldname(frm);
	if (!fieldname) return;

	const grid = frm.fields_dict[fieldname].grid;
	(grid.grid_rows || []).forEach(function (gr) {
		if (gr.grid_form && gr.grid_form.fields_dict && gr.grid_form.fields_dict.activity_name) {
			gr.grid_form.fields_dict.activity_name.get_query = function (doc, cdt, cdn) {
				const r = gr.doc;
				return { filters: { activity_type: r.activity_type || "" } };
			};
		}
	});
}

function bind_grid_change_listener(frm) {
	const fieldname = get_child_fieldname(frm);
	if (!fieldname) return;

	const wrapper = frm.fields_dict[fieldname].grid.wrapper;
	wrapper.off(".activity_type_filter");
	wrapper.on(
		"change.activity_type_filter",
		'input[data-fieldname="activity_type"], select[data-fieldname="activity_type"]',
		function (e) {
			const $row = $(this).closest(".grid-row");
			const rowname = $row.attr("data-name");
			const cdt = frm.fields_dict[fieldname].grid.doctype;
			const row = locals[cdt] ? locals[cdt][rowname] : null;
			if (!row) return;

			frappe.model.set_value(cdt, rowname, "activity_name", "");

			const gr = frm.fields_dict[fieldname].grid.grid_rows.find(
				(g) => g.docname === rowname,
			);
			if (gr && gr.grid_form && gr.grid_form.fields_dict.activity_name) {
				gr.grid_form.fields_dict.activity_name.get_query = function () {
					return { filters: { activity_type: row.activity_type || "" } };
				};
			}
		},
	);
}

function style_button($btn, extra_css) {
	$btn.css(
		Object.assign(
			{
				"background-color": "#2cb4e0",
				color: "#fff",
				"border-radius": "6px",
				padding: "6px 12px",
				"font-weight": "bold",
				border: "none",
			},
			extra_css || {},
		),
	);
}

function style_tabs() {
	$(".form-tabs .nav-link").css({
		color: "black",
		"font-weight": "500",
		padding: "4px 14px",
		"border-radius": "6px",
		margin: "6px",
		"background-color": "",
	});
	$(".form-tabs .nav-link.active").css({
		"background-color": "black",
		color: "#ffff",
		border: "none",
	});
}

function monthNameToNumber(monthName) {
	return (
		{
			January: 1,
			February: 2,
			March: 3,
			April: 4,
			May: 5,
			June: 6,
			July: 7,
			August: 8,
			September: 9,
			October: 10,
			November: 11,
			December: 12,
		}[monthName] || null
	);
}

function calcPercentFrom100(value) {
	let p = Number(value || 0);
	if (p > 100) p = 100;
	return p.toFixed(2) + "%";
}

// ============================================================
//  INSPECTION / AUDIT / WALKTHROUGH SCOPE-TAB HELPERS
// ============================================================

function toggle_safety_inspections(frm) {
	let show = false,
		target_row = null;
	(frm.doc.project_hse_formats || []).forEach((row) => {
		if (row.format_number === "F-HSE-031") {
			target_row = row;
			if (cint(row.applicability) === 1) show = true;
		}
	});
	frm.set_df_property("custom_safety_inspections", "hidden", show ? 0 : 1);
	if (target_row && cint(target_row.applicability) === 0) {
		frm.clear_table("custom_safety_inspections");
		frm.refresh_field("custom_safety_inspections");
	}
}

function toggle_audit_table(frm) {
	let show = false,
		target_row = null;
	(frm.doc.project_hse_formats || []).forEach((row) => {
		if (["F-HSE-039", "F-HSE-038", "F-HSE-032"].includes(row.format_number)) {
			target_row = row;
			if (cint(row.applicability) === 1) show = true;
		}
	});
	frm.set_df_property("custom_audit", "hidden", show ? 0 : 1);
	if (target_row && cint(target_row.applicability) === 0) {
		frm.clear_table("custom_audit");
		frm.refresh_field("custom_audit");
	}
}

function toggle_walkthrough_table(frm) {
	let show = false,
		target_row = null;
	(frm.doc.project_hse_formats || []).forEach((row) => {
		if (row.format_number === "F-HSE-040") {
			target_row = row;
			if (cint(row.applicability) === 1) show = true;
		}
	});
	frm.set_df_property("custom_walkthrough", "hidden", show ? 0 : 1);
	if (target_row && cint(target_row.applicability) === 0) {
		frm.clear_table("custom_walkthrough");
		frm.refresh_field("custom_walkthrough");
	}
}

async function load_hse_activities(frm) {
	let scope_frequency = null;
	(frm.doc.project_hse_formats || []).forEach((row) => {
		if (row.format_number === "F-HSE-031" && cint(row.applicability) === 1)
			scope_frequency = row.frequency;
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
			filters: { custom_hse_activity_name: act.name },
			limit: 1000,
		});

		if (item_groups.length > 0) {
			for (const ig of item_groups) {
				let row = frm.add_child("custom_safety_inspections");
				row.activity_name = act.name;
				row.group = ig.name;
				if (["Daily", "Weekly", "Monthly"].includes(scope_frequency))
					row.frequency = scope_frequency;
				row.template = template_map[act.name] || null;
			}
		} else {
			let row = frm.add_child("custom_safety_inspections");
			row.activity_name = act.name;
			if (["Daily", "Weekly", "Monthly"].includes(scope_frequency))
				row.frequency = scope_frequency;
			row.template = template_map[act.name] || null;
		}
	}
	frm.refresh_field("custom_safety_inspections");
}

async function load_audit_activities(frm) {
	let scope_frequency = null;
	(frm.doc.project_hse_formats || []).forEach((row) => {
		if (["F-HSE-039", "F-HSE-038", "F-HSE-032"].includes(row.format_number))
			scope_frequency = row.frequency;
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
		if (["Daily", "Weekly", "Monthly"].includes(scope_frequency))
			row.frequency = scope_frequency;
		row.template = template_map[aud.name] || null;
	});
	frm.refresh_field("custom_audit");
}

async function load_hse_walkthrough(frm) {
	let scope_frequency = null;
	(frm.doc.project_hse_formats || []).forEach((row) => {
		if (row.format_number === "F-HSE-040") scope_frequency = row.frequency;
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
		if (["Daily", "Weekly", "Monthly"].includes(scope_frequency))
			row.frequency = scope_frequency;
		row.template = template_map[nos.name] || null;
	});
	frm.refresh_field("custom_walkthrough");
}

async function maybe_load_inspections_once(frm) {
	const row = (frm.doc.project_hse_formats || []).find((r) => r.format_number === "F-HSE-031");
	if (!row || cint(row.applicability) !== 1) return;
	if ((frm.doc.custom_safety_inspections || []).length > 0) return;
	await load_hse_activities(frm);
}

async function maybe_load_audit_once(frm) {
	const has_applicable = (frm.doc.project_hse_formats || []).some(
		(row) =>
			["F-HSE-039", "F-HSE-038", "F-HSE-032"].includes(row.format_number) &&
			cint(row.applicability) === 1,
	);
	if (!has_applicable) return;
	if ((frm.doc.custom_audit || []).length > 0) return;
	await load_audit_activities(frm);
}

async function maybe_load_walkthrough_once(frm) {
	const row = (frm.doc.project_hse_formats || []).find((r) => r.format_number === "F-HSE-040");
	if (!row || cint(row.applicability) !== 1) return;
	if ((frm.doc.custom_walkthrough || []).length > 0) return;
	await load_hse_walkthrough(frm);
}

function should_reload_all_tables(frm) {
	return (
		!(frm.doc.custom_safety_inspections || []).length ||
		!(frm.doc.custom_audit || []).length ||
		!(frm.doc.custom_walkthrough || []).length
	);
}

async function reload_all_tables(frm) {
	await maybe_load_inspections_once(frm);
	await maybe_load_audit_once(frm);
	await maybe_load_walkthrough_once(frm);
	if (!frm.is_new()) await frm.save();
}

// ============================================================
//  TRAINING HELPERS
// ============================================================

async function assign_training(frm, values) {
	const training = values.training_program;
	let employees = [];

	if (values.all_employees) {
		const list = await frappe.db.get_list("Project Employee", {
			filters: { project: frm.doc.project },
			fields: ["name"],
		});
		employees = list.map((e) => e.name);
	} else {
		employees = (values.employee_name || []).map((row) => row.project_employee);
	}

	if (!employees.length) {
		frappe.msgprint("No employees found");
		return;
	}

	for (const employee of employees) {
		let hse_row = frm.add_child("assigned_trainings");
		hse_row.training = training;
		hse_row.employee = employee;
		hse_row.project = frm.doc.project;
		hse_row.status = "Pending";

		const pe_doc = await frappe.db.get_doc("Project Employee", employee);
		pe_doc.custom_trainings_history = pe_doc.custom_trainings_history || [];

		const exists = pe_doc.custom_trainings_history.some(
			(t) => t.training_program === training,
		);
		if (exists) continue;

		pe_doc.custom_trainings_history.push({
			training_program: training,
			status: "Assigned",
			project: frm.doc.project,
		});

		await frappe.call({
			method: "frappe.client.save",
			args: { doc: pe_doc },
			freeze: true,
			freeze_message: `Assigning training to ${employee}...`,
		});
	}

	frm.refresh_field("assigned_trainings");
	await frm.save();
	frappe.show_alert(
		{
			message: __(
				`Training <b>${training}</b> assigned to <b>${employees.length}</b> employee(s).`,
			),
			indicator: "green",
		},
		10,
	);
}

// ============================================================
//  MAIN FORM HANDLER  –  single consolidated block
// ============================================================

frappe.ui.form.on("HSE Charter", {
	// ----------------------------------------------------------
	//  onload  –  all onload logic merged here
	// ----------------------------------------------------------
	async onload(frm) {
		// ── Default Documents ──────────────────────────────────
		if (frm.is_new() && !(frm.doc.master_ho_documents || []).length) {
			const docs = await frappe.db.get_list("Documents", {
				filters: { default: 1 },
				fields: ["name"],
				limit: 100,
			});
			docs.forEach((d) => {
				let row = frm.add_child("master_ho_documents");
				row.document_name = d.name;
			});
			frm.refresh_field("master_ho_documents");
		}

		// ── HSE Format fill-up on new doc ─────────────────────
		if (frm.is_new()) {
			frm.clear_table("project_hse_formats");
			frm.doc.project_hse_formats = [];
			frappe.db
				.get_list("HSE Format Master", {
					fields: ["name", "format_number", "description", "module", "frequency"],
					filters: { applicability: 1 },
					limit: 500,
					order_by: "name",
				})
				.then((records) => {
					records.forEach((record) => {
						let row = frm.add_child("project_hse_formats");
						row.format_number = record.name;
						row.description = record.description;
						row.module = record.module;
						row.frequency = record.frequency;
					});
					frm.refresh_field("project_hse_formats");
				});
		}

		// ── Report buttons (bound once on onload) ─────────────
		// Daily Report button
		if (frm.fields_dict.custom_download_hse_report) {
			style_button(frm.fields_dict.custom_download_hse_report.$input, { width: "240px" });
			frm.fields_dict.custom_download_hse_report.$input
				.off("click")
				.on("click", () => open_hse_dialog(frm));
		}

		// Monthly HSE report button
		if (frm.fields_dict.custom_download_monthly_hse_report) {
			style_button(frm.fields_dict.custom_download_monthly_hse_report.$input);
			frm.fields_dict.custom_download_monthly_hse_report.$input
				.off("click")
				.on("click", function () {
					let d = new frappe.ui.Dialog({
						title: "Download Monthly HSE Report",
						fields: [
							{
								label: "Month",
								fieldname: "monthly_month",
								fieldtype: "Select",
								options: [
									"January",
									"February",
									"March",
									"April",
									"May",
									"June",
									"July",
									"August",
									"September",
									"October",
									"November",
									"December",
								],
								reqd: 1,
							},
							{
								label: "Year (for Monthly)",
								fieldname: "monthly_year",
								fieldtype: "Select",
								options: ["2024", "2025", "2026", "2027"],
								reqd: 1,
							},
						],
						primary_action_label: "Download Excel",
						primary_action(values) {
							if (!values.monthly_month) {
								frappe.msgprint("Please select month.");
								return;
							}
							const monthIndex = monthNameToNumber(values.monthly_month);
							const selYear = parseInt(values.monthly_year);
							const now = new Date();
							if (
								selYear > now.getFullYear() ||
								(selYear === now.getFullYear() && monthIndex > now.getMonth() + 1)
							) {
								frappe.msgprint({
									title: "Invalid Selection",
									message: "You cannot select a future month.",
									indicator: "red",
								});
								return;
							}
							d.hide();
							const run = () => generate_hse_month_excel(frm, values);
							if (typeof ExcelJS === "undefined") {
								frappe.require(
									[
										"https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js",
										"https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js",
									],
									run,
								);
							} else {
								run();
							}
						},
					});
					d.show();
				});
		}

		// Objective Analysis button
		if (frm.fields_dict.custom_download_hse_objective_analysis_report) {
			style_button(frm.fields_dict.custom_download_hse_objective_analysis_report.$input, {
				"white-space": "nowrap",
			});
			frm.fields_dict.custom_download_hse_objective_analysis_report.$input
				.off("click")
				.on("click", function () {
					let d = new frappe.ui.Dialog({
						title: "Download Objective Analysis Report",
						fields: [
							{
								label: "For Year",
								fieldname: "monthly_year",
								fieldtype: "Select",
								options: ["2024", "2025", "2026"],
								reqd: 1,
							},
						],
						primary_action_label: "Download Excel",
						primary_action(values) {
							if (!values.monthly_year) {
								frappe.msgprint("Please select year.");
								return;
							}
							d.hide();
							const run = () => generate_analysis_excel(frm, values);
							if (typeof ExcelJS === "undefined") {
								frappe.require(
									[
										"https://cdnjs.cloudflare.com/ajax/libs/exceljs/4.3.0/exceljs.min.js",
										"https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js",
									],
									run,
								);
							} else {
								run();
							}
						},
					});
					d.show();
				});
		}

		// ── Employee filter (set on load) ─────────────────────
		set_project_employee_filter(frm);
	},

	// ----------------------------------------------------------
	//  refresh  –  all refresh logic merged here
	// ----------------------------------------------------------
	async refresh(frm) {
		// ── Tab styling ───────────────────────────────────────
		style_tabs();
		$(".form-tabs .nav-link").on("click", () => setTimeout(style_tabs, 50));

		// ── Planning grid filters ─────────────────────────────
		init_activity_name_filters(frm);
		apply_query_to_visible_rows(frm);
		bind_grid_change_listener(frm);

		// ── Grid form button styling ──────────────────────────
		if (frm.fields_dict["assigned_trainings"]) {
			frm.fields_dict["assigned_trainings"].grid.open_form = function (doc, grid_row) {
				frappe.ui.form.Grid.prototype.open_form.call(this, doc, grid_row);
				const gf = this.grid_form;
				if (gf && gf.fields_dict.create_training_event) {
					$(gf.fields_dict.create_training_event.$wrapper).find("button").css({
						"background-color": "#28a745",
						color: "white",
						"border-radius": "4px",
						"font-weight": "bold",
					});
				}
			};
		}

		if (frm.fields_dict["planning"]) {
			frm.fields_dict["planning"].grid.open_form = function (doc, grid_row) {
				frappe.ui.form.Grid.prototype.open_form.call(this, doc, grid_row);
				const gf = this.grid_form;
				if (gf && gf.fields_dict.create_checklist) {
					$(gf.fields_dict.create_checklist.$wrapper).find("button").css({
						"background-color": "#007bff",
						color: "white",
						"border-radius": "4px",
						"font-weight": "bold",
					});
				}
			};
		}

		// ── Safety Committee: populate on new ────────────────
		if (frm.is_new()) {
			try {
				frm.clear_table("safety_committee");
				const res = await frappe.call({
					method: "frappe.client.get_list",
					args: {
						doctype: "Safety Committee Role",
						filters: { applicable: 1 },
						fields: ["name"],
					},
				});
				(res.message || []).forEach((role) => {
					const row = frm.add_child("safety_committee");
					row.committee_role = role.name;
				});
				frm.refresh_field("safety_committee");
			} catch (err) {
				console.error("Error populating Safety Committee:", err);
			}
		}

		// ── Scope tab: toggle + reload tables ────────────────
		toggle_safety_inspections(frm);
		toggle_audit_table(frm);
		toggle_walkthrough_table(frm);

		if (frm.is_new() && should_reload_all_tables(frm)) {
			frappe.dom.freeze("Loading HSE Data...");
			await reload_all_tables(frm);
			frappe.dom.unfreeze();
		}

		// ── Custom Planning button ────────────────────────────
		if (frm.fields_dict.custom_create_custom_planning) {
			style_button(frm.fields_dict.custom_create_custom_planning.$input);
			frm.fields_dict.custom_create_custom_planning.$input
				.off("click")
				.on("click", function () {
					const dialog = new frappe.ui.Dialog({
						title: "Generate Planning & Checklists",
						fields: [
							{
								label: "Select Type",
								fieldname: "plan_type",
								fieldtype: "Select",
								options: ["Inspection", "Audit", "Walkthrough"],
								reqd: 1,
							},
						],
						primary_action_label: "Generate",
						primary_action(values) {
							dialog.hide();
							frappe.call({
								method: "hse_app.hse.doctype.hse_charter.hse_charter.generate_custom_planning",
								args: { charter_name: frm.doc.name, plan_type: values.plan_type },
								callback(r) {
									if (r.exc) return;
									const res = r.message || {};
									let indicator = "green",
										msg = "";
									if (res.status === "created") {
										msg = `${res.created} activities created.\nSkipped: ${res.skipped || 0}\nPlanned date: ${res.planned_date}`;
									} else if (res.status === "already_exists") {
										indicator = "orange";
										msg = res.message || "Planning already exists.";
									} else if (res.status === "invalid_frequency") {
										indicator = "red";
										msg = res.message || "Activities have invalid frequency.";
									} else if (res.status === "not_applicable") {
										indicator = "red";
										msg = res.message || "No applicable activities found.";
									} else {
										msg = JSON.stringify(res, null, 2);
									}
									frappe.msgprint({
										title: "Planning",
										message: msg,
										indicator,
									});
									frm.reload_doc();
								},
							});
						},
					});
					dialog.show();
				});
		}

		// ── Scope Planning button ─────────────────────────────
		if (frm.fields_dict.custom_create_scope_planning) {
			style_button(frm.fields_dict.custom_create_scope_planning.$input);
			frm.fields_dict.custom_create_scope_planning.$input
				.off("click")
				.on("click", function () {
					frappe.call({
						method: "hse_app.hse.doctype.hse_charter.hse_charter.assign_planning",
						args: { charter_name: frm.doc.name },
						callback: function (res) {
							if (!res.message) return;
							const r = res.message;
							if (r.status === "created") {
								frappe.msgprint(
									`${r.created} activities created.<br>Skipped: ${r.skipped}`,
								);
								frm.reload_doc();
							} else {
								frappe.msgprint(r.message);
							}
						},
					});
				});
		}

		// ── Incident buttons ──────────────────────────────────
		if (frm.fields_dict.custom_create_new_incident) {
			const $newInc = frm.fields_dict.custom_create_new_incident.$input;
			style_button($newInc);
			$newInc.off("click").on("click", function () {
				frappe.new_doc("Incident", { project_name: frm.doc.project });
			});
		}

		if (frm.fields_dict.custom_view_incidents) {
			const $viewInc = frm.fields_dict.custom_view_incidents.$input;
			style_button($viewInc, { "margin-left": "10px" });
			if (frm.fields_dict.custom_create_new_incident)
				$viewInc.insertAfter(frm.fields_dict.custom_create_new_incident.$input);
			$viewInc.off("click").on("click", function () {
				frappe.set_route("List", "Incident", { project_name: ["=", frm.doc.project] });
			});
		}

		// ── Observation buttons ───────────────────────────────
		if (frm.fields_dict.custom_create_observation && !frm._obs_bound) {
			frm._obs_bound = true;

			const $createObs = frm.fields_dict.custom_create_observation.$input;
			style_button($createObs);

			if (frm.fields_dict.custom_view_observation) {
				const $viewObs = frm.fields_dict.custom_view_observation.$input;
				style_button($viewObs, { "margin-left": "10px" });
				$viewObs.insertAfter($createObs);
				$viewObs.off("click").on("click", () =>
					frappe.set_route("List", "Observation", {
						current_project: ["=", frm.doc.project],
					}),
				);
			}

			$createObs.off("click").on("click", async () => {
				const module_options = [
					"Inspection",
					"Audit",
					"Walkthrough",
					"Training",
					"Others",
				];
				let d = new frappe.ui.Dialog({
					title: "Select Module & Activity",
					fields: [
						{
							fieldtype: "Select",
							label: "Module",
							fieldname: "module",
							options: module_options.join("\n"),
							reqd: 1,
							onchange: function () {
								const module = d.get_value("module");
								let options = [];
								if (["Inspection", "Audit", "Walkthrough"].includes(module)) {
									let uniqueMap = new Map();
									(frm.doc.planning || [])
										.filter((r) => r.activity_type === module)
										.forEach((r) => {
											if (!r.activity_name || !r.planned_date) return;
											const label = `${r.activity_name} - ${frappe.datetime.str_to_user(r.planned_date)}`;
											if (
												r.inspection_checklist &&
												!uniqueMap.has(r.inspection_checklist)
											)
												uniqueMap.set(r.inspection_checklist, label);
										});
									options = Array.from(uniqueMap.entries()).map(
										([value, label]) => ({ label, value }),
									);
								}
								d.set_df_property("activity_name", "options", options);
								d.set_value("activity_name", "");
								d.refresh_field("activity_name");
							},
						},
						{
							fieldtype: "Select",
							label: "Activity / Training Name",
							fieldname: "activity_name",
							options: [],
							depends_on:
								'eval:["Inspection","Audit","Walkthrough","Training"].includes(doc.module)',
						},
					],
					primary_action_label: "Create Observation",
					primary_action(values) {
						let checklist_id = "",
							document_type = "",
							observation_location = "";
						if (["Inspection", "Audit", "Walkthrough"].includes(values.module)) {
							const row = (frm.doc.planning || []).find(
								(r) => r.inspection_checklist === values.activity_name,
							);
							if (row) {
								checklist_id = row.inspection_checklist;
								document_type = "Inspection Checklist";
								observation_location = row.plantlocation || "";
							}
						} else if (values.module === "Training") {
							const row = (frm.doc.assigned_trainings || []).find(
								(r) => r.training === values.activity_name,
							);
							if (row) {
								checklist_id = row.training_event;
								document_type = "Training Event";
								observation_location = row.location || "";
							}
						} else if (values.module === "Others") {
							checklist_id = frm.doc.name;
							document_type = "HSE Charter";
							observation_location = frm.doc.location || "";
						}
						if (!checklist_id) {
							frappe.msgprint({
								title: "Not Found",
								message: `No related record found for "${values.activity_name}" in ${values.module}.`,
								indicator: "orange",
							});
							return;
						}
						frappe.new_doc("Observation", {
							document_type: document_type,
							checklist_training: checklist_id,
							observation_by: frappe.session.user,
							current_project: frm.doc.project,
							module: values.module,
							name1: values.activity_name,
							observation_location: observation_location,
						});
						d.hide();
					},
				});
				d.show();
			});
		}

		// ── Assign Trainings buttons ──────────────────────────
		if (frm.fields_dict.create_training_event && !frm.assign_trainings_button_added) {
			frm.assign_trainings_button_added = true;

			// Style the Create Training Event button
			const $create_btn = frm.fields_dict.create_training_event.$input;
			$create_btn.css({ "white-space": "nowrap" });

			// Assign Trainings
			const $assign_btn = $(`<button class="btn btn-secondary btn-sm"
                style="margin-left:8px;background-color:#2cb4e0;color:#fff;
                       border-radius:6px;padding:6px 12px;line-height:1.2;
                       font-size:14px;font-weight:bold;white-space:nowrap;border:none;">
                Assign Trainings</button>`)
				.insertAfter($create_btn)
				.on("click", function () {
					frappe.call({
						method: "hse_app.hse.doctype.hse_charter.hse_charter.assign_trainings_to_project_employees",
						args: { hse_charter_name: frm.doc.name, project: frm.doc.project },
						callback: () => frm.reload_doc(),
					});
				});

			// Assign Custom Trainings
			$(`<button class="btn btn-secondary btn-sm"
                style="margin-left:8px;background-color:#2cb4e0;color:#fff;
                       border-radius:6px;padding:6px 12px;line-height:1.2;
                       font-size:14px;font-weight:bold;white-space:nowrap;border:none;">
                Assign Custom Trainings</button>`)
				.insertAfter($assign_btn)
				.on("click", function () {
					frappe.model.with_doctype("Project Employee Selector", () => {
						const dialog = new frappe.ui.Dialog({
							title: "Select Training Program",
							size: "large",
							fields: [
								{
									label: "Training Program",
									fieldname: "training_program",
									fieldtype: "Link",
									options: "Training Program",
									reqd: 1,
								},
								{
									label: "All Project Employees",
									fieldname: "all_employees",
									fieldtype: "Check",
								},
								{
									label: "Employee Name",
									fieldname: "employee_name",
									fieldtype: "Table MultiSelect",
									options: "Project Employee Selector",
									depends_on: "eval: !doc.all_employees",
								},
							],
							primary_action_label: "Assign",
							primary_action(values) {
								dialog.hide();
								if (!values.training_program) {
									frappe.msgprint("Select Training Program");
									return;
								}
								if (
									!values.all_employees &&
									(!values.employee_name || !values.employee_name.length)
								) {
									frappe.msgprint("Select at least one employee");
									return;
								}
								assign_training(frm, values);
							},
						});
						dialog.show();
					});
				});

			// Create Training Event click
			$create_btn.css({
				"background-color": "#2cb4e0",
				color: "#ffff",
				"border-radius": "6px",
				padding: "6px 12px",
				"font-weight": "bold",
				border: "none",
			});

			$create_btn.off("click").on("click", function (e) {
				const has_rows = (frm.doc.assigned_trainings || []).length > 0;
				if (!has_rows) {
					e.preventDefault();
					e.stopImmediatePropagation();
					frappe.msgprint("No Assigned Trainings found.");
					return false;
				}

				let trainings = ["Tool Box (TBT)"];
				(frm.doc.assigned_trainings || []).forEach((row) => {
					if (row.training && !trainings.includes(row.training))
						trainings.push(row.training);
				});

				const add_hours = (dt_str, today) => {
					const dt = new Date(dt_str);
					const h = (dt.getHours() + 2) % 24;
					const mm = String(dt.getMinutes()).padStart(2, "0");
					const ss = String(dt.getSeconds()).padStart(2, "0");
					return `${today} ${String(h).padStart(2, "0")}:${mm}:${ss}`;
				};

				const today = frappe.datetime.get_today();
				const start_time = `${today} 09:00:00`;
				const end_time = add_hours(start_time, today);

				let d = new frappe.ui.Dialog({
					title: "Create Training Event",
					fields: [
						{
							fieldtype: "Select",
							label: "Select Training",
							fieldname: "training",
							options: trainings,
							reqd: 1,
						},
						{
							fieldtype: "Datetime",
							label: "Start Time",
							fieldname: "start_time",
							reqd: 1,
							default: start_time,
							onchange: function () {
								const ns = d.get_value("start_time");
								if (ns) d.set_value("end_time", add_hours(ns, today));
							},
						},
						{
							fieldtype: "Datetime",
							label: "End Time",
							fieldname: "end_time",
							reqd: 1,
							default: end_time,
						},
						{ fieldtype: "Data", label: "Location", fieldname: "location", reqd: 1 },
						{
							fieldtype: "Small Text",
							label: "Introduction",
							fieldname: "introduction",
							reqd: 1,
						},
					],
					primary_action_label: "Create",
					async primary_action(values) {
						if (
							frappe.datetime.str_to_obj(values.end_time) <=
							frappe.datetime.str_to_obj(values.start_time)
						) {
							frappe.msgprint("End Time must be greater than Start Time.");
							return;
						}

						let emp = [];
						if (values.training === "Tool Box (TBT)") {
							if (!frm.doc.project) {
								frappe.msgprint("Please select Project first.");
								return;
							}
							const employees = await frappe.db.get_list("Project Employee", {
								filters: { project: frm.doc.project },
								fields: ["employee"],
							});
							emp = employees.map((e) => ({ employee: e.employee }));
						} else {
							emp = (frm.doc.assigned_trainings || [])
								.filter((row) => row.training === values.training)
								.map((row) => ({ employee: row.employee_id }));
						}

						frappe.call({
							method: "frappe.client.insert",
							args: {
								doc: {
									doctype: "Training Event",
									training: values.training,
									training_program: values.training,
									event_name: values.training,
									start_time: values.start_time,
									end_time: values.end_time,
									location: values.location,
									introduction: values.introduction,
									project: frm.doc.project,
									employees: emp,
								},
							},
							callback: function (r) {
								if (r.message) {
									const event_name = r.message.name;
									if (values.training !== "Tool Box (TBT)") {
										(frm.doc.assigned_trainings || [])
											.filter((row) => row.training === values.training)
											.forEach((row) =>
												frappe.model.set_value(
													row.doctype,
													row.name,
													"training_event",
													event_name,
												),
											);
									}
									frm.save_or_update();
									frappe.set_route("Form", "Training Event", event_name);
								}
							},
						});
						d.hide();
					},
				});
				d.show();
			});
		}

		// ── Delete inspection checklist on row remove ─────────
		if (!frm.checked_rows_handler && frm.fields_dict["planning"]) {
			frm.checked_rows_handler = true;
			const grid = frm.fields_dict["planning"].grid;

			grid.wrapper.on("click", ".grid-remove-rows", function () {
				let checklist_to_delete = [];
				grid.grid_rows.forEach((row_obj) => {
					const $cb = row_obj.wrapper.find('input[type="checkbox"]');
					if ($cb.length && $cb.is(":checked") && row_obj.doc.inspection_checklist) {
						checklist_to_delete.push({
							rowname: row_obj.doc.name,
							checklist: row_obj.doc.inspection_checklist,
						});
					}
				});

				if (!checklist_to_delete.length) {
					frappe.msgprint("No linked checklists selected to delete.");
					return;
				}

				checklist_to_delete.forEach((obj) => {
					const row_doc = frm.doc.planning.find((r) => r.name === obj.rowname);
					if (row_doc) {
						row_doc.inspection_checklist = "";
						frm.refresh_field("planning");
					}
				});

				frm.save().then(() => {
					checklist_to_delete.forEach((obj) => {
						frappe.call({
							method: "frappe.client.delete",
							args: { doctype: "Inspection Checklist", name: obj.checklist },
							callback: () =>
								frappe.show_alert({
									message: `Checklist ${obj.checklist} deleted successfully`,
									indicator: "red",
								}),
						});
					});
				});
			});
		}

		// ── Create Inspection Checklist (planning grid) ───────
		if (!frm.checklist_handler_bound && frm.fields_dict["planning"]) {
			frm.checklist_handler_bound = true;

			frm.fields_dict["planning"].grid.wrapper.on(
				"click",
				".grid-row .btn[data-fieldname='create_checklist']",
				function () {
					const $btn = $(this);
					const rowname = $btn.closest(".grid-row").attr("data-name");
					const row = frm.doc.planning.find((r) => r.name === rowname);
					if (!row) return;

					if (row.inspection_checklist) {
						frappe.msgprint(`A checklist already exists: ${row.inspection_checklist}`);
						return;
					}
					if (!row.planned_date) {
						frappe.throw(
							"Please select the <b>Planned Date</b> before creating a checklist.",
						);
						return;
					}
					if (!row.activity_name) {
						frappe.msgprint("Please select an Activity Name first");
						return;
					}

					frappe.db
						.get_list("HSE Checklist Template", {
							filters: {
								custom_inspection_checklist_type: row.activity_name,
								applicable: 1,
							},
							fields: ["name"],
							limit: 1,
						})
						.then((qit_docs) => {
							if (!qit_docs || !qit_docs.length) {
								frappe.msgprint("No Inspection Template found for this activity");
								return;
							}
							frappe.db
								.get_doc("HSE Checklist Template", qit_docs[0].name)
								.then((qit_doc) => {
									const items = (qit_doc.checklist || []).map((param) => ({
										item_name: param.description || "",
									}));
									let acronym = qit_doc.custom_activity_acronym || "XXX";
									const project_id = frm.doc.project || "PRJ";
									const planned_date = (
										row.planned_date || frappe.datetime.nowdate()
									).replace(/-/g, "");
									const checklist_name = `${project_id}-${acronym}-${planned_date}`;

									frappe.call({
										method: "frappe.client.insert",
										args: {
											doc: {
												doctype: "Inspection Checklist",
												name: checklist_name,
												module: row.activity_type,
												inspection_for: frm.doc.name,
												planning: row.activity_name,
												checklist_items: items,
												equipment: row.equipment,
											},
										},
										callback: function (r) {
											if (r.message && r.message.name) {
												frappe.model.set_value(
													row.doctype,
													row.name,
													"inspection_checklist",
													r.message.name,
												);
												frappe.model.set_value(
													row.doctype,
													row.name,
													"inspection_checklist_status",
													r.message.status,
												);
												frm.refresh_field("planning");
												frm.save().then(() =>
													frappe.show_alert({
														message: `Checklist ${r.message.name} created and saved`,
														indicator: "green",
													}),
												);
											} else {
												frappe.msgprint("Failed to create checklist");
											}
										},
									});
								});
						});
				},
			);
		}
	},

	// ----------------------------------------------------------
	//  project  –  validation + employee filter refresh
	// ----------------------------------------------------------
	project(frm) {
		// Duplicate charter guard
		if (frm.doc.project) {
			frappe.db
				.count("HSE Charter", {
					filters: { project: frm.doc.project, name: ["!=", frm.doc.name] },
				})
				.then((count) => {
					if (count > 0) {
						frappe.msgprint(__("An HSE Charter already exists for this Project."));
						frm.set_value("project", "");
					}
				});
		}
		// Refresh employee filter & committee table
		set_project_employee_filter(frm);
		frm.refresh_field("safety_committee");
	},

	// ----------------------------------------------------------
	//  before_save  –  duplicate project guard (server-side safe)
	// ----------------------------------------------------------
	before_save(frm) {
		if (frm.doc.project) {
			return frappe.db
				.count("HSE Charter", {
					filters: { project: frm.doc.project, name: ["!=", frm.doc.name] },
				})
				.then((count) => {
					if (count > 0)
						frappe.throw(__("An HSE Charter already exists for this Project."));
				});
		}
	},

	// ----------------------------------------------------------
	//  planning_add  –  re-apply filters when a row is added
	// ----------------------------------------------------------
	planning_add(frm, cdt, cdn) {
		init_activity_name_filters(frm);
		apply_query_to_visible_rows(frm);
	},
});

// ============================================================
//  PROJECT HSE FORMAT child  –  scope-tab toggles
// ============================================================

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

// ============================================================
//  ASSIGNED TRAININGS child  –  employee & training handlers
// ============================================================

frappe.ui.form.on("Assigned Trainings", {
	async employee(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (!row.employee) return;

		try {
			const pe_doc = await frappe.db.get_doc("Project Employee", row.employee);
			const designation = pe_doc.designation;
			const employee_name = pe_doc.employee_name;

			if (employee_name) frappe.model.set_value(cdt, cdn, "employee_name", employee_name);

			if (!designation) {
				frappe.msgprint("Selected employee has no designation.");
				return;
			}

			const desig_doc = await frappe.db.get_doc("Designation", designation);
			const trainings = (desig_doc.custom_trainings || []).map((t) => t.training);

			if (!trainings.length) {
				frappe.msgprint(`No trainings found for designation: ${designation}`);
				return;
			}

			frm.fields_dict.assigned_trainings.grid.grid_rows_by_docname[cdn].get_field(
				"training",
			).get_query = () => ({ filters: { name: ["in", trainings] } });

			frappe.model.set_value(cdt, cdn, "training", "");
			frm.refresh_field("assigned_trainings");
			frappe.show_alert({
				message: `${trainings.length} trainings loaded for ${designation}`,
				indicator: "green",
			});
		} catch (err) {
			console.error("Error applying filter for employee:", err);
		}
	},

	async training(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (!row.employee || !row.training) return;

		try {
			const pe_doc = await frappe.db.get_doc("Project Employee", row.employee);
			pe_doc.custom_trainings_history = pe_doc.custom_trainings_history || [];

			const exists = pe_doc.custom_trainings_history.some(
				(t) => t.training_program === row.training,
			);
			if (exists) {
				frappe.throw(`Training "${row.training}" already exists for ${row.employee}`);
				return;
			}

			pe_doc.custom_trainings_history.push({
				training_program: row.training,
				status: "Present",
			});

			await frappe.call({
				method: "frappe.client.save",
				args: { doc: pe_doc },
				freeze: true,
				freeze_message: `Updating Project Employee...`,
			});

			frappe.show_alert({
				message: `✅ Training "${row.training}" added to Project Employee ${row.employee}`,
				indicator: "green",
			});
		} catch (err) {
			console.error("Error adding training to Project Employee:", err);
		}
	},
});

// ============================================================
//  LIST VIEW settings
// ============================================================

frappe.listview_settings["HSE Charter"] = {
	onload: function (listview) {
		cur_list.columns.push({
			type: "Field",
			df: { label: __("Created On"), fieldname: "creation", fieldtype: "Datetime" },
		});
		cur_list.refresh(true);
	},
	formatters: {
		creation: function (value) {
			return value ? frappe.format(value, { fieldtype: "Datetime" }) : "";
		},
	},
};

// ============================================================
//  EMPLOYEE FILTER helper  (used in onload + project change)
// ============================================================

function set_project_employee_filter(frm) {
	frm.set_query("project_employee", "safety_committee", () => ({
		filters: { project: frm.doc.project || "" },
	}));
}
