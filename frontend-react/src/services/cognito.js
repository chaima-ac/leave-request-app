import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from 'amazon-cognito-identity-js';

const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  ClientId:   import.meta.env.VITE_COGNITO_CLIENT_ID,
};

const userPool = new CognitoUserPool(poolData);

// ── Login ──────────────────────────────────────────────────────────────────
export function cognitoLogin(email, password) {
  return new Promise((resolve, reject) => {
    const user    = new CognitoUser({ Username: email, Pool: userPool });
    const details = new AuthenticationDetails({ Username: email, Password: password });

    user.authenticateUser(details, {
      onSuccess: (result) => {
        resolve({
          idToken: result.getIdToken().getJwtToken(),
          payload: result.getIdToken().payload,
        });
      },
      onFailure: (err) => reject(err),
      newPasswordRequired: () =>
        reject(new Error('Password change required. Contact your administrator.')),
    });
  });
}

// ── Logout ─────────────────────────────────────────────────────────────────
export function cognitoLogout() {
  const user = userPool.getCurrentUser();
  if (user) user.signOut();
}

// ── Get current valid idToken (used by api.js interceptor) ─────────────────
// Returns the idToken string if the session is valid, or null.
// Hard timeout of 3 s — if the Cognito SDK network call stalls, resolve null
// so the caller can fall back to the localStorage token instead of hanging.
export function cognitoGetCurrentToken() {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 8000); // 8 s — AWS Academy Cognito can be slow

    const user = userPool.getCurrentUser();
    if (!user) { clearTimeout(timer); return resolve(null); }

    user.getSession((err, session) => {
      clearTimeout(timer);
      if (err || !session || !session.isValid()) return resolve(null);
      resolve(session.getIdToken().getJwtToken());
    });
  });
}

// ── Silent refresh (used by api.js response interceptor on 401) ────────────
// Forces a token refresh via the stored refresh token. Returns the new idToken.
export function cognitoRefreshSession() {
  return new Promise((resolve, reject) => {
    const user = userPool.getCurrentUser();
    if (!user) return reject(new Error('No current user'));

    user.getSession((err, session) => {
      if (err || !session) return reject(err || new Error('No session'));

      const refreshToken = session.getRefreshToken();
      user.refreshSession(refreshToken, (refreshErr, newSession) => {
        if (refreshErr || !newSession) return reject(refreshErr || new Error('Refresh failed'));
        resolve(newSession.getIdToken().getJwtToken());
      });
    });
  });
}