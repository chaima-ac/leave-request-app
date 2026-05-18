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

export function cognitoLogin(email, password) {
  return new Promise((resolve, reject) => {
    const user    = new CognitoUser({ Username: email, Pool: userPool });
    const details = new AuthenticationDetails({ Username: email, Password: password });

    user.authenticateUser(details, {
      onSuccess: (result) => {
        resolve({
          idToken:  result.getIdToken().getJwtToken(),
          payload:  result.getIdToken().payload,
        });
      },
      onFailure: (err) => reject(err),
      newPasswordRequired: () =>
        reject(new Error('Password change required. Contact your administrator.')),
    });
  });
}

export function cognitoLogout() {
  const user = userPool.getCurrentUser();
  if (user) user.signOut();
}