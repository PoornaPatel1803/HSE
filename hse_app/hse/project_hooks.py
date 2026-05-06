import frappe


def create_hse_charter(doc, method=None):
    if frappe.db.exists("HSE Charter", {"project": doc.name}):
        return

    try:
        charter = frappe.get_doc({
            "doctype": "HSE Charter",
            "project": doc.name,
        })
        charter.insert(ignore_permissions=True)
    except Exception:
        frappe.log_error(title=f"HSE Charter auto-create failed for {doc.name}")
