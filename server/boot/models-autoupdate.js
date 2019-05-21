module.exports = function (app) {
    'use strict'
    var ds = app.dataSources.tbbboutdb;
    
    console.log('--All Models found:', Object.keys(app.models));
    const mymodels = ['user', 'tab', 'business'];

    console.log('--Models to migrate: ', mymodels);
    for (const x in mymodels) {
        const modelname = mymodels[x];
        ds.autoupdate(modelname, function () {
            console.log("Auto-migrated " + modelname + " user successfully.");
        });
    }
};