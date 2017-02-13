//methods for marrying up template to data
function templateRenderingFactory(){
    function redrawRepeaterTemplate(){
      let cell = createTempNode(this.cellTemplate),repeatableTemplate;
      Object.keys(this.cellData).forEach(function(property,idx){
          let template = extractRepeaterElement(cell,property).outerHTML;
          let finalTemplate = mergeDataToTemplate(this,this.cellData[property],template);
          repeatableTemplate = mergeTemplate(template,mergeRepeaters(finalTemplate),repeatableTemplate);
      }.bind(this))
      let s = document.createElement('span')
      s.innerHTML = repeatableTemplate;
      return repeatableTemplate;
    }

    function redrawSingleTemplate(){
      return redrawTemplate(this,this.cellData,this.cellTemplate);
    }

    function createTempNode(cell){
      let dom  = document.createElement('span');
      dom.innerHTML = cell;
      return dom;
    }

    function mergeTemplate(orig,arrayOfTemplates,template){
      let t = template;
      (function merge(orig,arrayOfTemplates,template){
        arrayOfTemplates.forEach(function(item,idx){
          if(Array.isArray(item)) return merge(orig,item,template);
          t = (!t)? item : t.replace(orig,item);
        });
      })(orig,arrayOfTemplates,template);
      return t
    }

    function extractRepeaterElement(cell,property){
          return Array.from(cell.children).map(function(childCell){
            if(!childCell.attributes.getNamedItem('repeat-on') || childCell.attributes.getNamedItem('repeat-on').value!=property){
              return extractRepeaterElement(childCell,property);
            }else{
              return childCell
            }
          }).filter((item)=>(item))[0]
    }

    function mergeDataToTemplate(cell,cellData,template){
      return cellData.map(function(item){
        if(Array.isArray(item)) return mergeDataToTemplate(cell, item, template);
        else return redrawTemplate(cell, item, template);
        }).filter((item)=>(item))
    }

    function mergeRepeaters(newTemplate, finalOutput){
        return newTemplate.map(function(item,idx){
                if(Array.isArray(item)) return mergeRepeaters(item,finalOutput)
                else{
                  finalOutput = (finalOutput)?finalOutput + item : item;
                  return (idx == newTemplate.length-1)? finalOutput:null;
                }
          }).filter((item)=>(item))
    }

    function redrawTemplate(cell, cellData, template){
          Object.keys(cellData).forEach(function(item){
              let replace = new RegExp("\(\\#\\{{(\\^?)"+item+"\\}}\)");
              if(cell.dataFormat && cellData[item]!==""){
                  let formatting = (cell.dataFormat.indexOf("{") !=-1)? (function(){return Object.keys(JSON.parse(cell.dataFormat)).map((format)=>(JSON.parse(cell.dataFormat)[format]=== item) ? format : null)[0]}.bind(cell))(): cell.dataFormat;
                  if(formatting) cellData[item] = format.getFormat()[formatting](cellData[item]);
              }
              template = template.replace(replace,cellData[item]);

          }.bind(cell));
          return template;
    }
    return{
        redrawRepeaterTemplate:redrawRepeaterTemplate,
        redrawSingleTemplate:redrawSingleTemplate
    }
}
const RENDERING_TEMPLATE_FACTORY = templateRenderingFactory();
export {RENDERING_TEMPLATE_FACTORY};
