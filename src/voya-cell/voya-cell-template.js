export function VoyaCellTemplate() {
    function render(el){
        el.style.width = el.width;
        let content = (el.cellTemplate)? el.cellTemplate : el.cellValue;
        let method = (!el.mobile)? "add" : "remove";
        el.classList[method]("non-mobile");
        let method2 = (!el.label)? "add" : "remove";
        el.classList[method2]("non-label");
        return `<div class="voya-cell ${el.cellName}"><span class="label">${el.label}: </span>${content}</div>`
    }
    return {
        render:render
   }
}