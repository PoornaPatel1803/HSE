# Copyright (c) 2026, Octo Advisory and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class InspectionChecklist(Document):

    def on_update(self):
        """Sync checklist status back to the linked Planning child row
        whenever it changes."""
        _sync_status_to_planning(self)


# ---------------------------------------------------------------------------
#  Helper
# ---------------------------------------------------------------------------

def _sync_status_to_planning(doc):
    """Update inspection_checklist_status on every Planning row
    that references this checklist, if the value differs."""

    if not doc.inspection_for:
        return

    if not doc.has_value_changed("status"):
        return

    rows = frappe.get_all(
        "Planning",
        filters={"inspection_checklist": doc.name},
        fields=["name", "inspection_checklist_status"]
    )

    for row in rows:
        if row.inspection_checklist_status != doc.status:
            frappe.db.set_value(
                "Planning",
                row.name,
                "inspection_checklist_status",
                doc.status
            )