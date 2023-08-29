require("dotenv").config();
const config = require("../databaseConfig/config");
const sql = require("mssql");

const profile = async function (req, res) {
    try {
        const user = req.userDetails;
        var poolConnection = await sql.connect(config);
        console.log("connected");

        let data = await poolConnection.request().query(`SELECT *
        FROM [DevOps].[Login_Table] WHERE Email = '${user.Email}'`);

        data = data.recordset[0];

        let profile = {
            Name:data.Name,
            Email:data.Email,
            Company:data.Company,
            Job:data.Job
        };
        
        poolConnection.close();
        console.log("disconnected");
        return res.status(201).send({ status:true, result: profile , message:"profile data fetched successfully" });

    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};



module.exports = { profile };
