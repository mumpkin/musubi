// SPDX-License-Identifier: GPL-3.0-or-later
// The order of names in lists: numbers by their value ("Note 2" before
// "Note 10"), letters without regard to case or accents first.
const collator = new Intl.Collator(undefined, {
	numeric: true,
	sensitivity: 'base',
});

// Compares two names naturally; equal names compare by their exact text,
// so that the order never depends on where they came from.
export function naturalCompare(left: string, right: string): number {
	const order = collator.compare(left, right);
	if (order !== 0 || left === right) {
		return order;
	}
	return left < right ? -1 : 1;
}

// Compares two paths naturally, folder by folder: a folder comes right
// before what it holds.
export function naturalPathCompare(left: string, right: string): number {
	const leftParts = left.split('/');
	const rightParts = right.split('/');
	const shared = Math.min(leftParts.length, rightParts.length);
	for (let index = 0; index < shared; index += 1) {
		const order = naturalCompare(leftParts[index] ?? '', rightParts[index] ?? '');
		if (order !== 0) {
			return order;
		}
	}
	return leftParts.length - rightParts.length;
}
