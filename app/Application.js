"use strict";
Ext.Ajax.defaultHeaders = {
    'X-Requested-With': 'XMLHttpRequest'
};

Ext.Ajax.setConfig('withCredentials', false);
Ext.define('WorkflowApp.Application', {
    extend: 'Ext.app.Application',
    appFolder: 'app',

    requires: [
        'WorkflowApp.store.Operations',
        'WorkflowApp.store.Features',
        'WorkflowApp.store.Coverages',
    ],

    stores: ['Operations', 'Features', 'Coverages'],

    homeCtrl: null,
    wkfCtrl: null,
    mapCenter: [378517,19552], 
    launch: function () {

    }
});
/*--- ---*/



