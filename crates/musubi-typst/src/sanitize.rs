// SPDX-License-Identifier: GPL-3.0-or-later
//! Removes from the HTML tree everything that could run code or load from
//! elsewhere. Notes come from anywhere (synced, downloaded), and Typst lets
//! a note emit any element with `html.elem`. The interface cleans the HTML
//! again and the content security policy of the window is a last barrier.

use typst_html::{HtmlElement, HtmlNode, tag};

/// Elements removed with their content.
const FORBIDDEN_ELEMENTS: [&str; 12] = [
	"script", "iframe", "frame", "frameset", "object", "embed", "link", "meta",
	"base", "form", "noscript", "template",
];
/// Attributes whose value is a URL.
const URL_ATTRIBUTES: [&str; 7] = [
	"href",
	"src",
	"action",
	"formaction",
	"poster",
	"srcset",
	"xlink:href",
];
/// URLs that may stay: links to notes and the web, anchors, embedded
/// images.
const SAFE_URL_PREFIXES: [&str; 6] =
	["musubi:", "https:", "http:", "mailto:", "#", "data:image/"];

/// Whether `url` is safe, once the characters browsers skip are removed
/// (`java\tscript:` is `javascript:`).
fn is_safe_url(url: &str) -> bool {
	let compact: String = url
		.chars()
		.filter(|character| {
			!character.is_ascii_whitespace() && !character.is_control()
		})
		.collect::<String>()
		.to_ascii_lowercase();
	SAFE_URL_PREFIXES
		.iter()
		.any(|prefix| compact.starts_with(prefix))
}

fn is_safe_attribute(name: &str, value: &str) -> bool {
	let name = name.to_ascii_lowercase();
	if name.starts_with("on") {
		return false;
	}
	!URL_ATTRIBUTES.contains(&name.as_str()) || is_safe_url(value)
}

/// Whether `element`, a child of the head if `in_head`, must go.
fn is_forbidden(element: &HtmlElement, in_head: bool) -> bool {
	let name = element.tag.resolve();
	let name = name.as_str();
	// Typst puts its own styles in the head; a note may not add any.
	FORBIDDEN_ELEMENTS.contains(&name) || (name == "style" && !in_head)
}

fn clean_element(element: &mut HtmlElement) {
	element.attrs.0.retain(|(attribute, value)| {
		is_safe_attribute(attribute.resolve().as_str(), value)
	});
	let is_head = element.tag == tag::head;
	element.children.retain(|child| match child {
		HtmlNode::Element(child) => !is_forbidden(child, is_head),
		_ => true,
	});
	for child in element.children.make_mut() {
		if let HtmlNode::Element(child) = child {
			clean_element(child);
		}
	}
}

/// Cleans `root`, the `html` element of a document, in place.
pub fn sanitize(root: &mut HtmlElement) {
	clean_element(root);
}

#[cfg(test)]
mod tests {
	use super::{is_safe_attribute, is_safe_url};

	#[test]
	fn keeps_only_safe_urls() {
		for url in ["musubi://note/Demo", "https://typst.app", "#loc-1"] {
			assert!(is_safe_url(url), "{url}");
		}
		assert!(is_safe_url("data:image/png;base64,AAA"));
		for url in [
			"javascript:alert(1)",
			" JavaScript:alert(1)",
			"java\tscript:alert(1)",
			"data:text/html,<script>",
			"vbscript:x",
			"file:///etc/passwd",
		] {
			assert!(!is_safe_url(url), "{url}");
		}
	}

	#[test]
	fn removes_event_handlers() {
		assert!(!is_safe_attribute("onclick", "x"));
		assert!(!is_safe_attribute("ONLOAD", "x"));
		assert!(is_safe_attribute("class", "musubi-link"));
		assert!(!is_safe_attribute("href", "javascript:x"));
	}
}
