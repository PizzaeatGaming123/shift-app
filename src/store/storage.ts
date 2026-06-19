import type { AppData } from '../types';
import { STORAGE_KEY } from '../constants';

/** localStorage から読み込む。無ければ null、壊れていても null（デモを止めない）。 */
export function loadData(): AppData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppData;
  } catch {
    return null;
  }
}

/** localStorage へ保存。localStorage が使えない環境でも例外で落とさない。 */
export function saveData(data: AppData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // デモ継続を優先し、保存失敗は無視（メモリ上の状態は維持される）
  }
}
