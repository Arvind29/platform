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
import { toRaw } from 'vue';
import { mount } from '@vue/test-utils';
import TextDialogueComponent from './TextDialogueComponent.vue';
import { DialogueStep } from '@/dlb-lib/model/DialogueStep';
import { Statement } from '@/dlb-lib/model/Statement';
import { Segment } from '@/dlb-lib/model/Segment';
import { BasicReply } from '@/dlb-lib/model/BasicReply';

const SELECTABLE = 'text-interaction-reply-option';
const DISABLED = 'text-icon-button-disabled';

function statement(text) {
    return new Statement([new Segment('TEXT', text)]);
}

// A distinct DialogueStep object per call — mirrors the app, where every (re)start of a dialogue
// builds fresh step objects. `selectedReplies` is keyed by the step object itself, so two steps
// built here can never collide.
function makeStep(text, replyTexts) {
    return new DialogueStep(
        'TestDialogue',
        'Start',
        'Agent',
        statement(text),
        replyTexts.map((t, i) => new BasicReply(i + 1, false, [], statement(t))),
        null,
        null,
    );
}

function mountComponent(props) {
    return mount(TextDialogueComponent, {
        props: {
            dialogueName: 'TestDialogue',
            dialogueEnded: false,
            dialogueCancelled: false,
            awaitingReply: false,
            startError: null,
            ...props,
        },
        global: {
            stubs: { FontAwesomeIcon: true, CollapsibleErrorList: true },
        },
    });
}

// Every BasicReply renders as one `.flex.gap-2.font-semibold` row: a number cell (first <div>)
// and a clickable text cell (<span>), each carrying the highlight/greyed classes under test.
function replyRows(scope) {
    return scope.findAll('.flex.gap-2.font-semibold');
}

describe('TextDialogueComponent reply highlighting', () => {
    it('renders every reply of a fresh final step as selectable, none greyed out', () => {
        const wrapper = mountComponent({ dialogueSteps: [makeStep('Opening line.', ['Yes', 'No', 'Maybe'])] });

        const rows = replyRows(wrapper);
        expect(rows).toHaveLength(3);
        for (const row of rows) {
            expect(row.get('div').classes()).toContain(SELECTABLE);
            expect(row.get('div').classes()).not.toContain(DISABLED);
            expect(row.get('span').classes()).toContain('cursor-pointer');
            expect(row.get('span').classes()).toContain('hover:text-interaction-reply-option-hover');
        }
    });

    it('greys out the replies of every step that is no longer the final one', () => {
        const wrapper = mountComponent({
            dialogueSteps: [makeStep('Earlier line.', ['A', 'B']), makeStep('Current line.', ['C', 'D'])],
        });

        const steps = wrapper.findAll('.dialogue-step');
        for (const row of replyRows(steps[0])) {
            expect(row.get('div').classes()).toContain(DISABLED);
            expect(row.get('span').classes()).not.toContain('cursor-pointer');
        }
        for (const row of replyRows(steps[1])) {
            expect(row.get('div').classes()).toContain(SELECTABLE);
        }
    });

    it('greys out the final step\'s replies while a reply request is in flight', () => {
        const wrapper = mountComponent({
            dialogueSteps: [makeStep('Waiting…', ['A', 'B'])],
            awaitingReply: true,
        });

        for (const row of replyRows(wrapper)) {
            expect(row.get('div').classes()).toContain(DISABLED);
            expect(row.get('span').classes()).not.toContain('cursor-pointer');
        }
    });

    it('keeps the picked reply highlighted and greys its siblings after a click', async () => {
        const step = makeStep('Pick one.', ['First', 'Second', 'Third']);
        const wrapper = mountComponent({ dialogueSteps: [step] });

        await replyRows(wrapper)[1].get('span').trigger('click');

        expect(wrapper.emitted('selectReply')).toHaveLength(1);
        // The template iterates the reactive `dialogueSteps` prop, so the emitted values are
        // reactive proxies of the fixture objects — unwrap before the identity check.
        expect(toRaw(wrapper.emitted('selectReply')[0][0])).toBe(step);
        expect(toRaw(wrapper.emitted('selectReply')[0][1])).toBe(step.replies[1]);

        const rows = replyRows(wrapper);
        expect(rows[1].get('div').classes()).toContain(SELECTABLE);
        expect(rows[0].get('div').classes()).toContain(DISABLED);
        expect(rows[2].get('div').classes()).toContain(DISABLED);
    });

    it('does not emit when a reply on a non-final step is clicked', async () => {
        const wrapper = mountComponent({
            dialogueSteps: [makeStep('Earlier line.', ['A', 'B']), makeStep('Current line.', ['C', 'D'])],
        });

        const steps = wrapper.findAll('.dialogue-step');
        await replyRows(steps[0])[0].get('span').trigger('click');

        expect(wrapper.emitted('selectReply')).toBeFalsy();
    });

    it('does not leak an earlier run\'s selection onto a restarted dialogue (shared instance)', async () => {
        const firstRun = makeStep('First run line.', ['Alpha', 'Beta']);
        const wrapper = mountComponent({ dialogueSteps: [firstRun] });

        await replyRows(wrapper)[0].get('span').trigger('click');
        expect(replyRows(wrapper)[1].get('div').classes()).toContain(DISABLED);

        // A restart swaps in a brand-new steps array with brand-new step objects.
        const secondRun = makeStep('Second run line.', ['Gamma', 'Delta']);
        await wrapper.setProps({ dialogueSteps: [secondRun] });

        for (const row of replyRows(wrapper)) {
            expect(row.get('div').classes()).toContain(SELECTABLE);
            expect(row.get('div').classes()).not.toContain(DISABLED);
        }
    });
});

describe('TextDialogueComponent scroll API', () => {
    it('exposes the scroll helpers DialogueWorkspace drives on tab switches', () => {
        const wrapper = mountComponent({ dialogueSteps: [makeStep('Line.', ['A'])] });

        expect(typeof wrapper.vm.getScrollTop).toBe('function');
        expect(typeof wrapper.vm.restoreScroll).toBe('function');
        expect(typeof wrapper.vm.scrollToBottom).toBe('function');

        expect(() => wrapper.vm.getScrollTop()).not.toThrow();
        expect(() => wrapper.vm.restoreScroll(null)).not.toThrow();
        expect(() => wrapper.vm.restoreScroll(120)).not.toThrow();
        expect(() => wrapper.vm.scrollToBottom()).not.toThrow();
    });
});
