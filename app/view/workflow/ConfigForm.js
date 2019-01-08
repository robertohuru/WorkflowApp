/*--- Legend window ---*/

"use strict";

Ext.define('WorkflowApp.view.workflow.ConfigForm', {
    extend: 'Ext.window.Window',
    alias: 'widget.configform',
    layout: 'fit',
    draggable: false,
    padding: 1,
    border: true,
    closable: true,
    modal: false,
    resizable: true,
    style: {
        border: '2px solid rgba(0,0,0,0.3)'
    }
});