/*--- Legend window ---*/

"use strict";

Ext.define('WorkflowApp.view.home.ControlWindow', {
    extend: 'Ext.window.Window',
    alias: 'widget.controlwindow',
    layout: 'fit',
    draggable: true,
    padding: 1,
    border: true,
    closable: true,
    modal: false,
    resizable: true,
    style: {
        border: '2px solid rgba(0,0,0,0.3)'
    }
});