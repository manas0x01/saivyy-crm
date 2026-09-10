// Utility to parse and filter CRM records by standard time horizons

export function isDateInRange(dateValue, range) {
  if (!range || range === "All Time" || range === "All") return true;
  if (dateValue === undefined || dateValue === null || dateValue === "") return false;

  let parsedDate = null;

  // Try ISO date, Date object or timestamp
  if (dateValue instanceof Date) {
    parsedDate = dateValue;
  } else if (typeof dateValue === "number") {
    parsedDate = new Date(dateValue > 1e11 ? dateValue : dateValue * 1000);
  } else if (typeof dateValue === "string") {
    const clean = dateValue.replace(/·/g, " ").trim();
    if (!clean) return false;

    const lower = clean.toLowerCase();

    // Relative date handling
    if (lower === "today" || lower.startsWith("today")) {
      parsedDate = new Date();
    } else if (lower === "yesterday" || lower.startsWith("yesterday")) {
      parsedDate = new Date(Date.now() - 86400000);
    } else if (lower.includes("day ago") || lower.includes("days ago")) {
      const matchDays = lower.match(/(\d+)\s*day/);
      const days = matchDays ? parseInt(matchDays[1], 10) : 1;
      parsedDate = new Date(Date.now() - days * 86400000);
    } else if (
      lower.includes("hour ago") ||
      lower.includes("hours ago") ||
      lower.includes("min ago") ||
      lower.includes("mins ago") ||
      lower === "just now"
    ) {
      parsedDate = new Date();
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      const [y, m, d] = clean.split("-").map(Number);
      parsedDate = new Date(y, m - 1, d);
    } else {
      let normalized = clean.replace(/Sept/i, "Sep");
      // If year is omitted (e.g. "10 Aug"), assume current year
      if (!/\d{4}/.test(normalized)) {
        normalized = `${normalized} ${new Date().getFullYear()}`;
      }

      const d = new Date(normalized);
      if (!isNaN(d.getTime())) {
        parsedDate = d;
      } else {
        // Try parsing Indian standard date e.g. "13/08/2026" or "13-08-2026"
        const match = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
        if (match) {
          parsedDate = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
        }
      }
    }
  }

  if (!parsedDate || isNaN(parsedDate.getTime())) return true; // fallback to include if date cannot be parsed

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (range) {
    case "Today": {
      return parsedDate >= startOfDay && parsedDate <= endOfDay;
    }
    case "This Week": {
      const day = now.getDay();
      const diffToMonday = (day === 0 ? -6 : 1) - day;
      const startOfWeek = new Date(startOfDay);
      startOfWeek.setDate(startOfDay.getDate() + diffToMonday);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return parsedDate >= startOfWeek && parsedDate <= endOfWeek;
    }
    case "This Month": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return parsedDate >= startOfMonth && parsedDate <= endOfMonth;
    }
    case "This Quarter": {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
      const endOfQuarter = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59, 999);
      return parsedDate >= startOfQuarter && parsedDate <= endOfQuarter;
    }
    case "This Year": {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return parsedDate >= startOfYear && parsedDate <= endOfYear;
    }
    default:
      return true;
  }
}

export function filterByDateRange(items, range, dateExtractor) {
  if (!range || range === "All Time" || range === "All") return items || [];
  if (!Array.isArray(items)) return [];

  return items.filter((item) => {
    if (!item) return false;

    let candidateDates = [];

    if (typeof dateExtractor === "function") {
      try {
        const val = dateExtractor(item);
        if (Array.isArray(val)) {
          candidateDates = val;
        } else if (val !== undefined && val !== null) {
          candidateDates = [val];
        }
      } catch {
        return true;
      }
    } else if (Array.isArray(dateExtractor)) {
      candidateDates = dateExtractor
        .map((key) => item[key])
        .filter((val) => val !== undefined && val !== null && val !== "");
    } else if (typeof dateExtractor === "string" && dateExtractor.trim()) {
      const val = item[dateExtractor.trim()];
      if (val !== undefined && val !== null && val !== "") {
        candidateDates = [val];
      }
    }

    if (candidateDates.length === 0) {
      const fallback =
        item.created ||
        item.date ||
        item.lastContact ||
        item.createdAt ||
        item.close ||
        item.dueDate ||
        item.last;
      if (fallback !== undefined && fallback !== null && fallback !== "") {
        candidateDates = [fallback];
      } else {
        return true;
      }
    }

    return candidateDates.some((dateVal) => isDateInRange(dateVal, range));
  });
}
