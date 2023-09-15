const rls = async function(req,res,next){
    try{
        let access = req.userDetails.Access;
        if(access !== "global"){
        access = JSON.parse(access);
        let key = Object.keys(access);
        for(let i=0; i<key.length; i++){
            let query = access[key[i]];
            let arr = query.split('"');
            let str = arr.join("'");
            let reqKey = key[i]+"_Clause";
            req[reqKey] = str;
        }
        } 
        next();
    }
    catch(e)
    {
        res.status(500).send({status:false , message:e.message});
    }
}

module.exports = {rls}

//impelement clauses in controller functions
