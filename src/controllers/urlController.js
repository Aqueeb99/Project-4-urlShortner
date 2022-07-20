const shortId = require('shortid')
const urlModel = require("../models/urlModel")
const redis = require("redis");

const { promisify } = require("util");

// Connect to redis
const redisClient = redis.createClient(
  13190,
  "redis-13190.c301.ap-south-1-1.ec2.cloud.redislabs.com",
  { no_ready_check: true };;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;/
);
redisClient.auth("gkiOIPkytPI3ADi14jHMSWkZEo2J5TDG", function (err) {
  if (err) throw err;
});

redisClient.on("connect", async function () {
  console.log("Connected to Redis..");
});
const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient)

const shortenUrl = async function (req, res) {
    try {
        const longUrl = req.body.longUrl

        if (!longUrl)
            return res.status(400).send({ status: false, message: "please enter longUrl" })

        const regUrl = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/

        if (!regUrl.test(longUrl))
            return res.status(400).send({ status: false, message: "please enter valid longUrl" })

        const findUrl = await urlModel.findOne({ longUrl: longUrl }).select({ _id: 0, urlCode: 1, longUrl: 1, shortUrl: 1 })             // no need 
        if (findUrl)
            return res.status(200).send({ status: true, message: "short url is already generated", data: findUrl })

        let urlCode = shortId.generate(longUrl)
        let shortUrl = `localhost:3000/${urlCode}`
        let urlObj = {
            "urlCode": urlCode,
            "longUrl": longUrl,
            "shortUrl": shortUrl
        }

        let createUrl = await urlModel.create(urlObj)

        return res.status(201).send({ status: true, data: { urlCode: createUrl.urlCode, longUrl: createUrl.longUrl, shortUrl: createUrl.shortUrl } })
    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}

const getLongUrl = async function (req, res) {
    try {
        let urlCode = req.params.urlCode
        if (!shortId.isValid(urlCode))
            return res.status(400).send({ status: false, message: "urlCode is invalid" }) 

        let cahcedLongUrl = await GET_ASYNC(`${urlCode}`)
  if(cahcedLongUrl) {
    res.send(cahcedLongUrl.longUrl)
  } else {
    let findLongUrl = await urlModel.findOne({ urlCode: urlCode }).select({ longUrl: 1, _id: 0 })
    if (!findLongUrl)
            return res.status(404).send({ status: false, message: "url not found for the given url code" })
    await SET_ASYNC(`${urlCode}`, JSON.stringify(findLongUrl.longUrl))
    return res.status(302).redirect(findLongUrl.longUrl);
  } 
}
catch (err) {
    return res.status(500).send({ status: false, message: err.message })
  }
}

//         if (!shortId.isValid(urlCode))
//             return res.status(400).send({ status: false, message: "urlCode is invalid" })   //not working

//         const findLongUrl = await urlModel.findOne({ urlCode: urlCode }).select({ longUrl: 1, _id: 0 })

//         if (!findLongUrl)
//             return res.status(404).send({ status: false, message: "url not found for the given url code" })

//         return res.status(302).redirect(findLongUrl.longUrl);
//     } catch (err) {
//         return res.status(500).send({ status: false, message: err.message })
//     }
// }

module.exports = { shortenUrl, getLongUrl }