// SPDX-License-Identifier: GPL-3.0-or-later
//! Links rendered HTML elements to the source blocks they come from.
//!
//! Every element and text node of the HTML export keeps the span of the
//! syntax that produced it. An element whose spans in the note all fall in
//! one block gets a `data-block` attribute with the index of that block;
//! an element that covers several blocks (a list, for example) is left as is
//! and its children are examined instead.

use std::collections::BTreeSet;

use ecow::eco_vec;
use typst::World;
use typst::WorldExt;
use typst::syntax::FileId;
use typst::syntax::Span;
use typst_html::{HtmlAttr, HtmlElement, HtmlNode, tag};

use crate::blocks::SourceBlock;

const BLOCK_ATTRIBUTE: &str = "data-block";
/// The class of the `span` that gives text its color or size.
const STYLED_TEXT_CLASS: &str = "musubi-text";

/// What the annotation needs to know about the note.
pub struct SourceMap<'a> {
	pub world: &'a dyn World,
	/// The note whose blocks are marked.
	pub note: FileId,
	pub blocks: &'a [SourceBlock],
}

impl SourceMap<'_> {
	/// Adds `data-block` attributes to the descendants of `element`.
	pub fn annotate(&self, element: &mut HtmlElement) {
		let Ok(attribute) = HtmlAttr::intern(BLOCK_ATTRIBUTE) else {
			return;
		};
		for child in element.children.make_mut() {
			match child {
				HtmlNode::Element(child_element) => {
					self.annotate_element(child_element, attribute);
				}
				HtmlNode::Frame(_) => self.wrap_frame(child, attribute),
				HtmlNode::Tag(_) | HtmlNode::Text(..) => {}
			}
		}
	}

	/// A frame of its own (an SVG island) goes into a `div` that carries
	/// its block, as other blocks do.
	fn wrap_frame(&self, node: &mut HtmlNode, attribute: HtmlAttr) {
		let HtmlNode::Frame(frame) = node else {
			return;
		};
		let span = frame.span;
		let mut covered = BTreeSet::new();
		self.insert_block(span, &mut covered);
		let Some(index) = covered.first() else {
			return;
		};
		let island =
			std::mem::replace(node, HtmlNode::text("", Span::detached()));
		*node = HtmlNode::Element(
			HtmlElement::new(tag::div)
				.with_attr(attribute, index.to_string())
				.with_children(eco_vec![island])
				.spanned(span),
		);
	}

	fn annotate_element(&self, element: &mut HtmlElement, attribute: HtmlAttr) {
		let mut covered = BTreeSet::new();
		self.collect_element(element, &mut covered);
		let mut indices = covered.iter();
		match (indices.next(), indices.next()) {
			(Some(index), None) => {
				element.attrs.push(attribute, index.to_string());
			}
			(Some(_), Some(_)) if has_element_children(element) => {
				for child in element.children.make_mut() {
					if let HtmlNode::Element(child_element) = child {
						self.annotate_element(child_element, attribute);
					}
				}
			}
			// Text from several blocks, typically a variable defined in one
			// block and used in a later one: the use is the last block.
			(Some(_), Some(_)) => {
				if let Some(last) = covered.last() {
					element.attrs.push(attribute, last.to_string());
				}
			}
			_ => {}
		}
	}

	/// Indices of the blocks that the spans of `node` and its descendants
	/// fall in.
	fn collect_blocks(&self, node: &HtmlNode, covered: &mut BTreeSet<usize>) {
		match node {
			HtmlNode::Text(_, span) => self.insert_block(*span, covered),
			HtmlNode::Element(element) => {
				self.collect_element(element, covered)
			}
			HtmlNode::Frame(frame) => self.insert_block(frame.span, covered),
			HtmlNode::Tag(_) => {}
		}
	}

	fn collect_element(
		&self,
		element: &HtmlElement,
		covered: &mut BTreeSet<usize>,
	) {
		self.insert_block(element.span, covered);
		for child in &element.children {
			self.collect_blocks(child, covered);
		}
	}

	fn insert_block(&self, span: Span, covered: &mut BTreeSet<usize>) {
		if span.id() != Some(self.note) {
			return;
		}
		let Some(range) = self.world.range(span) else {
			return;
		};
		if let Some(index) = self.block_at(range.start) {
			covered.insert(index);
		}
	}

	fn block_at(&self, byte: usize) -> Option<usize> {
		self.blocks
			.iter()
			.position(|block| block.start <= byte && byte < block.end)
	}
}

/// Whether `element` has children other than text; a `span` that only
/// carries the style of its text (`entry.typ`) counts as text.
fn has_element_children(element: &HtmlElement) -> bool {
	element.children.iter().any(|child| match child {
		HtmlNode::Element(child) => !is_styled_text(child),
		_ => false,
	})
}

fn is_styled_text(element: &HtmlElement) -> bool {
	element.tag == tag::span
		&& element.attrs.0.iter().any(|(attribute, value)| {
			attribute.resolve().as_str() == "class"
				&& value == STYLED_TEXT_CLASS
		})
}
