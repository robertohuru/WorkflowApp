Ext.define('WorkflowApp.store.Coverages', {
    extend: 'Ext.data.Store',
 
    alias: 'store.coverages',
    storeId: 'coverages',
 
    model: 'WorkflowApp.model.Coverage',
 
    proxy: {
        type: 'ajax',
        noCache: true,
        url: 'app/api/wcs_capabilities.py',
        reader: {
            type: 'json',
            successProperty: 'success',
            rootProperty: 'coverages'  /* Name of the element containing the data */
        }
    }
});

