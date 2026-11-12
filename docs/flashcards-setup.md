# Flashcards: setup

`/flashcards` uses the same Firebase project and sign-in as the games (see [games-setup.md](games-setup.md)).
Each signed-in account gets its own private groups, stored at `users/{uid}/flashcardGroups/{groupId}`, with the
cards inside the group document.

The only extra step is publishing the updated rules:

1. In the Firebase console, open **Firestore Database → Rules**.
2. Replace everything with the contents of [`firestore.rules`](../firestore.rules) and click **Publish**.

Until the rules are published, signed-in accounts get a "Couldn't load your flashcards" message.

## Local testing

`npm run dev:local` (port 3001) keeps flashcards in the browser instead of Firestore. "Continue with Google"
signs in as a fake test account.
