import {property,nullable} from 'voya-component-utils/decorators/property-decorators';
export class Filter{
    constructor(column){
        this.col = column;
        this.button = document.createElement('div');
        this.button.innerHTML = "+";
        this.button.className = "voya-col-filter "+this.col.dataItem || "voya-col-filter";
        this.eventListeners();
    }
    @property
    col

    @property
    button

    eventListeners(){
        this.button.addEventListener('click',this.executeFilter.bind(this),true);
    }

    executeFilter(e){
        console.log(this.col.name)
    }
}