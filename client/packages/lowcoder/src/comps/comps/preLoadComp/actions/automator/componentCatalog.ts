// client/packages/lowcoder/src/comps/comps/preLoadComp/actions/automator/componentCatalog.ts

/**
 * Curated, *minimal* reference of the component types the model is most
 * likely to need when assembling small apps (todo, CRUD, login, dashboard).
 *
 * The legacy `Latest_prompt.md` shipped a 4.7K-line catalog covering every
 * component. That blew up token budgets and led the model to invent fields.
 * Here we keep just the essentials, with curated default property shapes
 * derived from the legacy doc and the live `defaultDataFn` runtime values.
 *
 * The catalog is deliberately *additive*: callers can call
 * `getComponentCatalog()` to get the default subset, or
 * `getComponentCatalog([...extra])` to inject additional types they know
 * the user wants (e.g. via UI hints).
 */

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
}

const TEXT: ComponentCatalogEntry = {
  type: "text",
  defaultLayout: { w: 12, h: 4 },
  required: ["text"],
  optional: ["type"],
  example: { text: "## Hello", type: "markdown" },
  notes: "Use type:'markdown' for headings, links, formatted text.",
};

const BUTTON: ComponentCatalogEntry = {
  type: "button",
  defaultLayout: { w: 6, h: 5 },
  required: ["text"],
  optional: ["type", "disabled", "loading", "form", "prefixIcon"],
  example: { text: "Submit", type: "primary" },
  notes: "Set type:'submit' and form:'<formName>' to submit a form.",
};

const INPUT: ComponentCatalogEntry = {
  type: "input",
  defaultLayout: { w: 12, h: 6 },
  required: ["label", "placeholder"],
  optional: ["value", "validationType", "required", "allowClear"],
  example: {
    label: { text: "Name", position: "row", align: "left" },
    placeholder: "Enter name",
    allowClear: true,
  },
};

const NUMBER_INPUT: ComponentCatalogEntry = {
  type: "numberInput",
  defaultLayout: { w: 12, h: 6 },
  required: ["label"],
  optional: ["value", "min", "max", "step", "placeholder"],
  example: {
    label: { text: "Quantity", position: "row" },
    value: 1,
    min: 0,
    max: 100,
  },
};

const DROPDOWN: ComponentCatalogEntry = {
  type: "select",
  defaultLayout: { w: 12, h: 6 },
  required: ["label", "options", "value"],
  optional: ["allowClear"],
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
};

const CHECKBOX: ComponentCatalogEntry = {
  type: "checkbox",
  defaultLayout: { w: 8, h: 5 },
  required: ["label"],
  optional: ["value", "options"],
  example: {
    label: { text: "I agree", position: "row" },
    value: false,
  },
};

const FORM: ComponentCatalogEntry = {
  type: "form",
  isContainer: true,
  defaultLayout: { w: 12, h: 30 },
  required: ["container"],
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
};

const CONTAINER: ComponentCatalogEntry = {
  type: "container",
  isContainer: true,
  defaultLayout: { w: 12, h: 20 },
  required: ["container"],
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
};

const MODAL: ComponentCatalogEntry = {
  type: "modal",
  isContainer: true,
  defaultLayout: { w: 12, h: 40 },
  required: ["title", "container"],
  optional: ["open"],
  example: {
    title: "Add Item",
    open: false,
    container: {},
  },
  notes:
    "container MUST be empty {}. Children are nested under '<modalName>.container' (no body/header/footer paths).",
};

const DRAWER: ComponentCatalogEntry = {
  type: "drawer",
  isContainer: true,
  defaultLayout: { w: 12, h: 40 },
  required: ["title", "container"],
  optional: ["open", "placement"],
  example: { title: "Edit", open: false, container: {} },
  notes:
    "Same flat-container rule as modal. Nest under '<drawerName>.container'.",
};

const TABLE: ComponentCatalogEntry = {
  type: "table",
  defaultLayout: { w: 24, h: 30 },
  required: ["columns", "data"],
  optional: ["pagination", "showRowGridBorder"],
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
  optional: ["noOfRows", "itemIndexName", "itemDataName"],
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
  optional: ["autoHeight"],
  example: { src: "https://images.unsplash.com/photo-1518770660439-4636190af475" },
  notes: "src MUST be a real, publicly accessible URL.",
};

const DIVIDER: ComponentCatalogEntry = {
  type: "divider",
  defaultLayout: { w: 24, h: 2 },
  required: [],
  example: {},
};

const DATE: ComponentCatalogEntry = {
  type: "date",
  defaultLayout: { w: 12, h: 6 },
  required: ["label"],
  optional: ["value", "format"],
  example: {
    label: { text: "Due date", position: "row" },
    format: "YYYY-MM-DD",
  },
};

const SWITCH: ComponentCatalogEntry = {
  type: "switch",
  defaultLayout: { w: 6, h: 5 },
  required: ["label"],
  optional: ["value"],
  example: {
    label: { text: "Enabled", position: "row" },
    value: true,
  },
};

const TEXT_AREA: ComponentCatalogEntry = {
  type: "textArea",
  defaultLayout: { w: 12, h: 8 },
  required: ["label"],
  optional: ["placeholder", "value", "autoHeight"],
  example: {
    label: { text: "Description", position: "row" },
    placeholder: "Enter description...",
  },
};

const PASSWORD: ComponentCatalogEntry = {
  type: "password",
  defaultLayout: { w: 12, h: 6 },
  required: ["label"],
  optional: ["placeholder"],
  example: {
    label: { text: "Password", position: "row" },
    placeholder: "Enter password",
  },
};

const CHART: ComponentCatalogEntry = {
  type: "chart",
  defaultLayout: { w: 12, h: 20 },
  required: ["chartType", "data"],
  optional: ["title", "xAxisKey"],
  example: {
    chartType: "bar",
    data: '[{"category":"A","value":30},{"category":"B","value":50},{"category":"C","value":20}]',
    title: "Sales by Category",
    xAxisKey: "category",
  },
  notes: "chartType: 'bar', 'line', 'pie', 'scatter'. data is a stringified JSON array.",
};

const CARD: ComponentCatalogEntry = {
  type: "card",
  isContainer: true,
  defaultLayout: { w: 8, h: 15 },
  required: ["title"],
  optional: ["size"],
  example: { title: "Card Title" },
  notes: "Nest content inside '<cardName>.container'.",
};

const TABBED_CONTAINER: ComponentCatalogEntry = {
  type: "tabbedContainer",
  isContainer: true,
  defaultLayout: { w: 24, h: 30 },
  required: ["container"],
  optional: ["tabs"],
  example: { container: {} },
  notes: "Nest content per tab. Tabs are managed via properties.",
};

const VIDEO: ComponentCatalogEntry = {
  type: "video",
  defaultLayout: { w: 12, h: 15 },
  required: ["src"],
  optional: ["controls", "autoPlay"],
  example: { src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", controls: true },
  notes: "src must be a real URL. Set layout.h >= 10.",
};

const AVATAR: ComponentCatalogEntry = {
  type: "avatar",
  defaultLayout: { w: 6, h: 6 },
  required: ["icon", "iconSize"],
  optional: ["src", "avatarLabel", "avatarCatption", "shape"],
  example: {
    icon: "/icon:solid/user",
    iconSize: "40",
    shape: "circle",
    avatarLabel: "John Doe",
  },
};

const PROGRESS: ComponentCatalogEntry = {
  type: "progress",
  defaultLayout: { w: 12, h: 4 },
  required: ["value"],
  optional: ["showInfo"],
  example: { value: "75" },
};

const RATING: ComponentCatalogEntry = {
  type: "rating",
  defaultLayout: { w: 8, h: 5 },
  required: ["label"],
  optional: ["value", "max", "allowHalf"],
  example: {
    label: { text: "Rating", position: "row" },
    value: "3",
    max: "5",
  },
};

const SLIDER: ComponentCatalogEntry = {
  type: "slider",
  defaultLayout: { w: 12, h: 5 },
  required: ["label"],
  optional: ["value", "min", "max", "step"],
  example: {
    label: { text: "Volume", position: "row" },
    value: "50",
    min: "0",
    max: "100",
  },
};

const NAVIGATION: ComponentCatalogEntry = {
  type: "navigation",
  defaultLayout: { w: 24, h: 5 },
  required: ["items"],
  optional: ["logoUrl"],
  example: {
    items: [
      { label: "Home", hidden: false },
      { label: "About", hidden: false },
    ],
  },
};

const TIMELINE: ComponentCatalogEntry = {
  type: "timeline",
  defaultLayout: { w: 12, h: 15 },
  required: ["value"],
  example: {
    value: '[{"title":"Step 1","subTitle":"Started"},{"title":"Step 2","subTitle":"In Progress"}]',
  },
  notes: "value must be a stringified JSON array of timeline entries.",
};

const STEP: ComponentCatalogEntry = {
  type: "step",
  defaultLayout: { w: 24, h: 6 },
  required: ["value", "options"],
  optional: ["initialValue"],
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
  optional: ["value"],
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
};

const DEFAULT_CATALOG: ComponentCatalogEntry[] = [
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
];

/**
 * Returns the curated component catalog. If `onlyTypes` is provided we only
 * include those entries (useful when the user already mentioned specific
 * components and we want to keep token usage low).
 */
export function getComponentCatalog(onlyTypes?: string[]): ComponentCatalogEntry[] {
  if (!onlyTypes || onlyTypes.length === 0) return DEFAULT_CATALOG;
  const set = new Set(onlyTypes);
  const filtered = DEFAULT_CATALOG.filter((c) => set.has(c.type));
  return filtered.length > 0 ? filtered : DEFAULT_CATALOG;
}

export const COMPONENT_TYPES_DEFAULT: string[] = DEFAULT_CATALOG.map(
  (c) => c.type
);
