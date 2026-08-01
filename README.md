# BillBox

BillBox is a React Native app that turns your Gmail inbox into an automatic expense tracker. It signs in with Google, reads order/payment emails (Swiggy, Zomato, bank alerts, and other platforms), and uses an LLM (via [Replicate](https://replicate.com)) to parse unstructured email content into structured order and transaction data — no manual entry required.

## Features

- **Google Sign-In & Gmail integration** — connects to one or more Gmail accounts to fetch relevant emails.
- **AI-assisted email parsing** — cleans HTML email bodies and extracts order/refund/payment details using an LLM, with a regex-based parser as fallback.
- **Multi-platform support** — built-in handling for food delivery platforms (Swiggy, Zomato) and bank transaction emails.
- **Expense insights** — order timelines, restaurant/food breakdowns, meal-timing analysis, and top-favorites summaries.
- **Multi-account support** — switch between multiple connected Gmail accounts.
- **Push notifications** — via Firebase Cloud Messaging.

## Tech Stack

- [React Native](https://reactnative.dev)
- [React Navigation](https://reactnavigation.org) (drawer, bottom tabs, native stack)
- [Firebase](https://rnfirebase.io) (Cloud Messaging)
- [Google Sign-In](https://github.com/react-native-google-signin/google-signin)
- [Replicate](https://replicate.com) (LLM inference for email parsing)

## Getting Started

> **Note**: Make sure you have completed the React Native [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

### 1. Install dependencies

```sh
npm install
# or
yarn install
```

### 2. Configure environment variables

Copy the example env file and fill in your own credentials (Google OAuth client ID, Replicate API token, etc.):

```sh
cp .env.example .env
```

None of these values are committed to the repo — see [`src/config/env.js`](src/config/env.js) for what's read at runtime.

### 3. Start Metro

```sh
npm start
```

### 4. Run the app

**Android**

```sh
npm run android
```

**iOS**

```sh
bundle install          # first time only
bundle exec pod install # whenever native deps change
npm run ios
```

## Project Structure

```
src/
  screens/     # App screens (accounts, orders, transactions, settings, ...)
  components/  # Reusable UI components
  services/    # Gmail/Auth/Account/Storage integrations
  utils/       # Email parsing (AI-assisted + regex fallback)
  context/     # React context providers
  navigation/  # React Navigation setup
  constants/   # Static data (banks, platforms, colors)
  config/      # Environment/config accessors
```

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for how to get set up and submit a pull request.

## License

[MIT](LICENSE)
