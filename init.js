/*--- WorkflowApp - Application launcher script ---*/
 
"use strict";

Ext.application({
    name: 'WorkflowApp',
    extend: 'WorkflowApp.Application',
 
    requires: [
        'WorkflowApp.view.home.HomeView'
    ],
 
    /* The class name of the View that will be lauched when the application starts. */
    mainView: 'WorkflowApp.view.home.HomeView'
});
/*--- ---*/
