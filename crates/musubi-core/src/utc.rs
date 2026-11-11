// SPDX-License-Identifier: GPL-3.0-or-later
//! UTC times of the vault format: `2026-11-10T14:03:22Z` in files and
//! `20261110T140322Z` in names, as seconds since the Unix epoch.

const SECONDS_PER_DAY: i64 = 86_400;
const SECONDS_PER_HOUR: i64 = 3_600;
const SECONDS_PER_MINUTE: i64 = 60;
const DAYS_PER_ERA: i64 = 146_097;
const YEARS_PER_ERA: i64 = 400;
const DAYS_FROM_EPOCH_TO_ERA_ZERO: i64 = 719_468;
const MONTHS_FROM_MARCH: i64 = 153;

/// A UTC date and time, to the second.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct Civil {
	year: i64,
	month: i64,
	day: i64,
	hour: i64,
	minute: i64,
	second: i64,
}

/// Days since the epoch of a date (`days_from_civil` of Howard Hinnant).
const fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
	let year = if month <= 2 { year - 1 } else { year };
	let era = year.div_euclid(YEARS_PER_ERA);
	let year_of_era = year - era * YEARS_PER_ERA;
	let month_from_march = (month + 9) % 12;
	let day_of_year = (MONTHS_FROM_MARCH * month_from_march + 2) / 5 + day - 1;
	let day_of_era =
		year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
	era * DAYS_PER_ERA + day_of_era - DAYS_FROM_EPOCH_TO_ERA_ZERO
}

/// The date of a day since the epoch (`civil_from_days`).
const fn civil_from_days(days: i64) -> (i64, i64, i64) {
	let shifted = days + DAYS_FROM_EPOCH_TO_ERA_ZERO;
	let era = shifted.div_euclid(DAYS_PER_ERA);
	let day_of_era = shifted - era * DAYS_PER_ERA;
	let year_of_era = (day_of_era - day_of_era / 1460 + day_of_era / 36_524
		- day_of_era / 146_096)
		/ 365;
	let day_of_year =
		day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
	let month_from_march = (5 * day_of_year + 2) / MONTHS_FROM_MARCH;
	let day = day_of_year - (MONTHS_FROM_MARCH * month_from_march + 2) / 5 + 1;
	let month = if month_from_march < 10 {
		month_from_march + 3
	} else {
		month_from_march - 9
	};
	let year =
		year_of_era + era * YEARS_PER_ERA + if month <= 2 { 1 } else { 0 };
	(year, month, day)
}

fn civil(seconds: i64) -> Civil {
	let (year, month, day) =
		civil_from_days(seconds.div_euclid(SECONDS_PER_DAY));
	let time = seconds.rem_euclid(SECONDS_PER_DAY);
	Civil {
		year,
		month,
		day,
		hour: time / SECONDS_PER_HOUR,
		minute: time % SECONDS_PER_HOUR / SECONDS_PER_MINUTE,
		second: time % SECONDS_PER_MINUTE,
	}
}

/// `2026-11-10T14:03:22Z`.
#[must_use]
pub fn rfc3339(seconds: i64) -> String {
	let at = civil(seconds);
	format!(
		"{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z",
		at.year, at.month, at.day, at.hour, at.minute, at.second
	)
}

/// `20261110T140322Z`, for names.
#[must_use]
pub fn compact(seconds: i64) -> String {
	rfc3339(seconds).replace(['-', ':'], "")
}

/// Seconds since the epoch of `2026-11-10T14:03:22Z`; `None` for any other
/// form.
#[must_use]
pub fn parse_rfc3339(text: &str) -> Option<i64> {
	let bytes = text.as_bytes();
	let is_shape = text.len() == "2026-11-10T14:03:22Z".len()
		&& bytes.get(4) == Some(&b'-')
		&& bytes.get(7) == Some(&b'-')
		&& bytes.get(10) == Some(&b'T')
		&& bytes.get(13) == Some(&b':')
		&& bytes.get(16) == Some(&b':')
		&& text.ends_with('Z');
	if !is_shape {
		return None;
	}
	let number =
		|range: std::ops::Range<usize>| text.get(range)?.parse::<i64>().ok();
	let days = days_from_civil(number(0..4)?, number(5..7)?, number(8..10)?);
	Some(
		days * SECONDS_PER_DAY
			+ number(11..13)? * SECONDS_PER_HOUR
			+ number(14..16)? * SECONDS_PER_MINUTE
			+ number(17..19)?,
	)
}

#[cfg(test)]
mod tests {
	use super::{compact, parse_rfc3339, rfc3339};

	const SAMPLE: i64 = 1_794_319_402;

	#[test]
	fn writes_and_reads_utc_times() {
		assert_eq!(rfc3339(0), "1970-01-01T00:00:00Z");
		assert_eq!(rfc3339(SAMPLE), "2026-11-10T14:03:22Z");
		assert_eq!(compact(SAMPLE), "20261110T140322Z");
		assert_eq!(parse_rfc3339("2026-11-10T14:03:22Z"), Some(SAMPLE));
		assert_eq!(
			parse_rfc3339("2024-02-29T00:00:00Z")
				.map(rfc3339)
				.as_deref(),
			Some("2024-02-29T00:00:00Z")
		);
		assert_eq!(parse_rfc3339("2026-11-10 14:03:22"), None);
	}
}
