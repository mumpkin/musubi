// SPDX-License-Identifier: GPL-3.0-or-later
import { invoke } from '@tauri-apps/api/core';

import type { AppInfo } from './bindings/AppInfo.ts';

export function formatAppInfo(info: AppInfo): string {
	return `${info.name} ${info.version}`;
}

export async function fetchAppInfo(): Promise<AppInfo> {
	return invoke<AppInfo>('app_info');
}
