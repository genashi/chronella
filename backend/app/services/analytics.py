import statistics
from datetime import datetime, timedelta

EWMA_ALPHA = 0.3

def _ewma(series: list, alpha: float = EWMA_ALPHA) -> list:
    if not series:
        return []
    result = [series[0]]
    for val in series[1:]:
        result.append(alpha * val + (1 - alpha) * result[-1])
    return result

def analyze_weekly_workload(events, week_start_str: str):
    weights = {'lecture': 1.0, 'practice': 1.2, 'lab': 1.2, 'deadline': 2.0, 'exam': 2.5, 'control': 2.5, 'custom': 1.0}
    
    start_dt = datetime.strptime(week_start_str, "%Y-%m-%d")
    daily_loads = {(start_dt + timedelta(days=i)).strftime('%Y-%m-%d'): 0.0 for i in range(7)}
    
    for event in events:
        e_type = event.type if hasattr(event, 'type') else event.get('type', 'custom')
        e_start = event.start_at if hasattr(event, 'start_at') else event.get('start_at')
        e_end = event.end_at if hasattr(event, 'end_at') else event.get('end_at')
        
        if not e_start or not e_end:
            continue
            
        day = e_start.strftime('%Y-%m-%d')
        if day in daily_loads:
            duration = (e_end - e_start).total_seconds() / 3600
            weight = weights.get(e_type, 1.0)
            daily_loads[day] += duration * weight

    loads_only = list(daily_loads.values())
    
    mean_load = statistics.mean(loads_only)
    stdev_load = statistics.stdev(loads_only) if len(loads_only) > 1 else 0.0
    cv = (stdev_load / mean_load * 100) if mean_load > 0 else 0.0
    
    ewma_vals = _ewma(loads_only)
    
    daily_details = []
    
    for i, (day, load) in enumerate(daily_loads.items()):
        z_score = (load - mean_load) / stdev_load if stdev_load > 0 else 0.0
        ewma_val = ewma_vals[i]
        
        if z_score >= 1.5:
            status = "crit"
        elif z_score >= 1.0:
            status = "warn"
        elif z_score <= -1.0:
            status = "rest"
        else:
            status = "ok"

        daily_details.append({
            "day": day,
            "load": round(load, 2),
            "ewma": round(ewma_val, 2),
            "z_score": round(z_score, 2),
            "status": status
        })

    return {
        "mean_load": round(mean_load, 2),
        "stdev_load": round(stdev_load, 2),
        "cv": round(cv, 1),
        "daily_details": daily_details
    }