const express = require("express")
const router = express.Router()
const bcrypt = require("bcryptjs")
const jwt = require("../middleware/authenticate")
require('../db/conn')
const cookieParser = require("cookie-parser")
router.use(cookieParser())

const User = require("../models/schema")



// using promises
// router.post('/register', (req,res) =>{
// const { name, email, phone, work, password, cpassword } = req.body

// if (!name || !email || !phone || !work || !password || !cpassword){
//     return res.status(422).json({ error: "plz filled the field properly"})
// }

// User.findOne({ email : email})
//     .then((userExist) => {
//         if(userExist){
//             return res.status(422).json({error: "Email already Exist"})
//         }

//         const user = new User({name, email, phone, work, password, cpassword})
//         user.save().then(() =>{
//             res.status(201).json({ message: "user registered successfully"})
//         }).catch((err) => res.status(500).json({error: "failed to registered"}))
//     }).catch(err => { console.log(err)})

// })



// async await
router.post('/signup', async (req, res) => {
    const { name, email, phone, work, password, cpassword } = req.body

    if (!name || !email || !phone || !work || !password || !cpassword) {
        return res.status(422).json({ error: "plz filled the field properly" })
    }

    try {
        const userExist = await User.findOne({ email: email })

        if (userExist) {
            return res.status(422).json({ error: "Email already Exist" })
        }
        else if (password != cpassword) {
            return res.status(422).json({ error: "password are not matching" })
        }
        else {

            const user = new User({ name, email, phone, work, password, cpassword })

            await user.save()
            res.status(201).json({ message: "user registered successfully" })
        }

    } catch (error) {
        console.log(error)
    }
})

// log route

router.post('/login', async (req, res) => {

    try {
        let token
        const { email, password } = req.body

        if (!email || !password) {
            return res.status(400).json({ error: "plz filled the data" })
        }

        const userLogin = await User.findOne({ email: email })
        // console.log(userLogin)


        if (userLogin) {
            const isMatch = await bcrypt.compare(password, userLogin.password)

            token = await userLogin.generateAuthToken()
            console.log(token)

            res.cookie("jwtoken", token, {
                expires: new Date(Date.now() + 120000),
                httpOnly: true
            })

            if (!isMatch) {
                res.status(400).json({ error: "Invalid Credientials" })
            }
            else {
                res.json({ message: "user Login Successfully" })
            }
        }
        else {
            res.status(400).json({ error: "Invalid Credientials " })
        }

    } catch (error) {
        console.log(error)
    }
})


router.get('/About', jwt , (req, res) => {
    res.send(req.rootUser)
})

router.get('/GetData', jwt , (req, res) => {

    res.send(req.rootUser)
})

router.get('/logout', (req,res) =>{
    console.log('hello my Logout Page')
    res.clearCookie('jwtoken', {path: '/'})
    res.status(201).send('User Logout ')
})



module.exports = router 