import { Schema } from "prosemirror-model";

export const schema = new Schema({
  nodes: {
    doc: { content: "block+" },
    text: { group: "inline" },
    paragraph: {
      content: "inline*",
      group: "block",
      attrs: { indent: { default: 0 } },
      parseDOM: [{ tag: "p" }],
      toDOM: () => ["p", 0]
    },
    heading: {
      attrs: { level: { default: 1 } },
      content: "inline*",
      group: "block",
      defining: true,
      parseDOM: [
        { tag: "h1", attrs: { level: 1 } },
        { tag: "h2", attrs: { level: 2 } },
        { tag: "h3", attrs: { level: 3 } }
      ],
      toDOM: (node) => ["h" + node.attrs.level, 0]
    },
    bulletList: {
      content: "listItem+",
      group: "block list",
      parseDOM: [{ tag: "ul" }],
      toDOM: () => ["ul", 0]
    },
    orderedList: {
      content: "listItem+",
      group: "block list",
      attrs: { start: { default: 1 } },
      parseDOM: [{ tag: "ol" }],
      toDOM: (node) => ["ol", { start: node.attrs.start }, 0]
    },
    listItem: {
      content: "paragraph block*",
      defining: true,
      parseDOM: [{ tag: "li" }],
      toDOM: () => ["li", 0]
    },
    taskList: {
      content: "taskItem+",
      group: "block list",
      parseDOM: [{ tag: 'ul[data-type="taskList"]' }],
      toDOM: () => ["ul", { "data-type": "taskList" }, 0]
    },
    taskItem: {
      content: "paragraph+",
      defining: true,
      attrs: { checked: { default: false } },
      parseDOM: [{ 
        tag: 'li[data-type="taskItem"]',
        getAttrs: dom => ({ checked: (dom as HTMLElement).getAttribute('data-checked') === 'true' })
      }],
      toDOM: (node) => ["li", { "data-type": "taskItem", "data-checked": node.attrs.checked }, 0]
    },
    codeBlock: {
      content: "text*",
      group: "block",
      code: true,
      defining: true,
      parseDOM: [{ tag: "pre", preserveWhitespace: "full" }],
      toDOM: () => ["pre", ["code", 0]]
    },
    horizontalRule: {
      group: "block",
      parseDOM: [{ tag: "hr" }],
      toDOM: () => ["hr"]
    },
    hardBreak: {
      group: "inline",
      inline: true,
      selectable: false,
      parseDOM: [{ tag: "br" }],
      toDOM: () => ["br"]
    },
    image: {
      inline: false,
      group: "block",
      attrs: { src: {}, alt: { default: null }, title: { default: null } },
      parseDOM: [{ tag: "img[src]", getAttrs: dom => ({ src: (dom as HTMLElement).getAttribute("src") }) }],
      toDOM: (node) => ["img", node.attrs]
    }
  },
  marks: {
    bold: {
      parseDOM: [{ tag: "strong" }, { tag: "b" }, { style: "font-weight=bold" }],
      toDOM: () => ["strong", 0]
    },
    italic: {
      parseDOM: [{ tag: "i" }, { tag: "em" }, { style: "font-style=italic" }],
      toDOM: () => ["em", 0]
    },
    underline: {
      parseDOM: [{ tag: "u" }, { style: "text-decoration=underline" }],
      toDOM: () => ["u", 0]
    },
    strike: {
      parseDOM: [{ tag: "s" }, { tag: "del" }, { style: "text-decoration=line-through" }],
      toDOM: () => ["s", 0]
    },
    link: {
      attrs: { href: {}, target: { default: "_blank" } },
      inclusive: false,
      parseDOM: [{ tag: "a[href]", getAttrs: dom => ({ href: (dom as HTMLElement).getAttribute("href") }) }],
      toDOM: (node) => ["a", node.attrs, 0]
    },
    highlight: {
      attrs: { color: { default: null } },
      parseDOM: [{ tag: "mark" }],
      toDOM: (node) => ["mark", { style: `background-color: ${node.attrs.color}` }, 0]
    },
    textStyle: {
      attrs: { color: { default: null } },
      parseDOM: [{ tag: "span" }],
      toDOM: (node) => ["span", { style: `color: ${node.attrs.color}` }, 0]
    }
  }
});

export default schema;