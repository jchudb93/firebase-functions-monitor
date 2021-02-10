const functions = require("firebase-functions");
const firebase = require("firebase-admin");
const axios = require("axios");
const testURLS = require("./test-urls.json");

const config = require('../../firebase-config.json');

firebase.initializeApp({
    credential: firebase.credential.cert(config)
})

const db = firebase.firestore();

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