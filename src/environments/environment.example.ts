// Copia este archivo como environment.ts y rellena tus credenciales de Firebase.
// NUNCA commitees environment.ts con credenciales reales.
export const environment = {
  production: false,
  stripePk: 'pk_test_YOUR_PUBLIC_KEY',
  firebase: {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT_ID.firebasestorage.app',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    appId: 'YOUR_APP_ID'
  }
};
