const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function getMonthNames() {
  return monthNames;
}

export function parseDateValue(dateValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day, 12, 0, 0);
}

export function toDateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function formatCalendarMonth(date: Date) {
  return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

export function inputValueToDisplayDate(dateValue: string) {
  const [year, month, day] = dateValue.split("-");
  const monthName = monthNames[Number(month) - 1];

  if (!year || !monthName || !day) {
    return "";
  }

  return `${monthName} ${Number(day)}, ${year}`;
}

export function formatDateRange(startDate: string, endDate?: string) {
  if (!startDate) {
    return "";
  }

  if (!endDate || endDate === startDate) {
    return inputValueToDisplayDate(startDate);
  }

  const start = parseDateValue(startDate);
  const end = parseDateValue(endDate);

  if (!start || !end) {
    return inputValueToDisplayDate(startDate);
  }

  const startMonth = monthNames[start.getMonth()];
  const endMonth = monthNames[end.getMonth()];
  const startDay = start.getDate();
  const endDay = end.getDate();
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  if (startYear === endYear && start.getMonth() === end.getMonth()) {
    return `${startMonth} ${startDay}-${endDay}, ${startYear}`;
  }

  if (startYear === endYear) {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${startYear}`;
  }

  return `${startMonth} ${startDay}, ${startYear} - ${endMonth} ${endDay}, ${endYear}`;
}

export function displayDateToInputValue(dateLabel: string) {
  const [monthName, dayWithComma, year] = dateLabel.split(" ");
  const monthIndex = monthNames.indexOf(monthName);
  const day = dayWithComma?.replace(",", "").padStart(2, "0");

  if (monthIndex < 0 || !day || !year) {
    return "";
  }

  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${day}`;
}

export function buildCalendarCells(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1, 12, 0, 0);
  const daysInMonth = new Date(year, month + 1, 0, 12, 0, 0).getDate();
  const leadingBlanks = firstDay.getDay();
  const cells: Array<{ key: string; label: string; value?: string }> = [];

  for (let index = 0; index < leadingBlanks; index += 1) {
    cells.push({ key: `blank-${year}-${month}-${index}`, label: "" });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const currentDate = new Date(year, month, day, 12, 0, 0);
    cells.push({
      key: toDateValue(currentDate),
      label: String(day),
      value: toDateValue(currentDate),
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `tail-${year}-${month}-${cells.length}`, label: "" });
  }

  return cells;
}
