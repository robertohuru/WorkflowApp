Ext.define('WorkflowApp.store.Features', {
    extend: 'Ext.data.Store',
 
    alias: 'store.features',
    storeId: 'features',
 
    model: 'WorkflowApp.model.Feature',
 
    proxy: {
        type: 'ajax',
        noCache: true,
        url: 'app/api/wfs_capabilities.py',
        reader: {
            type: 'json',
            successProperty: 'success',
            rootProperty: 'features'  /* Name of the element containing the data */
        }
    }
});

