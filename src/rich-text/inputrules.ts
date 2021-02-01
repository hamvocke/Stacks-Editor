import {
    InputRule,
    inputRules,
    textblockTypeInputRule,
    wrappingInputRule,
} from "prosemirror-inputrules";
import { NodeType } from "prosemirror-model";
import { NodeSelection } from "prosemirror-state";
import { richTextSchema as schema } from "../shared/schema";

const blockquoteInputRule = wrappingInputRule(
    /^\s*>\s$/,
    schema.nodes.blockquote
);
const headingInputRule = textblockTypeInputRule(
    new RegExp("^(#{1,3})\\s$"),
    schema.nodes.heading,
    (match) => ({ level: match[1].length })
);
const codeBlockRule = textblockTypeInputRule(/^```$/, schema.nodes.code_block);
const unorderedListRule = wrappingInputRule(
    /^\s*[*+-]\s$/,
    schema.nodes.bullet_list
);
const orderedListRule = wrappingInputRule(
    /^\s*\d\.\s$/,
    schema.nodes.ordered_list,
    (match) => ({ order: +match[1] }),
    (match, node) => node.childCount + <number>node.attrs.order == +match[1]
);

export function inlineInputRule(
    pattern: RegExp,
    nodeType: NodeType,
    getAttrs?: (match: string[]) => any
) {
    return new InputRule(pattern, (state, match, start, end) => {
        let $start = state.doc.resolve(start);
        let index = $start.index();
        let $end = state.doc.resolve(end);
        // get attrs
        let attrs = getAttrs instanceof Function ? getAttrs(match) : getAttrs;
        // check if replacement valid
        if (!$start.parent.canReplaceWith(index, $end.index(), nodeType)) {
            return null;
        }
        // perform replacement
        return state.tr.replaceRangeWith(
            start,
            end,
            nodeType.create(attrs, nodeType.schema.text(match[1]))
        );
    });
}

export function blockInputRule(
    pattern: RegExp,
    nodeType: NodeType,
    getAttrs?: (match: string[]) => any
) {
    return new InputRule(pattern, (state, match, start, end) => {
        let $start = state.doc.resolve(start);
        let attrs = getAttrs instanceof Function ? getAttrs(match) : getAttrs;
        if (
            !$start
                .node(-1)
                .canReplaceWith(
                    $start.index(-1),
                    $start.indexAfter(-1),
                    nodeType
                )
        )
            return null;
        let tr = state.tr
            .delete(start, end)
            .setBlockType(start, start, nodeType, attrs);

        return tr.setSelection(
            NodeSelection.create(tr.doc, tr.mapping.map($start.pos - 1))
        );
    });
}

export const mathInputRules = inputRules({
    rules: [
        // negative lookbehind regex notation for escaped \$ delimiters
        // (see https://javascript.info/regexp-lookahead-lookbehind)
        inlineInputRule(/(?<!\\)\$(.+)(?<!\\)\$/, schema.nodes.math_inline),
        // simpler version without the option to escape \$
        //inlineInputRule(/\$(.+)\$/, editorSchema.nodes.math_inline),
        blockInputRule(/^\$\$\s+$/, schema.nodes.math_display),
    ],
});

/**
 * Defines all input rules we're using in our rich-text editor.
 * Input rules are formatting operations that trigger as you type based on regular expressions
 *
 * Examples:
 *      * starting a line with "# " will turn the line into a headline
 *      * starting a line with "> " will insert a new blockquote in place
 */
export const richTextInputRules = inputRules({
    rules: [
        blockquoteInputRule,
        headingInputRule,
        codeBlockRule,
        unorderedListRule,
        orderedListRule,
    ],
});
