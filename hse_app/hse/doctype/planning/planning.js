// ===== Item Code Filter =====

frappe.ui.form.on("Planning", {
	activity_name: function (frm, cdt, cdn) {
		let row = locals[cdt][cdn];

		// console.log("🔥 Activity Triggered");
		// console.log("Row:", row);
		// console.log("Project:", frm.doc.project);

		if (row.activity_name && frm.doc.project) {
			frappe.call({
				method: "get_serial_numbers_from_project",
				args: {
					project: frm.doc.project,
				},
				callback: function (r) {
					// console.log("📡 API Response:", r);

					if (r.message) {
						let item_codes = [...new Set(r.message.map((d) => d.item_code))];

						// console.log("✅ Extracted Item Codes:", item_codes);

						// Store item_codes in row
						row._item_codes = item_codes;

						// console.log("📦 Stored in row._item_codes:", row._item_codes);

						// Set query
						frm.set_query("equipment", "planning", function (doc, cdt, cdn) {
							let child = locals[cdt][cdn];

							// console.log("🔍 get_query triggered for row:", child.name);
							// console.log("👉 child._item_codes:", child._item_codes);

							if (child._item_codes) {
								return {
									filters: {
										name: ["in", child._item_codes],
									},
								};
							}
						});

						// Clear invalid value
						if (row.equipment && !item_codes.includes(row.equipment)) {
							// console.log("❌ Clearing invalid equipment:", row.equipment);
							frappe.model.set_value(cdt, cdn, "equipment", "");
						}

						frm.refresh_field("planning");
					} else {
						// console.log("⚠️ No message returned from API");
					}
				},
			});
		}
	},
});
