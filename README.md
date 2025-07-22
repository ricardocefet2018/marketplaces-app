# Multimarketplaces App

A desktop application for managing multiple Steam accounts and trading across several third-party marketplaces. Built with Electron, TypeScript, and Node.js, the app provides a unified interface for handling Steam inventory, trade offers, and marketplace integrations.

---

## Features

- **Multi-account support:** Manage multiple Steam accounts simultaneously.
- **Marketplace integrations:** Connect and trade with Waxpeer, Shadowpay, MarketCSGO, and CSFloat.
- **API key management:** Securely update and store marketplace API keys per account.
- **Trade automation:** Create and manage trades across all supported marketplaces.
- **Notifications:** Receive desktop notifications for important events (login, trade status, errors).
- **Proxy support:** Configure HTTP proxies for Steam connections.
- **Event-driven architecture:** Real-time updates via WebSocket and HTTP polling.

---

## Architecture Overview

### Main Components

- **Steam and Marketplaces Manager (`TradeManager`):**
  - Manages a single Steam account session.
  - Integrates with all supported marketplaces.
  - Emits events for state changes and trade updates.

- **Trade Manager Service (`TradeManagerService`):**
  - Maintains a registry of all active `TradeManager` instances.
  - Handles login, logout, and account-specific operations.
  - Acts as the main business logic layer between the Electron main process and account logic.

- **Marketplace Clients (`*Client`):**
  - Handle HTTP/API requests for each marketplace (e.g., `WaxpeerClient`, `ShadowpayClient`).
  - Responsible for authentication, trade creation, and data retrieval.

- **Marketplace Sockets (`*Socket`):**
  - Event emitters that poll marketplace APIs via HTTP(S) requests.
  - Emit events based on polling results (e.g., `MarketcsgoSocket`, `CSFloatSocket`).

- **Marketplace Websockets (`*Websocket`):**
  - Event emitters that listen to real WebSocket connections.
  - Emit events based on messages from the marketplace server (e.g., `WaxpeerWebsocket`, `ShadowpayWebsocket`).

---

## Naming Conventions

- **`*Client`**: Handles HTTP/API requests for a marketplace.
- **`*Socket`**: Polls a marketplace API via HTTP(S) and emits events (not a real WebSocket).
- **`*Websocket`**: Listens to a real WebSocket connection and emits events.

---

## Development

### Prerequisites

- Node.js (v20+ recommended)
- npm

### Install dependencies

```bash
npm install
```

### Run the app (development)

```bash
npm run dev
```

### Build for production

```bash
npm run package
```

---

## Contributing

- Please document new marketplace integrations and follow the established naming conventions.
- For HTTP polling event emitters, use the `*Socket` suffix.
- For real WebSocket event emitters, use the `*Websocket` suffix.

---

## License

MIT

---

## Acknowledgements

- [Electron](https://www.electronjs.org/docs/latest/)
- [Steam-user](https://github.com/DoctorMcKay/node-steam-user)
- [Steam-tradeoffer-manager](https://github.com/DoctorMcKay/node-steam-tradeoffer-manager)
- [Vue](https://vuejs.org/)
- [Primevue](https://primevue.org/)
- [SQLite](https://github.com/TryGhost/node-sqlite3)
- [TypeORM](https://typeorm.io/docs/getting-started)