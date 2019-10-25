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
        user: '351026618024c8',
        pass: '9b8ab488a3052f'
    }
})

var deleteCode  = app.use(async (ctx, next) => {
    const user      = await ctx.app.user.find().toArray()
    const dateNow   = new Date()
    user.forEach((element, index) => {
        const code_created  = element.code_created
        const calculate     = dateNow - code_created
        const diffInMinutes = Math.round(((calculate % 86400000) % 3600000) / 60000)

        if (diffInMinutes > 2) {
            ctx.app.user.updateMany({
                'code_created': code_created
            }, {
                $set: {
                    'verify_code'   : '',                        
                    'attempts'       : 1
                }
            })                
        }
    
    });

    await next()
})

router.get('/', async (ctx) => {    
    await deleteCode
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
    await deleteCode
    // await next()
    let verify_code = ctx.request.body.verify_code
    let id          = ctx.request.body.id
    let timer       = 0

    const currentUser = await ctx.app.user.findOne({
        '_id': ObjectID(id)
    })


    // let countAttempts = currentUser.attempts+1

    if (currentUser.verify_code != "") {
        const now           = new Date()
        const calculate     = now - currentUser.last_login_failed 
        const diffInSecond = Math.round(((calculate % 86400000) % 3600000) / 60000 * 60)
        
        console.log(diffInSecond)
        if(diffInSecond < 10){
            let remain = 10 - diffInSecond
            return await ctx.render('./login', { id: currentUser._id, msg: 'wait for ' + remain +' seconds.'  })
        }else if (Bcrypt.compareSync(verify_code, currentUser.verify_code)) {
            await ctx.app.user.updateOne({ '_id': ObjectID(id) }, {
                $set: {
                    'attempts'      : 1,
                    'verify_code'   : ""
                }
            })                 
            ctx.body    = "Welcome " + currentUser.name +", you are logged in!"
        } else if(currentUser.attempts >= 3){
            await ctx.app.user.updateOne({ '_id': ObjectID(id) }, {
                $set: {
                    'attempts'          : mongodb.Int32(currentUser.attempts + 1),
                    'last_login_failed' : now, 
                    'disable'           : true 
                }
            })
            return ctx.render('./index', {id:currentUser._id, msg:`${currentUser.attempts} attempts, your account has been locked!`})
        }else{
            await ctx.app.user.updateOne({ '_id': ObjectID(id) }, {
                $set: {
                    'attempts'          : mongodb.Int32(currentUser.attempts + 1),
                    'last_login_failed' : now 
                }
            })

            return ctx.render('./login', {id:currentUser._id, msg:`${currentUser.attempts} attempts, enters 2 tries within 10 seconds`})
        }
    }
    else {
        return ctx.render('./index', {msg: 'Your verification code is expired. Please login again to resend the new verification code!'})
    }        
})

router.post('/create-user/', async(ctx) => {
    let password    = ctx.request.body.password
    let hash        = Bcrypt.hashSync(password)
    let data        = {
            'name'              : ctx.request.body.username,
            'username'          : ctx.request.body.username,
            'email'             : ctx.request.body.email,
            'password'          : hash,
            'verify_code'       : null,
            'last_login_failed' : 0,
            'attempts'          : 0,
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