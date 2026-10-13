// Firebase web config. These values identify the project and are safe to publish;
// access is controlled by firestore.rules and the family PIN.
export const firebaseConfig = {
  apiKey: 'AIzaSyBHw2HXT2L9Q0w4N8xdLrLNi1PXEdJGDKE',
  // On the live site, sign-in runs through helper pages hosted on ajsnow.me itself (public/__/auth), so
  // Google sign-in also works in the iPhone home-screen app and with Safari's tracking protection.
  authDomain:
    typeof window !== 'undefined' && window.location.hostname.endsWith('ajsnow.me')
      ? window.location.host
      : 'ajsnow-net.firebaseapp.com',
  projectId: 'ajsnow-net',
  storageBucket: 'ajsnow-net.firebasestorage.app',
  messagingSenderId: '378960516189',
  appId: '1:378960516189:web:c66e3f2a9909df9821a9b4',
};
