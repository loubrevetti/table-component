import {getNestedData, getArrayData} from '../../utilities/data-manipulation';
//methods are for traverseing and reassembling data to cell requirements
function mapDataFactory(){
    function mapObjectData(){
        let c={}
        this.cellTemplate.split('#').slice(1).map((dataProperty)=>dataProperty.substring(2,dataProperty.indexOf("}}"))).forEach(function(property){
            let primaryValue = (property.indexOf('^')!=-1)? property.substring(1):null;
            if(primaryValue) {this.cellName = (this.cellName === primaryValue) ? primaryValue+"^" : primaryValue;}
            c[(primaryValue)? primaryValue : property]=(primaryValue)? this.cellName : property;
        }.bind(this))
        for(var property in c){
              c[property]=(c[property].charAt(c[property].length-1)!="^")? getNestedData(property,this.cellValue) : this.cellValue;
              c[property]=(c[property] == null)? "": c[property];
        }
        return c
    }

    function mapRepeaterData(){
      let arrayObject={};
      assembleRepeatable(this).forEach(function(repeatObject){
        // traversing through data model to obatin values and correct node level for nested lpoops and mapping back row layout
        arrayObject[repeatObject.repeater]=getArrayData(repeatObject.childProps,getNestedData(repeatObject.repeater,this.cellValue));
      }.bind(this));
      return arrayObject;
    }

    function assembleRepeatable(cell){
      return cell.cellTemplate.split('repeat-on').slice(1).map(function(dataProperty){
          let arrayProp = dataProperty.substring(5,dataProperty.indexOf("}}"));
          let childProps = dataProperty.split('#').slice(1).map((childProperty)=>childProperty.substring(2,childProperty.indexOf("}}"))).filter((childProp)=>(childProp!=arrayProp));
          cell.cellTemplate = cell.cellTemplate.replace(/(repeat-on=('|")#{{((\w|\.)+)}}('|"))/,"repeat-on='"+arrayProp+"'")
          return {repeater:arrayProp, childProps:childProps}
      }.bind(cell));
    }
     return{
       mapObjectData:mapObjectData,
       mapRepeaterData:mapRepeaterData
     }
}
const MAP_DATA_FACTORY = mapDataFactory();
export {MAP_DATA_FACTORY}
