# Copyright (c) 2025, Your Company and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class Project(Document):

    def after_insert(self):
        """After Insert: create an HSE Charter for this project
        if one does not already exist."""
        _create_hse_charter(self)


# ---------------------------------------------------------------------------
#  Helper
# ---------------------------------------------------------------------------

def _create_hse_charter(doc):
    """Create a new HSE Charter pre-populated with Safety Committee,
    HSE Formats and Master HO Documents."""

    if frappe.db.exists("HSE Charter", {"project": doc.name}):
        return

    charter = frappe.new_doc("HSE Charter")
    charter.project = doc.name

    # ── Safety Committee ──────────────────────────────────────────────────
    roles = frappe.get_all(
        "Safety Committee Role",
        filters={"applicable": 1},
        fields=["name"],
        order_by="name",
        limit=500
    )
    for role in roles:
        charter.append("safety_committee", {
            "committee_role": role.name
        })

    # ── Project HSE Formats / Scope ───────────────────────────────────────
    formats = frappe.get_all(
        "HSE Format Master",
        filters={"applicability": 1},
        fields=["name", "format_number", "description", "module", "frequency"],
        order_by="name",
        limit=500
    )
    for record in formats:
        charter.append("project_hse_formats", {
            "format_number": record.name,
            "description":   record.description,
            "module":        record.module,
            "frequency":     record.frequency
        })

    # ── Master HO Documents ───────────────────────────────────────────────
    documents = frappe.get_all(
        "Documents",
        filters={"default": 1},
        fields=["name"],
        limit=500
    )
    for d in documents:
        charter.append("master_ho_documents", {
            "document_name": d.name
        })

    charter.insert(ignore_permissions=True)

    frappe.msgprint(
        f"HSE Charter created and pre-populated for Project: {doc.name}."
    )