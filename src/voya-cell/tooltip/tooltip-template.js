export function tooltipTemplate(){
    function render(el){
        return `<div class="tooltipButton fa fa-question"></div>`
    }
    function insertVoyaTooltip(el){
        el.appendChild(el.voyaTooltip);
    }
    function addUniqueClass(el){
        el.querySelector('.tooltipButton').classList.add('row-'+el.rowIdx);
    }
    return{
        render:render,
        insertVoyaTooltip:insertVoyaTooltip,
        addUniqueClass:addUniqueClass
    }
}