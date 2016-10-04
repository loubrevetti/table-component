export class Formats{
    getFormat(){
        return{
            currency:function(item){
                return (isNaN(item) || item === '') ? item : '$ ' + parseFloat(item).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
            },
            pwebCurrency:function(item){
                return (isNaN(item) || item === '') ? item : '$ ' + parseFloat(item).toString().replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
            },
            number:function(item){
                return (isNaN(item) || item === '') ? item :  parseFloat(item).toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1,');
            },
            percent:function(item){
                return (isNaN(item) || item === '') ? item : parseFloat(item)+"%";
            }
        }
    }
}
let format = new Formats();

export { format };