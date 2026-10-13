# Family Card Games: Firebase setup

The `/games` section stores players and games in Firebase Cloud Firestore on the free Spark plan.
At family scale (a few hundred reads and writes per game night) it stays well under the free limits
of 50,000 reads and 20,000 writes per day, and Spark has no billing, so it can't charge you.

## 1. Create the project

1. Go to <https://console.firebase.google.com> and sign in with your Google account.
2. **Create a project**. Name it `family-card-games` (any name works).
3. Turn **off** Google Analytics. It isn't needed. Then **Create project**.

## 2. Create the database

1. In the left menu, open **Build → Firestore Database** and choose **Create database**.
2. Pick the **Standard** edition if asked, and a location near you (`nam5 (United States)` is fine).
   The location can't be changed later.
3. Choose **Start in production mode** and create it.

## 3. Publish the security rules

1. In Firestore, open the **Rules** tab.
2. Replace everything there with the contents of [`firestore.rules`](../firestore.rules) and click **Publish**.

## 4. Register the web app

1. Go to **Project Overview** (house icon), then click the **Web** button (`</>`) under "Get started by adding Firebase to your app".
2. Nickname it `ajsnow-me-web`. Leave **Firebase Hosting unchecked**, since the site is on GitHub Pages. Click **Register app**.
3. Copy the `firebaseConfig` values it shows (`apiKey`, `authDomain`, `projectId`, `storageBucket`,
   `messagingSenderId`, `appId`) into [`lib/games/firebase-config.ts`](../lib/games/firebase-config.ts).
   These values are public by design, so it's fine to commit them.

## 5. Set the family PIN

1. Run, replacing `1234` with your PIN:

   ```bash
   node scripts/pin-hash.mjs 1234
   ```

   It prints a long document ID and a `familyId`. The PIN itself is never stored anywhere.
2. In Firestore, open the **Data** tab and click **Start collection**.
   - Collection ID: `pins`
   - Document ID: the long ID from the script
   - Add a field `familyId`, type **string**, with the value from the script. Click **Save**.
3. Keep the `familyId` somewhere safe. You'll need it to change the PIN.

## 6. Set the admin PIN

The admin PIN protects deleting games, reopening finished games, editing past rounds, and renaming,
hiding or deleting players. Once entered, it stays unlocked on that device for 10 minutes.

1. Make sure the published rules include the `adminPins` block from [`firestore.rules`](../firestore.rules).
2. Run, replacing `5678` with the admin PIN and `<familyId>` with the family's id from step 5:

   ```bash
   node scripts/pin-hash.mjs --admin 5678 <familyId>
   ```

   If you've lost the familyId, it's the `familyId` field on your document in the `pins` collection.
3. In Firestore → **Data**, create a collection `adminPins` with a document using the printed ID and a
   string field `familyId` with the same value.

To change the admin PIN, add a new `adminPins` document the same way and delete the old one.

The admin PIN only gates actions inside the app. Anyone with the family PIN could still change data
directly with the browser's developer tools, so treat it as a lock against playing around, not a
security boundary.

## 7. Optional sign-in (Google and email)

Family members can sign in instead of using the PIN. The first time, they enter the family PIN once
and pick which player they are; after that, signing in is enough on any device. The PIN keeps working.

1. **Rules:** publish the latest [`firestore.rules`](../firestore.rules), which adds the `members` block.
2. **Turn on Authentication:** Firebase console → **Build → Authentication → Get started**.
3. **Sign-in methods** tab:
   - **Email/Password**: enable the first switch (Email/Password). Leave "Email link" off.
   - **Google**: enable, pick a support email, save.
4. **Settings → Authorized domains**: add `www.ajsnow.me` and `ajsnow.me` (`localhost` is there already).
5. **Google redirect address**, so Google sign-in works on the live site and in the iPhone home-screen
   app: in [Google Cloud console](https://console.cloud.google.com/apis/credentials) for the
   `ajsnow-net` project → **APIs & Services → Credentials** → open the OAuth client named
   "Web client (auto created by Google Service)":
   - **Authorized JavaScript origins**: add `https://www.ajsnow.me`
   - **Authorized redirect URIs**: add `https://www.ajsnow.me/__/auth/handler`
   - Save. It can take a few minutes to take effect.
6. **Optional:** in Google Cloud → **Google Auth Platform → Branding**, set the app name to
   "Family Card Games" so Google's sign-in screen doesn't show the project number. In Firebase →
   **Authentication → Templates**, you can set the sender name for password-reset emails.

The live site serves Firebase's sign-in helper pages itself from `public/__/auth/` (copied from
`https://ajsnow-net.firebaseapp.com/__/auth/`). If Google sign-in ever breaks after a Firebase update,
re-copy `handler`, `handler.js`, `experiments.js`, `iframe` and `iframe.js` from there, saving the two
pages as `handler.html` and `iframe.html`.

## Changing the PIN later

1. Run `node scripts/pin-hash.mjs <new PIN> <familyId>`, with the familyId from step 5.
2. Add the new `pins` document it prints, then delete the old `pins` document.
3. Every device asks for the new PIN on its next visit. All games and players are kept.

## Optional: restrict the API key

In Google Cloud console → **APIs & Services → Credentials**, edit the "Browser key" and add
website restrictions for `https://www.ajsnow.me/*` and `http://localhost:3000/*`. This stops
other websites from using the key, though the security rules are what actually protect the data.

## How secure is the PIN?

Without the PIN, a visitor can't find or change any family data: the rules only allow fetching
`pins/{key}` documents by exact ID, never listing them. But a 4-digit PIN has only 10,000
possibilities, and a static site has no server to limit guesses. Someone determined who reads the
site's code could try them all. That's fine for game scores. Don't store anything sensitive here.

## Local development

`npm run dev` uses a local test mode until `firebase-config.ts` is filled in. Data stays in the
browser, the PIN is `0000`, the admin PIN is `9999`, and "Continue with Google" signs in as a test account. After setup, `npm run dev:local` uses test mode so you can try things without touching real data.
