'use strict';
const Koa           = require('koa')
const Router        = require('koa-router')
const BodyParser    = require('koa-bodyparser')
const logger        = require('koa-logger')
const Bcrypt        = require('bcryptjs')
const view          = require('koa-view')
const uniqueRandom  = require('unique-random')
const ObjectID      = require("mongodb").ObjectID
const time          = require('mongodb').Timestamp
const mongodb       = require('mongodb')      
const nodemailer    = require('nodemailer')

const random        = uniqueRandom(1, 10000)
const app           = new Koa()
const router        = new Router()

// connect database
require('./server')(app)

// use view
app.use(view('./views'))

// body parser
app.use(BodyParser())

// logger
app.use(logger())

// email
const transporter = nodemailer.createTransport({
    host: 'smtp.mailtrap.io',
    port: 2525,
    auth: {
        user: 'ce610dca22ef9c',
        pass: '96cbed681965e0'
    }
})

router.get('/', async (ctx) => {    
    return ctx.render('./index')
})

router.get('/users', async (ctx) => {
    ctx.body    = await ctx.app.user.find().toArray()
})

router.post('/login', async (ctx, next) => {
    let username            = ctx.request.body.username
    let password            = ctx.request.body.password
    let code                = random().toString()

    let currentUser   = await ctx.app.user.findOne({
                'username': username,
            })

    if (currentUser) {
        if (currentUser.disable == false) {                
            let checkPassword = Bcrypt.compareSync(password, currentUser.password)
            if (checkPassword === true) {
                await ctx.app.user.updateOne({
                    '_id': ObjectID(currentUser._id)
                }, {
                    $set: {
                        'verify_code'   : Bcrypt.hashSync(code),
                        'code_created'  : new Date(),
                        'attempts'       : 1
                    }
                })
                let getUser = await ctx.app.user.findOne({
                    '_id': ObjectID(currentUser._id)
                })

                let mailOptions = {
                    from    : 'admin@healthbeats.com',
                    to      : `${getUser.email}`,
                    html    : `To login on Healthbeats use this code <b> ${code} </b> . This code will expire in 2 minutes`                
                }

                await transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        return console.log(error)
                    } else {
                        console.log('Message sent: %s', info.messageId);
                    }
                })


                return await ctx.render('./login', {id: getUser._id})
            } else {
                return ctx.render('./index', { msg: 'Password for username '+ username + ' is wrong!' })
            }

        } else {
            return ctx.render('./index', {msg: 'Your account is locked, because you have been entered 3 times wrong code!'})
        }
    } else {
        return ctx.render('./index', {msg: 'No username '+ username +' in our database!'})
    }
})

router.post('/verify', async(ctx, next) => {

    let verify_code = ctx.request.body.verify_code
    let id          = ctx.request.body.id
    let timer       = 0

    const currentUser = await ctx.app.user.findOne({
        '_id': ObjectID(id)
    })

    const now               = new Date()
    const lastDifference    = now - currentUser.last_login_failed 
    const lastDiffInSecond  = Math.round(((lastDifference % 86400000) % 3600000) / 60000 * 60)

    const codeCreatedDifference     = now - currentUser.code_created
    const codeCreatedDiffInSecond   = Math.round(((codeCreatedDifference % 86400000) % 3600000) / 60000 * 60)
    
    // console.log(lastDiffInSecond)
    console.log(codeCreatedDiffInSecond)
    
    // If last failed login smaller than 10 second
    if(lastDiffInSecond < 10){
        let remain = 10 - lastDiffInSecond
        return await ctx.render('./login', { id: currentUser._id, msg: 'Try again after ' + remain +' seconds.'  })
    }
    // If verify code is correct
    else if (Bcrypt.compareSync(verify_code, currentUser.verify_code)) {
        // If verify code is expired afer 120 second or 2 minutes
        if(codeCreatedDiffInSecond > 120){
            return await ctx.render('./index', { id: currentUser._id, msg: 'Your verify code is expired, please login again to generate new code!'  })
        }
        await ctx.app.user.updateOne({ '_id': ObjectID(id) }, {
            $set: {
                'attempts'      : 1,
                'verify_code'   : ""
            }
        })                 
        ctx.body    = "Welcome " + currentUser.name +", you are logged in!"
    } 
    // If user wrong for 3 attempts
    else if(currentUser.attempts >= 3){
        await ctx.app.user.updateOne({ '_id': ObjectID(id) }, {
            $set: {
                'attempts'          : mongodb.Int32(currentUser.attempts + 1),
                'last_login_failed' : now, 
                'disable'           : true 
            }
        })
        return ctx.render('./index', {id:currentUser._id, msg:`${currentUser.attempts} attempts, your account has been locked!`})
    }
    // If user wrong for but less than 3 attempts
    else{
        await ctx.app.user.updateOne({ '_id': ObjectID(id) }, {
            $set: {
                'attempts'          : mongodb.Int32(currentUser.attempts + 1),
                'last_login_failed' : now 
            }
        })

        return ctx.render('./login', {id:currentUser._id, msg:`${currentUser.attempts} attempts failed, try again after 10 seconds`})
    }
         
})

router.post('/create-user/', async(ctx) => {
    let password    = ctx.request.body.password
    let hash        = Bcrypt.hashSync(password)
    let data        = {
            'name'              : ctx.request.body.name,
            'username'          : ctx.request.body.username,
            'email'             : ctx.request.body.email,
            'password'          : hash,
            'verify_code'       : null,
            'code_created'      : date,
            'attempts'          : 0,
            'last_login_failed' : date,
            'disable'           : false
    }
    ctx.body        = await ctx.app.user.insert(data)
}) 

router.get('/create-user/', async(ctx) => {
    let password    = '123456'
    let hash        = Bcrypt.hashSync(password)
    let date        = new Date('2019-01-01T00:00:00');
    let data        = {
            'name'              : 'Faisol Andi Sefihara',
            'username'          : 'faisol',
            'email'             : 'faisol@kilkproductions.com',
            'password'          : hash,
            'verify_code'       : null,
            'code_created'      : date,
            'attempts'          : 0,
            'last_login_failed' : date,
            'disable'           : false
    }
    ctx.body        = await ctx.app.user.insert(data)
})

router.get('/activated-all-user/', async(ctx) => {
    const user      = await ctx.app.user.find().toArray()
    const now       = new Date()

    user.forEach((element, index) => {
        ctx.app.user.updateMany({
            'activated_date': now
        }, {
            $set: {
                'disable'   : false
            }
        })                
    
    });

    ctx.body        = 'All users has been activated! Try login again!'
}) 

router.get('/delete-all-user/', async(ctx) => {
    const user      = await ctx.app.user.find().toArray()
    const now       = new Date()

    user.forEach((element, index) => {
        ctx.app.user.deleteOne()                
    });

    ctx.body        = 'All users has been deleted! Try login again!'
}) 

app.use(router.routes()).use(router.allowedMethods())

app.listen(3000, () => {
    console.log('Server running at port 3000')
})