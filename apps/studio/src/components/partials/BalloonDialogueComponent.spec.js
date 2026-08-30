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
import { reactive, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import BalloonDialogueComponent from './BalloonDialogueComponent.vue';
import { DialogueStep } from '@/dlb-lib/model/DialogueStep';
import { Statement } from '@/dlb-lib/model/Statement';
import { Segment } from '@/dlb-lib/model/Segment';

function step(textLength) {
    return new DialogueStep(
        'TestDialogue',
        'Start',
        'Agent',
        new Statement([new Segment('TEXT', 'x'.repeat(textLength))]),
        [],
        null,
        null,
    );
}

// Length thresholds in the component: > 900 -> text-sm, > 400 -> text-base, else text-lg.
const SHORT = 200;
const MEDIUM = 600;
const LONG = 1000;

function mountComponent(dialogueSteps) {
    return mount(BalloonDialogueComponent, {
        props: {
            dialogueName: 'TestDialogue',
            dialogueSteps,
            dialogueEnded: false,
            dialogueCancelled: false,
            awaitingReply: false,
            startError: null,
            isDraftTest: false,
        },
        global: {
            stubs: { FontAwesomeIcon: true, CollapsibleErrorList: true },
        },
    });
}

function bubbleSizeClass(wrapper) {
    const classes = wrapper.get('.bg-speech-bubble').classes();
    return ['text-sm', 'text-base', 'text-lg'].find((c) => classes.includes(c));
}

describe('BalloonDialogueComponent statement font size', () => {
    it('uses the largest size for a short statement', () => {
        expect(bubbleSizeClass(mountComponent([step(SHORT)]))).toBe('text-lg');
    });

    it('steps down one notch for a medium-length statement', () => {
        expect(bubbleSizeClass(mountComponent([step(MEDIUM)]))).toBe('text-base');
    });

    it('steps down two notches for a very long statement', () => {
        expect(bubbleSizeClass(mountComponent([step(LONG)]))).toBe('text-sm');
    });

    it('only ever shrinks within a run — a later short node stays at the reduced size', async () => {
        const steps = reactive([step(LONG)]);
        const wrapper = mountComponent(steps);
        expect(bubbleSizeClass(wrapper)).toBe('text-sm');

        steps.push(step(SHORT));
        await nextTick();

        expect(bubbleSizeClass(wrapper)).toBe('text-sm');
    });

    it('keeps shrinking within a run when a longer node comes along', async () => {
        const steps = reactive([step(MEDIUM)]);
        const wrapper = mountComponent(steps);
        expect(bubbleSizeClass(wrapper)).toBe('text-base');

        steps.push(step(LONG));
        await nextTick();

        expect(bubbleSizeClass(wrapper)).toBe('text-sm');
    });

    it('resets to the largest size when the dialogue is restarted (new steps array)', async () => {
        const wrapper = mountComponent([step(LONG)]);
        expect(bubbleSizeClass(wrapper)).toBe('text-sm');

        await wrapper.setProps({ dialogueSteps: [step(SHORT)] });

        expect(bubbleSizeClass(wrapper)).toBe('text-lg');
    });
});
