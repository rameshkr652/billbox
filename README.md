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

Copy the example env file:

```sh
cp .env.example .env
```

Then fill in `GOOGLE_WEB_CLIENT_ID` and `REPLICATE_API_TOKEN` — see below for how to get each. None of these values are committed to the repo; see [`src/config/env.js`](src/config/env.js) for what's read at runtime.

### 3. Get Google / Gmail API access

BillBox reads email via the Gmail API using OAuth (`https://www.googleapis.com/auth/gmail.readonly` scope, read-only). To run the app you need your own Google Cloud project and OAuth credentials — the ones in this repo's `google-services.json` only work for the original maintainer's builds.

1. **Create a Google Cloud project**
   Go to [Google Cloud Console → New Project](https://console.cloud.google.com/projectcreate) and create one (or reuse an existing one).

2. **Enable the Gmail API**
   Go to [APIs & Services → Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com) for your project and click **Enable**.

3. **Configure the OAuth consent screen** (now called "Google Auth Platform" in the Cloud Console)
   Go to [Google Auth Platform overview](https://console.cloud.google.com/auth/overview) and set it up:
   - User type: **External** (unless you have a Google Workspace org).
   - Under [Data Access](https://console.cloud.google.com/auth/scopes), add the scope `.../auth/gmail.readonly`.
   - Under [Audience](https://console.cloud.google.com/auth/audience), add your own Google account as a **test user** — while the app is in "Testing" mode only test users can sign in. `gmail.readonly` is a Google-restricted scope, so moving to production/verified status requires a [CASA security assessment](https://support.google.com/cloud/answer/13469185) — not needed for local development.

4. **Create OAuth client IDs**
   Go to [Credentials → Create Credentials → OAuth client ID](https://console.cloud.google.com/apis/credentials) and create:
   - **Web application** — this is the client ID you put in `.env` as `GOOGLE_WEB_CLIENT_ID`. It's required even for the Android/iOS app because `@react-native-google-signin/google-signin` uses it as the `webClientId` to obtain a server auth code / offline (refresh) access.
   - **Android** — application ID `com.binatrix.billbox` (see `android/app/build.gradle`), plus the SHA-1 certificate fingerprint of the keystore you're building with:
     ```sh
     # Debug keystore (default, used by `npm run android`)
     keytool -list -v -keystore android/app/debug.keystore -alias androiddebugkey -storepass android -keypass android

     # Release keystore
     keytool -list -v -keystore android/app/release.keystore -alias my-key-alias
     ```
   - **iOS** — bundle ID from `ios/BillBox.xcodeproj` (check your Xcode target's Bundle Identifier).

5. **Firebase (for the Android/iOS Google Sign-In config + push notifications)**
   This project also uses Firebase (`@react-native-firebase`). Create/link a [Firebase project](https://console.firebase.google.com) on top of the same Google Cloud project, register your Android app with the SHA-1 from step 4, and download your own `google-services.json` (Android) / `GoogleService-Info.plist` (iOS) to replace the ones in `android/app/` and `ios/`.

### 4. Get a Replicate API token

BillBox uses an LLM hosted on [Replicate](https://replicate.com) to parse email content. Sign up, then generate a token at [replicate.com/account/api-tokens](https://replicate.com/account/api-tokens) and set it as `REPLICATE_API_TOKEN` in `.env`.

### 5. Start Metro

```sh
npm start
```

### 6. Run the app

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
