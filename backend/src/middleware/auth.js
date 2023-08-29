const jwt = require('jsonwebtoken')

const auth = async function(req,res,next){
    try{
        let bearerHeader = req.headers['authorization'];
        if(!bearerHeader) return res.status(400).send({status:false , message:"Token is not available"});
        const bearer = bearerHeader.split(" ");
        const bearerToken = bearer[1];
        jwt.verify(bearerToken, "spendAnalyticPlatform");
        req.userDetails = jwt.decode(bearerToken);
        next();
    }
    catch(e)
    {
        res.status(500).send({status:false , message:e.message});
    }
}

module.exports = {auth}
