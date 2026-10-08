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
browser and the PIN is `0000`. After setup, `npm run dev:local` uses test mode so you can try things without touching real data.
