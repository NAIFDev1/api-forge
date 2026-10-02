# APIForge

A dense, browser-based API client for building, sending and inspecting HTTP requests.

APIForge runs entirely in your browser. There is no backend, no account, and no API key storage — every request is issued with the browser's own `fetch`, and every piece of workspace data lives in `localStorage` on your machine.

> This is a fictional, open-source-style portfolio project. It is not affiliated with, endorsed by, or connected to any real company or product. The sample data and seeded requests are generic and fictional.

## Features

- **Request builder** — seven HTTP methods, query parameters, custom headers, four body modes (none / JSON / form URL-encoded / raw) and four auth styles (none, bearer, basic, API key).
- **Real requests** — no mock layer. Requests go straight to the endpoint and the response panel shows the real status, timing, byte size, headers and body.
- **Response inspection** — collapsible JSON tree with type colouring, pretty/raw toggle, in-response search with match count, copy to clipboard, and inline preview for images, PDF and HTML responses.
- **Collections** — create, rename, duplicate, delete and organise saved requests in nested-ready collections with a per-request context menu.
- **Environments** — key/value variables written as `{{NAME}}` in the URL, headers or body. Unresolved placeholders are flagged before you send, and again in the response panel if one survives.
- **History** — the last 60 requests with method, URL, status, timing and size. Reopen any entry or delete it individually.
- **Global search** — `Ctrl/Cmd + K` opens a command palette that searches saved requests, history, environments and actions at once.
- **Persistent workspace** — collections, environments, history, theme, sidebar state, timeout and the in-progress request survive a reload.
- **Dark and light themes** — dark by default, remembered between visits.
- **Accessible and responsive** — labelled controls, keyboard navigation, visible focus rings, a resizable split view, a drawer sidebar on small screens and respect for `prefers-reduced-motion`.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl/Cmd + K` | Open the command palette |
| `Ctrl/Cmd + Shift + P` | Same (browsers reserve `Ctrl + K` for the address bar) |
| `Ctrl/Cmd + Enter` | Send the current request |
| `Ctrl/Cmd + B` | Collapse or expand the sidebar |
| `Ctrl/Cmd + J` | Start a new request |
| `Ctrl/Cmd + E` | Manage environments |
| `Ctrl/Cmd + /` | Open settings |
| `?` | Show the shortcut list |
| `Esc` | Close any dialog or overlay |

## Getting started

```bash
npm install
npm run dev      # http://localhost:5180
```

Other scripts:

```bash
npm run build      # production build into dist/
npm run preview    # serve the production build
npm run lint       # ESLint
npm test           # build, then run the jsdom smoke suite
```

## How to try it

Three collections are seeded on first load so there is something real to click:

- **Users API** — JSONPlaceholder: list users with pagination params, fetch one user, and POST a JSON login payload.
- **Countries API** — REST Countries: all countries, and a lookup by country code.
- **Shop API** — DummyJSON: browse products and create a product with a JSON body.

Activate the **Development** environment and set the URL to `{{BASE_URL}}/users` to watch a placeholder get substituted before the request leaves the tab.

## About CORS

A browser can only read a response when the server opts in with `Access-Control-Allow-Origin`. That rule is enforced by the browser, not by APIForge, so some public APIs simply cannot be called from a page like this one.

When a request is blocked before it reaches the server, the response panel explains that instead of showing a silent failure. Endpoints such as JSONPlaceholder, DummyJSON and REST Countries do send the headers needed and work as expected.

## Privacy

Requests are sent from your browser to the endpoint you type. Workspace data is stored locally and never leaves your device. Clearing site data resets the app.

## Tech stack

- React 18 with Vite
- Tailwind CSS with CSS-variable design tokens for both themes
- shadcn/ui conventions (in-repo components in `src/components/ui`, `cn` helper, `class-variance-authority`)
- lucide-react for icons
- jsdom smoke suite that exercises the built bundle

## Project structure

```
src/
├── components/
│   ├── ui/            # shadcn-style primitives (button, modal, popover, …)
│   ├── Chrome.jsx     # top bar, shortcut list, toasts
│   ├── Sidebar.jsx    # collections + history + request bar
│   ├── RequestBuilder.jsx
│   ├── RequestParts.jsx
│   ├── ResponsePanel.jsx
│   ├── JsonViewer.jsx
│   ├── CommandPalette.jsx
│   └── Dialogs.jsx    # environment manager, settings
├── context/           # workspace state and persistence
├── hooks/             # request runner, global hotkeys
├── lib/               # cn helper
├── services/          # fetch client, storage adapter
└── utils/             # variable resolution, formatting
```

## License

MIT