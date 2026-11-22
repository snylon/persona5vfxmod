# 🌿 Releaf

**Supporting patient autonomy and caregiver peace of mind.**

Worldwide, over 55 million people live with Alzheimer’s or dementia. Yet cognitive decline is rarely an individual experience—it is a two-person journey shared between a loved one striving to hold onto their independence and a family caregiver living under constant stress. 

**Releaf** bridges that gap by offering two synchronized, role-based experiences in one platform: a calm, low-stimulation daily companion for individuals experiencing early-stage Alzheimer's or memory loss, and a discreet safety and coordination dashboard for their Care Partners.

---

## 📸 Preview

| Patient View (Calming Pastel Blue & Sage) | Care Partner View (Reassuring Warm Cream) |
| :---: | :---: |
| <img width="1008" height="2244" alt="Screenshot_20261122-113406" src="https://github.com/user-attachments/assets/a0c1f2be-c90a-4429-8719-88cbaeac8901" /> | <img width="1440" height="3120" alt="Screenshot_20261122_113340_Releaf" src="https://github.com/user-attachments/assets/fb69fe82-f942-4d75-97c5-4f6d8f2b1e74" /> |


---

## ✨ Key Features

### 🧩 Primary User Experience (Patient View)
Designed around cognitive aging research and color psychology, using a **pastel blue and sage green palette** to minimize visual overstimulation and anxiety.
- **Daily Structure & Routine:** Simple, easy-to-read calendars, to-do lists, and gentle reminders to encourage daily independence.
- **Cognitive Engagement & Memory Retention:** Interactive activities inspired by early-stage Alzheimer’s therapy, including working-memory minigames, quizzes, and guided journaling.
- **Picture Day & Family Connection:** A visual family tree and photo-sharing space to help reinforce interpersonal relationships and familiar faces.

### 🛡️ Care Partner Experience (Caregiver View)
Designed with a warm, reassuring **cream palette** to give caregivers visibility and control without overwhelming the primary user.
- **Geofencing & Going-Out Alerts:** Care partners can manage permissions for going out alone, accept/decline requests from the primary user for outdoor activities, and receive instant notifications if their loved one leaves a safe zone.
- **Real-Time Discreet GPS Telemetry:** Live location updates powered by Firebase Realtime Database to help prevent wandering incidents.
- **Activity & Content Customization:** Remotely manage reminders, customize cognitive exercises, and update family contacts.
- **Two-Way Mutual Pairing ("The Handshake"):** Patients are never monitored without authorization. Accounts connect via a unique, human-friendly 8-character code (`RLF-XXXX`) that avoids visually confusing characters (`0/O`, `1/I`). Both parties must confirm the link before location or personal data is shared, and either party can revoke access at any time.
- **Customisation:** Care partners can choose which modules are enabled/disabled for their custom use case.

---

## 🏗️ Tech Stack & Architecture

| Layer | Technology | Architectural Decision |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (Turbopack) + React 19 | Server-Side Rendering (SSR) for fast initial loads paired with a reactive Client Shell for live interactive state. |
| **Styling** | Tailwind CSS v4 | Role-based adaptive theming (calming Pastel Blue/Sage for patients; warm Cream for caregivers). |
| **Real-Time Telemetry** | Firebase Realtime Database | Sub-second WebSocket listeners on the caregiver side with client-side 3-second write throttling on the patient side. |
| **Authentication** | Node.js `crypto` (PBKDF2) + HTTP-Only Cookies | Passwords hashed with 10,000 rounds of SHA-512 and verified via `timingSafeEqual` to prevent timing side-channel attacks. |
| **Data Persistence** | Atomic JSON File Stores (`.data/`) | Lightweight, zero-dependency local persistence with offline caching support. |
| **Mobile Wrapper** | Android APK | Packaged as an installable Android APK for mobile testing and live device deployment. |

---

## 📁 Project Structure

```text
releaf/
├── .data/              # Local atomic JSON persistence & offline cache
├── docs/               # Screenshots & demo assets
├── public/             # Static assets & media
└── src/
    ├── app/            # Next.js App Router pages (Patient & Care Partner views)
    ├── components/     # Shared & role-themed UI components
    └── lib/            # Auth (PBKDF2), Firebase telemetry, and data helpers
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v20 or higher recommended)
- **npm**, **yarn**, or **pnpm**
- A **Firebase** project with **Realtime Database** enabled

### Local Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/releaf.git](https://github.com/your-username/releaf.git)
   cd releaf
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env.local` file in the root directory and add your Firebase Realtime Database credentials:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_DATABASE_URL=[https://your-project-default-rtdb.firebaseio.com](https://your-project-default-rtdb.firebaseio.com)
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

> **💡 Quick Testing Tip for Judges:** Open `http://localhost:3000` in a standard browser window as the **Patient** and in an Incognito/Private window as the **Care Partner**, then link both accounts using the generated `RLF-XXXX` pairing code.

---

## 🔭 What's Next
- **Cloud Database Migration:** Transitioning `.data/` atomic JSON stores to a managed cloud database (PostgreSQL / Firestore) for multi-instance serverless scaling.
- **Wearable & Background Sync:** Expanding background geofencing reliability and offline-first sync on mobile devices.
- **Multi-Caregiver Support:** Allowing multiple family members or professional aides to share Care Partner permissions.

---

## ⚠️ Disclaimer & Data Notes
- **Not Medical Advice:** Releaf is a daily support and caregiver coordination prototype built for educational and hackathon purposes. It is not a medical device or clinical diagnostic tool, and should not replace emergency services.
- **Persistence:** Local `.data/` JSON stores provide zero-dependency persistence for local runs and single-node deployments; for multi-instance serverless hosts, pair with an external database.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
