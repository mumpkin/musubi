// SPDX-License-Identifier: GPL-3.0-or-later
// Whether a graph is on screen: while one is, the explorer shows the color
// of each folder, to read the colors of the notes in the graph.
class GraphPresence {
	// Graph views mounted, in every pane.
	views = $state(0);

	get isShown(): boolean {
		return this.views > 0;
	}

	// Counts a graph view until the returned function is called.
	enter(): () => void {
		this.views += 1;
		return () => {
			this.views -= 1;
		};
	}
}

export const graphPresence = new GraphPresence();
