require("dotenv").config();
const config = require("../databaseConfig/config");
const sql = require("mssql");
const { startOfWeek, endOfWeek, eachDayOfInterval,format  } = require('date-fns');

const getKpi = async function (req, res) {
    try {
        const user = req.userDetails;
        let spendinClause=``,savinginClause=``,actioninClause=``;
        if(req["SpendData_Clause"]) spendinClause = req["SpendData_Clause"];
        if(req["SavingData_2_Clause"]) savinginClause = req["SavingData_2_Clause"];
        if(req["ActionTracking_test_Clause"]) actioninClause = req["ActionTracking_test_Clause"];
        var poolConnection = await sql.connect(config);
        console.log("connected");
        let data = [];

        let [sp, sv, ac , ac2 , help , lasthelp] = await Promise.all([
            poolConnection.request().query(`SELECT SUM(AmountEUR),COUNT(DISTINCT CompanyName),COUNT(DISTINCT Supplier_Key),COUNT(CompanyName),COUNT(DISTINCT ReportingLevel4),MAX(YearMonth),MIN(YearMonth),COUNT(DISTINCT Entity_Country)
            FROM [DevOps].[SpendData] ${spendinClause}`),
            poolConnection.request().query(`SELECT SUM(CALC_AmountEUR_YTD_TY),COUNT(DISTINCT CompanyPrimaryCluster),SUM(CALC_PriceVariance_YTD),MAX(YearMonth),MIN(YearMonth),COUNT(DISTINCT Entity_RegionP)
            FROM [DevOps].[SavingData_2] ${savinginClause}`),
            poolConnection.request().query(`SELECT SUM(AmountEUR),COUNT(DISTINCT CompanyName),COUNT(DISTINCT VendorNameHarmonized),MAX(YearMonth),MIN(YearMonth),COUNT(DISTINCT ActionName),COUNT(DISTINCT Entity_Country),COUNT(case when Status = 'Pending' then 1 else null end)
            FROM [DevOps].[ActionTracking_test] ${actioninClause}`),
            poolConnection.request().query(`SELECT SUM([AmountEUR(Pre)]),SUM([AmountEUR(Post)])
            FROM [DevOps].[ActionTracking_test_upd]`),
            poolConnection.request().query(`SELECT COUNT(Status),COUNT(case when Status = 'Pending' then 1 else null end),COUNT(case when Status = 'In Progress' then 1 else null end),COUNT(case when Status = 'Rejected' then 1 else null end),COUNT(case when Status = 'Successfull' then 1 else null end)
            FROM [DevOps].[Help_Desk_Table] WHERE Email = '${user.Email}'`),
            poolConnection.request().query(`SELECT Date
            FROM [DevOps].[Help_Desk_Table] WHERE Email = '${user.Email}'`)
        ]);

        ac2 = ac2.recordsets[0][0][""][1] - ac2.recordsets[0][0][""][0];
        lasthelp = lasthelp.recordsets[0];
        let mn = 0;
        let yr = 0;
        for (let i = 0; i < lasthelp.length; i++) {
            let date = lasthelp[i].Date;
            date = date.split("/");
            let month = date[1];
            let year = date[2];
            if (yr < year) {
                mn = month;
                yr = year;
            }
            else if (yr == year && month > mn) {
                mn = month;
            }
        }
        let lhelp = yr + "" + mn;

        data.push(
            {
                totalSpend: sp.recordsets[0][0][""][0],
                spendEntity: sp.recordsets[0][0][""][1],
                spendSupplier: sp.recordsets[0][0][""][2],
                spendTransaction: sp.recordsets[0][0][""][3],
                spendL4Category: sp.recordsets[0][0][""][4],
                spendTimeRange: [sp.recordsets[0][0][""][6], sp.recordsets[0][0][""][5]],
                spendCountry: sp.recordsets[0][0][""][7],
                totalSave: sv.recordsets[0][0][""][0],
                saveEntity: sv.recordsets[0][0][""][1],
                saveVariance1: sv.recordsets[0][0][""][2],
                saveTimeRange: [sv.recordsets[0][0][""][4], sv.recordsets[0][0][""][3]],
                saveRegion: sv.recordsets[0][0][""][5],
                totalAction: ac.recordsets[0][0][""][0],
                actionEntity: ac.recordsets[0][0][""][1],
                actionSupplier: ac.recordsets[0][0][""][2],
                actionTimeRange: [ac.recordsets[0][0][""][4], ac.recordsets[0][0][""][3]],
                actionNumber: ac.recordsets[0][0][""][5],
                actionCountry: ac.recordsets[0][0][""][6],
                actionUnderCons: ac.recordsets[0][0][""][7],
                actionSaving: ac2,
                helpTicket: help.recordsets[0][0][""][0],
                pending: help.recordsets[0][0][""][1],
                progress: help.recordsets[0][0][""][2],
                reject: help.recordsets[0][0][""][3],
                success: help.recordsets[0][0][""][4],
                helpTime: lhelp,
            }
        );

        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({ result: data, message: "kpi fetched successfully" });
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const getChart = async function (req, res) {
    try {

        let user = req.userDetails;
        let spendinClause=``,savinginClause=``,actioninClause=``
        if(req["SpendData_Clause"]) spendinClause = req["SpendData_Clause"];
        if(req["SavingData_2_Clause"]) savinginClause = req["SavingData_2_Clause"];
        if(req["ActionTracking_test_Clause"]) actioninClause = req["ActionTracking_test_Clause"];

        function formatCompactNumber(number) {
            number = number + "";
            num = number.split(".");
            return Number(num[0]);
        }

        var poolConnection = await sql.connect(config);
        console.log("connected");

        let [spend, save, action] = await Promise.all([
            poolConnection.request().query(`SELECT CompanyName,YearMonth,SUM(AmountEUR)
            FROM [DevOps].[SpendData] ${spendinClause} GROUP BY CompanyName,YearMonth ORDER BY CompanyName,YearMonth ASC`),
            poolConnection.request().query(`SELECT CompanyName,YearMonth,SUM(CALC_AmountEUR_YTD_TY)
            FROM [DevOps].[SavingData_2] ${savinginClause} GROUP BY CompanyName,YearMonth ORDER BY CompanyName,YearMonth ASC`),
            poolConnection.request().query(`SELECT CompanyName,YearMonth,SUM(AmountEUR)
            FROM [DevOps].[ActionTracking_test] ${actioninClause} GROUP BY CompanyName,YearMonth ORDER BY CompanyName,YearMonth ASC`)
        ]);

        spend = spend.recordsets[0];
        save = save.recordsets[0];
        action = action.recordsets[0];

        function chart(spend){
        let ar = [];
        for (let i = 0; i < spend.length; i++) {
            let str = spend[i]["YearMonth"];
            let year = str.slice(0, 4);
            let month = str.slice(str.length - 2);
            let companyKey = spend[i]["CompanyName"];
            if(ar.length == 0 ){
                ar.push({
                    [companyKey]:{
                        [year]:[formatCompactNumber(spend[i][""])]
                    }
                });
            }
            else if(ar[ar.length-1][companyKey]){
                if(ar[ar.length-1][companyKey][year]){
                    let arr = ar[ar.length-1][companyKey][year];
                    arr.push(formatCompactNumber(spend[i][""]));
                    ar[ar.length-1][companyKey][year] = arr;
                }
                else{
                    ar[ar.length-1][companyKey][year] = [formatCompactNumber(spend[i][""])];
                }}
                else if(!ar[ar.length-1][companyKey]){
                    ar[ar.length-1][companyKey]  = {
                        [year]:[formatCompactNumber(spend[i][""])]
                    }
                }
            }
                return ar;
        }

        let a1 = chart(spend);
        let a2 = chart(action);
        let a3 = chart(save);

        let final = [a1[0],a2[0],a3[0]];

        poolConnection.close();
        console.log("disconnected");
        return res.status(200).send({ result: final, message: "chart fetched successfully" });
    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const getActivity = async function (req, res) {
    try {
        const user = req.userDetails;
        var poolConnection = await sql.connect(config);
        console.log("connected");
        
        const currentDate = new Date();
        const startDate = startOfWeek(currentDate);
        const endDate = endOfWeek(currentDate);
        const datesInCurrentWeek = eachDayOfInterval({ start: startDate, end: endDate });
        let dateArray=[];
        datesInCurrentWeek.forEach((date) => {
            const formattedDate = format(date, 'MM/dd/yyyy');
            dateArray.push(formattedDate);
        });
          
        let data = await poolConnection.request().query(`SELECT *
        FROM [DevOps].[Notification_Table] WHERE Email = '${user.Email}' AND Status = 'success'`);
        data = data.recordsets[0];

        // this weak filter
        let final=[];
        data.map(x=>{
            let d = x.Timestumps;
            d = d.split(",");
            let date = d[0].split("/");
            if(date[0].length == 1) date[0] = '0'+date[0];
            if(date[1].length == 1) date[1] = '0'+date[1];
            date = date.join("/");
            console.log(date);
            if(dateArray.includes(date)) final.push(x);
        });

        console.log(final);

        poolConnection.close();
        console.log("disconnected");
        return res.status(201).send({ status: true, result: final, message: "Activities fetched successfully" });

    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

const getCountry = async function (req, res) {
    try {
        const user = req.userDetails;
        let spendinClause=``,savinginClause=``,actioninClause=``;
        if(req["SpendData_Clause"]) spendinClause = req["SpendData_Clause"];
        if(req["SavingData_2_Clause"]) savinginClause = req["SavingData_2_Clause"];
        if(req["ActionTracking_test_Clause"]) actioninClause = req["ActionTracking_test_Clause"];
        
        var poolConnection = await sql.connect(config);
        console.log("connected");

        let [spend, save, action] = await Promise.all([
            poolConnection.request().query(`SELECT [CountryCode],SUM(AmountEUR)
        FROM [DevOps].[SpendData] ${spendinClause} GROUP BY [CountryCode] ORDER BY [CountryCode] ASC`),
        poolConnection.request().query(`SELECT [CountryCode],SUM(CALC_AmountEUR_YTD_TY)
        FROM [DevOps].[SavingData_2] ${savinginClause} GROUP BY [CountryCode] ORDER BY [CountryCode] ASC`),
        poolConnection.request().query(`SELECT [Entity_Country],SUM(AmountEUR)
        FROM [DevOps].[ActionTracking_test] ${actioninClause} GROUP BY [Entity_Country] ORDER BY [Entity_Country] ASC`)
        ]);

        spend = spend.recordsets[0];
        save = save.recordsets[0];
        action = action.recordsets[0];

        let data = {
            spend:spend,
            saving:save,
            action:action
        }
        
        poolConnection.close();
        console.log("disconnected");
        return res.status(201).send({ status: true, result: data, message: "Activities fetched successfully" });

    } catch (e) {
        res.status(500).send({ status: false, message: e.message });
    }
};

module.exports = {
    getKpi, getChart, getActivity, getCountry
};
