// SPDX-License-Identifier: GPL-3.0-or-later
// Images dropped on or pasted into the editor: copied into the `.assets`
// folder of the note, then shown with an `#image` call at the cursor.
import {
	EditorSelection,
	type EditorState,
	type Extension,
} from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { modeField } from '@musubi/editor';
import { getCurrentWebview } from '@tauri-apps/api/webview';

import {
	imageMarkup,
	importImage,
	isImageFile,
	pasteImage,
} from '../vault/assets.ts';

export interface ImageTarget {
	// Path of the note being edited, from the vault root.
	note: () => string;
	onMessage: (message: string) => void;
}

// An image is a block: it goes on a line of its own.
function onItsOwnLine(state: EditorState, from: number, text: string) {
	const line = state.doc.lineAt(from);
	const before = from > line.from ? '\n' : '';
	const after = from < line.to ? '\n' : '';
	return before + text + after;
}

// Inserts `#image(…)` for each path at the main cursor, on its own line. In
// insert mode the cursor goes after it; otherwise the insertion is
// selected, as a paste.
export function insertImages(view: EditorView, paths: string[]): void {
	const { state } = view;
	const isInsert = state.field(modeField) === 'insert';
	const { main } = state.selection;
	const from = isInsert ? main.head : main.from;
	const text = onItsOwnLine(state, from, paths.map(imageMarkup).join('\n'));
	view.dispatch({
		changes: { from, insert: text },
		selection: isInsert
			? EditorSelection.cursor(from + text.length)
			: EditorSelection.range(from, from + text.length),
		scrollIntoView: true,
		userEvent: 'input.paste',
	});
	view.focus();
}

function report(target: ImageTarget, error: unknown): void {
	target.onMessage(String(error));
}

// Pasting images (`Ctrl-v`), in any mode; text pastes as before.
export function imagePaste(target: ImageTarget): Extension {
	return EditorView.domEventHandlers({
		paste(event, view) {
			const files = [...(event.clipboardData?.files ?? [])]
				.filter(isImageFile);
			if (files.length === 0) {
				return false;
			}
			event.preventDefault();
			const note = target.note();
			Promise.all(files.map(async (file) => pasteImage(note, file)))
				.then((paths) => {
					insertImages(view, paths);
				})
				.catch((error: unknown) => {
					report(target, error);
				});
			return true;
		},
	});
}

// Whether a point of the window (CSS pixels) is over `element`.
function isOver(
	element: Element,
	{ left, top }: { left: number; top: number },
): boolean {
	const box = element.getBoundingClientRect();
	return left >= box.left && left <= box.right
		&& top >= box.top && top <= box.bottom;
}

// Files dropped on the window over the editor. Tauri receives the drop and
// gives the paths of the files. Resolves to a function that stops
// listening.
export async function listenForDrops(
	view: EditorView,
	target: ImageTarget,
): Promise<() => void> {
	return getCurrentWebview().onDragDropEvent(({ payload }) => {
		if (payload.type !== 'drop') {
			return;
		}
		const ratio = window.devicePixelRatio;
		const point = {
			left: payload.position.x / ratio,
			top: payload.position.y / ratio,
		};
		if (!isOver(view.dom, point)) {
			return;
		}
		Promise.all(payload.paths.map(async (path) =>
			importImage(target.note(), path)))
			.then((paths) => {
				insertImages(view, paths);
			})
			.catch((error: unknown) => {
				report(target, error);
			});
	});
}
