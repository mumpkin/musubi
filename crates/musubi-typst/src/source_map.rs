// SPDX-License-Identifier: GPL-3.0-or-later
//! Links rendered HTML elements to the source blocks they come from.
//!
//! Every element and text node of the HTML export keeps the span of the
//! syntax that produced it. An element whose spans in the note all fall in
//! one block gets a `data-block` attribute with the index of that block;
//! an element that covers several blocks (a list, for example) is left as is
//! and its children are examined instead.

use std::collections::BTreeSet;

use typst::World;
use typst::WorldExt;
use typst::syntax::Span;
use typst_html::{HtmlAttr, HtmlElement, HtmlNode};

use crate::blocks::SourceBlock;

const BLOCK_ATTRIBUTE: &str = "data-block";

/// What the annotation needs to know about the note.
pub struct SourceMap<'a> {
	pub world: &'a dyn World,
	pub blocks: &'a [SourceBlock],
}

impl SourceMap<'_> {
	/// Adds `data-block` attributes to the descendants of `element`.
	pub fn annotate(&self, element: &mut HtmlElement) {
		let Ok(attribute) = HtmlAttr::intern(BLOCK_ATTRIBUTE) else {
			return;
		};
		for child in element.children.make_mut() {
			if let HtmlNode::Element(child_element) = child {
				self.annotate_element(child_element, attribute);
			}
		}
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
			HtmlNode::Tag(_) | HtmlNode::Frame(_) => {}
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
		if span.id() != Some(self.world.main()) {
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

fn has_element_children(element: &HtmlElement) -> bool {
	element
		.children
		.iter()
		.any(|child| matches!(child, HtmlNode::Element(_)))
}
