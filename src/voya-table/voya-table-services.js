import {restAssembly} from '../utilities/rest-assembly';
import {getNestedData,sortData} from '../utilities/data-manipulation';

export function VoyaTableServices(){

    let REST=restAssembly();
    function buildService(cmp) {
        if (!cmp.apiUrl) return;
        let payload = (cmp.fetchPayload && typeof(cmp.fetchPayload)==="string")? JSON.parse(cmp.fetchPayload) : cmp.fetchPayload;
        let options = (cmp.fetchOptions && typeof(cmp.fetchOptions)==="string")? JSON.parse(cmp.fetchOptions) : cmp.fetchOptions;
        let apiParams={url:cmp.apiUrl,payload:payload,options:options};
        api(apiParams)
    }

    function api(params){
        REST.buildRequest(params);
    }
    function callService(){
        return fetch(REST.request()).then(function(response){
            return response.json()
        })
    }
    function loadData(cmp) {
        return callService().then(function(response){
            return (cmp.bindingProperty.indexOf(".")!=-1) ? parseData(cmp.bindingProperty,response,0) : response[cmp.bindingProperty];
        })
    }
    function parseData(bindingProperty,data,index){
        let propArray=bindingProperty.split(".")
        if(typeof(data[propArray[index]])==="object" && !Array.isArray(data[propArray[index]])){
            return parseData(bindingProperty,data[propArray[index]],index+1)
        }else{
            return data[propArray[index]];
        }
    }
    function sort(e,data){
        sortData(e,data);
    }
    function filter(e){

    }

    return{
        buildService:buildService,
        api:api,
        loadData:loadData,
        sort:sort,
        filter:filter
    }
}