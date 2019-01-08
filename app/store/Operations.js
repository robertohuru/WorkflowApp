Ext.define('WorkflowApp.store.Operations', {
    extend: 'Ext.data.Store',
 
    alias: 'store.operations',
    storeId: 'operations',
 
    model: 'WorkflowApp.model.Operation',
 
    proxy: {
        type: 'ajax',
        noCache: true,
        url: 'app/api/wps_capabilities.py',
        reader: {
            type: 'json',
            successProperty: 'success',
            rootProperty: 'operations'  /* Name of the element containing the data */
        }
    }
});
/*--- ---*/