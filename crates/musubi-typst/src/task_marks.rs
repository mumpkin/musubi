// SPDX-License-Identifier: GPL-3.0-or-later
//! Tasks of the reading view (`#todo[…]`, `#done[…]`) get the position, in
//! the note, of the name of their function: a click on their checkbox can
//! then switch it. A task whose call is not found (a task made by another
//! function, a renamed import) stays as it is.

use typst::WorldExt;
use typst::syntax::{LinkedNode, Side, Source, SyntaxKind};
use typst_html::{HtmlAttr, HtmlElement, HtmlNode};

use crate::world::VaultWorld;

const TASK_CLASS: &str = "musubi-task";
const TASK_ATTRIBUTE: &str = "data-task";
const TASK_FUNCTIONS: [&str; 2] = ["todo", "done"];

pub struct TaskMarks<'a> {
	pub world: &'a VaultWorld,
	/// The note as it is on disk.
	pub source: &'a Source,
}

impl TaskMarks<'_> {
	/// Marks the tasks among the descendants of `element`.
	pub fn mark(&self, element: &mut HtmlElement) {
		let Ok(attribute) = HtmlAttr::intern(TASK_ATTRIBUTE) else {
			return;
		};
		self.mark_with(element, attribute);
	}

	fn mark_with(&self, element: &mut HtmlElement, attribute: HtmlAttr) {
		for child in element.children.make_mut() {
			let HtmlNode::Element(child) = child else {
				continue;
			};
			if is_task(child) {
				if let Some(offset) = self.call_of(child) {
					child.attrs.push(attribute, offset.to_string());
				}
			} else {
				self.mark_with(child, attribute);
			}
		}
	}

	/// The first byte of the note that the text of `element` comes from.
	fn first_note_byte(&self, element: &HtmlElement) -> Option<usize> {
		element.children.iter().find_map(|child| match child {
			HtmlNode::Text(_, span) if span.id() == Some(self.world.note()) => {
				let range = self.world.range(*span)?;
				Some(self.world.to_original(range.start))
			}
			HtmlNode::Element(child) => self.first_note_byte(child),
			_ => None,
		})
	}

	/// Where the name of the `todo` or `done` call of the task `element`
	/// starts in the note.
	fn call_of(&self, element: &HtmlElement) -> Option<usize> {
		let byte = self.first_note_byte(element)?;
		let root = LinkedNode::new(self.source.root());
		let mut node = root.leaf_at(byte, Side::After)?;
		while let Some(parent) = node.parent().cloned() {
			if parent.kind() == SyntaxKind::FuncCall
				&& let Some(name) = task_function_name(&parent)
			{
				return Some(name);
			}
			node = parent;
		}
		None
	}
}

fn is_task(element: &HtmlElement) -> bool {
	element.attrs.0.iter().any(|(attribute, value)| {
		attribute.resolve().as_str() == "class" && value == TASK_CLASS
	})
}

/// The offset of the name of `call` if it calls `todo` or `done`, directly
/// or as a field (`musubi.todo`).
fn task_function_name(call: &LinkedNode) -> Option<usize> {
	let callee = call.children().next()?;
	let name = match callee.kind() {
		SyntaxKind::Ident => callee,
		SyntaxKind::FieldAccess => callee.children().next_back()?,
		_ => return None,
	};
	TASK_FUNCTIONS
		.contains(&name.get().leaf_text().as_str())
		.then(|| name.offset())
}
