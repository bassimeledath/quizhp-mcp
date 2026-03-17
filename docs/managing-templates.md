# Managing Templates

## Directory Structure

Templates live in `templates/` organized by platform and question type:

```
templates/
  index.json              # Manifest — the source of truth for which templates are active
  web/
    mcq/                  # Desktop multiple-choice games
    true_false/           # Desktop true/false games (underscore)
    true-false/           # Desktop true/false games (hyphen — legacy naming)
  mobile/
    mcq/                  # Mobile multiple-choice games
    true_false/           # Mobile true/false games (underscore)
    true-false/           # Mobile true/false games (hyphen — legacy naming)
```

> **Note:** Both `true_false/` and `true-false/` directories exist due to a naming inconsistency from migration. Either works — just make sure the `path` in `index.json` matches the actual file location.

## The Manifest (`templates/index.json`)

`index.json` is a JSON file with this schema:

```json
{
  "version": 1,
  "templates": [
    {
      "name": "piano-keys",
      "path": "web/mcq/piano-keys.html",
      "platform": "web",
      "questionType": "mcq",
      "instructions": "Click a piano key to select your answer.",
      "controls": [
        {
          "type": "mouse",
          "description": "Click piano key to select answer"
        },
        {
          "keys": ["R"],
          "type": "keyboard",
          "description": "Restart game"
        }
      ]
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Unique identifier (kebab-case, matches filename without `.html`) |
| `path` | string | Relative path from `templates/` to the HTML file |
| `platform` | `"web"` \| `"mobile"` | Target platform |
| `questionType` | `"mcq"` \| `"true_false"` | Question type the template supports |
| `instructions` | string | Human-readable instructions shown to the player |
| `controls` | array | Input controls (mouse, keyboard, touch) with descriptions |

Only templates listed in `index.json` are served to users. HTML files that exist on disk but aren't in the manifest are ignored.

## Template HTML Requirements

Each template is a self-contained HTML file with an inline `<canvas>` game. The runtime injects question data and a postMessage shim before serving it. Templates must follow these conventions:

### 1. Question Data Placeholder

The template must include one of these patterns so the injector can replace it with real question data:

```js
// Option A (preferred): a const block that gets regex-replaced
const QUESTION = {
  type: "mcq",
  prompt: "Sample question?",
  choices: [
    { text: "A", is_correct: true, explanation: "" },
    { text: "B", is_correct: false, explanation: "" }
  ],
  isLastQuestion: false
};

// Option B: a JSON placeholder comment
const QUESTION = /*__QUESTION_JSON__*/;
```

If neither pattern is found, the injector falls back to prepending a `<script>` tag after `<body>`.

### 2. Engine Object

The template must expose a global `engine` object with an `end(isCorrect, explanation)` method. The postMessage shim wraps this method to report results back to the parent MCP App:

```js
const engine = {
  end(isCorrect, explanation) {
    // Show correct/incorrect feedback in the game canvas
  }
};
```

The shim polls for `engine.end` every 50ms until it finds it, then wraps it to fire a `quiz-end` postMessage event.

### 3. General Guidelines

- Templates should be fully self-contained (no external scripts, stylesheets, or images)
- Use a `<canvas id="game">` element — the injected CSS targets this for responsive sizing
- Keep file size reasonable — every template adds to the Worker bundle

## Adding a New Template

1. **Create the HTML file** in the appropriate directory:
   ```
   templates/web/mcq/my-new-game.html
   ```

2. **Add an entry to `templates/index.json`:**
   ```json
   {
     "name": "my-new-game",
     "path": "web/mcq/my-new-game.html",
     "platform": "web",
     "questionType": "mcq",
     "instructions": "Description of how to play.",
     "controls": [
       { "type": "mouse", "description": "Click to select answer" },
       { "keys": ["R"], "type": "keyboard", "description": "Restart game" }
     ]
   }
   ```

3. **Rebuild the Worker bundle:**
   ```bash
   npm run build:view && node scripts/build-worker-bundle.mjs
   ```

## Modifying an Existing Template

1. Edit the HTML file directly (e.g., `templates/web/mcq/piano-keys.html`)
2. Rebuild:
   ```bash
   npm run build:view && node scripts/build-worker-bundle.mjs
   ```

If you changed the template's instructions or controls, update its entry in `index.json` too.

## Removing a Template

1. Delete the HTML file from `templates/`
2. Remove its entry from `templates/index.json`
3. Rebuild:
   ```bash
   npm run build:view && node scripts/build-worker-bundle.mjs
   ```

## Build Pipeline

The full build is two steps:

### Step 1: `npm run build:view`

Builds the React MCP App widget (in `view/`) into `dist/view/index.html` using Vite.

### Step 2: `node scripts/build-worker-bundle.mjs`

Reads `dist/view/index.html` and all **web** templates from `index.json`, then generates `src/worker-bundle.ts` — a TypeScript file that exports:

- `WIDGET_HTML` — the compiled MCP App HTML as a string constant
- `WORKER_TEMPLATES` — an array of all web templates with their HTML inlined

This file is imported by the Cloudflare Worker entry point (`src/worker.ts`) so it can serve everything without filesystem access. Only **web** platform templates are bundled into the Worker — mobile templates are served via the stdio/HTTP servers which have filesystem access.

### Bundle Size

The Worker bundle is currently ~3 MB. The limit on Cloudflare Workers paid plan ($5/mo) is **10 MB**. If you add many templates, monitor the bundle size — the build script prints it after each run.

## Unindexed Templates

These 8 HTML files exist on disk but are **not** in `index.json` (excluded for quality reasons):

| File | Platform | Type |
|------|----------|------|
| `mobile/true_false/tos-agreement.html` | Mobile | True/False |
| `mobile/true_false/word-find-true-false.html` | Mobile | True/False |
| `web/true_false/arrow-ufo-hunter.html` | Web | True/False |
| `web/true_false/balance-beam.html` | Web | True/False |
| `web/true_false/bomb-defusal.html` | Web | True/False |
| `web/true_false/rocket-launch-commander.html` | Web | True/False |
| `web/true_false/slingshot.html` | Web | True/False |
| `web/true_false/word-search-true-false.html` | Web | True/False |

All 8 are true/false templates that were excluded because they didn't pass quality validation. They can be re-added by fixing their issues and adding entries to `index.json`.
