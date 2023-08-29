const rls = async function(req,res,next){
    try{

        console.log("RLS");
        const user = req.userDetails;
        let access = user.Access;
        console.log(access);
        if(access !== "global"){
        access = JSON.parse(access)
            let key = Object.keys(access);
            console.log(key);
            for(let i=0; i<key.length; i++){
                let query = access[key[i]];
                let arr = query.split('"');
                let str = arr.join("'");
                console.log(str);
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
