# Phase 2: Google sign-in and cloud sync setup

## What is ready

The app now has a Firebase integration point for Google sign-in and a private Firestore layout for each account. Local workout logging remains available. The app does not upload your training data until you sign in and choose **Enable cloud sync**.

Firebase setup is not complete yet, so the Google button is not active in this copy. No Google account credentials or workout data have been sent to Firebase.

For this development stage, the Firebase SDK is loaded from Google's CDN only when the account feature is used. Google recommends bundling the SDK for a production web app, so that will be part of launch preparation.

## What I need you to decide first

### 1. Where should workout data be stored?

Tell me the country where you expect the first users to be. If that is India, my recommendation is the Mumbai region. Firebase asks for a Firestore location when the database is created, and Google says that location cannot be changed afterward. Please do not create the database until we agree on the location.

### 2. Which website address will the app use?

For development, `localhost` is enough. If you already own a website address for the app, tell me what it is. If not, say “localhost for now”; we can add a public address before launch.

## What you will do in your Google account

You keep ownership of the project and sign in yourself. **Do not send me your Google password, verification code, service-account file, or private key.** I do not need access to your Google account.

After we agree on the database location:

1. Open the [Firebase Console](https://console.firebase.google.com/) and create a project named **FORM Training**. You can leave Google Analytics off for now.
2. In the project overview, add a **Web app** and give it the nickname **FORM Training**.
3. In **Authentication → Sign-in method**, enable **Google** and choose your own support email when Firebase asks.
4. In **Authentication → Settings → Authorized domains**, add `localhost` for development if it is not already listed. New Firebase projects may not include it automatically. We will add your public website address later, if you have one.
5. Create a **Cloud Firestore** database in the location we agreed on. Choose **production mode**, not test mode.
6. In Firestore’s **Rules** tab, paste the rules from [firestore.rules](./firestore.rules) and publish them. They allow each signed-in person to access only their own account data.
7. From **Project settings → Your apps → Firebase SDK snippet**, copy the small object named `firebaseConfig` and paste it here. You do not need to edit it; I’ll put it in the right place. The app uses `apiKey`, `authDomain`, `projectId`, and `appId`.

The Firebase web configuration is designed to be used by a web app. It is not your Google password or a private server key. I will put those four values in `firebase-config.js`. Do not add billing details or upgrade the project plan for this prototype unless we review the cost first.

## What the app will do after configuration

1. **Continue with Google** signs you in. Signing in alone does not upload your workouts.
2. You choose **Enable cloud sync**. The app explains what will be uploaded before it sends your profile, plan, completed sessions, and active workout to your Firebase project.
3. After that, changes are saved locally first and synced when the device is online. If the device is offline, the app keeps working and retries when the connection returns.

If both this device and your account already contain data, the app asks which plan to keep and combines their completed workout histories. Local logging remains available if you sign out.

## Reply with these details

1. **First-user country:** (for example, India; I recommend Mumbai if the first users are there.)
2. **App website:** your existing domain, or “localhost for now.”
3. **Firebase project:** “I’ll create it” or “I already have one.”

Once the location is agreed, I’ll guide you through the exact console screens and then connect the project values you provide. I will not ask for your Google password or use your account on your behalf.

Before inviting the public, we will also need a permanent app website, a privacy page, and an account-deletion flow. Those are not required to try the development sign-in flow.
