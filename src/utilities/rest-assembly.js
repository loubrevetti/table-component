export function restAssembly(){
    let apiParams={method:"POST",headers:{'Content-Type': 'application/json'}};
    let REQUEST;
    let RESPONSE;
    function buildRequest(params){
        apiParams.url = (params.url) ? buildURL(params.url) : apiParams.url;
        apiParams.method = (params.payload.method) ? params.payload.method : apiParams.method;
        if(apiParams.url.indexOf("stubs")==-1) apiParams.body = buildPayload(params);
        REQUEST = new Request(apiParams.url,apiParams);
    }

    function buildURL(url){
        return (url.indexOf("://")!=-1)? url : window.location.origin+url;
    }

    function buildPayload(params){
        let data = new FormData();
        for(var item in params.payload){
            data.append(item,params.body[item])
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