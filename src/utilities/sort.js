import {property,nullable} from 'voya-component-utils/decorators/property-decorators';
const SORT_TYPE=["ASC", "DESC", null];
export class Sort{
    constructor(column){
        this.col = column;
        this.event = new CustomEvent("columnSort",{bubbles:true})
        this.button = document.createElement('div');
        this.button.className = "voya-col-sort "+this.col.name || "voya-col-sort";
        this.col.classList.add("cursor")
        this.eventListeners();
    }
    @property
    event = new CustomEvent("columnSort")

    @property
    col

    @property
    button

    @property
    sortType

    @property({type:'integer'})
    clickCount

    eventListeners(){
        this.col.addEventListener('click',this.executeSort.bind(this),true);
    }

    executeSort(){
        this.removeButtonSort();
        this.clickCount = (this.clickCount>=0) ? parseInt(this.clickCount)+1 : 0 ;
        this.clickCount = (this.clickCount > SORT_TYPE.length-1)? 0 : this.clickCount;
        this.sortType = SORT_TYPE[this.clickCount];
        this.addButtonSort();
        this.event.sortType=this.sortType;
        this.event.columnName=this.col.name || this.col.colLabel;
        this.event.colIndex = this.col.colIndex;
        this.button.dispatchEvent(this.event);
    }
    removeActiveSort(e){
        if((this.col.colLabel === e.columnName)||(this.col.name === e.columnName)) return;
        this.button.classList.remove(this.sortType);
        this.clickCount=undefined;
    }
    removeButtonSort(){
        if(!this.sortType) return;
        this.button.classList.remove(this.sortType);
    }
    addButtonSort(){
        if(!this.sortType) return;
        this.button.classList.add(this.sortType);
    }
}
