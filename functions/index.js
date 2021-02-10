const functions = require("firebase-functions");
const firebase = require("firebase-admin");
const axios = require("axios");
const testURLS = require("./test-urls.json");

// connect to Firebase
firebase.initializeApp(functions.config().firebase);

const db = firebase.firestore();

// Monitor function

exports.monitorFunction = functions.pubsub.schedule('0 */2 * * *').onRun((context) => {

    const instance = axios.create()

    const collectionRef = db.collection('api-monitor')

    instance.interceptors.request.use((config) => {
        config.headers['request-startTime'] = process.hrtime()
        return config
    })

    instance.interceptors.response.use((response) => {
        const start = response.config.headers['request-startTime']
        const end = process.hrtime(start)
        const milliseconds = Math.round((end[0] * 1000) + (end[1] / 1000000))
        response.headers['request-duration'] = milliseconds
        return response
    })

    testURLS.forEach((item) => {
        const req = {
            method: item.method,
            url: item.url,
            params: item.params,
            body: item.body
        }

        Object.freeze(req)

        instance.request(
            req
        ).then((response) => {
            const data = {
                name: item.name,
                baseURL: item.url,
                responseTime: response.headers["request-duration"],
                timeUnit: "milliseconds"
            }
            collectionRef.add(data)
        }).catch(err => console.warn(err))
    })

    return context

});

// Example functions

exports.getCityInCountry = functions.https.onRequest(async (req, res) => {

    const collectionRef = db.collection('cities')
    const snapshot = await collectionRef
        .where('country', '==', req.query.country)
        .get()
    res.status(200).send({
        "query": req.query.country,
        "data": snapshot.docs.map(doc => doc.data())
    })
})

exports.listCities = functions.https.onRequest(async (req, res) => {
    const collectionRef = db.collection('cities')
    const snapshot = await collectionRef
        .limit(10)
        .get()
    res.status(200).send({
        "data": snapshot.docs.map(doc => doc.data())
    })
})

exports.getInsuranceRisk= functions.https.onRequest(async (req, res) => {

    const snapshot = await db.collection('insurance-risk')
        .where("Id", "==", parseInt(req.query.Id))
        .limit(1)
        .get()
    res.status(200).send({
        "Id": req.query.Id,
        "data": snapshot.docs.map(doc => doc.data())
    })

})
