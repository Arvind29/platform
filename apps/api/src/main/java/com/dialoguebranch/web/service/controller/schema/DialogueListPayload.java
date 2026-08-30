/*
 *
 *                 Copyright (c) 2023-2026 Dialogue Branch (www.dialoguebranch.com)
 *
 *
 *     This material is part of the Dialogue Branch Platform, and is covered by the MIT License
 *                                        as outlined below.
 *
 *                                            ----------
 *
 * Copyright (c) 2023-2026 Dialogue Branch (www.dialoguebranch.com)
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

package com.dialoguebranch.web.service.controller.schema;

import io.swagger.v3.oas.annotations.media.Schema;
import nl.rrd.utils.json.JsonObject;

import java.util.Arrays;

/**
 * A {@link DialogueListPayload} object contains a list of dialogue names that is somehow provided
 * by the web service.
 *
 * @author Harm op den Akker
 */
public class DialogueListPayload extends JsonObject {

    @Schema(description = "A list of dialogue names, supported by the web service",
            example = "[dialogue1,dialogue2]")
    private String[] dialogueNames;

    // -------------------------------------------------------- //
    // -------------------- Constructor(s) -------------------- //
    // -------------------------------------------------------- //

    /**
     * Creates an empty instance of a {@link DialogueListPayload} object.
     */
    public DialogueListPayload() { }

    /**
     * Creates an instance of a {@link DialogueListPayload} object with a given array of {@code
     * dialogueNames}.
     *
     * @param dialogueNames an array of dialogue names as a {@code String[]}.
     */
    public DialogueListPayload(String[] dialogueNames) {
        this.dialogueNames = sortDialogueNames(dialogueNames);
    }

    // ----------------------------------------------------------- //
    // -------------------- Getters & Setters -------------------- //
    // ----------------------------------------------------------- //

    /**
     * Returns an array of dialogue names in this {@link DialogueListPayload}.
     * @return an array of dialogue names in this {@link DialogueListPayload}.
     */
    public String[] getDialogueNames() {
        return dialogueNames;
    }

    /**
     * Sets the array of dialogue names in this {@link DialogueListPayload}.
     * @param dialogueNames the array of dialogue names in this {@link DialogueListPayload}.
     */
    public void setDialogueNames(String[] dialogueNames) {
        this.dialogueNames = sortDialogueNames(dialogueNames);
    }

    /**
     * Takes a String array of dialogue names and returns a new array sorted the way a file
     * browser would show it: a {@code /} in a name separates folder levels, and at every level
     * sub-folders are listed before loose dialogues, with entries then ordered alphabetically
     * (case-insensitive). The input array is not modified.
     *
     * @param dialogueNames the list of dialogue names to sort.
     * @return a new, sorted array of dialogue names.
     */
    private String[] sortDialogueNames(String[] dialogueNames) {
        String[] sorted = dialogueNames.clone();
        Arrays.sort(sorted, DialogueListPayload::compareFoldersFirst);
        return sorted;
    }

    /**
     * Compares two {@code /}-separated dialogue names "folders first": at the first path level
     * where they differ, an entry that descends into a sub-folder sorts before one that is a
     * loose dialogue; otherwise the level is compared case-insensitively. Names that differ only
     * by case are given a stable order by a final case-sensitive comparison.
     */
    private static int compareFoldersFirst(String a, String b) {
        String[] aParts = a.split("/");
        String[] bParts = b.split("/");
        int sharedLevels = Math.min(aParts.length, bParts.length);
        for (int i = 0; i < sharedLevels; i++) {
            boolean aInFolderHere = i < aParts.length - 1;
            boolean bInFolderHere = i < bParts.length - 1;
            if (aInFolderHere != bInFolderHere)
                return aInFolderHere ? -1 : 1;
            int levelComparison = aParts[i].compareToIgnoreCase(bParts[i]);
            if (levelComparison != 0)
                return levelComparison;
        }
        int depthComparison = Integer.compare(aParts.length, bParts.length);
        return depthComparison != 0 ? depthComparison : a.compareTo(b);
    }

}
