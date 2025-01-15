const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const User = mongoose.model("User")
const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const {JWT_SECRET} = require('../config/keys')
const nodemailer = require('nodemailer')
const {EMAIL, SMTP_MAIL, SMTP_MAIL_PASSWORD} = require('../config/keys')

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    auth: {
      user: SMTP_MAIL,
      pass: SMTP_MAIL_PASSWORD,
    },
  });

// router.get('/protected',requireLogin,(req,res)=>{
//     res.send("hello user")
// })

router.post('/signup',(req,res)=>{
    const {name,email,password,pic} = req.body
    if(!email || !password || !name){
       return res.status(422).json({error:"please add all the fields"})
    }
    User.findOne({email:email})
    .then((savedUser)=>{
        if(savedUser){
            return res.status(422).json({error:"user is already exists with that email"})
        }
        bcrypt.hash(password,12)
        .then(hashedpassword=>{
            const user = new User({
                email,
                password:hashedpassword,
                name,
                pic
            })
    
            user.save()
            .then(user=>{
                transporter.sendMail({
                    to:user.email,
                    from:"000shobhitchaurasia@gmail.com",
                    subject:"Signup Success",
                    html:"<h1>Welcome to Instagram</h1>"
                })
                res.json({message:"saved successfully"})
            })
            .catch(err=>{
                console.log(err)
            })
        })
        
    })
    .catch(err=>{
        console.log(err)
    })
})


router.post('/signin',(req,res)=>{
    const {email,password} = req.body
    if(!email || !password){
       return res.status(422).json({error:"please add email or password"})
    } 
    User.findOne({email:email})
    .then(savedUser=>{
        if(!savedUser){
           return res.status(422).json({error:"Invalid email or password"})
        }
        bcrypt.compare(password,savedUser.password)
        .then(doMatch=>{
            if(doMatch){
                // res.json({message:"successfully signed in"})
                const token = jwt.sign({_id:savedUser._id},JWT_SECRET)
                const {_id,name,email,followers,following,pic} = savedUser
                res.json({token,user:{_id,name,email,followers,following,pic}})
            }
            else{
                return res.status(422).json({error:"Invalid email or password"})
            }
        })
        .catch(err=>{
            console.log(err)
        })
    })
})

router.post('/reset-password',(req,res)=>{
      crypto.randomBytes(32,(err,buffer)=>{
          if(err){
              console.log(err)
          }
          const token = buffer.toString("hex")
          User.findOne({email:req.body.email})
          .then(user=>{
              if(!user){
                  return res.status(422).json({error:"User don't exists with that email"})
              }
              user.resetToken = token
              user.expireToken = Date.now() + 3600000
              user.save().then((result)=>{
                  transporter.sendMail({
                      to:user.email,
                      from:"000shobhitchaurasia@gmail.com",
                      subject:"Password Reset",
                      html:`
                      <p>You requested for password reset</p>
                      <h5>Click in this <a href="${EMAIL}/reset/${token}">link</a> to reset password</h5>
                      `
                  },
                  function (err, data) {
                      if (err) {
                          console.log('Error Occurs', err);
                      } else {
                          console.log('Email sent successfully');
                      }
                  })
                  res.json({message:"Check your email"})
              })
          })
      })
})

router.post('/new-password',(req,res)=>{
    const newPassword = req.body.password
    const sentToken = req.body.token
    User.findOne({resetToken:sentToken,expireToken:{$gt:Date.now()}})
    .then(user=>{
        if(!user){
            return res.status(422).json({error:"Try again session expired"})
        }
        bcrypt.hash(newPassword,12).then(hashedpassword=>{
            user.password = hashedpassword
            user.resetToken = undefined
            user.expireToken = undefined
            user.save().then((saveduser)=>{
                res.json({message:"Password updated successfully"})
            })
        })
    }).catch(err=>{
        console.log(err)
    })
})

module.exports = router