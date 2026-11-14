// SPDX-License-Identifier: GPL-3.0-or-later
//! Tasks switched from the reading view: `#todo[…]` becomes `#done[…]`
//! and back, by changing the name of the function in the note source.

const TODO: &str = "todo";
const DONE: &str = "done";

fn is_name_char(character: char) -> bool {
	character.is_alphanumeric() || character == '_' || character == '-'
}

/// `text` with the task function named at byte `offset` switched between
/// `todo` and `done`; `None` if no such name starts there.
#[must_use]
pub fn toggle_task(text: &str, offset: usize) -> Option<String> {
	let (before, rest) = (text.get(..offset)?, text.get(offset..)?);
	let other = if rest.starts_with(TODO) {
		DONE
	} else if rest.starts_with(DONE) {
		TODO
	} else {
		return None;
	};
	let after = rest.get(TODO.len()..)?;
	let starts_name = before
		.chars()
		.next_back()
		.is_none_or(|character| !is_name_char(character));
	let ends_name = after
		.chars()
		.next()
		.is_none_or(|character| !is_name_char(character));
	(starts_name && ends_name).then(|| format!("{before}{other}{after}"))
}

#[cfg(test)]
mod tests {
	use super::toggle_task;

	#[test]
	fn switches_todo_and_done() {
		let text = "- #todo[Buy milk]\n- #done[Call]\n";
		let toggled = toggle_task(text, 3);
		assert_eq!(
			toggled.as_deref(),
			Some("- #done[Buy milk]\n- #done[Call]\n")
		);
		let back = toggle_task(text, 21);
		assert_eq!(back.as_deref(), Some("- #todo[Buy milk]\n- #todo[Call]\n"));
	}

	#[test]
	fn keeps_other_names() {
		assert_eq!(toggle_task("#todos[x]", 1), None);
		assert_eq!(toggle_task("#my-todo[x]", 4), None);
		assert_eq!(toggle_task("#card[x]", 1), None);
		assert_eq!(toggle_task("#todo", 99), None);
	}
}
