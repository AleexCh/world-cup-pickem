/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });


const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
admin.initializeApp();

// Importing your shared pure logic
const { scoreUserPredictions } = require("./shared/scoringEngine");
const { calculateStandings } = require("./shared/tournamentLogic");

// Assuming you keep your schedule and teams in a 'config' collection or as JSON files
// If using JSON files, place them in functions/data/ and require them:
const teams = require("./data/teams.json");
const schedule = require("./data/schedule.json");



exports.updateUserPoints = onDocumentUpdated("actualResults/matchResults", async (event) => {
    // 1. Guard Clause: Check if data actually changed
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    const beforeMatchPicks = beforeData.matchPicks;
    const afterMatchPicks = afterData.matchPicks;
    

    // Use JSON.stringify on the correct field
    if (JSON.stringify(beforeMatchPicks) === JSON.stringify(afterMatchPicks)) {
        console.log("No matchPicks updates detected, exiting.");
        return null;
    }

    console.log("MatchPicks changed! Starting point calculation...");

    // Explicitly define the object structure the engine expects
    const actualResults = {
        matchPicks: afterData.matchPicks || {},
        knockoutPicks: afterData.knockoutPicks || {}
    };
    
    const db = admin.firestore();

    // 2. Fetch all users
    const predictionsSnapshot = await db.collection("predictions").get();
    const batch = db.batch();

    // 3. Loop through users and calculate points
    for (const predictionDoc of predictionsSnapshot.docs) {
        const predictionData = predictionDoc.data();
        const userPicks = {
            matchPicks: predictionData.matchPicks || {},
            knockoutPicks: predictionData.knockoutPicks || {}
        };
        
        const totalPoints = scoreUserPredictions(
            userPicks, 
            actualResults, 
            schedule, 
            teams, 
            calculateStandings 
        );
        const userId = predictionDoc.id; 

        // Now you can use this userId to target the 'users' collection
        const userRef = admin.firestore().collection('users').doc(userId);

        // Only update if points have actually changed to save database writes
        batch.update(userRef, { 
            totalPoints: totalPoints,
            scoreUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }

    // 4. Atomic update
    return batch.commit();
});