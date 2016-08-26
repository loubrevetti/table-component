export function getNestedData(searchString,object){
    let value = searchString.split('.').map(function(property,idx){
        if(typeof(object[property])==='object' && idx < searchString.split('.').length-1){
            return getNestedData(searchString.split('.').slice(idx+1).join("."),object[property])
        }
        object[property]=(object[property]==0)? ""+object[property] : object[property];
        if(typeof(object[property])!=='object' && object[property]){
            return object[property]
        }
    }).filter((data)=>(data))[0];
    return value
}

export function sortData(e,data){
    data.sort(function(a,b){
        let current = (e.columnName.indexOf('.')!=-1)? getNestedData(e.columnName,a) : a[e.columnName];
        let next =  (e.columnName.indexOf('.')!=-1)? getNestedData(e.columnName,b) : b[e.columnName];
        let currentValue = (!isNaN(parseInt(current)))? parseInt(current) : current.toLowerCase().replace(/\ /g,"");
        let nextValue = (!isNaN(parseInt(next)))? parseInt(next) : next.toLowerCase().replace(/\ /g,"");
        let reverse = (e.sortType === "DESC") ? true : false;
        return ((currentValue < nextValue) ? -1 : ((currentValue > nextValue) ? 1 : 0)) * (reverse ? -1 : 1);
    })
}