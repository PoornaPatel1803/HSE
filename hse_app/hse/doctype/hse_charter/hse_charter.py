# Copyright (c) 2025, Your Company and contributors
# For license information, please see license.txt

import json
import frappe
from frappe.model.document import Document


class HSECharter(Document):
    pass




# ===========================================================================
#  2. GENERATE CUSTOM PLANNING
#     Called by: "Generate Planning & Checklists" button (Inspection/Audit/Walkthrough)
# ===========================================================================

@frappe.whitelist()
def generate_custom_planning(charter_name, plan_type):
    doc = frappe.get_doc("HSE Charter", charter_name)

    scope_row              = None
    has_applicable_rows    = False
    missing_item_mapping   = False
    missing_activities     = []
    has_already_exists     = False

    # ── Scope validation ──────────────────────────────────────────────────
    for s in doc.project_hse_formats or []:
        if (
            (plan_type == "Inspection"  and s.format_number == "F-HSE-031")
            or
            (plan_type == "Audit"       and s.format_number in ("F-HSE-032", "F-HSE-038", "F-HSE-039"))
            or
            (plan_type == "Walkthrough" and s.format_number == "F-HSE-040")
        ) and s.applicability == 1 and s.frequency in (
            "As and When Required",
            "As applicable",
            "New Project / New activity"
        ):
            scope_row = s
            break

    if not scope_row:
        frappe.throw(f"{plan_type} format not applicable")

    # ── Date logic ────────────────────────────────────────────────────────
    today      = frappe.utils.getdate()
    audit_date = today.replace(day=7)

    try:
        planned_date = today.replace(day=29)
    except ValueError:
        planned_date = today.replace(day=28)

    if plan_type == "Inspection":
        source_rows = doc.custom_safety_inspections or []
    elif plan_type == "Audit":
        planned_date = audit_date
        source_rows  = doc.custom_audit or []
    elif plan_type == "Walkthrough":
        planned_date = audit_date
        source_rows  = doc.custom_walkthrough or []
    else:
        frappe.throw("Invalid activity type")

    # ── Counters ──────────────────────────────────────────────────────────
    created_count = 0
    skipped_count = 0

    allowed_scope_frequencies = [
        "As and When Required",
        "As applicable",
        "New Project / New activity"
    ]

    # ── Main loop ─────────────────────────────────────────────────────────
    for ins in source_rows:

        if not ins.applicability:
            continue

        if ins.frequency not in allowed_scope_frequencies:
            continue

        has_applicable_rows = True

        activity_name = ins.activity_name
        template_name = ins.template

        if not activity_name or not template_name:
            continue

        template     = frappe.get_doc("HSE Checklist Template", template_name)
        safe_project = (doc.project or "").replace(" ", "-")
        safe_acronym = (template.custom_activity_acronym or "ACT").replace(" ", "-")

        # Items mapped to this activity
        items = frappe.get_all(
            "Item",
            filters={"custom_hse_activity": activity_name},
            fields=["name"]
        )

        if not items:
            missing_item_mapping = True
            missing_activities.append(activity_name)
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

                # Duplicate check
                exists = any(
                    plan.activity_name  == activity_name
                    and plan.planned_date   == planned_date
                    and str(plan.equipment_name or "") == str(item.name or "")
                    and str(plan.equipment      or "") == str(sr.name   or "")
                    and plan.activity_type  == plan_type
                    for plan in (doc.planning or [])
                )

                if exists:
                    skipped_count      += 1
                    has_already_exists  = True
                    continue

                checklist_name = (
                    f"{safe_project}-{safe_acronym}"
                    f"-{item.name}-{sr.name}-{planned_date}"
                )

                if frappe.db.exists("Inspection Checklist", checklist_name):
                    checklist_doc = frappe.get_doc("Inspection Checklist", checklist_name)
                else:
                    checklist_doc = frappe.get_doc({
                        "doctype":        "Inspection Checklist",
                        "name":           checklist_name,
                        "inspection_for": doc.name,
                        "module":         plan_type,
                        "planning":       activity_name,
                        "template":       template_name,
                        "planned_date":   planned_date,
                        "equipment_name": item.name,
                        "equipment":      sr.name
                    })
                    for p in template.checklist:
                        checklist_doc.append("checklist_items", {
                            "item_name": p.description
                        })
                    checklist_doc.insert(ignore_permissions=True)

                doc.append("planning", {
                    "activity_type":        plan_type,
                    "activity_name":        activity_name,
                    "planned_date":         planned_date,
                    "inspection_checklist": checklist_doc.name,
                    "equipment_name":       item.name,
                    "equipment":            sr.name
                })
                created_count += 1

    doc.save(ignore_permissions=True)

    # ── Response ──────────────────────────────────────────────────────────
    if created_count == 0:
        if not has_applicable_rows:
            return {
                "status":  "not_applicable",
                "message": "No applicable activities found."
            }

        messages = []
        if missing_item_mapping:
            messages.append(f"Missing item mapping for: {', '.join(set(missing_activities))}")
        if has_already_exists:
            messages.append(f"Some activities are already planned for {planned_date}")
        if not messages:
            messages.append("No activities matched the criteria.")

        return {
            "status":       "partial",
            "message":      " | ".join(messages),
            "planned_date": str(planned_date)
        }

    messages = []
    if created_count:
        messages.append(f"{created_count} activities created")
    if skipped_count:
        messages.append(f"{skipped_count} already existed")
    if missing_item_mapping:
        messages.append(f"Missing mapping: {', '.join(set(missing_activities))}")

    return {
        "status":       "created",
        "created":      created_count,
        "skipped":      skipped_count,
        "planned_date": str(planned_date),
        "message":      " | ".join(messages)
    }


# ===========================================================================
#  3. ASSIGN PLANNING  (Initiate Scope Planning)
#     Called by: "Initiate Scope Planning" button
# ===========================================================================

@frappe.whitelist()
def assign_planning(charter_name):
    doc            = frappe.get_doc("HSE Charter", charter_name)
    today_date     = frappe.utils.getdate(frappe.utils.today())
    created_count  = 0
    skipped_count  = 0

    def get_coming_monday(date):
        days_ahead = 0 - date.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        return frappe.utils.add_days(date, days_ahead)

    def get_monthly_planned_date(date):
        month_date = date if date.day <= 25 else frappe.utils.add_months(date, 1)
        try:
            return month_date.replace(day=29)
        except ValueError:
            return month_date.replace(day=28)

    # Collect applicable activities from all three scope tables
    all_activities = []

    for row in doc.custom_safety_inspections or []:
        if row.applicability and row.frequency in ["Daily", "Weekly", "Monthly"]:
            all_activities.append({
                "activity": row.activity_name,
                "template": row.template,
                "frequency": row.frequency,
                "type": "Inspection"
            })

    for row in doc.custom_audit or []:
        if row.applicability and row.frequency in ["Daily", "Weekly", "Monthly"]:
            all_activities.append({
                "activity": row.activity_name,
                "template": row.template,
                "frequency": row.frequency,
                "type": "Audit"
            })

    for row in doc.custom_walkthrough or []:
        if row.applicability and row.frequency in ["Daily", "Weekly", "Monthly"]:
            all_activities.append({
                "activity": row.activity_name,
                "template": row.template,
                "frequency": row.frequency,
                "type": "Walkthrough"
            })

    for act in all_activities:

        if act["frequency"] == "Daily":
            planned_date = today_date
        elif act["frequency"] == "Weekly":
            planned_date = get_coming_monday(today_date)
        elif act["frequency"] == "Monthly":
            planned_date = get_monthly_planned_date(today_date)
        else:
            continue

        template_name = act["template"]
        template      = frappe.get_doc("HSE Checklist Template", template_name)
        safe_project  = (doc.project or "").replace(" ", "-")
        safe_acronym  = (template.custom_activity_acronym or "ACT").replace(" ", "-")

        items = frappe.get_all(
            "Item",
            filters={"custom_hse_activity": act["activity"]},
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

                exists = any(
                    p.activity_name  == act["activity"]
                    and p.planned_date   == planned_date
                    and p.equipment_name == item.name
                    and p.equipment      == sr.name
                    for p in (doc.planning or [])
                )

                if exists:
                    skipped_count += 1
                    continue

                checklist_name = (
                    f"{safe_project}-{safe_acronym}-{sr.name}-{planned_date}"
                )

                if frappe.db.exists("Inspection Checklist", checklist_name):
                    checklist_doc = frappe.get_doc("Inspection Checklist", checklist_name)
                else:
                    checklist_doc = frappe.get_doc({
                        "doctype":        "Inspection Checklist",
                        "name":           checklist_name,
                        "inspection_for": doc.name,
                        "module":         act["type"],
                        "planning":       act["activity"],
                        "template":       template_name,
                        "planned_date":   planned_date,
                        "equipment":      sr.name
                    })
                    for p in template.checklist:
                        checklist_doc.append("checklist_items", {
                            "item_name": p.description
                        })
                    checklist_doc.insert(ignore_permissions=True)

                row = doc.append("planning", {})
                row.activity_type        = act["type"]
                row.activity_name        = act["activity"]
                row.planned_date         = planned_date
                row.inspection_checklist = checklist_doc.name
                row.equipment            = sr.name

                created_count += 1

    doc.save(ignore_permissions=True)

    if created_count == 0:
        return {
            "status":  "exists",
            "message": "Planning & Checklists already exist."
        }

    return {
        "status":  "created",
        "created": created_count,
        "skipped": skipped_count,
        "message": f"{created_count} activities created."
    }


# ===========================================================================
#  4. ASSIGN TRAININGS TO PROJECT EMPLOYEES
#     Called by: "Assign Trainings" button
# ===========================================================================

@frappe.whitelist()
def assign_trainings_to_project_employees(hse_charter_name, project):
    if not project:
        frappe.throw("Project is required")
    if not hse_charter_name:
        frappe.throw("HSE Charter is required")

    hse_doc = frappe.get_doc("HSE Charter", hse_charter_name)

    project_employees = frappe.get_all(
        "Project Employee",
        filters={"project": project},
        fields=["name", "employee", "designation", "project"]
    )

    if not project_employees:
        frappe.throw("No Project Employees found for this Project")

    assigned_count = 0
    errors         = []

    # ── First pass: collect errors ────────────────────────────────────────
    for emp in project_employees:
        if not emp["designation"]:
            continue

        designation_doc = frappe.get_doc("Designation", emp["designation"])
        trainings       = designation_doc.get("custom_trainings") or []

        if not trainings:
            continue

        for t in trainings:
            training_name = t.get("training")
            if not training_name:
                continue

            for row in hse_doc.get("assigned_trainings") or []:
                if row.employee == emp["name"] and row.training == training_name:
                    if row.status != "Completed":
                        errors.append(
                            f"• Training <b>'{training_name}'</b> already assigned to "
                            f"Employee <b>{emp['employee']}</b> and is not Completed."
                        )
                    break

    if errors:
        frappe.throw(
            "The following trainings could not be assigned:<br><br>" +
            "<br>".join(errors)
        )

    # ── Second pass: assign ───────────────────────────────────────────────
    for emp in project_employees:
        if not emp["designation"]:
            continue

        designation_doc  = frappe.get_doc("Designation", emp["designation"])
        trainings        = designation_doc.get("custom_trainings") or []

        if not trainings:
            continue

        project_emp_doc = frappe.get_doc("Project Employee", emp["name"])

        for t in trainings:
            training_name = t.get("training")
            if not training_name:
                continue

            hse_doc.append("assigned_trainings", {
                "employee":    emp["name"],
                "employee_id": emp["employee"],
                "training":    training_name,
                "project":     emp["project"],
            })
            assigned_count += 1

            history_dup = next(
                (r for r in (project_emp_doc.get("custom_trainings_history") or [])
                 if r.training_program == training_name),
                None
            )

            if history_dup and history_dup.status != "Completed":
                continue

            project_emp_doc.append("custom_trainings_history", {
                "training_program": training_name,
                "status":           "Present",
                "project":          emp["project"]
            })

        project_emp_doc.flags.ignore_mandatory = True
        project_emp_doc.flags.ignore_validate  = True
        project_emp_doc.flags.ignore_links     = True
        project_emp_doc.save(ignore_permissions=True)

    hse_doc.save(ignore_permissions=True)

    if assigned_count == 0:
        frappe.msgprint("No trainings found to assign.")
    else:
        frappe.msgprint(f"{assigned_count} trainings assigned successfully.")
