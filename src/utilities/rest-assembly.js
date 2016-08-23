export function restAssembly(){
    let apiParams={method:"POST",headers:{'Content-Type': 'application/json','X-Requested-By': 'myVoya'}};
    let REQUEST;
    let RESPONSE;
    function buildRequest(params){
        apiParams.url = (params.url) ? params.url : apiParams.url;
        if(params.options) buildOptions(params.options)
        apiParams.method = (params.payload && params.payload.method) ? params.payload.method : apiParams.method;
        if(apiParams.url.indexOf("stubs")==-1 && apiParams.method.toLowerCase()!=="get" && params.payload) apiParams.body = buildPayload(params);
        REQUEST = new Request(apiParams.url,apiParams);
    }

    function buildOptions(params){
        Object.keys(params).forEach(function(property){
            apiParams[property] = params[property];
        })
    }
    function buildPayload(params){
        let data = new FormData();
        for(var item in params.payload){
            data.append(item,params.payload[item])
        }
        return data;
    }
    function request(){
        return REQUEST;
    }
    function response(){
        return RESPONSE;
    }
    return {
        buildRequest:buildRequest,
        request:request,
        response:response
    }
}