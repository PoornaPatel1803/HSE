# Copyright (c) 2025, Your Company and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class TrainingEvent(Document):

    def on_submit(self):
        """After Submit: mark Assigned Trainings rows as Completed
        for every employee who attended (status = 'Present')."""

        attendance_list = frappe.get_all(
            "Training Event Employee",
            filters={"parent": self.name, "attendance": "Present"},
            fields=["employee"]
        )

        for att in attendance_list:
            assigned_rows = frappe.get_all(
                "Assigned Trainings",
                filters={
                    "training_event": self.name,
                    "employee_id":    att.employee
                },
                fields=["name"]
            )
            for row in assigned_rows:
                frappe.db.set_value(
                    "Assigned Trainings",
                    row.name,
                    "status",
                    "Completed"
                )