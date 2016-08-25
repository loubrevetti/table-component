export class Formats{
    getFormat(){
        return{
            currency:function(item){
                return (isNaN(item) || item === '') ? item : '$ ' + parseFloat(item).toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
            }
        }
    }
}
let format = new Formats();

export { format };
