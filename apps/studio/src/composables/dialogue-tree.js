/* @license
 *
 *                Copyright (c) 2023-2026 Fruit Tree Labs (www.fruittreelabs.com)
 *
 *
 *     This material is part of the Dialogue Branch Platform, and is covered by the MIT License
 *                                        as outlined below.
 *
 *                                            ----------
 *
 * Copyright (c) 2023-2026 Fruit Tree Labs (www.fruittreelabs.com)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
 * NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// Sort modes offered by the Dialogue Browser.
//
// DEFAULT is the order the API already returns (folders first at each level, then alphabetical) —
// no client-side re-sort. NAME_ASC / NAME_DESC are a flat alphabetical sort with folders and
// dialogues intermixed. UPDATED_* and SIZE_* keep folders grouped first (a folder has no update
// time or node count of its own) and order the dialogues within a level by that key; they rely on
// per-dialogue metadata only present in Authoring Mode's list response.
export const SORT_DEFAULT = 'default';
export const SORT_NAME_ASC = 'name-asc';
export const SORT_NAME_DESC = 'name-desc';
export const SORT_UPDATED_DESC = 'updated-desc';
export const SORT_UPDATED_ASC = 'updated-asc';
export const SORT_SIZE_DESC = 'size-desc';
export const SORT_SIZE_ASC = 'size-asc';

export const AUTHORING_ONLY_SORT_MODES = [
    SORT_UPDATED_DESC, SORT_UPDATED_ASC, SORT_SIZE_DESC, SORT_SIZE_ASC,
];

function isFolder(node) {
    return !node._file;
}

// Prunes a tree (as built by DialogueBrowser's buildTree) to the entries matching `query`,
// case-insensitively, on their own path segment: a dialogue is kept if its name matches; a
// folder is kept whole if its own name matches, otherwise only if it still contains a match.
// An empty query returns the tree unchanged (same reference).
export function filterTree(root, query) {
    const needle = (query ?? '').trim().toLowerCase();
    if (!needle) return root;

    const prune = (level) => {
        const kept = {};
        for (const [name, node] of Object.entries(level)) {
            const nameMatches = name.toLowerCase().includes(needle);
            if (isFolder(node)) {
                if (nameMatches) {
                    kept[name] = node;
                } else {
                    const children = prune(node._children);
                    if (Object.keys(children).length > 0) kept[name] = { ...node, _children: children };
                }
            } else if (nameMatches) {
                kept[name] = node;
            }
        }
        return kept;
    };
    return prune(root);
}

// Orders one level of the folder tree — an array of [name, node] entries as produced by
// Object.entries() on a tree level. Returns a new array (except for DEFAULT / an unknown mode,
// which pass the API order straight through).
export function sortTreeLevel(entries, sortMode) {
    if (sortMode === SORT_NAME_ASC || sortMode === SORT_NAME_DESC) {
        const dir = sortMode === SORT_NAME_DESC ? -1 : 1;
        return [...entries].sort(([a], [b]) => dir * a.localeCompare(b));
    }

    if (!AUTHORING_ONLY_SORT_MODES.includes(sortMode)) return entries;

    // updated / size: folders first (name-sorted), then dialogues by the chosen key.
    const folders = entries.filter(([, node]) => isFolder(node)).sort(([a], [b]) => a.localeCompare(b));
    const leaves = entries.filter(([, node]) => !isFolder(node));
    const byName = ([a], [b]) => a.localeCompare(b);

    let leafComparator;
    if (sortMode === SORT_UPDATED_DESC || sortMode === SORT_UPDATED_ASC) {
        const dir = sortMode === SORT_UPDATED_DESC ? -1 : 1;
        leafComparator = (x, y) =>
            dir * (x[1]._updatedAt ?? '').localeCompare(y[1]._updatedAt ?? '') || byName(x, y);
    } else {
        const dir = sortMode === SORT_SIZE_DESC ? -1 : 1;
        leafComparator = (x, y) =>
            dir * ((x[1]._nodeCount ?? 0) - (y[1]._nodeCount ?? 0)) || byName(x, y);
    }
    leaves.sort(leafComparator);

    return [...folders, ...leaves];
}
