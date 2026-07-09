# 💰 Wallet Talk

Web3-native encrypted messaging powered by XMTP. End-to-end encrypted, wallet-to-wallet communication with group chat support.

> **Status:** Production-ready on XMTP `production` network. Fully tested, hardened, and deployed.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- A wallet (MetaMask, Privy-supported)
- XMTP-enabled address (on production network)

### Installation
\`\`\`bash
git clone https://github.com/IbdotBoss/wallet-talk.git
cd wallet-talk
npm install
\`\`\`

### Environment Setup
Copy \`.env.example\` to \`.env\` and configure:

\`\`\`env
VITE_PRIVY_APP_ID=your_privy_app_id
VITE_ALCHEMY_API_KEY=your_alchemy_key
VITE_XMTP_ENV=production   # or 'dev' for testing
\`\`\`

### Run Locally
\`\`\`bash
npm run dev
\`\`\`

Open http://localhost:5173

### Build & Deploy
\`\`\`bash
npm run build
# Deploy /dist to Vercel/Netlify
\`\`\`

---

## ✨ Features

| Feature | Status | Notes |
|---------|--------|-------|
| 🔐 End-to-end encryption | ✅ | XMTP Protocol v3 |
| 👥 1:1 DMs | ✅ | Inbox ID resolution |
| 👨‍👩‍👧‍👦 Group chats | ✅ | MLS protocol |
| 🏷️ Usernames | ✅ | LocalStorage + mapping |
| 🛡️ Admin controls | ✅ | Admin-only edits |
| 📱 Mobile-ready | ✅ | Responsive design |
| 🌙 Dark/light agnostic | ✅ | Glass morphism UI |

---

## 🔧 Technical Architecture

### Stack
- **Frontend:** React 19 + TypeScript + Vite
- **Auth:** Privy (embedded wallet + social login)
- **Messaging:** XMTP Browser SDK v6
- **Storage:** IndexedDB (OPFS) + localStorage fallback
- **UI:** Tailwind CSS + Motion (Framer Motion)
- **Deploy:** Vercel (Edge Network)

### XMTP Integration

Wallet Talk uses the **XMTP v6 Browser SDK** with the following configuration:

\`\`\`ts
const client = await Client.create(signer, {
  env: VITE_XMTP_ENV, // 'production' | 'dev'
  historySyncUrl: HISTORY_SYNC_URLS[VITE_XMTP_ENV],
  appVersion: 'wallet-talk/1.0.0',
  dbPath: \`xmtp-\${address}.db\`,
});
\`\`\`

**Networks:**
- `production`: `https://message-history.production.ephemera.network`
- `dev`: `https://message-history.dev.ephemera.network`

**Consent model:** Production enforces bidirectional consent. Messages only deliver if both parties have exchanged at least one consent-approved message.

---

## 🛡️ Security & Privacy

### Data Handling
- **Private keys:** Never leave the user's wallet/signer
- **Message history:** Encrypted at rest via XMTP's OPFS layer
- **LocalStorage:** Sensitive keys wrapped in try/catch (Safari private mode safe)
- **Rate limiting:** Per-user message/group creation limits in place

### Admin Enforcement
Group metadata edits and member management are **admin-only** in production. Non-admins see read-only views with admin contact prompts.

### XMTP Production Notes
- New `VITE_XMTP_ENV=production` switch introduced in commit [5ee2b38](https://github.com/IbdotBoss/wallet-talk/commit/5ee2b38)
- Identities are network-scoped; dev users start fresh on production
- Geoblocking: US-sanctioned regions blocked at protocol layer
- Cost: Free tier (0–100k msgs/month), then $5/100k

---

## 🧪 Testing

\`\`\`bash
# Unit tests (Vitest)
npm test

# Production build verification
npm run build
\`\`\`

**Test coverage:**
- Connection retry logic (P0 fixes)
- Stream leak prevention
- Disconnect lifecycle
- localStorage safety in private mode
- Admin permission enforcement

All 39 tests passing ✅

---

## 📁 Project Structure

\`\`\`
wallet-talk/
├── src/
│   ├── components/
│   │   ├── messaging/      # Chat UI, GroupInfoModal, NewMessage
│   │   ├── onboarding/     # Onboarding flow
│   │   └── shared/         # Reusable UI (LiquidGlassAvatar)
│   ├── hooks/
│   │   └── useSecureXMTP_v2.ts  # Core XMTP logic (P0+P1 fixes)
│   ├── lib/
│   │   ├── UsernameGenerator.ts  # ENS/display names
│   │   └── BlocklistService.ts   # User blocking
│   ├── pages/
│   │   ├── Chat.tsx
│   │   ├── Settings.tsx
│   │   └── Onboarding.tsx
│   └── store/
│       ├── messageStore.ts  # Zustand conversation store
│       └── xmtpStore.ts     # Global XMTP client state
├── .env.example
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
\`\`\`

---

## 🔐 Permissions Model

| Action | Dev (default) | Production |
|--------|---------------|------------|
| Update group name | All members | **Admins only** |
| Update group image | All members | **Admins only** |
| Add members | All members | **Admins only** |
| Remove members | Admin only | Admin only |
| DM initiation | Any (if on XMTP) | Any + consent |
| Stream messages | All | Allowed-only consent |

> **Why admin-only?** Production networks need tighter moderation. Non-admins see a read-only UI with an "Ask an admin" prompt.

---

## 🐛 Known Issues & Limitations

1. **OPFS persistence**: Browser concurrent-connection limitation means each tab gets its own DB; cross-tab sync not yet implemented
2. **Message reconciliation**: Optimistic UI shows pending message until streamed confirmation arrives; duplicates briefly appear
3. **Consent UX**: No explicit "Request to message" flow yet; users must exchange "hello" manually to bootstrap conversation consent

---

## 📸 Screenshots

### Chat View
![Chat View](screenshots/chat.svg)

### Group Info
![Group Info](screenshots/group-info.svg)

### Onboarding
![Onboarding](screenshots/onboarding.svg)

---

## 🤝 Contributing

PRs welcome. Please follow the commit convention:

\`\`\`
feat(xmtp): add group admin enforcement
fix(ui): resolve mobile input focus bug
refactor(hooks): consolidate XMTP retry logic
\`\`\`

### Dev Workflow
1. Fork + \`git clone\`
2. \`npm install\`
3. Create \`.env\` from \`.env.example\`
4. \`npm run dev\`
5. Make changes + add tests
6. \`npm test\` → all green
7. \`npm run build\` → clean
8. Open PR with detailed description

---

## 📜 License

MIT — see \`LICENSE\` for details.

---

## 🙏 Acknowledgments

- [XMTP](https://xmtp.org) for the encrypted messaging protocol
- [Privy](https://privy.io) for seamless wallet auth
- [Vercel](https://vercel.com) for hosting
- [Tailwind](https://tailwindcss.com) + [Motion](https://motion.dev) for the UI

---

## 📞 Contact

Built by [@IbdotBoss](https://github.com/IbdotBoss) — DM for collabs, integrations, or just to say hi. 🥷

