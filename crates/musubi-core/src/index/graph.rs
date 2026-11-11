// SPDX-License-Identifier: GPL-3.0-or-later
//! The graph of notes and links, from the index.

use std::collections::HashMap;

use serde::Serialize;
use ts_rs::TS;

use super::VaultIndex;
use crate::error::VaultError;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, TS)]
#[ts(export)]
pub struct GraphNode {
	/// Path from the vault root, with the extension.
	pub path: String,
	pub title: String,
}

/// A link between two notes, by their index in the nodes.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, TS)]
#[ts(export)]
pub struct GraphLink {
	pub source: u32,
	pub target: u32,
}

#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, TS)]
#[ts(export)]
pub struct Graph {
	pub nodes: Vec<GraphNode>,
	/// Links to existing notes, one per pair of notes and direction,
	/// without links of a note to itself.
	pub links: Vec<GraphLink>,
}

impl VaultIndex {
	fn graph_nodes(&self) -> Result<Vec<GraphNode>, VaultError> {
		let mut statement = self
			.connection
			.prepare("SELECT path, title FROM notes ORDER BY path")?;
		let nodes = statement.query_map((), |row| {
			Ok(GraphNode {
				path: row.get(0)?,
				title: row.get(1)?,
			})
		})?;
		Ok(nodes.collect::<Result<_, _>>()?)
	}

	/// Every note and the links between them.
	///
	/// # Errors
	///
	/// A SQLite error.
	pub fn graph(&self) -> Result<Graph, VaultError> {
		let nodes = self.graph_nodes()?;
		let positions: HashMap<&str, u32> = nodes
			.iter()
			.zip(0..)
			.map(|(node, position)| (node.path.as_str(), position))
			.collect();
		let mut statement = self.connection.prepare(
			"SELECT DISTINCT links.note, notes.path FROM links
			JOIN notes ON notes.path = links.target || '.typ'
			WHERE notes.path != links.note",
		)?;
		let pairs = statement
			.query_map((), |row| Ok((row.get(0)?, row.get(1)?)))?
			.collect::<Result<Vec<(String, String)>, _>>()?;
		let links = pairs
			.iter()
			.filter_map(|(source, target)| {
				Some(GraphLink {
					source: *positions.get(source.as_str())?,
					target: *positions.get(target.as_str())?,
				})
			})
			.collect();
		Ok(Graph { nodes, links })
	}
}
