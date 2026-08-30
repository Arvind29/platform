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

import { describe, it, expect } from 'vitest';
import {
    SORT_DEFAULT,
    SORT_NAME_ASC,
    SORT_NAME_DESC,
    SORT_UPDATED_DESC,
    SORT_UPDATED_ASC,
    SORT_SIZE_DESC,
    SORT_SIZE_ASC,
    AUTHORING_ONLY_SORT_MODES,
    sortTreeLevel,
    filterTree,
} from './dialogue-tree.js';

// Tree nodes as produced by DialogueBrowser's buildTree(): a folder has `_children`, a dialogue
// (leaf) has a truthy `_file` and, in Authoring Mode, `_updatedAt` / `_nodeCount` metadata.
const folder = (children = {}) => ({ _children: children });
const leaf = (extra = {}) => ({ _file: true, ...extra });
const names = (entries) => entries.map(([name]) => name);

describe('sortTreeLevel', () => {
    it('passes the API order straight through for DEFAULT (same array reference)', () => {
        const entries = [['b', leaf()], ['a', folder()]];
        expect(sortTreeLevel(entries, SORT_DEFAULT)).toBe(entries);
    });

    it('passes the API order straight through for an unknown mode', () => {
        const entries = [['b', leaf()], ['a', folder()]];
        expect(sortTreeLevel(entries, 'not-a-real-mode')).toBe(entries);
    });

    it('NAME_ASC sorts folders and dialogues together, alphabetically, into a new array', () => {
        const entries = [['Charlie', leaf()], ['alpha', folder()], ['Bravo', leaf()]];
        const result = sortTreeLevel(entries, SORT_NAME_ASC);
        expect(names(result)).toEqual(['alpha', 'Bravo', 'Charlie']);
        expect(result).not.toBe(entries);
    });

    it('NAME_DESC is the exact reverse ordering', () => {
        const entries = [['Charlie', leaf()], ['alpha', folder()], ['Bravo', leaf()]];
        expect(names(sortTreeLevel(entries, SORT_NAME_DESC))).toEqual(['Charlie', 'Bravo', 'alpha']);
    });

    it('UPDATED_DESC keeps folders first (name-sorted), then dialogues newest-first', () => {
        const entries = [
            ['zFolder', folder()],
            ['aFolder', folder()],
            ['old', leaf({ _updatedAt: '2024-01-01T00:00:00Z' })],
            ['new', leaf({ _updatedAt: '2026-01-01T00:00:00Z' })],
            ['mid', leaf({ _updatedAt: '2025-01-01T00:00:00Z' })],
        ];
        expect(names(sortTreeLevel(entries, SORT_UPDATED_DESC)))
            .toEqual(['aFolder', 'zFolder', 'new', 'mid', 'old']);
    });

    it('UPDATED_ASC orders dialogues oldest-first, folders still first', () => {
        const entries = [
            ['old', leaf({ _updatedAt: '2024-01-01T00:00:00Z' })],
            ['new', leaf({ _updatedAt: '2026-01-01T00:00:00Z' })],
            ['aFolder', folder()],
        ];
        expect(names(sortTreeLevel(entries, SORT_UPDATED_ASC))).toEqual(['aFolder', 'old', 'new']);
    });

    it('breaks an equal-timestamp tie by name (ascending, regardless of direction)', () => {
        const entries = [
            ['banana', leaf({ _updatedAt: '2025-01-01T00:00:00Z' })],
            ['apple', leaf({ _updatedAt: '2025-01-01T00:00:00Z' })],
        ];
        expect(names(sortTreeLevel(entries, SORT_UPDATED_DESC))).toEqual(['apple', 'banana']);
    });

    it('treats a missing _updatedAt as the earliest possible value', () => {
        const entries = [
            ['dated', leaf({ _updatedAt: '2025-01-01T00:00:00Z' })],
            ['undated', leaf()],
        ];
        expect(names(sortTreeLevel(entries, SORT_UPDATED_DESC))).toEqual(['dated', 'undated']);
        expect(names(sortTreeLevel(entries, SORT_UPDATED_ASC))).toEqual(['undated', 'dated']);
    });

    it('SIZE_DESC / SIZE_ASC order dialogues by node count', () => {
        const entries = [
            ['small', leaf({ _nodeCount: 2 })],
            ['big', leaf({ _nodeCount: 50 })],
            ['mid', leaf({ _nodeCount: 10 })],
        ];
        expect(names(sortTreeLevel(entries, SORT_SIZE_DESC))).toEqual(['big', 'mid', 'small']);
        expect(names(sortTreeLevel(entries, SORT_SIZE_ASC))).toEqual(['small', 'mid', 'big']);
    });

    it('treats a missing _nodeCount as zero', () => {
        const entries = [
            ['counted', leaf({ _nodeCount: 5 })],
            ['uncounted', leaf()],
        ];
        expect(names(sortTreeLevel(entries, SORT_SIZE_ASC))).toEqual(['uncounted', 'counted']);
    });

    it('always groups folders before dialogues in the metadata-driven modes', () => {
        const entries = [
            ['hugeDialogue', leaf({ _nodeCount: 999 })],
            ['zzzFolder', folder()],
        ];
        expect(names(sortTreeLevel(entries, SORT_SIZE_DESC))).toEqual(['zzzFolder', 'hugeDialogue']);
    });

    it('exposes exactly the four Authoring-only sort modes', () => {
        expect(AUTHORING_ONLY_SORT_MODES)
            .toEqual([SORT_UPDATED_DESC, SORT_UPDATED_ASC, SORT_SIZE_DESC, SORT_SIZE_ASC]);
    });
});

describe('filterTree', () => {
    const makeRoot = () => ({
        Intro: leaf(),
        chapter1: folder({
            Scene1: leaf(),
            Scene2: leaf(),
        }),
        chapter2: folder({
            Outro: leaf(),
        }),
    });

    it('returns the tree unchanged (same reference) for an empty or whitespace query', () => {
        const root = makeRoot();
        expect(filterTree(root, '')).toBe(root);
        expect(filterTree(root, '   ')).toBe(root);
        expect(filterTree(root, null)).toBe(root);
    });

    it('keeps only dialogues whose own name matches, case-insensitively', () => {
        const result = filterTree(makeRoot(), 'intro');
        expect(Object.keys(result)).toEqual(['Intro']);
    });

    it('keeps a folder on the path to a match, pruned to the matching descendants', () => {
        const result = filterTree(makeRoot(), 'scene');
        expect(Object.keys(result)).toEqual(['chapter1']);
        expect(Object.keys(result.chapter1._children)).toEqual(['Scene1', 'Scene2']);
    });

    it('keeps a folder whole (original node) when the folder name itself matches', () => {
        const root = makeRoot();
        const result = filterTree(root, 'chapter1');
        expect(Object.keys(result)).toEqual(['chapter1']);
        expect(result.chapter1).toBe(root.chapter1);
    });

    it('keeps every folder whose name matches a shared prefix', () => {
        const result = filterTree(makeRoot(), 'chapter');
        expect(Object.keys(result)).toEqual(['chapter1', 'chapter2']);
    });

    it('drops folders and dialogues with nothing matching', () => {
        expect(filterTree(makeRoot(), 'nothing-here')).toEqual({});
    });

    it('rebuilds a pruned folder as a new node but reuses the surviving leaf nodes', () => {
        const root = makeRoot();
        const result = filterTree(root, 'scene1');
        expect(result.chapter1).not.toBe(root.chapter1);
        expect(result.chapter1._children.Scene1).toBe(root.chapter1._children.Scene1);
        expect(Object.keys(result.chapter1._children)).toEqual(['Scene1']);
    });
});
