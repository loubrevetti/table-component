export function VoyaColumnTemplate() {
    function render(data){
        return `<div class="voya-col ${data.colLabel}"><div class="label">${data.colLabel}</div> <div class="voya-col-actions"></div></div>`
    }
    function addButton(el,button){
        el.querySelector(".voya-col-actions").appendChild(button);
    }
    function updateTheme(el){
        if(el.theme) {
            el.classList.forEach(function(CSSclass){
                if(CSSclass.indexOf("orange")!=-1 || CSSclass.indexOf("white")!=-1){
                    el.classList.remove(CSSclass);
                }
            })
            el.classList.add(el.theme);
        }
        if(el.borders){
            el.classList.forEach(function(CSSclass){
                if(CSSclass.indexOf("vertical")!=-1 || CSSclass.indexOf("horizontal")!=-1 || CSSclass.indexOf("none")!=-1){
                    el.classList.remove(CSSclass);
                }
            })
            el.classList.add(el.borders);
        }
    }
    function updateColumnWidth(el){
        if(!el.width) return;
        el.style.width=(isNaN(el.width))? el.width : el.width+"%";
    }
    return {
        render:render,
        addButton:addButton,
        updateTheme:updateTheme,
        updateColumnWidth:updateColumnWidth
    }
}