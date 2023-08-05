const express = require("express")
const app = express()
const dotenv = require("dotenv")
const cookieParser = require('cookie-parser')
const port = process.env.PORT || 5000
dotenv.config({ path : './config.env'})
require("./db/conn")

require("./router/auth")
app.use(express.json())

app.use(require('./router/auth'))

app.use(cookieParser())



if(process.env.NODE_ENV =="production"){
    app.use(express.static("client/build"))
}

app.listen(port, () => {
    console.log(`connected to successfull to port ${port}`)
})