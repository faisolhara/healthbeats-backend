const MongoClient = require('mongodb').MongoClient
const MONGO_URL = 'mongodb://localhost:27017/node_test'
let node_test


module.exports  = function (app) {
    MongoClient.connect(MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    })
    .then((connect) => {
        const db = connect.db('node_test')
        app.user = db.collection('user')
        // console.log("connected")
    })
    .catch((err) => console.error(err))
}

// function connect(callback) {
//     MongoClient.connect(MONGO_URL, {useNewUrlParser: true,useUnifiedTopology: true} , (err) => {
//         node_test = db
//         callback()
//     })
// }

// function get() {
//     return node_test
// }

// function close() {
//     node_test.close()
// }

// module.exports  =  {
//     connect,
//     get,
//     close
// }