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
}

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
