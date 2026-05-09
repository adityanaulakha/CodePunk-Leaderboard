# LeadX v2.0 // The Premium Scoring Protocol

[![Vercel Deployment](https://img.shields.io/badge/Deploy-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)
[![React](https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react)](https://react.dev)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange?style=for-the-badge&logo=firebase)](https://firebase.google.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)

LeadX is a high-performance, real-time leaderboard and event management ecosystem designed for elite hackathons, coding competitions, and corporate innovation challenges. Built with a **Neo-Brutalist** aesthetic, it combines raw efficiency with a premium user experience.

## ⚡ Core Features

### 1. Public-Facing Leaderboard
- **Real-Time Sync**: Scores update across all clients in ~40ms using Firebase Firestore subscriptions.
- **Dense Ranking**: Transparent rank calculation (e.g., #1, #2, #2, #3) computed client-side.
- **Track Isolation**: Seamlessly switch between multiple tracks (Software, Hardware, Web3, etc.) on a single board.
- **Suspense Mode (Freeze)**: Organizers can freeze the board during final evaluations to build hype for the closing ceremony.
- **Celebration Engine**: Trigger synchronized confetti explosions across all public screens for the winner reveal.

### 2. Evaluator (Judge) Portal
- **Whitelisted Access**: Secure login for authorized evaluators via UID verification.
- **Rubric-Based Scoring**: Judges grade teams based on dynamic criteria (e.g., Technical Complexity, UI/UX, Innovation) defined by organizers.
- **Live Status Tracking**: Real-time feedback on which teams are pending evaluation vs. completed.
- **Round Locking**: Prevents accidental score modifications once a judging round is finalized.

### 3. Organizer (Admin) Panel
- **Track & Round Management**: Create, rename, delete, and reorder tracks and scoring rounds on the fly.
- **Bonus System**: Inject custom bonus points (e.g., "Best Pitch", "Social Media King") directly into team totals.
- **Detailed Score Viewer**: Expandable audit logs to view individual judge scores and parameter breakdowns.
- **Bulk Operations**: 
  - CSV Import for rapid team hydration.
  - Automatic CSV Backups when deleting tracks.
  - Mass Reset functions for rounds and bonuses.
- **Global Event Controls**: One-click Leaderboard Freeze and Celebration triggers.

---

## 🛠 Technology Stack

- **Frontend**: React 19 + Vite (Fast Refresh & Optimized Builds)
- **Styling**: Tailwind CSS v4 (Neo-Brutalist Design System)
- **Animations**: Framer Motion (Micro-interactions & Smooth Transitions)
- **Backend**: Firebase Firestore (Realtime NoSQL)
- **Authentication**: Firebase Auth (Secure Judge & Admin Login)
- **Charts/UI**: Lucide React Icons, React-Confetti, PapaParse (CSV)

---

## 📐 Architecture

### Database Schema (Firestore)

#### `/hackathons/{hackathonId}`
The root configuration document for an event.
```typescript
{
  ownerId: string;
  tracks: Array<{ id: string, name: string }>;
  roundsByTrack: Record<string, string[]>;
  bonusesByTrack: Record<string, string[]>;
  isFrozen: boolean;
  celebrationAt: Timestamp;
}
```

#### `/hackathons/{hackathonId}/teams/{teamId}`
Individual team records with nested scores.
```typescript
{
  name: string;
  track: string;
  scores: {
    [roundName]: {
      [judgeUid]: {
        total: number,
        parameters: Record<string, number>
      }
    }
  };
  bonuses: Record<string, number>;
  total: number; // Computed aggregate
}
```

#### `/hackathons/{hackathonId}/judges/{uid}`
Whitelist for authorized evaluators.
```typescript
{
  name: string;
  isActive: boolean;
  assignedTrack: string;
}
```

---

## 🚀 Setup & Local Development

### 1. Prerequisites
- Node.js (v18+)
- A Firebase Project with Firestore and Auth (Email/Password) enabled.

### 2. Installation
```bash
git clone https://github.com/adityanaulakha/CodePunk-Leaderboard.git
cd Leaderboard
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:
```env
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
```

### 4. Firestore Rules
Deploy the following rules to your Firebase console to secure the data:
*(See `firestore.rules` file in the root directory)*

### 5. Start Development
```bash
npm run dev
```

---

## 📖 Usage Guide: CSV Imports

To bulk import teams, use the **Manage Teams** tab in the Admin Panel. 

| Header | Description |
| :--- | :--- |
| `name` | (Required) The team name. |
| `track` | (Optional) Maps to existing track IDs. Defaults to the first track. |
| `[Round Name]` | If the header matches an active round, the value is imported as a score. |

---

## 🎨 Design Philosophy: Neo-Brutalism

LeadX follows a strict **Neo-Brutalist** design system:
- **High Contrast**: Deep blacks (`#111`) on vibrant backgrounds.
- **Bold Borders**: 4px to 8px solid borders on interactive elements.
- **Brutal Shadows**: Solid, non-blurred offsets (`shadow-brutal`).
- **Typography**: Heavy, uppercase headers with wide tracking for a "system-level" feel.

## 🛡 Security & Production Hardening

LeadX is fully hardened against web vulnerabilities and abuse:
- **XSS & Code Injection Prevention**: High-performance regex filters sanitize all user inputs (including manual team names, judge registries, track additions, and PapaParse CSV imports), stripping any malicious HTML/JS payloads.
- **Click Throttling & Double-Submission Prevention**: All critical write buttons are instantly locked under a strict `busy` state upon submission, protecting the database from accidental or malicious rapid-fire click spams.
- **Secure Serverless Architecture**: Client-side API keys act as simple project routing identifiers; access is secured purely at the database level using strict [firestore.rules](file:///d:/NEW%20LEARNING/Web%20Dev/Leaderboard/firestore.rules).

---

## 📊 Scale & Event Capacity (Firebase Free/Spark Tier)

Because LeadX is built on serverless **Google Cloud Firestore**, it has no physical backend server bottlenecks and scales dynamically. Below are the precise mathematical capacities when running on the **Firebase Spark (Free) Plan**:

### ⚡ Free Tier Quota Limits
* **Firestore Simulataneous Connections**: 100 concurrent open tabs
* **Firestore Daily Reads**: 50,000 reads per day
* **Firestore Daily Writes**: 20,000 writes per day
* **Firestore Storage**: 1 GiB total storage (~hundreds of thousands of records)

---

### 🏆 Operational Scenarios on the Free Tier

#### Scenario A: One Single Large Event (Maximum Allocation)
If you dedicate the entire free tier to **one massive hackathon**:
* **Max Teams**: **150 teams**
* **Max Active Judges**: **15 judges** scoring concurrently
* **Max Spectators**: **80 spectators** viewing live-ranked boards at any single moment
* **Write Usage**: 150 teams × 3 rounds × 15 judges = 6,750 writes (**33%** of your daily free writes limit).
* **Connection Usage**: 1 admin + 15 judges + 80 spectators = **96 concurrent connections** (fits inside the 100 connection cap).

#### Scenario B: Multiple Parallel Events (Balanced Multi-Tenancy)
If you run **multiple concurrent events** simultaneously in the same database:
* **Max Parallel Events**: **3 to 5 separate events** running at the same time
* **Max Teams per Event**: **30 to 50 teams** per event
* **Max Judges per Event**: **3 to 5 judges** per event
* **Max Spectators per Event**: **10 to 15 spectators** viewing each board at any single moment
* **Write Usage**: 5 events × 40 teams × 3 rounds × 4 judges = 2,400 writes (**12%** of your daily free writes limit).
* **Connection Usage**: 5 events × (1 admin + 4 judges + 15 spectators) = **100 concurrent connections** (fits exactly inside the 100 connection cap).

---

Built with ⚡ by [Aditya Naulakha](https://github.com/adityanaulakha)
