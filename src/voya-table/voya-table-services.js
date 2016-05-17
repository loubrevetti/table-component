import {restAssembly} from '../utilities/rest-assembly';
import {getNestedData,sortData} from '../utilities/data-manipulation';

export function VoyaTableServices(){

    let REST=restAssembly();

    function api(params){
        REST.buildRequest(params);
    }
    function loadData() {
        return fetch(REST.request()).then(function(response){return response.json()})
    }
    function sort(e,data){
        sortData(e,data);
    }
    function filter(e){

    }

    return{
        api:api,
        loadData:loadData,
        sort:sort,
        filter:filter
    }
}