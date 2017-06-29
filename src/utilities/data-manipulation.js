let arr = [];
export function getNestedData(searchString,object){
    object = (Array.isArray(object))? object : Object.assign({},object);
    let value = searchString.split('.').map(function(property,idx){
        //if data is Array based
        if(Array.isArray(object[property]) && idx == searchString.split('.').length-1){
          return object[property];
        }
        else if(Array.isArray(object[property]) && idx < searchString.split('.').length-1){
          return object[property].map((data)=>getNestedData(searchString.split('.').slice(idx+1).join("."),data));
        }
        //if data is Object based
        if(typeof(object[property])==='object' && idx < searchString.split('.').length-1){
            return getNestedData(searchString.split('.').slice(idx+1).join("."),object[property])
        }
        //if data is key value pair
        object[property]=(object[property]==0)? ""+object[property] : object[property];
        if(typeof(object[property])!=='object' && object[property]){
            return object[property]
        }
    }).filter((data)=>(data))[0];
    return value
}

export function getArrayData(searchString,objects){
    return objects.map(function(item){
      if(Array.isArray(item)) return getArrayData(searchString,item);
      else {
        let o={},m = searchString.map(function(property, idx){
          o[property]=getNestedData(property,item);
          return (idx == searchString.length-1)? o : null;
        }).filter((item)=>(item));
        return m[0];
      };
    })
}

export function sortData(e,data){
    e.columnName = e.columnName.toLowerCase();
    data.sort(function(a,b){
        let current = (e.columnName.indexOf('.')!=-1)? getNestedData(e.columnName,a) : a[e.columnName];
        let next =  (e.columnName.indexOf('.')!=-1)? getNestedData(e.columnName,b) : b[e.columnName];
        let currentValue = (!isNaN(parseInt(current)))? parseInt(current) : current.toLowerCase().replace(/\ /g,"");
        let nextValue = (!isNaN(parseInt(next)))? parseInt(next) : next.toLowerCase().replace(/\ /g,"");
        let reverse = (e.sortType === "DESC") ? true : false;
        return ((currentValue < nextValue) ? -1 : ((currentValue > nextValue) ? 1 : 0)) * (reverse ? -1 : 1);
    })
}
