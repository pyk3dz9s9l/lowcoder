// client/packages/lowcoder/src/comps/comps/preLoadComp/actions/automator/componentCatalog.ts

import { uiCompRegistry, type UICompManifest } from "comps/uiCompRegistry";

/**
 * Component reference for the Automator.
 *
 * Curated entries provide known-good property examples for common components.
 * Every registered Lowcoder component is then added from `uiCompRegistry` so
 * the Automator can discover the full insertion panel, including newer
 * components like Chat, Chat Box, and Chat Controller.
 */

/**
 * Schema describing a top-level UI / layout property the model can set with
 * `set_properties`. These are the props that drive component behavior or
 * positional layout (text-align, vertical alignment, autoHeight, type, etc.)
 * and live as direct children of the component, NOT inside the `style`
 * namespace.
 */
export interface LayoutPropertyDescriptor {
  /** Human-readable hint shown to the model. */
  description?: string;
  /** Allowed string values when this property is a fixed enum. */
  enum?: readonly string[];
  /** Primitive type when the value is not enum-restricted. */
  type?: "string" | "number" | "boolean" | "object";
  /** Sample value the model can imitate verbatim. */
  example?: unknown;
}

/**
 * Map of style namespace → list of style keys that can be passed to
 * `set_style`. Most components have a single `style` namespace; inputs and
 * containers expose several (e.g. `labelStyle`, `inputFieldStyle`,
 * `disabledStyle`, `animationStyle`). The `set_style` executor auto-routes
 * each key to the matching namespace so models can usually pass a flat object
 * without specifying `_target`.
 */
export type StylePropertyMap = Record<string, readonly string[]>;

export interface ComponentCatalogEntry {
  /** Component type as registered in `uiCompRegistry` */
  type: string;
  /** Whether the component can have children nested under `<name>.container`. */
  isContainer?: boolean;
  /** Default grid layout (w / h) for sensible initial sizing. */
  defaultLayout: { w: number; h: number };
  /** Required property keys for `action_parameters`. */
  required: string[];
  /** Optional property keys worth knowing about. */
  optional?: string[];
  /** Realistic example `action_parameters` payload. */
  example: Record<string, unknown>;
  /** Notes the model should heed. */
  notes?: string;
  /** Display name shown in the Lowcoder component panel. */
  name?: string;
  /** English display name from the component manifest. */
  enName?: string;
  /** Component panel categories. Empty means hidden from normal insertion UI. */
  categories?: readonly string[];
  /** Short manifest description when it is serialisable. */
  description?: string;
  /**
   * Top-level UI / layout properties to be set with `set_properties`.
   * Only properties controlling *behaviour or layout* (alignment, autoHeight,
   * type, disabled, …) belong here — visual/CSS-like props live in
   * `styleProperties` and are set with `set_style`.
   */
  layoutProperties?: Record<string, LayoutPropertyDescriptor>;
  /**
   * Style properties grouped by style namespace, used by `set_style`.
   * Pass these as a flat object — `set_style` routes each key automatically.
   * Use `_target: "<namespace>"` only when the same key exists in multiple
   * namespaces and you need to disambiguate.
   */
  styleProperties?: StylePropertyMap;
}

// ── Style key presets ────────────────────────────────────────────────────────
// Mirror the field lists from `comps/controls/styleControlConstants.tsx` so the
// model knows what keys it can pass to `set_style`. Keep these compact — they
// are inlined into the system prompt.

const COMMON_STYLE_KEYS = [
  "background",
  "text",
  "textTransform",
  "textDecoration",
  "textSize",
  "textWeight",
  "fontFamily",
  "fontStyle",
  "border",
  "borderStyle",
  "borderWidth",
  "radius",
  "margin",
  "padding",
  "lineHeight",
  "rotation",
] as const;

const CONTAINER_STYLE_KEYS = [
  "background",
  "border",
  "borderStyle",
  "borderWidth",
  "radius",
  "margin",
  "padding",
  "boxShadow",
  "boxShadowColor",
  "opacity",
  "rotation",
  "backgroundImage",
  "backgroundImageRepeat",
  "backgroundImageSize",
  "backgroundImagePosition",
  "backgroundImageOrigin",
] as const;

const INPUT_LIKE_STYLE_KEYS = [
  "background",
  "boxShadow",
  "boxShadowColor",
  "text",
  "textTransform",
  "textDecoration",
  "textSize",
  "textWeight",
  "fontFamily",
  "fontStyle",
  "border",
  "borderStyle",
  "borderWidth",
  "radius",
  "margin",
  "padding",
  "placeholder",
  "accent",
  "validate",
] as const;

const LABEL_STYLE_KEYS = [
  "background",
  "label",
  "textTransform",
  "textDecoration",
  "textSize",
  "textWeight",
  "fontFamily",
  "fontStyle",
  "borderStyle",
  "borderWidth",
  "margin",
  "padding",
  "placeholder",
  "accent",
  "validate",
] as const;

const ANIMATION_STYLE_KEYS = [
  "animation",
  "animationDelay",
  "animationDuration",
  "animationIterationCount",
] as const;

const DISABLED_STYLE_KEYS = [
  "disabledBackground",
  "disabledText",
  "disabledBorder",
] as const;

const IMAGE_STYLE_KEYS = [
  "margin",
  "padding",
  "border",
  "borderStyle",
  "borderWidth",
  "radius",
  "opacity",
  "boxShadow",
  "boxShadowColor",
  "rotation",
] as const;

const NAVIGATION_STYLE_KEYS = [
  "background",
  "border",
  "borderStyle",
  "borderWidth",
  "radius",
  "margin",
  "padding",
  "accent",
] as const;

// ── Layout property presets ─────────────────────────────────────────────────

const TEXT_HORIZONTAL_ALIGNMENT: LayoutPropertyDescriptor = {
  description: "Horizontal text alignment inside the component.",
  enum: ["left", "center", "right", "justify"],
};

const ALIGN_HORIZONTAL: LayoutPropertyDescriptor = {
  description: "Horizontal alignment.",
  enum: ["left", "center", "right"],
};

const VERTICAL_ALIGNMENT: LayoutPropertyDescriptor = {
  description: "Vertical alignment.",
  enum: ["flex-start", "center", "flex-end"],
};

const AUTO_HEIGHT: LayoutPropertyDescriptor = {
  description: "Whether the component auto-sizes its height to its content.",
  enum: ["auto", "fixed"],
};

const HIDDEN: LayoutPropertyDescriptor = {
  description: "Hide the component at runtime.",
  type: "boolean",
};

const DISABLED: LayoutPropertyDescriptor = {
  description: "Disable the component at runtime.",
  type: "boolean",
};

const LOADING: LayoutPropertyDescriptor = {
  description: "Show a loading indicator on the component.",
  type: "boolean",
};

const LABEL_OBJECT: LayoutPropertyDescriptor = {
  description:
    "Field label config: { text, position: 'row'|'column', align: 'left'|'center'|'right', width: number, hidden?: boolean, tooltip?: string }.",
  type: "object",
  example: { text: "Email", position: "row", align: "left" },
};

export const LOWCODER_COMPONENT_TYPES: string[] = [
  "chart",
  "basicChart",
  "barChart",
  "lineChart",
  "pieChart",
  "scatterChart",
  "candleStickChart",
  "funnelChart",
  "gaugeChart",
  "graphChart",
  "heatmapChart",
  "radarChart",
  "sankeyChart",
  "sunburstChart",
  "themeriverChart",
  "treeChart",
  "treemapChart",
  "openLayersGeoMap",
  "chartsGeoMap",
  "table",
  "tableLite",
  "pivotTable",
  "mermaid",
  "timeline",
  "responsiveLayout",
  "pageLayout",
  "columnLayout",
  "splitLayout",
  "floatTextContainer",
  "card",
  "tabbedContainer",
  "collapsibleContainer",
  "container",
  "listView",
  "grid",
  "multiTags",
  "modal",
  "drawer",
  "toast",
  "divider",
  "navigation",
  "step",
  "cascader",
  "link",
  "floatingButton",
  "calendar",
  "timer",
  "sharingcomponent",
  "videocomponent",
  "meeting",
  "avatar",
  "avatarGroup",
  "comment",
  "mention",
  "chatController",
  "chatBox",
  "form",
  "jsonSchemaForm",
  "jsonEditor",
  "jsonExplorer",
  "richTextEditor",
  "input",
  "password",
  "numberInput",
  "textArea",
  "autocomplete",
  "switch",
  "checkbox",
  "radio",
  "date",
  "dateRange",
  "time",
  "timeRange",
  "slider",
  "rangeSlider",
  "button",
  "controlButton",
  "dropdown",
  "toggleButton",
  "segmentedControl",
  "rating",
  "ganttChart",
  "kanban",
  "hillchart",
  "bpmnEditor",
  "progress",
  "progressCircle",
  "file",
  "fileViewer",
  "image",
  "carousel",
  "audio",
  "video",
  "shape",
  "jsonLottie",
  "icon",
  "imageEditor",
  "colorPicker",
  "qrCode",
  "scanner",
  "signature",
  "select",
  "tour",
  "multiSelect",
  "tree",
  "treeSelect",
  "transfer",
  "turnstileCaptcha",
  "chat",
  "iframe",
  "custom",
  "module",
  "text",
];

const TEXT: ComponentCatalogEntry = {
  type: "text",
  defaultLayout: { w: 12, h: 4 },
  required: ["text"],
  optional: [
    "type",
    "horizontalAlignment",
    "verticalAlignment",
    "autoHeight",
    "contentScrollBar",
    "hidden",
  ],
  example: { text: "## Hello", type: "markdown" },
  notes:
    "Use type:'markdown' for headings, links, formatted text. For text alignment INSIDE the component, set the `horizontalAlignment` property (NOT the `align_component` action — that one moves the component on the canvas grid).",
  layoutProperties: {
    type: {
      description: "Render mode for the value.",
      enum: ["markdown", "text"],
    },
    horizontalAlignment: TEXT_HORIZONTAL_ALIGNMENT,
    verticalAlignment: VERTICAL_ALIGNMENT,
    autoHeight: AUTO_HEIGHT,
    contentScrollBar: {
      description: "Show scrollbars when content overflows (only when autoHeight=fixed).",
      type: "boolean",
    },
    hidden: HIDDEN,
  },
  styleProperties: {
    style: [...COMMON_STYLE_KEYS, "links"],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const BUTTON: ComponentCatalogEntry = {
  type: "button",
  defaultLayout: { w: 6, h: 5 },
  required: ["text"],
  optional: [
    "type",
    "disabled",
    "loading",
    "form",
    "prefixIcon",
    "suffixIcon",
    "tooltip",
    "tabIndex",
    "hidden",
  ],
  example: { text: "Submit", type: "" },
  notes:
    "Set type:'submit' and form:'<formName>' to submit a form. Leave type:'' for a default click-handler button.",
  layoutProperties: {
    type: {
      description: "'' for default click-handler button, 'submit' for a form-submit button.",
      enum: ["", "submit"],
    },
    disabled: DISABLED,
    loading: LOADING,
    hidden: HIDDEN,
    prefixIcon: {
      description:
        "Icon path string ('/icon:solid/check') shown before the text. Empty string clears it.",
      type: "string",
    },
    suffixIcon: {
      description: "Icon shown after the text.",
      type: "string",
    },
    tooltip: { description: "Hover tooltip text.", type: "string" },
    tabIndex: { description: "Tab order for keyboard navigation.", type: "number" },
  },
  styleProperties: {
    style: [...COMMON_STYLE_KEYS],
    disabledStyle: [...DISABLED_STYLE_KEYS],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const INPUT: ComponentCatalogEntry = {
  type: "input",
  defaultLayout: { w: 12, h: 6 },
  required: ["label", "placeholder"],
  optional: [
    "value",
    "validationType",
    "required",
    "allowClear",
    "showCount",
    "readOnly",
    "disabled",
    "hidden",
    "prefixIcon",
    "suffixIcon",
  ],
  example: {
    label: { text: "Name", position: "row", align: "left" },
    placeholder: "Enter name",
    allowClear: true,
  },
  layoutProperties: {
    label: LABEL_OBJECT,
    placeholder: { description: "Placeholder text.", type: "string" },
    disabled: DISABLED,
    hidden: HIDDEN,
    showCount: { description: "Show character counter.", type: "boolean" },
    allowClear: { description: "Show a clear button.", type: "boolean" },
    readOnly: { description: "Read-only field.", type: "boolean" },
    required: { description: "Mark as required for form validation.", type: "boolean" },
  },
  styleProperties: {
    style: [...CONTAINER_STYLE_KEYS],
    labelStyle: [...LABEL_STYLE_KEYS],
    inputFieldStyle: [...INPUT_LIKE_STYLE_KEYS],
    disabledStyle: [...DISABLED_STYLE_KEYS],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const NUMBER_INPUT: ComponentCatalogEntry = {
  type: "numberInput",
  defaultLayout: { w: 12, h: 6 },
  required: ["label"],
  optional: [
    "value",
    "min",
    "max",
    "step",
    "placeholder",
    "disabled",
    "hidden",
    "readOnly",
  ],
  example: {
    label: { text: "Quantity", position: "row" },
    value: 1,
    min: 0,
    max: 100,
  },
  layoutProperties: {
    label: LABEL_OBJECT,
    placeholder: { description: "Placeholder text.", type: "string" },
    disabled: DISABLED,
    hidden: HIDDEN,
    readOnly: { description: "Read-only field.", type: "boolean" },
  },
  styleProperties: {
    style: [...CONTAINER_STYLE_KEYS],
    labelStyle: [...LABEL_STYLE_KEYS],
    inputFieldStyle: [...INPUT_LIKE_STYLE_KEYS],
    disabledStyle: [...DISABLED_STYLE_KEYS],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const DROPDOWN: ComponentCatalogEntry = {
  type: "select",
  defaultLayout: { w: 12, h: 6 },
  required: ["label", "options", "value"],
  optional: ["allowClear", "disabled", "hidden", "showSearch", "placeholder"],
  example: {
    label: { text: "Status", position: "row" },
    options: {
      optionType: "manual",
      manual: {
        manual: [
          { value: "pending", label: "Pending" },
          { value: "done", label: "Done" },
        ],
      },
    },
    value: "pending",
  },
  layoutProperties: {
    label: LABEL_OBJECT,
    placeholder: { description: "Placeholder text.", type: "string" },
    disabled: DISABLED,
    hidden: HIDDEN,
    allowClear: { description: "Show a clear button.", type: "boolean" },
    showSearch: { description: "Enable search filter.", type: "boolean" },
  },
  styleProperties: {
    style: [...COMMON_STYLE_KEYS, "accent", "validate"],
    labelStyle: [...LABEL_STYLE_KEYS],
    childrenInputFieldStyle: [...INPUT_LIKE_STYLE_KEYS],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const CHECKBOX: ComponentCatalogEntry = {
  type: "checkbox",
  defaultLayout: { w: 8, h: 5 },
  required: ["label"],
  optional: ["value", "options", "disabled", "hidden", "layout"],
  example: {
    label: { text: "I agree", position: "row" },
    value: false,
  },
  layoutProperties: {
    label: LABEL_OBJECT,
    disabled: DISABLED,
    hidden: HIDDEN,
    layout: {
      description: "Group layout direction for multi-option checkboxes.",
      enum: ["horizontal", "vertical", "autoColumns"],
    },
  },
  styleProperties: {
    style: [...COMMON_STYLE_KEYS],
    labelStyle: [...LABEL_STYLE_KEYS],
    inputFieldStyle: [...INPUT_LIKE_STYLE_KEYS, "checkedBackground", "uncheckedBackground", "uncheckedBorder", "hoverBackground"],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const FORM: ComponentCatalogEntry = {
  type: "form",
  isContainer: true,
  defaultLayout: { w: 12, h: 30 },
  required: ["container"],
  optional: ["hidden", "disabled"],
  example: {
    container: {
      header: {},
      body: { "0": { view: {} } },
      footer: {},
      showHeader: false,
      showBody: true,
      showFooter: true,
      autoHeight: "auto",
      horizontalGridCells: 24,
      scrollbars: false,
      showVerticalScrollbar: false,
      style: {},
    },
  },
  notes:
    "Nest input/select/etc. under '<formName>.container.body.0.view'. Submit button goes under '<formName>.container.footer' with type:'submit', form:'<formName>'.",
  layoutProperties: {
    hidden: HIDDEN,
    disabled: DISABLED,
  },
  styleProperties: {
    style: [...CONTAINER_STYLE_KEYS],
    headerStyle: [...CONTAINER_STYLE_KEYS],
    bodyStyle: [...CONTAINER_STYLE_KEYS],
    footerStyle: [...CONTAINER_STYLE_KEYS],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const CONTAINER: ComponentCatalogEntry = {
  type: "container",
  isContainer: true,
  defaultLayout: { w: 12, h: 20 },
  required: ["container"],
  optional: ["hidden"],
  example: {
    container: {
      header: {},
      body: { "0": { view: {} } },
      footer: {},
      showHeader: false,
      showBody: true,
      showFooter: false,
      autoHeight: "auto",
      horizontalGridCells: 24,
      style: {},
    },
  },
  notes:
    "Nest under '<containerName>.container.body.0.view'.",
  layoutProperties: {
    hidden: HIDDEN,
  },
  styleProperties: {
    style: [...CONTAINER_STYLE_KEYS],
    headerStyle: [...CONTAINER_STYLE_KEYS],
    bodyStyle: [...CONTAINER_STYLE_KEYS],
    footerStyle: [...CONTAINER_STYLE_KEYS],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const MODAL: ComponentCatalogEntry = {
  type: "modal",
  isContainer: true,
  defaultLayout: { w: 12, h: 40 },
  required: ["title", "container"],
  optional: ["open", "showMask", "maskClosable", "width", "hidden"],
  example: {
    title: "Add Item",
    open: false,
    container: {},
  },
  notes:
    "container MUST be empty {}. Children are nested under '<modalName>.container' (no body/header/footer paths).",
  layoutProperties: {
    open: { description: "Whether the modal is visible.", type: "boolean" },
    showMask: { description: "Render the dim background mask.", type: "boolean" },
    maskClosable: { description: "Allow closing by clicking the mask.", type: "boolean" },
    width: { description: 'Modal width, e.g. "600px" or "60%".', type: "string" },
    hidden: HIDDEN,
  },
  styleProperties: {
    style: [...CONTAINER_STYLE_KEYS],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const DRAWER: ComponentCatalogEntry = {
  type: "drawer",
  isContainer: true,
  defaultLayout: { w: 12, h: 40 },
  required: ["title", "container"],
  optional: ["open", "placement", "showMask", "maskClosable", "width", "hidden"],
  example: { title: "Edit", open: false, container: {} },
  notes:
    "Same flat-container rule as modal. Nest under '<drawerName>.container'.",
  layoutProperties: {
    open: { description: "Whether the drawer is visible.", type: "boolean" },
    placement: {
      description: "Edge from which the drawer slides in.",
      enum: ["top", "right", "bottom", "left"],
    },
    showMask: { description: "Render the dim background mask.", type: "boolean" },
    maskClosable: { description: "Allow closing by clicking the mask.", type: "boolean" },
    width: { description: 'Drawer width, e.g. "400px".', type: "string" },
    hidden: HIDDEN,
  },
  styleProperties: {
    style: [...CONTAINER_STYLE_KEYS],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const TABLE: ComponentCatalogEntry = {
  type: "table",
  defaultLayout: { w: 24, h: 30 },
  required: ["columns", "data"],
  optional: [
    "pagination",
    "showRowGridBorder",
    "showHeader",
    "size",
    "hidden",
    "rowAutoHeight",
  ],
  layoutProperties: {
    showHeader: { description: "Render the column header row.", type: "boolean" },
    showRowGridBorder: { description: "Outline each row.", type: "boolean" },
    size: { description: "Row density.", enum: ["small", "middle", "large"] },
    rowAutoHeight: { description: "Auto-size each row to content.", type: "boolean" },
    hidden: HIDDEN,
  },
  styleProperties: {
    style: [...CONTAINER_STYLE_KEYS],
    headerStyle: [...COMMON_STYLE_KEYS],
    rowStyle: [...COMMON_STYLE_KEYS],
    cellStyle: [...COMMON_STYLE_KEYS],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
  example: {
    columns: [
      {
        title: "Task",
        dataIndex: "task",
        render: { compType: "text", comp: { text: "{{currentCell}}" } },
      },
      {
        title: "Status",
        dataIndex: "status",
        render: { compType: "text", comp: { text: "{{currentCell}}" } },
      },
    ],
    data: '[{"task":"Buy groceries","status":"Pending"},{"task":"Call Alice","status":"Done"}]',
    pagination: { pageSizeOptions: "[5, 10, 20, 50]" },
    showRowGridBorder: true,
  },
  notes:
    "`data` MUST be a stringified JSON array. Use {{currentCell}} in render unless told otherwise.",
};

const LIST_VIEW: ComponentCatalogEntry = {
  type: "listView",
  isContainer: true,
  defaultLayout: { w: 24, h: 30 },
  required: ["container"],
  optional: [
    "noOfRows",
    "itemIndexName",
    "itemDataName",
    "noOfColumns",
    "horizontal",
    "scrollbars",
    "hidden",
  ],
  layoutProperties: {
    noOfColumns: { description: "Columns per row in the grid.", type: "number" },
    horizontal: { description: "Render rows horizontally.", type: "boolean" },
    scrollbars: { description: "Always show scrollbars.", type: "boolean" },
    hidden: HIDDEN,
  },
  styleProperties: {
    style: [...CONTAINER_STYLE_KEYS],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
  example: {
    container: {},
    noOfRows: "3",
    itemIndexName: "i",
    itemDataName: "currentItem",
  },
  notes:
    "container is the per-item template. Nest item components directly under '<listViewName>.container' (flat). Do NOT use body/header/footer.",
};

const IMAGE: ComponentCatalogEntry = {
  type: "image",
  defaultLayout: { w: 8, h: 12 },
  required: ["src"],
  optional: [
    "autoHeight",
    "placement",
    "enableOverflow",
    "aspectRatio",
    "supportPreview",
    "hidden",
    "clipPath",
  ],
  example: { src: "https://images.unsplash.com/photo-1518770660439-4636190af475" },
  notes: "src MUST be a real, publicly accessible URL.",
  layoutProperties: {
    autoHeight: AUTO_HEIGHT,
    placement: {
      description: "Where the image sits inside the cell.",
      enum: [
        "top",
        "bottom",
        "left",
        "right",
        "top-left",
        "top-right",
        "bottom-left",
        "bottom-right",
      ],
    },
    enableOverflow: { description: "Crop image to fit instead of contain.", type: "boolean" },
    aspectRatio: { description: 'CSS aspect-ratio (e.g. "16 / 9").', type: "string" },
    supportPreview: { description: "Allow click-to-preview at full size.", type: "boolean" },
    hidden: HIDDEN,
    clipPath: { description: "CSS clip-path string.", type: "string" },
  },
  styleProperties: {
    style: [...IMAGE_STYLE_KEYS],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const DIVIDER: ComponentCatalogEntry = {
  type: "divider",
  defaultLayout: { w: 24, h: 2 },
  required: [],
  optional: ["title", "align", "type", "dashed", "hidden"],
  example: {},
  layoutProperties: {
    title: { description: "Optional label rendered in the divider.", type: "string" },
    align: ALIGN_HORIZONTAL,
    type: { description: "Orientation.", enum: ["horizontal", "vertical"] },
    dashed: { description: "Render with a dashed line.", type: "boolean" },
    hidden: HIDDEN,
  },
  styleProperties: {
    style: [...COMMON_STYLE_KEYS],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const DATE: ComponentCatalogEntry = {
  type: "date",
  defaultLayout: { w: 12, h: 6 },
  required: ["label"],
  optional: ["value", "format", "placeholder", "disabled", "hidden", "showTime"],
  example: {
    label: { text: "Due date", position: "row" },
    format: "YYYY-MM-DD",
  },
  layoutProperties: {
    label: LABEL_OBJECT,
    placeholder: { description: "Placeholder text.", type: "string" },
    disabled: DISABLED,
    hidden: HIDDEN,
    showTime: { description: "Include time picker.", type: "boolean" },
    format: { description: 'Display/parse format, e.g. "YYYY-MM-DD".', type: "string" },
  },
  styleProperties: {
    style: [...COMMON_STYLE_KEYS, "accent", "validate"],
    labelStyle: [...LABEL_STYLE_KEYS],
    inputFieldStyle: [...INPUT_LIKE_STYLE_KEYS],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const SWITCH: ComponentCatalogEntry = {
  type: "switch",
  defaultLayout: { w: 6, h: 5 },
  required: ["label"],
  optional: ["value", "disabled", "hidden"],
  example: {
    label: { text: "Enabled", position: "row" },
    value: true,
  },
  layoutProperties: {
    label: LABEL_OBJECT,
    disabled: DISABLED,
    hidden: HIDDEN,
  },
  styleProperties: {
    style: ["handle", "unchecked", "checked", "margin", "padding"],
    labelStyle: [...LABEL_STYLE_KEYS],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const TEXT_AREA: ComponentCatalogEntry = {
  type: "textArea",
  defaultLayout: { w: 12, h: 8 },
  required: ["label"],
  optional: [
    "placeholder",
    "value",
    "autoHeight",
    "disabled",
    "hidden",
    "readOnly",
    "showCount",
    "allowClear",
  ],
  example: {
    label: { text: "Description", position: "row" },
    placeholder: "Enter description...",
  },
  layoutProperties: {
    label: LABEL_OBJECT,
    placeholder: { description: "Placeholder text.", type: "string" },
    autoHeight: AUTO_HEIGHT,
    disabled: DISABLED,
    hidden: HIDDEN,
    readOnly: { description: "Read-only field.", type: "boolean" },
    showCount: { description: "Show character counter.", type: "boolean" },
    allowClear: { description: "Show a clear button.", type: "boolean" },
  },
  styleProperties: {
    style: [...CONTAINER_STYLE_KEYS],
    labelStyle: [...LABEL_STYLE_KEYS],
    inputFieldStyle: [...INPUT_LIKE_STYLE_KEYS],
    disabledStyle: [...DISABLED_STYLE_KEYS],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const PASSWORD: ComponentCatalogEntry = {
  type: "password",
  defaultLayout: { w: 12, h: 6 },
  required: ["label"],
  optional: ["placeholder", "disabled", "hidden", "visibilityToggle"],
  example: {
    label: { text: "Password", position: "row" },
    placeholder: "Enter password",
  },
  layoutProperties: {
    label: LABEL_OBJECT,
    placeholder: { description: "Placeholder text.", type: "string" },
    disabled: DISABLED,
    hidden: HIDDEN,
    visibilityToggle: { description: "Show the eye toggle to reveal the password.", type: "boolean" },
  },
  styleProperties: {
    style: [...CONTAINER_STYLE_KEYS],
    labelStyle: [...LABEL_STYLE_KEYS],
    inputFieldStyle: [...INPUT_LIKE_STYLE_KEYS],
    disabledStyle: [...DISABLED_STYLE_KEYS],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const CHART: ComponentCatalogEntry = {
  type: "chart",
  defaultLayout: { w: 12, h: 20 },
  required: ["chartType", "data"],
  optional: ["title", "xAxisKey", "hidden", "showLegend"],
  example: {
    chartType: "bar",
    data: '[{"category":"A","value":30},{"category":"B","value":50},{"category":"C","value":20}]',
    title: "Sales by Category",
    xAxisKey: "category",
  },
  notes: "chartType: 'bar', 'line', 'pie', 'scatter'. data is a stringified JSON array.",
  layoutProperties: {
    chartType: {
      description: "Visualisation kind.",
      enum: ["bar", "line", "pie", "scatter"],
    },
    title: { description: "Chart title.", type: "string" },
    showLegend: { description: "Display the legend.", type: "boolean" },
    hidden: HIDDEN,
  },
  styleProperties: {
    style: [
      "chartBackgroundColor",
      "chartGradientColor",
      "chartShadowColor",
      "chartBorderColor",
      "chartTextColor",
      "chartTextSize",
      "chartTextWeight",
      "chartFontFamily",
      "chartFontStyle",
      "chartBorderStyle",
      "chartBorderRadius",
      "chartBorderWidth",
      "chartOpacity",
      "chartBoxShadow",
      "margin",
      "padding",
    ],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const CARD: ComponentCatalogEntry = {
  type: "card",
  isContainer: true,
  defaultLayout: { w: 8, h: 15 },
  required: ["title"],
  optional: ["size", "showTitle", "hoverable", "bordered", "hidden"],
  example: { title: "Card Title" },
  notes: "Nest content inside '<cardName>.container'.",
  layoutProperties: {
    size: { description: "Card density.", enum: ["default", "small"] },
    showTitle: { description: "Render the title bar.", type: "boolean" },
    hoverable: { description: "Lift on hover.", type: "boolean" },
    bordered: { description: "Show outer border.", type: "boolean" },
    hidden: HIDDEN,
  },
  styleProperties: {
    style: [...CONTAINER_STYLE_KEYS, "IconColor", "activateColor"],
    headerStyle: [...COMMON_STYLE_KEYS],
    bodyStyle: [...CONTAINER_STYLE_KEYS],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const TABBED_CONTAINER: ComponentCatalogEntry = {
  type: "tabbedContainer",
  isContainer: true,
  defaultLayout: { w: 24, h: 30 },
  required: ["container"],
  optional: ["tabs", "tabPosition", "showHeader", "hidden"],
  example: { container: {} },
  notes: "Nest content per tab. Tabs are managed via properties.",
  layoutProperties: {
    tabPosition: {
      description: "Tab bar placement.",
      enum: ["top", "right", "bottom", "left"],
    },
    showHeader: { description: "Show the tabs bar.", type: "boolean" },
    hidden: HIDDEN,
  },
  styleProperties: {
    style: [...CONTAINER_STYLE_KEYS],
    headerStyle: [...COMMON_STYLE_KEYS],
    bodyStyle: [...CONTAINER_STYLE_KEYS],
    tabsStyle: [...COMMON_STYLE_KEYS],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const VIDEO: ComponentCatalogEntry = {
  type: "video",
  defaultLayout: { w: 12, h: 15 },
  required: ["src"],
  optional: ["controls", "autoPlay", "loop", "muted", "hidden"],
  example: { src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", controls: true },
  notes: "src must be a real URL. Set layout.h >= 10.",
  layoutProperties: {
    controls: { description: "Show native player controls.", type: "boolean" },
    autoPlay: { description: "Auto-play on mount (often requires muted=true).", type: "boolean" },
    loop: { description: "Loop the video.", type: "boolean" },
    muted: { description: "Start muted.", type: "boolean" },
    hidden: HIDDEN,
  },
  styleProperties: {
    style: ["margin", "padding"],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const AVATAR: ComponentCatalogEntry = {
  type: "avatar",
  defaultLayout: { w: 6, h: 6 },
  required: ["icon", "iconSize"],
  optional: ["src", "avatarLabel", "avatarCatption", "shape", "hidden"],
  example: {
    icon: "/icon:solid/user",
    iconSize: "40",
    shape: "circle",
    avatarLabel: "John Doe",
  },
  layoutProperties: {
    shape: { description: "Avatar shape.", enum: ["circle", "square"] },
    iconSize: { description: "Icon pixel size as a string, e.g. '40'.", type: "string" },
    hidden: HIDDEN,
  },
  styleProperties: {
    style: ["background", "fill"],
    avatarLabelStyle: [...COMMON_STYLE_KEYS],
    avatarContainerStyle: [...CONTAINER_STYLE_KEYS],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const PROGRESS: ComponentCatalogEntry = {
  type: "progress",
  defaultLayout: { w: 12, h: 4 },
  required: ["value"],
  optional: ["showInfo", "hidden"],
  example: { value: "75" },
  layoutProperties: {
    showInfo: { description: "Display the percentage label.", type: "boolean" },
    hidden: HIDDEN,
  },
  styleProperties: {
    style: ["text", "textSize", "textWeight", "fontFamily", "fontStyle", "radius", "margin", "padding", "lineHeight", "track", "fill", "success"],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const RATING: ComponentCatalogEntry = {
  type: "rating",
  defaultLayout: { w: 8, h: 5 },
  required: ["label"],
  optional: ["value", "max", "allowHalf", "disabled", "hidden"],
  example: {
    label: { text: "Rating", position: "row" },
    value: "3",
    max: "5",
  },
  layoutProperties: {
    label: LABEL_OBJECT,
    allowHalf: { description: "Allow half-star ratings.", type: "boolean" },
    disabled: DISABLED,
    hidden: HIDDEN,
  },
  styleProperties: {
    style: ["checked", "unchecked", "margin", "padding"],
    labelStyle: [...LABEL_STYLE_KEYS],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const SLIDER: ComponentCatalogEntry = {
  type: "slider",
  defaultLayout: { w: 12, h: 5 },
  required: ["label"],
  optional: ["value", "min", "max", "step", "disabled", "hidden", "vertical"],
  example: {
    label: { text: "Volume", position: "row" },
    value: "50",
    min: "0",
    max: "100",
  },
  layoutProperties: {
    label: LABEL_OBJECT,
    disabled: DISABLED,
    hidden: HIDDEN,
    vertical: { description: "Render vertically.", type: "boolean" },
  },
  styleProperties: {
    style: ["fill", "thumb", "thumbBorder", "track", "margin", "padding"],
    labelStyle: [...LABEL_STYLE_KEYS],
    disabledStyle: ["disabledFill", "disabledTrack"],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const NAVIGATION: ComponentCatalogEntry = {
  type: "navigation",
  defaultLayout: { w: 24, h: 5 },
  required: ["items"],
  optional: ["logoUrl", "horizontalAlignment", "hidden"],
  example: {
    items: [
      { label: "Home", hidden: false },
      { label: "About", hidden: false },
    ],
  },
  layoutProperties: {
    horizontalAlignment: ALIGN_HORIZONTAL,
    hidden: HIDDEN,
    logoUrl: { description: "Optional logo image URL.", type: "string" },
  },
  styleProperties: {
    style: [...NAVIGATION_STYLE_KEYS],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const TIMELINE: ComponentCatalogEntry = {
  type: "timeline",
  defaultLayout: { w: 12, h: 15 },
  required: ["value"],
  optional: ["mode", "reverse", "hidden"],
  example: {
    value: '[{"title":"Step 1","subTitle":"Started"},{"title":"Step 2","subTitle":"In Progress"}]',
  },
  notes: "value must be a stringified JSON array of timeline entries.",
  layoutProperties: {
    mode: {
      description: "Layout mode for entries.",
      enum: ["left", "alternate", "right"],
    },
    reverse: { description: "Reverse entry order.", type: "boolean" },
    hidden: HIDDEN,
  },
  styleProperties: {
    style: [
      "background",
      "titleColor",
      "subTitleColor",
      "labelColor",
      "margin",
      "padding",
      "radius",
    ],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const STEP: ComponentCatalogEntry = {
  type: "step",
  defaultLayout: { w: 24, h: 6 },
  required: ["value", "options"],
  optional: ["initialValue", "direction", "size", "hidden"],
  layoutProperties: {
    direction: {
      description: "Step bar orientation.",
      enum: ["horizontal", "vertical"],
    },
    size: { description: "Step density.", enum: ["default", "small"] },
    hidden: HIDDEN,
  },
  styleProperties: {
    style: [...COMMON_STYLE_KEYS],
    disabledStyle: [...DISABLED_STYLE_KEYS],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
  example: {
    value: "1",
    initialValue: "1",
    options: {
      optionType: "manual",
      manual: {
        manual: [
          { value: "1", label: "Step 1" },
          { value: "2", label: "Step 2" },
          { value: "3", label: "Step 3" },
        ],
      },
    },
  },
  notes: "Step values must be numbers starting from 1.",
};

const RADIO: ComponentCatalogEntry = {
  type: "radio",
  defaultLayout: { w: 12, h: 5 },
  required: ["label", "options"],
  optional: ["value", "disabled", "hidden", "layout"],
  example: {
    label: { text: "Priority", position: "row" },
    options: {
      optionType: "manual",
      manual: {
        manual: [
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" },
        ],
      },
    },
    value: "medium",
  },
  layoutProperties: {
    label: LABEL_OBJECT,
    disabled: DISABLED,
    hidden: HIDDEN,
    layout: {
      description: "Group layout direction.",
      enum: ["horizontal", "vertical", "autoColumns"],
    },
  },
  styleProperties: {
    style: [...COMMON_STYLE_KEYS],
    labelStyle: [...LABEL_STYLE_KEYS],
    inputFieldStyle: [...INPUT_LIKE_STYLE_KEYS, "checkedBackground", "uncheckedBackground", "uncheckedBorder", "hoverBackground"],
    animationStyle: [...ANIMATION_STYLE_KEYS],
  },
};

const CHAT: ComponentCatalogEntry = {
  type: "chat",
  defaultLayout: { w: 12, h: 20 },
  required: [],
  optional: ["chatQuery", "tableName", "placeholder"],
  example: {
    tableName: "LC_AI",
    placeholder: "Ask anything...",
  },
  notes: "AI chat component for embedding a conversational assistant in the app.",
};

const CHAT_BOX: ComponentCatalogEntry = {
  type: "chatBox",
  defaultLayout: { w: 12, h: 24 },
  required: [],
  optional: ["messages", "controller", "placeholder"],
  example: {},
  notes: "Chat UI for displaying messages and sending user input. Pair with chatController for realtime typing/presence.",
};

const CHAT_CONTROLLER: ComponentCatalogEntry = {
  type: "chatController",
  defaultLayout: { w: 12, h: 5 },
  required: [],
  optional: ["roomId"],
  example: {},
  notes: "Realtime chat controller hook. Use with chatBox for presence and typing indicators.",
};

const CURATED_CATALOG: ComponentCatalogEntry[] = [
  TEXT,
  BUTTON,
  INPUT,
  NUMBER_INPUT,
  TEXT_AREA,
  PASSWORD,
  DROPDOWN,
  CHECKBOX,
  RADIO,
  SWITCH,
  SLIDER,
  RATING,
  DATE,
  FORM,
  CONTAINER,
  MODAL,
  DRAWER,
  TABLE,
  LIST_VIEW,
  CARD,
  TABBED_CONTAINER,
  IMAGE,
  VIDEO,
  AVATAR,
  CHART,
  PROGRESS,
  NAVIGATION,
  TIMELINE,
  STEP,
  DIVIDER,
  CHAT,
  CHAT_BOX,
  CHAT_CONTROLLER,
];

const CURATED_BY_TYPE = new Map(CURATED_CATALOG.map((entry) => [entry.type, entry]));

function serialiseDescription(description: UICompManifest["description"]): string | undefined {
  if (typeof description === "string") return description;
  if (typeof description === "number") return String(description);
  return undefined;
}

function fallbackEntry(type: string, manifest: UICompManifest): ComponentCatalogEntry {
  const layout = manifest.layoutInfo ?? { w: 6, h: 5 };
  return {
    type,
    name: manifest.name,
    enName: manifest.enName,
    categories: manifest.categories,
    description: serialiseDescription(manifest.description),
    isContainer: manifest.isContainer,
    defaultLayout: {
      w: layout.w,
      h: layout.h,
    },
    required: [],
    optional: [],
    example: {},
    notes:
      "Registered Lowcoder component. Use an empty action_parameters object when no property shape is listed, or set properties afterward with set_properties.",
  };
}

function typeOnlyFallbackEntry(type: string): ComponentCatalogEntry {
  const curated = CURATED_BY_TYPE.get(type);
  if (curated) return curated;

  return {
    type,
    defaultLayout: { w: 6, h: 5 },
    required: [],
    optional: [],
    example: {},
    notes:
      "Lowcoder component listed in comps/index.tsx. Use an empty action_parameters object when no property shape is listed, or set properties afterward with set_properties.",
  };
}

function mergeManifestMetadata(
  entry: ComponentCatalogEntry,
  manifest: UICompManifest
): ComponentCatalogEntry {
  return {
    ...entry,
    name: manifest.name,
    enName: manifest.enName,
    categories: manifest.categories,
    description: serialiseDescription(manifest.description),
    isContainer: entry.isContainer ?? manifest.isContainer,
    defaultLayout: entry.defaultLayout ?? manifest.layoutInfo ?? { w: 6, h: 5 },
  };
}

function buildFullCatalog(): ComponentCatalogEntry[] {
  const registryEntries = Object.entries(uiCompRegistry);
  const registryTypes = new Set(registryEntries.map(([type]) => type));
  const knownTypes = new Set(LOWCODER_COMPONENT_TYPES);

  const listedEntries = LOWCODER_COMPONENT_TYPES.map((type) => {
    const manifest = uiCompRegistry[type];
    if (!manifest) return typeOnlyFallbackEntry(type);

    const curated = CURATED_BY_TYPE.get(type);
    return curated
      ? mergeManifestMetadata(curated, manifest)
      : fallbackEntry(type, manifest);
  });

  const extraRegistryEntries = registryEntries
    .filter(([type]) => !knownTypes.has(type))
    .map(([type, manifest]) => {
      const curated = CURATED_BY_TYPE.get(type);
      return curated
        ? mergeManifestMetadata(curated, manifest)
        : fallbackEntry(type, manifest);
    });

  const curatedOnlyEntries = CURATED_CATALOG.filter(
    (entry) => !registryTypes.has(entry.type) && !knownTypes.has(entry.type)
  );

  return [...listedEntries, ...extraRegistryEntries, ...curatedOnlyEntries].sort((a, b) => {
    const categoryA = a.categories?.[0] ?? "";
    const categoryB = b.categories?.[0] ?? "";
    if (categoryA !== categoryB) return categoryA.localeCompare(categoryB);
    return (a.enName || a.name || a.type).localeCompare(b.enName || b.name || b.type);
  });
}

/**
 * Returns all registered Lowcoder components. If `onlyTypes` is provided we
 * return those entries first and keep the remaining catalog afterward, so the
 * model sees the user's requested component names without losing access to the
 * rest of Lowcoder's palette.
 */
export function getComponentCatalog(onlyTypes?: string[]): ComponentCatalogEntry[] {
  const fullCatalog = buildFullCatalog();
  if (!onlyTypes || onlyTypes.length === 0) return fullCatalog;

  const requested = new Set(onlyTypes);
  const mentioned = fullCatalog.filter((c) => requested.has(c.type));
  const remaining = fullCatalog.filter((c) => !requested.has(c.type));
  return mentioned.length > 0 ? [...mentioned, ...remaining] : fullCatalog;
}

export const COMPONENT_TYPES_DEFAULT: string[] = buildFullCatalog().map((c) => c.type);
