export function VoyaRowTemplate() {
    function render(data){
        return `<div class="voya-row"></div>`
    }
    function addCells(el){
        el.querySelector(".voya-row").innerHTML="";
        el.cells.forEach(function(cell){
            el.querySelector(".voya-row").appendChild(cell)
        })
    }
    function updateRowTheme(el){
        if(el.rowAlternating) {
            el.classList.forEach(function(CSSclass){
                if(CSSclass.indexOf("odd")!=-1 || CSSclass.indexOf("even")!=-1){
                    el.classList.remove(CSSclass);
                }
            })
            el.classList.add(el.rowAlternating)
        }
        if(el.borders){
            el.classList.forEach(function(CSSclass){
                if(CSSclass.indexOf("vertical")!=-1 || CSSclass.indexOf("horizontal")!=-1 || CSSclass.indexOf("none")!=-1){
                    el.classList.remove(CSSclass);
                }
            })
            el.classList.add(el.borders)
        }
        if(el.theme){
            el.classList.forEach(function(CSSclass){
                if(CSSclass.indexOf("orange")!=-1 || CSSclass.indexOf("white")!=-1){
                    el.classList.remove(CSSclass);
                }
            })
            el.classList.add(el.theme)
        }
    }
    return {
        render:render,
        addCells:addCells,
        updateRowTheme:updateRowTheme
    }
}