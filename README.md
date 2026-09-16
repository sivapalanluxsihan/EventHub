# EventHub

EventHub is a modern cross-platform event management and discovery platform built for university campus communities. It enables students and organizers to explore, book, manage, and receive notifications for academic, cultural, and social events.

---

## 🛠 Technology Stack

### Mobile Client (`apps/mobile`)
- **Framework:** [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Language:** TypeScript
- **Local Storage:** SQLite (`expo-sqlite`) & AsyncStorage (`@react-native-async-storage/async-storage`)
- **Notifications:** Expo Notifications (`expo-notifications`)

### Backend API (`apps/server`)
- **Runtime:** Node.js
- **Framework:** [Express.js](https://expressjs.com/)
- **Language:** TypeScript
- **Database:** SQLite
- **Middleware:** CORS, dotenv

---

## 📁 Project Structure

```text
mobile p/
├── apps/
│   ├── mobile/           # Expo React Native mobile application
│   │   ├── App.tsx       # Entry application component
│   │   ├── app.json      # Expo configuration
│   │   └── package.json  # Mobile dependencies and scripts
│   └── server/           # Node.js + Express REST API
│       ├── src/
│       │   └── index.ts  # Express server entry point & routes
│       ├── tsconfig.json # TypeScript configuration
│       └── package.json  # Server dependencies and scripts
├── documentation/        # Project architecture and API documentation
├── .gitignore            # Root Git ignore rules
└── README.md             # Project overview and setup instructions
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js:** v18+ (tested with v24.x)
- **npm:** v9+ (tested with v11.x)
- **Android Studio / SDK:** Configured with `ANDROID_HOME` and `platform-tools`
- **Expo Go App:** Installed on your physical Android device or active Android emulator

---

### Backend Setup (`apps/server`)

1. Navigate to the server folder:
   ```bash
   cd apps/server
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create the `.env` file (if not present):
   ```env
   PORT=5000
   NODE_ENV=development
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Verify server health:
   ```bash
   curl http://localhost:5000/api/health
   ```
   Expected response:
   ```json
   {
     "status": "ok",
     "message": "EventHub API is running"
   }
   ```

---

### Mobile Setup (`apps/mobile`)

1. Navigate to the mobile folder:
   ```bash
   cd apps/mobile
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Expo development server:
   ```bash
   npm start
   ```
4. Run on Android:
   - Press `a` in the Expo terminal to open the app on a running Android emulator or connected device.
   - Or scan the QR code with the **Expo Go** app on your physical Android device.

---

## 📜 Development Scripts

| Scope | Command | Description |
| :--- | :--- | :--- |
| **Server** | `npm run dev` (in `apps/server`) | Starts Express server with hot reloading (`tsx watch`) |
| **Server** | `npm run build` (in `apps/server`) | Compiles TypeScript to `dist/` |
| **Server** | `npm start` (in `apps/server`) | Runs compiled server from `dist/index.js` |
| **Mobile** | `npx expo start` (in `apps/mobile`) | Starts Expo development bundler |
| **Mobile** | `npx expo start --android` (in `apps/mobile`) | Starts Expo and opens on Android emulator/device |
