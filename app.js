const express=require('express');
const bcrypt=require('bcrypt');
const jwt=require('jsonwebtoken');
const cookie=require('cookie-parser');
const usermodel=require("./models/user");
const postmodel=require("./models/post");
const upload=require('./config/multerconfig');
const crypto=require("crypto");
const path=require("path");
const user = require('./models/user');
// const multer=require("multer");
const app=express();

app.use(express.json());
app.use(cookie());
app.use(express.urlencoded({extended:true}));
app.set("view engine","ejs");
app.use(express.static(path.join(__dirname,'public')));

// store the files on server
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//       cb(null, './public/images/upload')
//     },
//     filename: function (req, file, cb) {        //giving a unique name to avoid overwriting
//       crypto.randomBytes(12,function(err,bytes){
//         const fn=bytes.toString("hex")+path.extname(file.originalname)
//         cb(null, fn)
//       })
      
//     }
//   })
  
//   const upload = multer({ storage: storage })


app.get("/",function(req,res){
    res.render("index");
})

app.get("/login",function(req,res){
    res.render("login");
})

app.get("/profile/upload",function(req,res){
    res.render("profileupload");
})

app.post("/upload",isloggedin,upload.single("image"),async function(req,res){
    let user=await usermodel.findOne({email:req.user.email});
    user.profilepic=req.file.filename;  
    await user.save();
    res.redirect("/profile");
})

app.get("/profile",isloggedin,async function(req,res){
    let user=await usermodel.findOne({email:req.user.email});
    await user.populate("posts");
    res.render("profile",{user});
})

app.get("/like/:id",isloggedin,async function(req,res){
    let post=await postmodel.findOne({_id:req.params.id}).populate("user");
    if (post.likes.indexOf(req.user.userid)===-1){
        post.likes.push(req.user.userid);
    }else{
        post.likes.splice(post.likes.indexOf(req.user.userid),1);
    }
    await post.save();
    res.redirect("/profile");
})

app.get("/edit/:id",isloggedin,async function(req,res){
    let post=await postmodel.findOne({_id:req.params.id}).populate("user");
    res.render("edit",{post});
})

app.post("/update/:id",isloggedin,async function(req,res){
    let post=await postmodel.findOneAndUpdate({_id:req.params.id},{content:req.body.content});
    res.redirect("/profile");
})


app.post("/post",isloggedin,async function(req,res){
    let user=await usermodel.findOne({email:req.user.email});
    let post = await postmodel.create({
        user: user._id,
        content:req.body.content
    })
    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile")
})

app.post("/register",async function(req,res){
    let {email,name,username,age,password}=req.body;
    let alreadyuser=await usermodel.findOne({email:email})
    if (alreadyuser){
        return res.status(500).send("User Already registered");
    }
    bcrypt.genSalt(10,function(err,salt){
        bcrypt.hash(password,salt,async function(err,hash){
            let newuser=await usermodel.create({
                email,
                name,
                username,
                age,
                password:hash 
            });
            let token=jwt.sign({email:email,userid:newuser._id},"shhh");
            res.cookie("token",token);  
            res.send("Registered!"); 
        })
    })
})

app.post("/login",async function(req,res){
    let {email,password}=req.body;
    let alreadyuser=await usermodel.findOne({email:email})
    if (!alreadyuser){
        return res.status(500).send("Something went Wrong");
    }
    bcrypt.compare(password,alreadyuser.password,function(err,result){
        if (result){
            let token=jwt.sign({email:email,userid:alreadyuser._id},"shhh");
            res.cookie("token",token);
            res.status(200).redirect("/profile");
        }else{
            res.redirect("/login");
        }
    })
})

app.get("/logout",function(req,res){
    res.cookie("token","");
    res.redirect("/login");
})

function isloggedin(req,res,next){
    if (req.cookies.token===""){
        res.redirect("/login");
    }else{
        let data=jwt.verify(req.cookies.token,"shhh");
        req.user=data;
        next();
    }   
}

//multer

// app.get("/test",function(req,res){
//     res.render("test");
// })

// app.post("/upload",upload.single("image"),function(req,res){
//     console.log(req.file);  // it adds both body and file object 
// })


app.listen(3000,function(){
    console.log("Running on port 3000!");
})
