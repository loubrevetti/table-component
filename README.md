# voya-table
table component for deep architecture, this table offers advanced features such as **sorting, theming, data model importing and cell templating**. Tables features are all generated by accessing the following properties listed below. also listen below shows you how to establish properties at a global level vs. column instance level.

###Implementation of table component
1. download repository into local machine
2. run ```npm install```
3. run ```jspm install```
4. with in your application you would write the following tags
  * ```
    <voya-table api-url="" api-params={"method":"GET"}>
      <voya-column>address</voya-column>
      <voya-column>city</voya-column>
      <voya-column>state</voya-column>
      <voya-column name="zipcode">zip</voya-column>
    </voya-table>
    ```

  * data model assumption 
    ```
    {'address':'11 main st', 'city':'wolcott', 'state':'CT', 'zipcode':'06489'}
    ```
    * *please note* **voya-table** *instaniates the table component object, in order to display data from model obtained by table component you must implement* **voya-column** *for each* **key value** *pair you wish to display. The logic of voya-column will use the column label as the* **key** *to search for in the* **model**. *If the key does not match the column label then you would simply need to add a* **name** *attribute to the* **voya-column** *instance.*
    
#Features
### data model importing
- **api-url:** property could be either a relative or absolute path to the service that would return a model or a static json file that is loaded with in the application, *note: if it is a static file then please set in api-params the property* **method:GET**

- **api-params:** property which allows developer to implement a reuqest body for service call with in table component
 - ex: ```
       {'method':"POST", 
           'payload':{'key1':'value1','key2':'value2','key3':'value3'} 
           }
       ```
