const express = require("express");
const router = express.Router();
const {
	actionTracker,
	actionUpdate,
	actionTree,
	actionTreeById,
	actionAdd,
	actionApproval,
	createActionTable,
} = require("../controller/actionTracker");
const { helpDesk,getQuery,getQueryById,helpResponse } = require("../controller/helpDesk");
const { fileManager,getFiles,deleteFiles,updateFiles } = require("../controller/fileManager");
const { signup,signin,deleteUser,resetPass,verifyPass,access } = require("../controller/login");
const { notification,getNotification,delNotification,readNotification } = require("../controller/notification");
const { categoryTree,addCategory,categoryTreeById, categoryApproval,mailtest} = require("../controller/categoryTree");
const { validationData, validationMainTable } = require("../controller/validationData");
const { getKpi,getChart,getActivity,getCountry } = require("../controller/kpiData");
const { SpendData,SavingData } = require("../controller/masterData");
const { profile } = require("../controller/profile");
const { brandList,clientList,tableList,accessClient,tableColumn,columnValue,addRight,userTable,addUser,sendCredentials } = require("../controller/accessRight");
const {auth} = require("../middleware/auth");
const {rls} = require("../middleware/rowLevelSecurity");

//statxo
//action tracker
router.get("/actiontracker",auth,rls,actionTracker);
router.get("/createActionTable",auth,createActionTable);
router.put("/actionUpdate/:actionId",auth,actionUpdate);

//action tree
router.get("/actiontree",auth,actionTree);
router.get("/actiontreeById/:actionId",auth, actionTreeById);
router.post("/actionadd",auth, actionAdd);
router.get("/actionapproval/:Id",auth, actionApproval);

//help
router.post("/helpdesk",auth, helpDesk);
router.get("/getQuery",auth, getQuery);
router.get("/getQueryById/:Id",auth, getQueryById);
router.get("/helpResponse/:Id",auth,helpResponse );

//file-manager
router.post("/filemanager",fileManager);
router.get("/getFiles",getFiles);
router.put("/updateFiles",updateFiles);
router.delete("/deleteFiles",deleteFiles);

//login
router.post("/signup",signup);
router.get("/signin",signin);
router.get("/deleteUser",deleteUser);
router.get("/forget-password",resetPass);
router.put("/reset-password",verifyPass);
router.get("/access",access);

//notification
router.post("/notification",auth,notification);
router.get("/getNotification",auth,getNotification);
router.get("/readNotification",auth,readNotification);
router.delete("/delNotification",auth,delNotification);

//category tree
router.get("/categoryTree",auth,categoryTree);
router.post("/addCategory",auth,addCategory);
router.get("/categoryTreeById/:categoryId",auth,categoryTreeById);
router.get("/categoryapproval/:Id",auth,categoryApproval);

//validation
router.get("/validationData",auth,validationData);
router.get("/validationMain",auth,validationMainTable);

//kpi
router.get("/getKpi",auth,rls,getKpi);
router.get("/getChart",auth,rls,getChart);
router.get("/getActivity",auth,getActivity);
router.get("/getCountry",auth,rls,getCountry);

//master data
router.get("/spendData",auth,rls,SpendData);
router.get("/savingData",auth,rls,SavingData);

//profile
router.get("/profile",auth,profile);

//access right
router.get("/brandList",brandList);
router.get("/clientList",clientList);
router.get("/tableList",tableList);
router.get("/accessClient",accessClient);
router.get("/tableColumn",tableColumn);
router.get("/columnValue",columnValue);
router.get("/addRight",addRight);
router.get("/userTable",userTable);
router.post("/addUser",addUser);
router.get("/sendCredentials",sendCredentials);

router.get("/mailtest",mailtest);

module.exports = router;
