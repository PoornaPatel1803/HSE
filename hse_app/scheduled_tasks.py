# Copyright (c) 2025, Your Company and contributors
# For license information, please see license.txt
#
# Then register each function in hooks.py (see bottom of this file).

import frappe
from frappe.utils import nowdate, getdate, add_days


# ===========================================================================
#  SHARED HELPERS
# ===========================================================================

def _get_or_copy_checklist(check_name, activity_name, equipment,
                            activity_type, doc, template_name,
                            template, planned_date,
                            equipment_name=None):
    """Return an existing Inspection Checklist or create a new one.
    Tries to copy the most recent checklist for the same activity/equipment
    before falling back to a fresh creation from the template."""

    if frappe.db.exists("Inspection Checklist", check_name):
        return frappe.get_doc("Inspection Checklist", check_name)

    existing = frappe.get_all(
        "Inspection Checklist",
        filters={"planning": activity_name, "equipment": equipment},
        fields=["name"],
        order_by="creation desc",
        limit=1
    )

    if existing:
        old_doc           = frappe.get_doc("Inspection Checklist", existing[0].name)
        checklist         = frappe.copy_doc(old_doc)
        checklist.name    = check_name
        checklist.equipment      = equipment
        checklist.inspection_for = doc.name
        checklist.planned_date   = planned_date
        if equipment_name:
            checklist.equipment_name = equipment_name
        checklist.insert(ignore_permissions=True)
        return checklist

    # Fresh creation from template
    new_doc = frappe.get_doc({
        "doctype":        "Inspection Checklist",
        "name":           check_name,
        "inspection_for": doc.name,
        "module":         activity_type,
        "planning":       activity_name,
        "template":       template_name,
        "equipment":      equipment,
        "planned_date":   planned_date,
    })
    if equipment_name:
        new_doc.equipment_name = equipment_name

    for p in template.checklist:
        new_doc.append("checklist_items", {"item_name": p.description})

    new_doc.insert(ignore_permissions=True)
    return new_doc


def _planning_exists(doc, activity_name, planned_date,
                     equipment=None, equipment_name=None):
    """Return True if a matching Planning row already exists on the charter."""
    for plan in doc.planning or []:
        match = (
            plan.activity_name == activity_name
            and str(plan.planned_date) == str(planned_date)
        )
        if equipment is not None:
            match = match and str(plan.equipment or "") == str(equipment or "")
        if equipment_name is not None:
            match = match and str(plan.equipment_name or "") == str(equipment_name or "")
        if match:
            return True
    return False


def _scope_applicable(doc, format_numbers):
    """Return the first applicable scope row for the given format numbers,
    or None if not found."""
    if isinstance(format_numbers, str):
        format_numbers = [format_numbers]
    for s in doc.project_hse_formats or []:
        if s.format_number in format_numbers and s.applicability == 1:
            return s
    return None


def _get_checklist_meta(doc, template_name):
    """Return (template doc, safe_project, safe_acronym) tuple."""
    template     = frappe.get_doc("HSE Checklist Template", template_name)
    safe_project = (doc.project or "").replace(" ", "-")
    safe_acronym = (template.custom_activity_acronym or "ACT").replace(" ", "-")
    return template, safe_project, safe_acronym


# ---------------------------------------------------------------------------
#  Inspection scheduler core — handles Daily / Weekly / Monthly
# ---------------------------------------------------------------------------

def _run_inspection_scheduler(frequency, planned_date):
    """
    Main logic for inspection schedulers.
    frequency    : "Daily" | "Weekly" | "Monthly"
    planned_date : date string (YYYY-MM-DD)
    """
    charters = frappe.get_all("HSE Charter", fields=["name"])

    for ch in charters:
        doc       = frappe.get_doc("HSE Charter", ch.name)
        scope_row = _scope_applicable(doc, "F-HSE-031")

        if not scope_row:
            continue
        if scope_row.frequency != frequency:
            continue

        inspections = [
            ins for ins in (doc.custom_safety_inspections or [])
            if int(ins.applicability or 0) == 1
            and ins.frequency == frequency
        ]
        if not inspections:
            continue

        changed = False

        for ins in inspections:
            activity_type = ins.activity_type
            activity_name = ins.activity_name
            template_name = ins.template

            if not activity_name or not template_name:
                continue

            template, safe_project, safe_acronym = _get_checklist_meta(doc, template_name)

            items = frappe.get_all(
                "Item",
                filters={"custom_hse_activity": activity_name},
                fields=["name"]
            )
            if not items:
                continue

            for item in items:
                serial_nos = frappe.get_all(
                    "Serial No",
                    filters={"item_code": item.name},
                    fields=["name"]
                )
                if not serial_nos:
                    continue

                for sr in serial_nos:
                    if _planning_exists(doc, activity_name, planned_date,
                                        equipment=sr.name,
                                        equipment_name=item.name):
                        continue

                    check_name = (
                        f"{safe_project}-{safe_acronym}"
                        f"-{item.name}-{sr.name}-{planned_date}"
                    )

                    checklist = _get_or_copy_checklist(
                        check_name, activity_name, sr.name,
                        activity_type, doc, template_name, template,
                        planned_date, equipment_name=item.name
                    )

                    doc.append("planning", {
                        "activity_type":        activity_type,
                        "activity_name":        activity_name,
                        "planned_date":         planned_date,
                        "inspection_checklist": checklist.name,
                        "equipment":            sr.name,
                        "equipment_name":       item.name
                    })
                    changed = True

        if changed:
            doc.save(ignore_permissions=True)


# ---------------------------------------------------------------------------
#  Audit / Walkthrough scheduler core
# ---------------------------------------------------------------------------

def _run_aw_scheduler(activity_table, format_numbers, frequency, planned_date):
    """
    Shared core for Audit and Walkthrough schedulers.
    activity_table : "custom_audit" | "custom_walkthrough"
    format_numbers : list of format number strings
    frequency      : "Daily" | "Weekly" | "Monthly"
    planned_date   : date string (YYYY-MM-DD)
    """
    charters = frappe.get_all("HSE Charter", fields=["name"])

    for ch in charters:
        doc       = frappe.get_doc("HSE Charter", ch.name)
        scope_row = _scope_applicable(doc, format_numbers)

        if not scope_row:
            continue

        rows = [
            r for r in (getattr(doc, activity_table) or [])
            if int(r.applicability or 0) == 1
            and r.frequency == frequency
        ]
        if not rows:
            continue

        changed = False

        for row in rows:
            activity_type = row.activity_type
            activity_name = row.activity_name
            template_name = row.template
            equipment     = row.equipment

            if not activity_name or not template_name:
                continue

            if _planning_exists(doc, activity_name, planned_date,
                                 equipment=equipment):
                continue

            template, safe_project, safe_acronym = _get_checklist_meta(doc, template_name)

            check_name = f"{safe_project}-{safe_acronym}-{planned_date}"

            checklist = _get_or_copy_checklist(
                check_name, activity_name, equipment,
                activity_type, doc, template_name, template, planned_date
            )

            doc.append("planning", {
                "activity_type":        activity_type,
                "activity_name":        activity_name,
                "planned_date":         planned_date,
                "equipment":            equipment,
                "inspection_checklist": checklist.name
            })
            changed = True

        if changed:
            doc.save(ignore_permissions=True)


# ===========================================================================
#  INSPECTION  — Daily / Weekly / Monthly
# ===========================================================================

def assign_inspection_daily():
    _run_inspection_scheduler("Daily", nowdate())


def assign_inspection_weekly():
    today      = getdate(nowdate())
    days_ahead = (0 - today.weekday()) or 7   # next Monday
    monday     = add_days(today, days_ahead)
    _run_inspection_scheduler("Weekly", str(monday))


def assign_inspection_monthly():
    today = getdate(nowdate())
    try:
        target = today.replace(day=29)
    except ValueError:
        target = today.replace(day=28)
    _run_inspection_scheduler("Monthly", str(target))


# ===========================================================================
#  AUDIT  — Daily / Weekly / Monthly
# ===========================================================================

AUDIT_FORMATS = ("F-HSE-032", "F-HSE-038", "F-HSE-039")


def assign_audit_daily():
    _run_aw_scheduler("custom_audit", AUDIT_FORMATS, "Daily", nowdate())


def assign_audit_weekly():
    today      = getdate(nowdate())
    days_ahead = (0 - today.weekday()) or 7
    monday     = add_days(today, days_ahead)
    _run_aw_scheduler("custom_audit", AUDIT_FORMATS, "Weekly", str(monday))


def assign_audit_monthly():
    today  = getdate(nowdate())
    target = today.replace(day=7)
    _run_aw_scheduler("custom_audit", AUDIT_FORMATS, "Monthly", str(target))


# ===========================================================================
#  WALKTHROUGH  — Daily / Weekly / Monthly
# ===========================================================================

WALKTHROUGH_FORMAT = ("F-HSE-040",)


def assign_walkthrough_daily():
    _run_aw_scheduler("custom_walkthrough", WALKTHROUGH_FORMAT, "Daily", nowdate())


def assign_walkthrough_weekly():
    today      = getdate(nowdate())
    days_ahead = (0 - today.weekday()) or 7
    monday     = add_days(today, days_ahead)
    _run_aw_scheduler("custom_walkthrough", WALKTHROUGH_FORMAT, "Weekly", str(monday))


def assign_walkthrough_monthly():
    today  = getdate(nowdate())
    target = today.replace(day=7)
    _run_aw_scheduler("custom_walkthrough", WALKTHROUGH_FORMAT, "Monthly", str(target))
    