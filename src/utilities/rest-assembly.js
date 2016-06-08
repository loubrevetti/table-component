export function restAssembly(){
    let apiParams={method:"POST",headers:{'Content-Type': 'application/json','credentials':'include','mode':'cors'}};
    let REQUEST;
    let RESPONSE;
    function buildRequest(params){
        apiParams.url = (params.url) ? params.url : apiParams.url;
        apiParams.method = (params.payload && params.payload.method) ? params.payload.method : apiParams.method;
        if(apiParams.url.indexOf("stubs")==-1 && apiParams.method.toLowerCase()!=="get" && params.payload) apiParams.body = buildPayload(params);
        REQUEST = new Request(apiParams.url,apiParams);
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