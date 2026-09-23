from langchain_core.tools import tool

@tool
def check_mileage_consistency(mileage_timeline: list) -> list:
    """
    Deterministic tool to check for odometer rollbacks.
    Input: A chronologically sorted list of dictionaries with 'date' and 'mileage'.
    Returns: A list of fraud flags (if any).
    """
    flags = []
    max_mileage_seen = -1

    for entry in mileage_timeline:
        current_mileage = entry.get("mileage", 0)
        current_date = entry.get("date", "Unknown")

        if current_mileage < max_mileage_seen:
            flags.append({
                "type": "odometer_rollback",
                "detail": f"Mileage dropped to {current_mileage} on {current_date} (previously saw {max_mileage_seen}).",
                "severity": "high"
            })
        else:
            max_mileage_seen = max(max_mileage_seen, current_mileage)

    return flags

@tool
def check_record_consistency(service_records: list) -> list:
    """
    Deterministic tool to flag unverified garages and duplicate records.
    Input: A list of service records.
    Returns: A list of fraud flags (if any).
    """
    flags = []
    seen_records = set()

    for record in service_records:
        garage_id = record.get("garage_id", "Unknown")
        is_verified = record.get("garage_verified", False)
        date = record.get("date", "Unknown")
        record_type = record.get("type", "Unknown")

        # 1. Check for Unverified Garage
        if not is_verified:
            flags.append({
                "type": "unverified_garage",
                "detail": f"Record from garage {garage_id} is not a registered/verified organization.",
                "severity": "medium"
            })

        # 2. Check for Duplicate Records (same garage, date, and type)
        record_hash = f"{garage_id}_{date}_{record_type}"
        if record_hash in seen_records:
            flags.append({
                "type": "duplicate_record",
                "detail": f"Duplicate entry found for {record_type} on {date}.",
                "severity": "low"
            })
        else:
            seen_records.add(record_hash)

    return flags