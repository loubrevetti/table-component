export function VoyaColumnTemplate() {
    function render(data){
        return `<div class="voya-col ${data.name}"><div class="label">${data.name}</div> <div class="voya-col-actions"></div></div>`
    }
    function addButton(el,button){
        el.querySelector(".voya-col-actions").appendChild(button);
    }
    function updateTheme(el){
        if(el.theme) el.classList.add(el.theme);
        if(el.borders) el.classList.add(el.borders);
    }
    function updateColumnWidth(el){
        el.style.width=el.width;
    }
    return {
        render:render,
        addButton:addButton,
        updateTheme:updateTheme,
        updateColumnWidth:updateColumnWidth
    }
}